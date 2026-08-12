'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getHistory, getTranscript } from '@/core/api'

interface Session {
  session_id: string
  started_at: string
  ended_at: string | null
  is_crisis_flagged: boolean
  channel: string
}

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export default function HistoryPage() {
  const router = useRouter()
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  
  const [selectedSession, setSelectedSession] = useState<Session | null>(null)
  const [transcript, setTranscript] = useState<Message[]>([])
  const [transcriptLoading, setTranscriptLoading] = useState(false)
  
  const [menuOpen, setMenuOpen] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('mb_token') : null
    if (!token) {
      router.replace('/login')
      return
    }

    const fetchHistory = async () => {
      try {
        const data = await getHistory()
        setSessions(data)
        if (data.length > 0) {
          handleSessionClick(data[0])
        }
      } catch (err) {
        console.error("Failed to fetch history", err)
      } finally {
        setLoading(false)
      }
    }

    fetchHistory()
  }, [router])

  const handleSessionClick = async (session: Session) => {
    setSelectedSession(session)
    setTranscriptLoading(true)
    
    // Open modal on mobile
    if (window.innerWidth < 768) {
      setModalOpen(true)
    }

    try {
      const data = await getTranscript(session.session_id)
      setTranscript(data.messages || [])
    } catch (err) {
      console.error(err)
      setTranscript([])
    } finally {
      setTranscriptLoading(false)
    }
  }

  const handleResume = (sessionId: string) => {
    sessionStorage.setItem('mb_session_id', sessionId)
    router.push('/text-chat')
  }

  const handleNewChat = () => {
    sessionStorage.removeItem('mb_session_id')
    router.push('/text-chat')
  }

  return (
    <>
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="bg-grain"></div>
        <div className="fixed top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-tertiary-fixed/30 mix-blend-multiply filter blur-[120px]"></div>
        <div className="fixed bottom-[-10%] right-[-10%] w-[60vw] h-[60vw] rounded-full bg-secondary-fixed/40 mix-blend-multiply filter blur-[120px]"></div>
      </div>

      {/* Header */}
      <header className="fixed top-0 z-40 flex justify-between items-center w-full px-margin-mobile md:px-margin-desktop py-4 pointer-events-none animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
        <div className="flex items-center gap-4 pointer-events-auto">
          <Link href="/home" className="material-symbols-outlined text-primary bg-white/60 backdrop-blur-md border border-white/50 p-2 rounded-full transition-all hover:bg-white/80 active:scale-95 shadow-sm">home</Link>
          <span className="text-headline-md font-headline-md font-medium text-primary">Mythri</span>
        </div>
        <div className="flex items-center gap-4 relative pointer-events-auto">
          <button onClick={() => setMenuOpen(!menuOpen)} className="hidden md:block material-symbols-outlined text-primary hover:bg-surface-container-high p-2 rounded-full transition-all active:scale-95">grid_view</button>
          
          <nav className={`hidden md:flex absolute right-0 top-[100%] mt-2 w-56 bg-white/70 backdrop-blur-3xl border border-white/50 shadow-2xl rounded-2xl flex-col p-2 gap-1 origin-top transition-all duration-300 ${menuOpen ? 'scale-y-100 opacity-100 pointer-events-auto' : 'scale-y-0 opacity-0 pointer-events-none'}`}>
            <Link href="/home" className="text-on-surface-variant hover:bg-white/60 transition-colors px-4 py-2.5 rounded-xl flex items-center gap-3 font-label-md">
              <span className="material-symbols-outlined text-[20px]">home</span> Sanctuary
            </Link>
            <Link href="/text-chat" className="text-on-surface-variant hover:bg-white/60 transition-colors px-4 py-2.5 rounded-xl flex items-center gap-3 font-label-md">
              <span className="material-symbols-outlined text-[20px]">health_and_safety</span> Consultation
            </Link>
            <Link href="/history" className="text-primary font-bold bg-white/80 px-4 py-2.5 rounded-xl flex items-center gap-3 font-label-md">
              <span className="material-symbols-outlined text-[20px]">history</span> Your Sessions
            </Link>
            <Link href="/profile" className="text-on-surface-variant hover:bg-white/60 transition-colors px-4 py-2.5 rounded-xl flex items-center gap-3 font-label-md">
              <span className="material-symbols-outlined text-[20px]">person</span> Profile
            </Link>
            <Link href="/feedback" className="text-on-surface-variant hover:bg-white/60 transition-colors px-4 py-2.5 rounded-xl flex items-center gap-3 font-label-md">
              <span className="material-symbols-outlined text-[20px]">feedback</span> Feedback
            </Link>
            <div className="h-px bg-outline-variant/30 my-1 mx-2"></div>
            <button onClick={() => { localStorage.clear(); router.replace('/login'); }} className="text-error hover:bg-error/10 transition-colors px-4 py-2.5 rounded-xl flex items-center gap-3 font-label-md text-left w-full">
              <span className="material-symbols-outlined text-[20px]">logout</span> Logout
            </button>
          </nav>
        </div>
      </header>

      {/* Main Layout */}
      <main className="h-[100dvh] w-full max-w-screen-xl mx-auto px-margin-mobile md:px-margin-desktop pb-24 md:pb-8 flex flex-col md:flex-row gap-stack-md pt-24 overflow-hidden animate-fade-in-up z-10 relative" style={{ animationDelay: '0.2s' }}>
        
        {/* Left Side: Session List */}
        <section className="w-full md:w-1/3 h-full flex flex-col gap-6 overflow-hidden">
          <div className="flex justify-between items-baseline mb-2">
            <h1 className="text-headline-lg font-headline-lg text-primary">Past Reflections</h1>
            <span className="text-label-md font-label-md text-on-surface-variant opacity-60">{sessions.length} entries</span>
          </div>
          
          <div className="flex-1 flex flex-col gap-3 overflow-y-auto pr-2 pb-8 hide-scrollbar">
            {loading ? (
               <div className="flex justify-center p-8"><span className="material-symbols-outlined animate-spin text-primary text-3xl">progress_activity</span></div>
            ) : sessions.length === 0 ? (
               <div className="flex flex-col items-center justify-center p-8 text-center h-full">
                  <span className="material-symbols-outlined text-4xl text-outline mb-2">history</span>
                  <p className="text-on-surface-variant">No reflections found.</p>
                  <button onClick={handleNewChat} className="mt-4 px-6 py-2 bg-primary text-white rounded-full font-label-md">Begin Reflection</button>
               </div>
            ) : (
              sessions.map(s => {
                const isActive = selectedSession?.session_id === s.session_id
                return (
                  <button key={s.session_id} onClick={() => handleSessionClick(s)} className={`session-card text-left backdrop-blur-md p-4 rounded-xl flex items-center justify-between group transition-all ${isActive ? 'bg-white/50 border border-primary shadow-lg' : 'bg-white/30 border border-white/50 hover:bg-white/50 hover:shadow-md'}`}>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-label-md font-label-md ${isActive ? 'text-primary' : 'text-on-surface-variant'}`}>
                          {new Date(s.started_at).toLocaleDateString(undefined, {month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'})}
                        </span>
                        {s.is_crisis_flagged && <span className="w-2 h-2 rounded-full bg-error" title="Flagged"></span>}
                      </div>
                      <p className="text-body-sm font-body-sm text-on-surface-variant line-clamp-1">{s.channel === 'voice' ? 'Voice Session' : 'Text Consultation'}</p>
                    </div>
                    <span className={`material-symbols-outlined transition-opacity ${isActive ? 'text-primary opacity-100' : 'text-on-surface-variant opacity-0 group-hover:opacity-100'}`}>chevron_right</span>
                  </button>
                )
              })
            )}
          </div>
        </section>

        {/* Right Side: Transcript Viewer (Desktop) */}
        <section className="hidden md:flex w-2/3 h-full bg-white/50 backdrop-blur-2xl border border-white/50 shadow-2xl rounded-2xl flex-col relative overflow-hidden p-8">
          {selectedSession ? (
            <div className="relative z-10 flex flex-col h-full w-full">
              <header className="flex justify-between items-center mb-8 border-b border-outline-variant pb-6">
                <div>
                  <h2 className="text-headline-md font-headline-md text-primary">Session Transcript</h2>
                  <span className="text-label-md font-label-md text-on-surface-variant">{new Date(selectedSession.started_at).toLocaleDateString(undefined, {weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'})}</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleResume(selectedSession.session_id)} className="px-4 py-2 bg-primary text-white rounded-full text-label-md flex items-center gap-2 hover:opacity-90 transition-all shadow-md active:scale-95">
                    <span className="material-symbols-outlined text-[18px]">open_in_new</span> Resume
                  </button>
                  <button className="p-2 rounded-full hover:bg-error/10 transition-colors text-error"><span className="material-symbols-outlined">delete</span></button>
                </div>
              </header>
              
              <div className="flex-1 overflow-y-auto space-y-8 pr-4 hide-scrollbar pb-8">
                {transcriptLoading ? (
                  <div className="flex justify-center p-8"><span className="material-symbols-outlined animate-spin text-primary text-3xl">progress_activity</span></div>
                ) : transcript.length === 0 ? (
                  <p className="text-on-surface-variant text-center mt-10">No messages found.</p>
                ) : (
                  transcript.map((m, i) => (
                    <article key={i} className={`flex flex-col gap-2 items-start ${m.role === 'assistant' ? 'border-l-2 border-secondary-fixed-dim pl-6 py-2' : ''}`}>
                      <span className={`font-label-md text-label-md uppercase tracking-widest ${m.role === 'user' ? 'text-primary opacity-60' : 'text-secondary'}`}>{m.role === 'user' ? 'You' : 'Mythri'}</span>
                      <p className={`text-body-lg font-body-lg max-w-2xl whitespace-pre-wrap ${m.role === 'assistant' ? 'text-on-surface-variant italic' : 'text-on-surface'}`}>{m.content}</p>
                    </article>
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center p-8 space-y-6 h-full">
              <div className="w-24 h-24 rounded-full bg-secondary-container flex items-center justify-center">
                  <span className="material-symbols-outlined text-on-secondary-container text-4xl">auto_stories</span>
              </div>
              <div className="max-w-xs">
                  <h3 className="text-headline-md font-headline-md text-primary mb-2">Silence is a blank page</h3>
                  <p className="text-body-md font-body-md text-on-surface-variant">Your history is a garden of past self-reflections. Select an entry to view.</p>
              </div>
              <button onClick={handleNewChat} className="bg-primary text-on-primary px-8 py-3 rounded-full font-label-md flex items-center gap-2 hover:opacity-90 transition-all">
                  <span className="material-symbols-outlined">add</span> Begin New Reflection
              </button>
            </div>
          )}
        </section>
      </main>

      {/* Mobile Modal */}
      <div className={`md:hidden fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-300 ${modalOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setModalOpen(false)}></div>
        <div className={`relative w-[90%] max-w-sm bg-white/80 backdrop-blur-xl border border-white/50 rounded-3xl p-6 shadow-2xl transition-transform duration-300 ${modalOpen ? 'scale-100' : 'scale-95'}`}>
          <div className="flex justify-between items-start mb-4">
              <h3 className="text-headline-md font-headline-md text-primary">Reflection</h3>
              <button onClick={() => setModalOpen(false)} className="material-symbols-outlined text-on-surface-variant hover:text-primary">close</button>
          </div>
          <div className="space-y-3 mb-6">
              <p className="text-body-sm text-on-surface-variant leading-relaxed line-clamp-3">
                  {transcriptLoading ? 'Loading session details...' : (transcript[0]?.content || 'Empty session')}
              </p>
              <div className="p-3 bg-secondary-fixed-dim/20 rounded-xl border border-secondary-fixed-dim/30">
                  <span className="block text-[10px] font-label-md text-primary uppercase tracking-wider mb-1">Details</span>
                  <p className="text-body-sm text-primary">Date: {selectedSession ? new Date(selectedSession.started_at).toLocaleString() : ''}</p>
              </div>
          </div>
          <div className="flex gap-3">
              <button onClick={() => setModalOpen(false)} className="flex-1 py-3 px-4 rounded-2xl border border-outline-variant/50 bg-white/50 text-on-surface-variant font-label-md hover:bg-white/80 transition-colors">
                  Close
              </button>
              <button onClick={() => selectedSession && handleResume(selectedSession.session_id)} className="flex-[2] py-3 px-4 rounded-2xl bg-primary text-white font-label-md flex justify-center items-center gap-2 hover:opacity-90 shadow-md">
                  Resume
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </button>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 w-full z-40 flex justify-around items-center bg-white/70 backdrop-blur-xl py-3 pb-safe shadow-[0_-4px_24px_rgba(0,0,0,0.05)] border-t border-white/40">
        <Link href="/home" className="flex flex-col items-center justify-center text-on-surface-variant/60 w-16 transition-all duration-300 active:scale-90 active:opacity-70 hover:text-primary transition-colors">
          <span className="material-symbols-outlined text-[24px]">home</span>
          <span className="text-[10px] font-label-md mt-1">Home</span>
        </Link>
        <Link href="/history" className="flex flex-col items-center justify-center text-primary w-16 transition-all duration-300 active:scale-90">
          <div className="bg-primary text-white p-2.5 rounded-full shadow-lg transform -translate-y-3 flex items-center justify-center transition-transform duration-300 hover:scale-105 active:scale-95">
            <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>history</span>
          </div>
          <span className="text-[10px] font-label-md font-bold -mt-2">History</span>
        </Link>
        <Link href="/text-chat" className="flex flex-col items-center justify-center text-on-surface-variant/60 w-16 transition-all duration-300 active:scale-90 active:opacity-70 hover:text-primary transition-colors">
          <span className="material-symbols-outlined text-[24px]">health_and_safety</span>
          <span className="text-[10px] font-label-md mt-1">Chat</span>
        </Link>
        <Link href="/profile" className="flex flex-col items-center justify-center text-on-surface-variant/60 w-16 transition-all duration-300 active:scale-90 active:opacity-70 hover:text-primary transition-colors">
          <span className="material-symbols-outlined text-[24px]">person</span>
          <span className="text-[10px] font-label-md mt-1">Profile</span>
        </Link>
      </nav>
    </>
  )
}
