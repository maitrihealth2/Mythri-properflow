'use client'

import { useState, useEffect } from 'react'
import { adminLogin, getAdminConsents, getAdminFeedback } from '@/core/api'

export default function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')

  const [activeTab, setActiveTab] = useState<'consents' | 'feedback'>('consents')
  const [consents, setConsents] = useState<any[]>([])
  const [feedbacks, setFeedbacks] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginError('')
    try {
      await adminLogin({ email, password })
      setIsAuthenticated(true)
      loadData()
    } catch (err) {
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

    const headers = [
      'User ID', 'Username', 'Email', 'Completed At', 
      'Eligibility', 'Collect Text', 'Collect Usage', 
      'Collect Feedback', 'Model Training', 'Data Retention'
    ]

    const rows = consents.map(c => {
      const consentData = c.raw_responses?.consent || {}
      return [
        c.user_id,
        c.username,
        c.email,
        new Date(c.completed_at).toLocaleString(),
        consentData.eligibility ? 'Yes' : 'No',
        consentData.collect_text ? 'Yes' : 'No',
        consentData.collect_usage ? 'Yes' : 'No',
        consentData.collect_feedback ? 'Yes' : 'No',
        consentData.model_training ? 'Yes' : 'No',
        consentData.data_retention ? 'Yes' : 'No'
      ]
    })

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', 'maitri_consents.csv')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <form onSubmit={handleLogin} className="bg-white p-8 rounded-2xl shadow-sm border border-outline-variant/30 w-full max-w-sm flex flex-col space-y-4">
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

  return (
    <div className="min-h-screen bg-surface p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-plum-high-contrast font-headline-lg text-3xl">Maitri Admin Dashboard</h1>
          <button onClick={() => setIsAuthenticated(false)} className="px-4 py-2 text-on-surface-variant font-label-md border rounded-full hover:bg-white">
            Log Out
          </button>
        </div>

        <div className="flex space-x-4 mb-6 border-b border-outline-variant/30 pb-2">
          <button
            onClick={() => setActiveTab('consents')}
            className={`font-label-md px-4 py-2 ${activeTab === 'consents' ? 'text-primary border-b-2 border-primary' : 'text-on-surface-variant'}`}
          >
            User Consents
          </button>
          <button
            onClick={() => setActiveTab('feedback')}
            className={`font-label-md px-4 py-2 ${activeTab === 'feedback' ? 'text-primary border-b-2 border-primary' : 'text-on-surface-variant'}`}
          >
            User Feedback
          </button>
        </div>

        {loading ? (
          <p className="text-on-surface-variant">Loading data...</p>
        ) : (
          <div>
            {activeTab === 'consents' && (
              <div className="space-y-4 animate-fade-in-up">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-headline-sm text-on-surface">Onboarding Consent Records</h2>
                  <button onClick={downloadConsentsCSV} className="bg-primary text-white px-4 py-2 rounded-full font-label-sm">
                    Download CSV
                  </button>
                </div>
                <div className="overflow-x-auto bg-white rounded-xl shadow-sm border border-outline-variant/30">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b bg-surface-dim font-label-md text-on-surface-variant">
                        <th className="p-4">Name</th>
                        <th className="p-4">Email</th>
                        <th className="p-4">Completed At</th>
                        <th className="p-4">Eligibility</th>
                        <th className="p-4">Collect Text</th>
                        <th className="p-4">Training</th>
                      </tr>
                    </thead>
                    <tbody>
                      {consents.map((c) => (
                        <tr key={c.user_id} className="border-b last:border-0 hover:bg-surface-dim/50 font-body-sm">
                          <td className="p-4">{c.username}</td>
                          <td className="p-4">{c.email}</td>
                          <td className="p-4">{new Date(c.completed_at).toLocaleString()}</td>
                          <td className="p-4">{c.raw_responses?.consent?.eligibility ? '✅' : '❌'}</td>
                          <td className="p-4">{c.raw_responses?.consent?.collect_text ? '✅' : '❌'}</td>
                          <td className="p-4">{c.raw_responses?.consent?.model_training ? '✅' : '❌'}</td>
                        </tr>
                      ))}
                      {consents.length === 0 && (
                        <tr>
                          <td colSpan={6} className="p-4 text-center text-on-surface-variant">No consent records found.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'feedback' && (
              <div className="space-y-4 animate-fade-in-up">
                <h2 className="text-xl font-headline-sm text-on-surface">User Feedback</h2>
                <div className="overflow-x-auto bg-white rounded-xl shadow-sm border border-outline-variant/30">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b bg-surface-dim font-label-md text-on-surface-variant">
                        <th className="p-4 w-1/4">Name / Email</th>
                        <th className="p-4 w-1/4">Date</th>
                        <th className="p-4 w-1/2">Feedback / Issue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {feedbacks.map((f, i) => (
                        <tr key={i} className="border-b last:border-0 hover:bg-surface-dim/50 font-body-sm">
                          <td className="p-4">
                            <div className="font-bold">{f.username}</div>
                            <div className="text-xs text-on-surface-variant">{f.email}</div>
                          </td>
                          <td className="p-4">{new Date(f.created_at).toLocaleString()}</td>
                          <td className="p-4 whitespace-pre-wrap">{f.content}</td>
                        </tr>
                      ))}
                      {feedbacks.length === 0 && (
                        <tr>
                          <td colSpan={3} className="p-4 text-center text-on-surface-variant">No feedback found.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
