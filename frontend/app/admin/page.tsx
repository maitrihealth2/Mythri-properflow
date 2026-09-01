'use client'

import { useState, useEffect } from 'react'
import { 
  adminLogin, 
  getAdminConsents, 
  getAdminFeedback,
  getAdminUsers,
  getAdminUserDetail,
  getAdminUserSessions,
  getAdminSessionMessages,
  exportAdminUserData,
  deleteAdminUsers
} from '@/core/api'

// ── Types ────────────────────────────────────────────────────────────────────
interface ConsentRecord {
  user_id: number
  username: string
  email: string
  completed_at: string
  raw_responses: any
}

interface FeedbackRecord {
  user_id: number
  username: string
  email: string
  content: string
  created_at: string
}

interface UserListRecord {
  id: number
  username: string
  email: string
  preferred_language: string
  created_at: string
  is_active: boolean
  session_count: number
  last_active: string
}

interface UserDetailRecord {
  id: number
  username: string
  email: string
  preferred_language: string
  created_at: string
  is_active: boolean
  profile: {
    bio?: string
    age?: number
    preferred_name?: string
    full_name?: string
    profession?: string
    therapy_focus?: string
  } | null
  activity_summary: {
    total_sessions: number
    last_activity: string
  }
}

interface SessionRecord {
  id: number
  session_token: string
  started_at: string
  ended_at: string | null
  channel: string
  is_crisis_flagged: boolean
  message_count: number
}

interface MessageRecord {
  id: number
  role: string
  content: string
  created_at: string
  emotion: string | null
}

// ── Consent Detail Modal ─────────────────────────────────────────────────────
function ConsentModal({ record, onClose }: { record: ConsentRecord; onClose: () => void }) {
  const c = record.raw_responses?.consent || {}
  const r = record.raw_responses || {}

  const consentItems = [
    { key: 'eligibility', label: 'Eligibility', value: c.eligibility },
    { key: 'collect_text', label: 'Collect Text', value: c.collect_text },
    { key: 'collect_usage', label: 'Collect Usage', value: c.collect_usage },
    { key: 'collect_feedback', label: 'Collect Feedback', value: c.collect_feedback },
    { key: 'model_training', label: 'Model Training', value: c.model_training },
    { key: 'data_retention', label: 'Data Retention', value: c.data_retention },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative bg-surface-container-lowest rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between p-6 border-b border-outline-variant/30 bg-surface-container-low">
          <div>
            <h2 className="text-xl font-semibold text-on-surface">{record.username}</h2>
            <p className="text-sm text-on-surface-variant mt-0.5">{record.email}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-surface-variant text-on-surface-variant transition-colors">
            ✕
          </button>
        </div>
        <div className="overflow-y-auto flex-1 p-6 space-y-6 bg-surface-container-lowest">
          <section>
            <h3 className="text-sm font-semibold text-on-surface-variant uppercase tracking-wider mb-3">Consents</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {consentItems.map((item) => (
                <div key={item.key} className="flex items-center gap-3 p-4 rounded-xl border bg-surface border-outline-variant/30 shadow-sm">
                  <span className="text-lg">{item.value ? '✅' : '❌'}</span>
                  <p className="font-medium text-sm text-on-surface">{item.label}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')

  const [activeTab, setActiveTab] = useState<'users' | 'consents' | 'feedback'>('users')
  const [search, setSearch] = useState('')
  const [isDarkMode, setIsDarkMode] = useState(false)
  
  // Data State
  const [users, setUsers] = useState<UserListRecord[]>([])
  const [totalUsers, setTotalUsers] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)

  const [consents, setConsents] = useState<ConsentRecord[]>([])
  const [feedbacks, setFeedbacks] = useState<FeedbackRecord[]>([])
  const [loading, setLoading] = useState(false)

  // Multi-select + delete
  const [selectedUsers, setSelectedUsers] = useState<Set<number>>(new Set())
  const [deleting, setDeleting] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  
  // Drill-down State
  const [activeUser, setActiveUser] = useState<UserDetailRecord | null>(null)
  const [activeUserSessions, setActiveUserSessions] = useState<SessionRecord[]>([])
  const [activeSession, setActiveSession] = useState<{ id: number; messages: MessageRecord[]; started_at: string } | null>(null)
  
  const [selectedConsent, setSelectedConsent] = useState<ConsentRecord | null>(null)

  useEffect(() => {
    const token = sessionStorage.getItem('mb_admin_token')
    if (token) {
      setIsAuthenticated(true)
      loadData(activeTab)
    }
  }, [])

  useEffect(() => {
    if (isAuthenticated) {
      if (activeTab === 'users' && !activeUser) {
        loadData('users')
      } else if (!activeUser) {
        loadData(activeTab)
      }
    }
  }, [activeTab, isAuthenticated, page, pageSize, search])

  // Optional: debounce search for users to avoid spamming
  useEffect(() => {
    if (activeTab === 'users') {
       setPage(1) // Reset to page 1 on new search
    }
  }, [search])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginError('')
    try {
      const res = await adminLogin({ email, password })
      sessionStorage.setItem('mb_admin_token', res.token)
      setIsAuthenticated(true)
      loadData('users')
    } catch {
      setLoginError('Invalid credentials')
    }
  }

  const handleLogout = () => {
    sessionStorage.removeItem('mb_admin_token')
    setIsAuthenticated(false)
    setActiveUser(null)
    setActiveSession(null)
  }

  const loadData = async (tab: string) => {
    setLoading(true)
    try {
      if (tab === 'users') {
        const skip = (page - 1) * pageSize
        const res = await getAdminUsers(search, skip, pageSize)
        setUsers(res.users)
        setTotalUsers(res.total || 0)
      } else if (tab === 'consents') {
        const res = await getAdminConsents()
        setConsents(res.consents)
      } else if (tab === 'feedback') {
        const res = await getAdminFeedback()
        setFeedbacks(res.feedbacks)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleUserClick = async (userId: number) => {
    setLoading(true)
    try {
      const detail = await getAdminUserDetail(userId)
      const sessions = await getAdminUserSessions(userId)
      setActiveUser(detail)
      setActiveUserSessions(sessions.sessions)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleSessionClick = async (sessionId: number) => {
    setLoading(true)
    try {
      const res = await getAdminSessionMessages(sessionId)
      setActiveSession({ id: sessionId, messages: res.messages, started_at: res.session.started_at })
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // ─── Multi-select helpers ────────────────────────────────────────────────
  const toggleUser = (id: number) => {
    setSelectedUsers(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleAllUsers = () => {
    if (selectedUsers.size === filteredUsers.length) {
      setSelectedUsers(new Set())
    } else {
      setSelectedUsers(new Set(filteredUsers.map(u => u.id)))
    }
  }

  const handleBulkDelete = async () => {
    if (selectedUsers.size === 0) return
    setDeleting(true)
    try {
      await deleteAdminUsers(Array.from(selectedUsers))
      setSelectedUsers(new Set())
      setDeleteConfirm(false)
      await loadData('users')
    } catch (err) {
      console.error('Bulk delete error:', err)
    } finally {
      setDeleting(false)
    }
  }

  const handleExportCSV = async () => {
    if (!activeUser) return
    try {
      const res = await exportAdminUserData(activeUser.id)
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `mythri_user_${activeUser.id}_${new Date().toISOString().split('T')[0]}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (err) {
      console.error("Export failed", err)
    }
  }

  const downloadConsentsCSV = () => {
    // keeping old consent export logic
  }

  // Filters
  const filteredUsers = users.filter(u => u.username?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase()))
  const filteredConsents = consents.filter(c => c.username?.toLowerCase().includes(search.toLowerCase()) || c.email?.toLowerCase().includes(search.toLowerCase()))
  const filteredFeedbacks = feedbacks.filter(f => f.username?.toLowerCase().includes(search.toLowerCase()) || f.email?.toLowerCase().includes(search.toLowerCase()) || f.content?.toLowerCase().includes(search.toLowerCase()))

  // ── Login screen ─────────────────────────────────────────────────────────
  if (!isAuthenticated) {
    return (
      <div className={`min-h-screen flex items-center justify-center bg-surface transition-colors duration-300 ${isDarkMode ? 'dark' : ''}`}>
        <form onSubmit={handleLogin} className="bg-surface-container-lowest p-10 rounded-3xl shadow-xl border border-outline-variant/30 w-full max-w-sm flex flex-col space-y-6">
          <h1 className="text-plum-high-contrast font-headline-lg text-3xl text-center">Admin Access</h1>
          <input type="email" placeholder="Admin Email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-3 bg-surface text-on-surface rounded-xl border border-outline-variant focus:outline-none focus:ring-2 focus:ring-primary/50 font-body-md transition-all" required />
          <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-3 bg-surface text-on-surface rounded-xl border border-outline-variant focus:outline-none focus:ring-2 focus:ring-primary/50 font-body-md transition-all" required />
          {loginError && <p className="text-red-500 text-sm text-center bg-red-50/50 p-2 rounded-lg">{loginError}</p>}
          <button type="submit" className="w-full py-3 bg-primary text-on-primary rounded-full font-label-md hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] shadow-md transition-all">Log In</button>
        </form>
      </div>
    )
  }

  // ── Session Detail View ─────────────────────────────────────────────────
  if (activeSession && activeUser) {
    return (
      <div className="min-h-screen bg-surface flex flex-col items-center py-8">
        <div className="w-full max-w-3xl flex flex-col h-[90vh] bg-white rounded-2xl shadow-sm border border-outline-variant/30 overflow-hidden">
          <div className="p-4 border-b border-outline-variant/30 bg-surface flex justify-between items-center">
            <button onClick={() => setActiveSession(null)} className="text-on-surface-variant hover:text-on-surface font-label-md flex items-center gap-2">
              ← Back to Profile
            </button>
            <span className="font-label-md text-primary">Session from {new Date(activeSession.started_at).toLocaleString()}</span>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-white">
            {activeSession.messages.length === 0 && (
              <p className="text-center text-on-surface-variant">No messages in this session.</p>
            )}
            {activeSession.messages.map((msg, idx) => (
              <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                <span className="text-[10px] uppercase font-bold text-on-surface-variant mb-1 opacity-70">
                  {msg.role === 'user' ? activeUser.username : 'MYTHRI'}
                </span>
                <div className={`px-4 py-3 rounded-2xl max-w-[80%] ${msg.role === 'user' ? 'bg-primary text-white rounded-tr-sm' : 'bg-surface-container text-on-surface rounded-tl-sm'}`}>
                  {msg.content}
                </div>
                {msg.emotion && (
                  <span className="text-[10px] text-on-surface-variant mt-1">Emotion: {msg.emotion}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ── User Detail View ────────────────────────────────────────────────────
  if (activeUser) {
    return (
      <div className="min-h-screen bg-surface flex flex-col items-center py-8">
        <div className="w-full max-w-5xl flex flex-col gap-6">
          <div className="flex justify-between items-center">
            <button onClick={() => { setActiveUser(null); setActiveUserSessions([]) }} className="text-on-surface-variant hover:text-on-surface font-label-md flex items-center gap-2">
              ← Back to Users
            </button>
            <button onClick={handleExportCSV} className="bg-primary text-white px-5 py-2 rounded-full font-label-md hover:bg-primary/90 flex items-center gap-2">
              Export CSV
            </button>
          </div>
          
          <div className="bg-white rounded-2xl shadow-sm border border-outline-variant/30 p-6 flex flex-col md:flex-row gap-8">
            <div className="flex-1">
              <h2 className="text-2xl font-headline-md text-primary mb-1">{activeUser.username}</h2>
              <p className="text-on-surface-variant font-body-sm">{activeUser.email} • {activeUser.preferred_language}</p>
              <div className="mt-6 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-on-surface-variant uppercase tracking-wider mb-1">Total Sessions</p>
                  <p className="font-medium text-lg">{activeUser.activity_summary.total_sessions}</p>
                </div>
                <div>
                  <p className="text-xs text-on-surface-variant uppercase tracking-wider mb-1">Last Active</p>
                  <p className="font-body-lg">{new Date(activeUser.activity_summary.last_activity).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-xs text-on-surface-variant uppercase tracking-wider mb-1">Joined</p>
                  <p className="font-medium text-lg">{new Date(activeUser.created_at).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
            
            <div className="flex-1 bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-on-surface-variant uppercase tracking-wider mb-3">Profile Data</h3>
              {activeUser.profile ? (
                <div className="space-y-2 font-body-sm">
                  <p><span className="text-on-surface-variant">Name:</span> {activeUser.profile.full_name || '-'}</p>
                  <p><span className="text-on-surface-variant">Pref Name:</span> {activeUser.profile.preferred_name || '-'}</p>
                  <p><span className="text-on-surface-variant">Age:</span> {activeUser.profile.age || '-'}</p>
                  <p><span className="text-on-surface-variant">Profession:</span> {activeUser.profile.profession || '-'}</p>
                  <p><span className="text-on-surface-variant">Focus:</span> {activeUser.profile.therapy_focus || '-'}</p>
                  <p><span className="text-on-surface-variant">Bio:</span> {activeUser.profile.bio || '-'}</p>
                </div>
              ) : (
                <p className="text-sm text-on-surface-variant">No extended profile created yet.</p>
              )}
            </div>
          </div>
          
          <div className="bg-white rounded-2xl shadow-sm border border-outline-variant/30 overflow-hidden">
            <div className="p-5 border-b border-outline-variant/30 bg-surface">
              <h3 className="font-headline-sm text-lg text-on-surface">Sessions History</h3>
            </div>
            {activeUserSessions.length === 0 ? (
              <div className="p-8 text-center text-on-surface-variant">No sessions recorded.</div>
            ) : (
              <div className="overflow-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-surface-dim font-label-md text-on-surface-variant">
                    <tr>
                      <th className="p-4">Session Date</th>
                      <th className="p-4">Time</th>
                      <th className="p-4 text-center">Messages</th>
                      <th className="p-4 text-center">Channel</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeUserSessions.map(sess => (
                      <tr 
                        key={sess.id} 
                        onClick={() => handleSessionClick(sess.id)}
                        className="border-b last:border-0 border-outline-variant/30 hover:bg-primary/5 cursor-pointer transition-colors group"
                      >
                        <td className="p-4 font-medium text-on-surface group-hover:text-primary transition-colors">
                          {new Date(sess.started_at).toLocaleDateString()}
                        </td>
                        <td className="p-4 text-on-surface-variant">
                          {new Date(sess.started_at).toLocaleTimeString()}
                        </td>
                        <td className="p-4 text-center font-medium">{sess.message_count}</td>
                        <td className="p-4 text-center uppercase text-xs">{sess.channel}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ── Dashboard ─────────────────────────────────────────────────────────────
  return (
    <div className={`${isDarkMode ? 'dark' : ''} h-screen w-full overflow-hidden flex flex-col`}>
      {selectedConsent && <ConsentModal record={selectedConsent} onClose={() => setSelectedConsent(null)} />}

      <div className="h-full bg-background text-on-background flex flex-col transition-colors duration-300 overflow-hidden">
        <header className="border-b border-outline-variant/30 bg-surface-container-lowest px-8 py-4 flex justify-between items-center flex-shrink-0 shadow-sm z-10">
          <h1 className="text-plum-high-contrast font-headline-lg text-2xl flex items-center gap-3">
            <span className="bg-primary text-on-primary w-8 h-8 rounded-lg flex items-center justify-center text-sm">M</span>
            Mythri Admin
          </h1>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsDarkMode(!isDarkMode)} 
              className="p-2 text-on-surface-variant hover:text-on-surface hover:bg-surface rounded-full transition-colors"
              title="Toggle Theme"
            >
              {isDarkMode ? '☀️' : '🌙'}
            </button>
            <button onClick={handleLogout} className="px-5 py-2 text-on-surface-variant font-label-md border border-outline-variant/50 rounded-full hover:bg-surface-variant transition-all hover:shadow-sm">
              Log Out
            </button>
          </div>
        </header>

        <div className="flex-1 flex flex-col max-w-6xl mx-auto w-full px-8 py-6 overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 flex-shrink-0">
            <div className="flex space-x-1 border-b border-outline-variant/30 overflow-x-auto">
              {(['users', 'consents', 'feedback'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => { setActiveTab(tab); setSearch('') }}
                  className={`font-label-md px-5 py-2.5 capitalize transition-colors whitespace-nowrap ${
                    activeTab === tab ? 'text-primary border-b-2 border-primary -mb-px' : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  {tab}
                  <span className="ml-2 text-xs bg-surface-dim text-on-surface-variant px-2 py-0.5 rounded-full">
                    {tab === 'users' ? users.length : tab === 'consents' ? consents.length : feedbacks.length}
                  </span>
                </button>
              ))}
            </div>
            
            <div className="flex items-center gap-3">
              <div className="relative group">
                <input
                  type="text"
                  placeholder="Search…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-4 pr-10 py-2.5 text-sm bg-surface-container-lowest border border-outline-variant/50 rounded-full focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary font-body-sm text-on-surface w-64 shadow-sm transition-all"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50 group-focus-within:text-primary transition-colors">
                  🔍
                </span>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="flex-1 min-h-0">
              
              {/* Users Tab */}
              {activeTab === 'users' && (
                <div className="h-full flex flex-col gap-3">

                  {/* ── Bulk delete bar ── */}
                  {selectedUsers.size > 0 && (
                    <div className="flex items-center justify-between bg-red-50 border border-red-200 rounded-xl px-5 py-3 shadow-sm">
                      <span className="text-sm font-medium text-red-700">
                        {selectedUsers.size} user{selectedUsers.size !== 1 ? 's' : ''} selected
                      </span>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setSelectedUsers(new Set())}
                          className="text-sm text-on-surface-variant hover:text-on-surface transition-colors"
                        >
                          Clear
                        </button>
                        {!deleteConfirm ? (
                          <button
                            onClick={() => setDeleteConfirm(true)}
                            className="px-4 py-1.5 bg-red-600 text-white text-sm font-medium rounded-full hover:bg-red-700 transition-colors"
                          >
                            🗑 Delete Selected
                          </button>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-red-700 font-medium">Are you sure?</span>
                            <button
                              onClick={handleBulkDelete}
                              disabled={deleting}
                              className="px-4 py-1.5 bg-red-700 text-white text-sm font-medium rounded-full hover:bg-red-800 transition-colors disabled:opacity-50"
                            >
                              {deleting ? 'Deleting…' : 'Yes, Delete'}
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(false)}
                              className="px-4 py-1.5 border border-outline-variant rounded-full text-sm hover:bg-surface transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex-1 overflow-auto rounded-xl border border-outline-variant/30 bg-surface-container-lowest shadow-sm">
                    <table className="w-full text-left border-collapse min-w-[700px]">
                      <thead className="sticky top-0 z-10 bg-surface-container-low font-label-md text-on-surface-variant border-b border-outline-variant/30 shadow-sm">
                        <tr>
                          <th className="p-4 w-10">
                            <input
                              type="checkbox"
                              checked={users.length > 0 && selectedUsers.size === users.length}
                              onChange={toggleAllUsers}
                              className="w-4 h-4 accent-primary cursor-pointer"
                              title="Select all on this page"
                            />
                          </th>
                          <th className="p-4">User</th>
                          <th className="p-4">Email</th>
                          <th className="p-4 text-center">Sessions</th>
                          <th className="p-4 text-right">Joined Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map(u => (
                          <tr
                            key={u.id}
                            className={`border-b last:border-0 border-outline-variant/30 transition-colors group ${
                              selectedUsers.has(u.id) ? 'bg-error-container/30' : 'hover:bg-surface-variant/50'
                            }`}
                          >
                            <td className="p-4" onClick={e => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={selectedUsers.has(u.id)}
                                onChange={() => toggleUser(u.id)}
                                className="w-4 h-4 accent-primary cursor-pointer"
                              />
                            </td>
                            <td
                              className="p-4 font-medium text-on-surface group-hover:text-primary transition-colors cursor-pointer"
                              onClick={() => handleUserClick(u.id)}
                            >
                              {u.username}
                            </td>
                            <td className="p-4 text-on-surface-variant cursor-pointer" onClick={() => handleUserClick(u.id)}>{u.email}</td>
                            <td className="p-4 text-center cursor-pointer" onClick={() => handleUserClick(u.id)}>
                              <span className="bg-surface-variant px-2.5 py-1 rounded-full text-xs font-medium text-on-surface-variant">
                                {u.session_count}
                              </span>
                            </td>
                            <td className="p-4 text-right text-on-surface-variant cursor-pointer" onClick={() => handleUserClick(u.id)}>{new Date(u.created_at).toLocaleDateString()}</td>
                          </tr>
                        ))}
                        {users.length === 0 && (
                          <tr><td colSpan={5} className="p-8 text-center text-on-surface-variant">No users found.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination Controls */}
                  <div className="flex items-center justify-between px-4 py-3 bg-surface-container-lowest border border-outline-variant/30 rounded-xl shadow-sm mt-2">
                    <div className="text-sm text-on-surface-variant">
                      Showing {Math.min((page - 1) * pageSize + 1, totalUsers)} to {Math.min(page * pageSize, totalUsers)} of <span className="font-medium text-on-surface">{totalUsers}</span> users
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        disabled={page === 1} 
                        onClick={() => setPage(page - 1)}
                        className="px-3 py-1.5 border border-outline-variant/50 rounded-lg text-sm hover:bg-surface-variant disabled:opacity-50 transition-colors text-on-surface"
                      >
                        Previous
                      </button>
                      <span className="text-sm font-medium px-2 text-on-surface">Page {page}</span>
                      <button 
                        disabled={page * pageSize >= totalUsers} 
                        onClick={() => setPage(page + 1)}
                        className="px-3 py-1.5 border border-outline-variant/50 rounded-lg text-sm hover:bg-surface-variant disabled:opacity-50 transition-colors text-on-surface"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Consents Tab */}
              {activeTab === 'consents' && (
                <div className="h-full flex flex-col">
                  <div className="flex-1 overflow-auto rounded-xl border border-outline-variant/30 bg-surface-container-lowest shadow-sm">
                    <table className="w-full text-left border-collapse min-w-[700px]">
                      <thead className="sticky top-0 z-10 bg-surface-container-low font-label-md text-on-surface-variant border-b border-outline-variant/30 shadow-sm">
                        <tr><th className="p-4">Name</th><th className="p-4">Email</th><th className="p-4">Completed At</th><th className="p-4 text-center">Action</th></tr>
                      </thead>
                      <tbody>
                        {filteredConsents.map(c => (
                          <tr key={c.user_id} onClick={() => setSelectedConsent(c)} className="border-b hover:bg-surface-variant/50 cursor-pointer transition-colors font-body-sm group">
                            <td className="p-4 font-medium text-on-surface group-hover:text-primary transition-colors">{c.username}</td>
                            <td className="p-4 text-on-surface-variant">{c.email}</td>
                            <td className="p-4 text-on-surface-variant">{new Date(c.completed_at).toLocaleString()}</td>
                            <td className="p-4 text-center"><button className="text-primary text-xs font-medium px-3 py-1 bg-primary/10 rounded-full hover:bg-primary/20 transition-colors">View Details</button></td>
                          </tr>
                        ))}
                        {filteredConsents.length === 0 && (
                          <tr><td colSpan={4} className="p-8 text-center text-on-surface-variant">No consents found.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Feedback Tab */}
              {activeTab === 'feedback' && (
                <div className="h-full flex flex-col">
                  <div className="flex-1 overflow-auto rounded-xl border border-outline-variant/30 bg-white shadow-sm">
                    <table className="w-full text-left border-collapse min-w-[600px]">
                      <thead className="sticky top-0 z-10 bg-surface-dim font-label-md text-on-surface-variant border-b border-outline-variant/30">
                        <tr><th className="p-4 w-1/4">User</th><th className="p-4 w-1/5">Date</th><th className="p-4">Feedback</th></tr>
                      </thead>
                      <tbody>
                        {filteredFeedbacks.map((f, i) => (
                          <tr key={i} className="border-b last:border-0 hover:bg-surface-dim/50 font-body-sm">
                            <td className="p-4"><div className="font-medium text-on-surface">{f.username}</div><div className="text-xs text-on-surface-variant mt-0.5">{f.email}</div></td>
                            <td className="p-4 text-on-surface-variant">{new Date(f.created_at).toLocaleString()}</td>
                            <td className="p-4 whitespace-pre-wrap text-on-surface">{f.content}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}



            </div>
          )}
        </div>
      </div>
    </div>
  )
}
