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
  exportAdminUserData
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
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between p-6 border-b border-outline-variant/30">
          <div>
            <h2 className="text-xl font-semibold text-on-surface">{record.username}</h2>
            <p className="text-sm text-on-surface-variant mt-0.5">{record.email}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-surface-dim text-on-surface-variant transition-colors">
            ✕
          </button>
        </div>
        <div className="overflow-y-auto flex-1 p-6 space-y-6">
          <section>
            <h3 className="text-sm font-semibold text-on-surface-variant uppercase tracking-wider mb-3">Consents</h3>
            <div className="space-y-3">
              {consentItems.map((item) => (
                <div key={item.key} className="flex items-start gap-3 p-3 rounded-xl border bg-surface border-outline-variant/30">
                  <span>{item.value ? '✅' : '❌'}</span>
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
  
  // Data State
  const [users, setUsers] = useState<UserListRecord[]>([])
  const [consents, setConsents] = useState<ConsentRecord[]>([])
  const [feedbacks, setFeedbacks] = useState<FeedbackRecord[]>([])
  const [loading, setLoading] = useState(false)
  
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
    if (isAuthenticated && !activeUser) {
      loadData(activeTab)
    }
  }, [activeTab, isAuthenticated])

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
        const res = await getAdminUsers()
        setUsers(res.users)
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
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <form onSubmit={handleLogin} className="bg-white p-8 rounded-2xl shadow-sm border border-outline-variant/30 w-full max-w-sm flex flex-col space-y-4">
          <h1 className="text-plum-high-contrast font-headline-md text-2xl text-center">Admin Access</h1>
          <input type="email" placeholder="Admin Email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-3 bg-surface text-on-surface rounded-xl border border-outline-variant focus:outline-none focus:border-primary font-body-md" required />
          <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-3 bg-surface text-on-surface rounded-xl border border-outline-variant focus:outline-none focus:border-primary font-body-md" required />
          {loginError && <p className="text-red-500 text-sm text-center">{loginError}</p>}
          <button type="submit" className="w-full py-3 bg-primary text-white rounded-full font-label-md hover:scale-[1.02] transition-transform">Log In</button>
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
    <>
      {selectedConsent && <ConsentModal record={selectedConsent} onClose={() => setSelectedConsent(null)} />}

      <div className="min-h-screen bg-surface flex flex-col">
        <header className="border-b border-outline-variant/30 bg-white px-8 py-4 flex justify-between items-center flex-shrink-0">
          <h1 className="text-plum-high-contrast font-headline-lg text-2xl">Mythri Admin</h1>
          <button onClick={handleLogout} className="px-4 py-2 text-on-surface-variant font-label-md border rounded-full hover:bg-surface transition-colors">
            Log Out
          </button>
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
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-4 pr-4 py-2 text-sm bg-white border border-outline-variant rounded-full focus:outline-none focus:border-primary font-body-sm text-on-surface w-52"
                />
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
                <div className="h-full flex flex-col">
                  <div className="flex-1 overflow-auto rounded-xl border border-outline-variant/30 bg-white shadow-sm">
                    <table className="w-full text-left border-collapse min-w-[700px]">
                      <thead className="sticky top-0 z-10 bg-surface-dim font-label-md text-on-surface-variant border-b border-outline-variant/30">
                        <tr>
                          <th className="p-4">User</th>
                          <th className="p-4">Email</th>
                          <th className="p-4 text-center">Sessions</th>
                          <th className="p-4 text-right">Joined Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredUsers.map(u => (
                          <tr key={u.id} onClick={() => handleUserClick(u.id)} className="border-b last:border-0 border-outline-variant/30 hover:bg-primary/5 cursor-pointer transition-colors group">
                            <td className="p-4 font-medium text-on-surface group-hover:text-primary transition-colors">{u.username}</td>
                            <td className="p-4 text-on-surface-variant">{u.email}</td>
                            <td className="p-4 text-center">{u.session_count}</td>
                            <td className="p-4 text-right text-on-surface-variant">{new Date(u.created_at).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Consents Tab */}
              {activeTab === 'consents' && (
                <div className="h-full flex flex-col">
                  <div className="flex-1 overflow-auto rounded-xl border border-outline-variant/30 bg-white shadow-sm">
                    <table className="w-full text-left border-collapse min-w-[700px]">
                      <thead className="sticky top-0 z-10 bg-surface-dim font-label-md text-on-surface-variant border-b border-outline-variant/30">
                        <tr><th className="p-4">Name</th><th className="p-4">Email</th><th className="p-4">Completed At</th></tr>
                      </thead>
                      <tbody>
                        {filteredConsents.map(c => (
                          <tr key={c.user_id} onClick={() => setSelectedConsent(c)} className="border-b hover:bg-primary/5 cursor-pointer transition-colors font-body-sm group">
                            <td className="p-4 font-medium text-on-surface group-hover:text-primary transition-colors">{c.username}</td>
                            <td className="p-4 text-on-surface-variant">{c.email}</td>
                            <td className="p-4 text-on-surface-variant">{new Date(c.completed_at).toLocaleString()}</td>
                          </tr>
                        ))}
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
    </>
  )
}
