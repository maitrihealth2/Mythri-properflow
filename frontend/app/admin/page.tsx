'use client'

import { useState, useEffect } from 'react'
import { adminLogin, getAdminConsents, getAdminFeedback } from '@/core/api'

// ── Types ────────────────────────────────────────────────────────────────────
interface ConsentRecord {
  user_id: number
  username: string
  email: string
  completed_at: string
  raw_responses: {
    consent?: {
      eligibility?: boolean
      collect_text?: boolean
      collect_usage?: boolean
      collect_feedback?: boolean
      model_training?: boolean
      data_retention?: boolean
    }
    preferred_name?: string
    language?: string
    conversation_style?: string
    communication_mode?: string
    initial_emotion?: string
    primary_goal?: string
    goals?: string[]
    reasons?: string[]
    [key: string]: any
  } | null
}

interface FeedbackRecord {
  user_id: number
  username: string
  email: string
  content: string
  created_at: string
}

// ── Consent Detail Modal ─────────────────────────────────────────────────────
function ConsentModal({ record, onClose }: { record: ConsentRecord; onClose: () => void }) {
  const c = record.raw_responses?.consent || {}
  const r = record.raw_responses || {}

  const consentItems = [
    {
      key: 'eligibility',
      label: 'Eligibility Confirmation',
      desc: 'User confirmed they are 18+ and voluntarily using Maitri.',
      value: c.eligibility,
    },
    {
      key: 'collect_text',
      label: 'Text & Conversation Collection',
      desc: 'User consented to their chat messages being stored to improve response quality.',
      value: c.collect_text,
    },
    {
      key: 'collect_usage',
      label: 'Usage Analytics Collection',
      desc: 'User consented to anonymous usage data being collected for product improvement.',
      value: c.collect_usage,
    },
    {
      key: 'collect_feedback',
      label: 'Feedback Collection',
      desc: 'User consented to their feedback being used to improve the platform.',
      value: c.collect_feedback,
    },
    {
      key: 'model_training',
      label: 'AI Model Training',
      desc: 'User consented to their anonymised conversations being used for AI model training.',
      value: c.model_training,
    },
    {
      key: 'data_retention',
      label: 'Data Retention Policy',
      desc: 'User acknowledged and agreed to the data retention policy.',
      value: c.data_retention,
    },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-outline-variant/30">
          <div>
            <h2 className="text-xl font-semibold text-on-surface">{record.username}</h2>
            <p className="text-sm text-on-surface-variant mt-0.5">{record.email}</p>
            <p className="text-xs text-on-surface-variant mt-1">
              Completed: {new Date(record.completed_at).toLocaleString()}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-surface-dim text-on-surface-variant transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 p-6 space-y-6">

          {/* Consent Checklist */}
          <section>
            <h3 className="text-sm font-semibold text-on-surface-variant uppercase tracking-wider mb-3">
              Consent Declarations
            </h3>
            <div className="space-y-3">
              {consentItems.map((item) => (
                <div
                  key={item.key}
                  className={`flex items-start gap-3 p-3 rounded-xl border ${
                    item.value
                      ? 'bg-green-50 border-green-200'
                      : item.value === false
                      ? 'bg-red-50 border-red-200'
                      : 'bg-surface border-outline-variant/30'
                  }`}
                >
                  <span className="text-lg mt-0.5">
                    {item.value === true ? '✅' : item.value === false ? '❌' : '—'}
                  </span>
                  <div>
                    <p className="font-medium text-sm text-on-surface">{item.label}</p>
                    <p className="text-xs text-on-surface-variant mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Onboarding Preferences */}
          <section>
            <h3 className="text-sm font-semibold text-on-surface-variant uppercase tracking-wider mb-3">
              Onboarding Preferences
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Preferred Name', value: r.preferred_name },
                { label: 'Language', value: r.language },
                { label: 'Conversation Style', value: r.conversation_style },
                { label: 'Communication Mode', value: r.communication_mode },
                { label: 'Initial Emotion', value: r.initial_emotion },
                { label: 'Primary Goal', value: r.primary_goal },
              ].map((field) =>
                field.value ? (
                  <div key={field.label} className="bg-surface rounded-xl p-3 border border-outline-variant/30">
                    <p className="text-xs text-on-surface-variant">{field.label}</p>
                    <p className="text-sm font-medium text-on-surface mt-0.5 capitalize">{field.value}</p>
                  </div>
                ) : null
              )}
            </div>

            {r.goals && r.goals.length > 0 && (
              <div className="mt-3 bg-surface rounded-xl p-3 border border-outline-variant/30">
                <p className="text-xs text-on-surface-variant mb-1.5">Goals</p>
                <div className="flex flex-wrap gap-2">
                  {r.goals.map((g: string, i: number) => (
                    <span key={i} className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                      {g}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {r.reasons && r.reasons.length > 0 && (
              <div className="mt-3 bg-surface rounded-xl p-3 border border-outline-variant/30">
                <p className="text-xs text-on-surface-variant mb-1.5">Reasons for Using Maitri</p>
                <div className="flex flex-wrap gap-2">
                  {r.reasons.map((rr: string, i: number) => (
                    <span key={i} className="text-xs bg-secondary/10 text-secondary-foreground px-2 py-1 rounded-full">
                      {rr}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Raw JSON (collapsible) */}
          <section>
            <details className="group">
              <summary className="cursor-pointer text-xs font-semibold text-on-surface-variant uppercase tracking-wider select-none flex items-center gap-1">
                <svg className="w-3 h-3 transition-transform group-open:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                Raw Response Data
              </summary>
              <pre className="mt-3 text-xs bg-surface-dim rounded-xl p-4 overflow-x-auto text-on-surface-variant border border-outline-variant/30 leading-relaxed">
                {JSON.stringify(record.raw_responses, null, 2)}
              </pre>
            </details>
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

  const [activeTab, setActiveTab] = useState<'consents' | 'feedback'>('consents')
  const [consents, setConsents] = useState<ConsentRecord[]>([])
  const [feedbacks, setFeedbacks] = useState<FeedbackRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedConsent, setSelectedConsent] = useState<ConsentRecord | null>(null)
  const [search, setSearch] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginError('')
    try {
      await adminLogin({ email, password })
      setIsAuthenticated(true)
      loadData()
    } catch {
      setLoginError('Invalid credentials')
    }
  }

  const loadData = async () => {
    setLoading(true)
    try {
      const consRes = await getAdminConsents()
      setConsents(consRes.consents)
      const feedRes = await getAdminFeedback()
      setFeedbacks(feedRes.feedbacks)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const downloadConsentsCSV = () => {
    if (!consents.length) return
    const headers = ['User ID', 'Username', 'Email', 'Completed At', 'Eligibility', 'Collect Text', 'Collect Usage', 'Collect Feedback', 'Model Training', 'Data Retention']
    const rows = consents.map((c) => {
      const cd = c.raw_responses?.consent || {}
      return [c.user_id, c.username, c.email, new Date(c.completed_at).toLocaleString(), cd.eligibility ? 'Yes' : 'No', cd.collect_text ? 'Yes' : 'No', cd.collect_usage ? 'Yes' : 'No', cd.collect_feedback ? 'Yes' : 'No', cd.model_training ? 'Yes' : 'No', cd.data_retention ? 'Yes' : 'No']
    })
    const csv = [headers.join(','), ...rows.map((r) => r.map((c) => `"${c}"`).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', 'maitri_consents.csv')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const filteredConsents = consents.filter(
    (c) =>
      c.username?.toLowerCase().includes(search.toLowerCase()) ||
      c.email?.toLowerCase().includes(search.toLowerCase())
  )

  const filteredFeedbacks = feedbacks.filter(
    (f) =>
      f.username?.toLowerCase().includes(search.toLowerCase()) ||
      f.email?.toLowerCase().includes(search.toLowerCase()) ||
      f.content?.toLowerCase().includes(search.toLowerCase())
  )

  // ── Login screen ─────────────────────────────────────────────────────────
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <form
          onSubmit={handleLogin}
          className="bg-white p-8 rounded-2xl shadow-sm border border-outline-variant/30 w-full max-w-sm flex flex-col space-y-4"
        >
          <h1 className="text-plum-high-contrast font-headline-md text-2xl text-center">Admin Access</h1>
          <input
            type="email"
            placeholder="Admin Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 bg-surface text-on-surface rounded-xl border border-outline-variant focus:outline-none focus:border-primary font-body-md"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 bg-surface text-on-surface rounded-xl border border-outline-variant focus:outline-none focus:border-primary font-body-md"
            required
          />
          {loginError && <p className="text-red-500 text-sm text-center">{loginError}</p>}
          <button type="submit" className="w-full py-3 bg-primary text-white rounded-full font-label-md hover:scale-[1.02] transition-transform">
            Log In
          </button>
        </form>
      </div>
    )
  }

  // ── Dashboard ─────────────────────────────────────────────────────────────
  return (
    <>
      {selectedConsent && (
        <ConsentModal record={selectedConsent} onClose={() => setSelectedConsent(null)} />
      )}

      <div className="min-h-screen bg-surface flex flex-col">
        {/* Top bar */}
        <header className="border-b border-outline-variant/30 bg-white px-8 py-4 flex justify-between items-center flex-shrink-0">
          <h1 className="text-plum-high-contrast font-headline-lg text-2xl">Maitri Admin Dashboard</h1>
          <button
            onClick={() => setIsAuthenticated(false)}
            className="px-4 py-2 text-on-surface-variant font-label-md border rounded-full hover:bg-surface transition-colors"
          >
            Log Out
          </button>
        </header>

        <div className="flex-1 flex flex-col max-w-6xl mx-auto w-full px-8 py-6 overflow-hidden">
          {/* Tab bar + search + CSV */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 flex-shrink-0">
            <div className="flex space-x-1 border-b border-outline-variant/30">
              {(['consents', 'feedback'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => { setActiveTab(tab); setSearch('') }}
                  className={`font-label-md px-5 py-2.5 capitalize transition-colors ${
                    activeTab === tab
                      ? 'text-primary border-b-2 border-primary -mb-px'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  {tab === 'consents' ? 'User Consents' : 'User Feedback'}
                  <span className="ml-2 text-xs bg-surface-dim text-on-surface-variant px-2 py-0.5 rounded-full">
                    {tab === 'consents' ? consents.length : feedbacks.length}
                  </span>
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search users…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 pr-4 py-2 text-sm bg-white border border-outline-variant rounded-full focus:outline-none focus:border-primary font-body-sm text-on-surface w-52"
                />
              </div>
              {activeTab === 'consents' && (
                <button
                  onClick={downloadConsentsCSV}
                  className="bg-primary text-white px-4 py-2 rounded-full font-label-sm hover:bg-primary/90 transition-colors flex items-center gap-1.5 whitespace-nowrap"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Export CSV
                </button>
              )}
            </div>
          </div>

          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="flex flex-col items-center gap-3 text-on-surface-variant">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <span className="font-body-sm">Loading data…</span>
              </div>
            </div>
          ) : (
            <div className="flex-1 min-h-0">

              {/* ── Consents Tab ─────────────────────────────────────────── */}
              {activeTab === 'consents' && (
                <div className="h-full flex flex-col">
                  {filteredConsents.length === 0 && (
                    <div className="flex-1 flex items-center justify-center text-on-surface-variant font-body-sm">
                      {search ? 'No matching records.' : 'No consent records found.'}
                    </div>
                  )}
                  {filteredConsents.length > 0 && (
                    <div className="flex-1 overflow-auto rounded-xl border border-outline-variant/30 bg-white shadow-sm">
                      <table className="w-full text-left border-collapse min-w-[700px]">
                        <thead className="sticky top-0 z-10">
                          <tr className="bg-surface-dim font-label-md text-on-surface-variant border-b border-outline-variant/30">
                            <th className="p-4">Name</th>
                            <th className="p-4">Email</th>
                            <th className="p-4">Completed At</th>
                            <th className="p-4 text-center">Eligible</th>
                            <th className="p-4 text-center">Text</th>
                            <th className="p-4 text-center">Training</th>
                            <th className="p-4 text-center">All Accepted</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredConsents.map((c) => {
                            const cd = c.raw_responses?.consent || {}
                            const allAccepted = cd.eligibility && cd.collect_text && cd.collect_usage && cd.collect_feedback && cd.model_training && cd.data_retention
                            return (
                              <tr
                                key={c.user_id}
                                onClick={() => setSelectedConsent(c)}
                                className="border-b last:border-0 hover:bg-primary/5 cursor-pointer transition-colors font-body-sm group"
                              >
                                <td className="p-4 font-medium text-on-surface group-hover:text-primary transition-colors">{c.username}</td>
                                <td className="p-4 text-on-surface-variant">{c.email}</td>
                                <td className="p-4 text-on-surface-variant">{new Date(c.completed_at).toLocaleString()}</td>
                                <td className="p-4 text-center">{cd.eligibility ? '✅' : '❌'}</td>
                                <td className="p-4 text-center">{cd.collect_text ? '✅' : '❌'}</td>
                                <td className="p-4 text-center">{cd.model_training ? '✅' : '❌'}</td>
                                <td className="p-4 text-center">
                                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${allAccepted ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                    {allAccepted ? 'Full' : 'Partial'}
                                  </span>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                  <p className="text-xs text-on-surface-variant mt-2 flex-shrink-0">
                    Click any row to view the full consent form ↗
                  </p>
                </div>
              )}

              {/* ── Feedback Tab ─────────────────────────────────────────── */}
              {activeTab === 'feedback' && (
                <div className="h-full flex flex-col">
                  {filteredFeedbacks.length === 0 && (
                    <div className="flex-1 flex items-center justify-center text-on-surface-variant font-body-sm">
                      {search ? 'No matching feedback.' : 'No feedback found.'}
                    </div>
                  )}
                  {filteredFeedbacks.length > 0 && (
                    <div className="flex-1 overflow-auto rounded-xl border border-outline-variant/30 bg-white shadow-sm">
                      <table className="w-full text-left border-collapse min-w-[600px]">
                        <thead className="sticky top-0 z-10">
                          <tr className="bg-surface-dim font-label-md text-on-surface-variant border-b border-outline-variant/30">
                            <th className="p-4 w-1/4">Name / Email</th>
                            <th className="p-4 w-1/5">Date</th>
                            <th className="p-4">Feedback</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredFeedbacks.map((f, i) => (
                            <tr key={i} className="border-b last:border-0 hover:bg-surface-dim/50 font-body-sm">
                              <td className="p-4">
                                <div className="font-medium text-on-surface">{f.username}</div>
                                <div className="text-xs text-on-surface-variant mt-0.5">{f.email}</div>
                              </td>
                              <td className="p-4 text-on-surface-variant">{new Date(f.created_at).toLocaleString()}</td>
                              <td className="p-4 whitespace-pre-wrap text-on-surface">{f.content}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
