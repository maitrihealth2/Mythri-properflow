import axios from 'axios'
import { serverPool, getActiveApiUrl, getWebSocketUrl, fetchWithFailover, wakeAllServers } from './serverPool'

export { serverPool, getActiveApiUrl, getWebSocketUrl, fetchWithFailover, wakeAllServers }
export const API_URL = getActiveApiUrl();

// ---------------------------------------------------------------------------
// CRIT-03: In-memory access token store
// The access token is NEVER written to localStorage or a non-httponly cookie.
// It lives only in this module-level variable. AuthContext updates it on
// login/refresh. On page reload, AuthContext restores it via /api/auth/refresh
// (which uses the httponly refresh token cookie automatically).
// ---------------------------------------------------------------------------
let _accessToken: string | null = null;

export function setInMemoryToken(token: string | null): void {
  _accessToken = token;
}

export function getInMemoryToken(): string | null {
  return _accessToken;
}

const api = axios.create({ baseURL: getActiveApiUrl(), timeout: 0, withCredentials: true })

let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
}

api.interceptors.request.use((config) => {
  // Always attach active healthy server base URL
  if (!config.baseURL || config.baseURL.startsWith('http://localhost') || config.baseURL.startsWith('http://127.0.0.1')) {
    config.baseURL = serverPool.getActiveUrl();
  }
  if (typeof window !== 'undefined') {
    if (config.url?.startsWith('/api/admin/') && !config.url?.includes('/api/admin/login')) {
      const adminToken = sessionStorage.getItem('mb_admin_token')
      if (adminToken) {
        config.headers.Authorization = `Bearer ${adminToken}`
      }
    } else {
      // Read from in-memory store — NOT localStorage
      const token = _accessToken
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
    }
  }
  return config
})

api.interceptors.response.use(
  (response) => {
    if (response.config?.baseURL) {
      serverPool.markHealthy(response.config.baseURL);
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // ── High-Availability Multi-Server Failover Retry ──
    const isCanceled = axios.isCancel(error) || error.code === 'ERR_CANCELED' || error.name === 'CanceledError';
    const isServerError = error.response && [502, 503, 504].includes(error.response.status);
    const isTrueNetworkError = !error.response && !isCanceled && (
      error.code === 'ECONNREFUSED' ||
      error.code === 'ERR_NETWORK' ||
      error.message?.includes('Network Error') ||
      error.message?.includes('Failed to fetch')
    );

    const isNetworkOrServerError = isServerError || isTrueNetworkError;
    if (originalRequest && isNetworkOrServerError && !isCanceled) {
      const allServers = serverPool.getAllServers();
      originalRequest._failoverCount = (originalRequest._failoverCount || 0);

      if (allServers.length > 1 && originalRequest._failoverCount < allServers.length - 1) {
        originalRequest._failoverCount += 1;
        const nextServer = serverPool.rotateToNextServer(error.message || 'Server unavailable');
        originalRequest.baseURL = nextServer;
        
        // Small exponential delay before next server retry
        await new Promise(res => setTimeout(res, 100));
        return api(originalRequest);
      }
    }
    
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      if (typeof window !== 'undefined' && !originalRequest.url?.includes('/api/auth/')) {
        if (isRefreshing) {
          return new Promise(function(resolve, reject) {
            failedQueue.push({ resolve, reject })
          }).then(token => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          }).catch(err => {
            return Promise.reject(err);
          });
        }
        
        originalRequest._retry = true;
        isRefreshing = true;

        try {
          const currentUrl = serverPool.getActiveUrl();
          const { data } = await axios.post(`${currentUrl}/api/auth/refresh`, {}, { withCredentials: true });

          const new_token = data.access_token;
          // CRIT-03: store in memory ONLY — never localStorage
          setInMemoryToken(new_token);
          if (data.username) localStorage.setItem('mb_username', data.username);

          api.defaults.headers.common['Authorization'] = `Bearer ${new_token}`;
          originalRequest.headers.Authorization = `Bearer ${new_token}`;

          processQueue(null, new_token);
          return api(originalRequest);
        } catch (err) {
          processQueue(err, null);
          setInMemoryToken(null);
          localStorage.removeItem('mb_username')
          localStorage.removeItem('mb_language')
          sessionStorage.removeItem('mb_session_id')
          window.location.href = '/login'
          return Promise.reject(err);
        } finally {
          isRefreshing = false;
        }
      }
    }
    
    if (error.response?.status === 403 && typeof window !== 'undefined') {
      const detail = error.response?.data?.detail;
      if (typeof detail === 'string' && detail.toLowerCase().includes('not allowed to access')) {
        // CRIT-07: Do NOT store block state in localStorage — dispatch event only.
        // BlockedGuard listens for this event and sets component state.
        window.dispatchEvent(new CustomEvent('mythri:user_blocked', { detail }));
      }
    }
    
    // Add empathetic error translation for other errors
    error.userMessage = translateApiError(error)
    return Promise.reject(error)
  }
)

function translateApiError(error: any): string {
  if (!error.response) {
    return "Mythri is having trouble connecting right now. Let's try again in a moment."
  }
  
  const detail = error.response.data?.detail
  if (typeof detail === 'string' && detail.trim().length > 0) {
    return detail
  }
  
  const status = error.response.status
  if (status === 429) {
    return "Things are a little busy right now. Please take a deep breath and try again shortly."
  }
  if (status >= 500) {
    return "Something shifted on our end. We are gently fixing it."
  }
  if (status === 403 || status === 401) {
    return "Your session has gently faded. Please log in again to continue."
  }
  
  return "I'm having trouble understanding right now. Can we try again?"
}

export default api

export async function register(username: string, email: string, password: string, language = 'en-IN') {
  const res = await api.post('/api/auth/register', { username, email, password, preferred_language: language })
  return res.data
}

export async function login(email: string, password: string) {
  const res = await api.post('/api/auth/login', { email, password })
  return res.data
}

export async function googleLogin(idToken: string) {
  const res = await api.post('/api/auth/google', { idToken })
  return res.data
}

export async function getMe() {
  const res = await api.get('/api/auth/me')
  return res.data
}

export async function logout() {
  try {
    await api.post('/api/auth/logout')
  } catch (err) {
    safeLogError('Logout API note:', err)
  } finally {
    if (typeof window !== 'undefined') {
      // CRIT-03: clear in-memory token
      setInMemoryToken(null);
      // Clear only non-sensitive preference keys, not security state
      localStorage.removeItem('mb_username')
      localStorage.removeItem('mb_language')
      localStorage.removeItem('mb_chat_draft')
      sessionStorage.clear()
      try {
        const { auth } = await import('@/core/firebase')
        const { signOut } = await import('firebase/auth')
        await signOut(auth)
      } catch (_) {}
      window.location.href = '/login'
    }
  }
}

export async function forgotPassword(email: string) {
  const res = await api.post('/api/auth/forgot-password', { email })
  return res.data
}

export async function getOnboardingStatus() {
  const res = await api.get('/api/user/onboarding/status')
  return res.data
}

export async function submitOnboarding(data: any) {
  const res = await api.post('/api/user/onboarding', data)
  return res.data
}

export async function startSession() {
  const res = await api.post('/api/consultation/start')
  return res.data
}

export async function sendMessage(session_id: string, message: string, language = 'en-IN') {
  const res = await api.post('/api/consultation/message', { session_id, message, language })
  return res.data
}

export async function endSession(sessionId: string) {
  try {
    const res = await api.post(`/api/consultation/${sessionId}/end`)
    return res.data
  } catch (err) {
    console.warn('[END_SESSION_ERR]', err)
    return null
  }
}


export async function getHistory() {
  const res = await api.get('/api/consultation/history')
  return res.data
}

export async function getTranscript(sessionId: string) {
  const res = await api.get(`/api/consultation/${sessionId}?t=${Date.now()}`)
  return res.data
}

export async function getWsTicket(): Promise<string> {
  const res = await api.post('/api/auth/ws-ticket')
  return res.data?.ticket
}

export async function sendVoiceMessage(sessionId: string, formData: FormData) {
  const token = getInMemoryToken()
  const headers: Record<string, string> = {}
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetchWithFailover('/api/voice/conversation', {
    method: 'POST',
    headers,
    credentials: 'include',
    body: formData,
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Fetch failed with status ${res.status}: ${errText}`)
  }

  return await res.json()
}

export async function getDashboardStats() {
  const res = await api.get('/api/consultation/dashboard_stats/overview')
  return res.data
}

export interface FeedbackPayload {
  content?: string
  rating?: number
  ratings?: Record<string, number>
  session_id?: number | string | null
  feedback_type?: 'general' | 'post_session_exit' | 'voice_session' | string
}

export interface FeedbackModeResponse {
  feedback_mode: 'new' | 'old'
  mode: 'new' | 'old'
  label?: string
  description?: string
  updated_at?: string
}

export async function submitFeedback(data: string | FeedbackPayload) {
  const payload = typeof data === 'string' ? { content: data, rating: 5, feedback_type: 'general' } : data
  const res = await api.post('/api/feedback/submit', payload)
  return res.data
}

export async function getFeedbackMode(): Promise<FeedbackModeResponse> {
  try {
    const res = await api.get('/api/config/feedback_mode')
    const m = res.data?.mode || res.data?.feedback_mode || 'new'
    return { feedback_mode: m, mode: m }
  } catch {
    return { feedback_mode: 'new', mode: 'new' }
  }
}

export async function getAdminFeedbackMode(): Promise<FeedbackModeResponse> {
  const res = await api.get('/api/admin/feedback/mode')
  const m = res.data?.mode || res.data?.feedback_mode || 'new'
  return { feedback_mode: m, mode: m }
}

export async function setAdminFeedbackMode(mode: 'new' | 'old'): Promise<FeedbackModeResponse> {
  const res = await api.post('/api/admin/feedback/mode', { mode })
  const m = res.data?.mode || res.data?.feedback_mode || mode
  return { feedback_mode: m, mode: m }
}

export async function getBaselineShiftAnalytics() {
  try {
    const res = await api.get('/api/consultation/baseline_analytics')
    return res.data
  } catch (err) {
    return null
  }
}


// ==========================================
// Admin
// ==========================================
export const adminLogin = async (data: any) => {
  const response = await api.post('/api/admin/login', data)
  return response.data
}
export const getAdminConsents = async () => {
  const response = await api.get('/api/admin/consents')
  return response.data
}
export const getAdminFeedback = async () => {
  const response = await api.get('/api/admin/feedback')
  return response.data
}
export const getAdminUsers = async (search = '', skip = 0, limit = 50) => {
  const response = await api.get('/api/admin/users', { params: { search, skip, limit } })
  return response.data
}
export const getAdminUserDetail = async (userId: number) => {
  const response = await api.get(`/api/admin/users/${userId}`)
  return response.data
}
export const getAdminUserSessions = async (userId: number) => {
  const response = await api.get(`/api/admin/users/${userId}/sessions`)
  return response.data
}
export const getAdminSessionMessages = async (sessionId: number) => {
  const response = await api.get(`/api/admin/sessions/${sessionId}`)
  return response.data
}
export const exportAdminUserData = async (userId: number) => {
  const response = await api.get(`/api/admin/users/${userId}/export`, {
    responseType: 'blob'
  })
  return response
}

export const exportAdminSessionData = async (sessionId: number) => {
  const response = await api.get(`/api/admin/sessions/${sessionId}/export`, {
    responseType: 'blob'
  })
  return response
}

export const deleteAdminUsers = async (userIds: number[]) => {
  const response = await api.post('/api/admin/users/bulk-delete', { user_ids: userIds })
  return response.data
}

export const updateAdminUserStatus = async (userId: number, isActive: boolean) => {
  const response = await api.put(`/api/admin/users/${userId}/status`, { is_active: isActive })
  return response.data
}

export const bulkUpdateAdminUserStatus = async (userIds: number[], isActive: boolean) => {
  const response = await api.post('/api/admin/users/bulk-status', { user_ids: userIds, is_active: isActive })
  return response.data
}

export const updateAllUsersStatus = async (isActive: boolean) => {
  const response = await api.post('/api/admin/users/all-status', { is_active: isActive })
  return response.data
}


// ==========================================
// Profile
// ==========================================
export async function getProfile() {
  const res = await api.get('/api/user/profile')
  return res.data
}

export async function updateProfile(data: any) {
  const res = await api.put('/api/user/profile', data)
  return res.data
}

// ==========================================
// Maintenance Mode
// ==========================================
export interface MaintenanceStatus {
  enabled: boolean
  message: string
  ends_at: string | null
  started_at: string | null
  remaining_seconds: number
  server_time: string
  updated_by?: string
}

export interface SetMaintenancePayload {
  enabled: boolean
  duration_minutes?: number | null
  ends_at?: string | null
  message?: string | null
}

export const getMaintenanceStatus = async (): Promise<MaintenanceStatus> => {
  const response = await api.get('/api/system/maintenance')
  return response.data
}

export const getAdminMaintenanceStatus = async (): Promise<MaintenanceStatus> => {
  const response = await api.get('/api/admin/maintenance')
  return response.data
}

export const setAdminMaintenanceMode = async (payload: SetMaintenancePayload): Promise<MaintenanceStatus> => {
  const response = await api.post('/api/admin/maintenance/set', payload)
  return response.data
}

export const disableAdminMaintenanceMode = async (): Promise<MaintenanceStatus> => {
  const response = await api.post('/api/admin/maintenance/disable')
  return response.data
}

/**
 * Sanitizes and safely logs errors to prevent exposing passwords, credentials, or bearer tokens.
 */
export function safeLogError(prefix: string, err: any): void {
  const isDev = process.env.NODE_ENV !== 'production';
  if (!isDev) return;
  const message = err?.response?.data?.detail || err?.userMessage || err?.message || 'An error occurred';
  const status = err?.response?.status;
  const url = err?.config?.url;
  // NEVER log err.config.data or err.config.headers as they may contain passwords or tokens
  const safeMsg = status ? `[${status}] ${message}` : message;
  const safeUrl = url ? `(endpoint: ${url.split('?')[0]})` : '';
  console.error(`${prefix} ${safeMsg} ${safeUrl}`.trim());
}


