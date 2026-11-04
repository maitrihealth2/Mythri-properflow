'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getHistory, getTranscript, logout } from '@/core/api'
import { useAuth } from '@/shared/components/contexts/AuthContext'
import SanctuaryNavRail from '@/shared/components/SanctuaryNavRail'
import ThemeToggle from '@/shared/components/ThemeToggle'
import { motion } from 'framer-motion'

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
  timestamp?: string
}

// ── Ambient Background Component ──────────────────────────────────────────────
const AmbientBackground = () => (
  <div className="fixed inset-0 overflow-hidden pointer-events-none z-0 bg-[#FFFDF9] dark:bg-[#0a080c]">
    <div
      className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-1000 bg-[url('/mythri_gradient_bg.jpg')] dark:bg-[url('/mythri_gradient_bg_dark_v2.jpg')]"
    />
    <div className="absolute inset-0 bg-white/40 dark:bg-black/15" />
    <div className="absolute inset-0 bg-gradient-to-br from-[#FFFDF9]/60 via-[#FDF5F2]/50 to-[#F5E6E1]/60 dark:from-[#141218]/25 dark:via-transparent dark:to-[#221A21]/25" />
    
    {/* Swirling Layer 1 - Muted Plum */}
    <motion.div
      className="absolute top-[-15%] left-[-10%] w-[70vw] h-[70vw] rounded-[40%_60%_70%_30%] blur-[120px] opacity-[0.14] dark:opacity-[0.08]"
      style={{ background: 'radial-gradient(circle, #7A4A5F 0%, transparent 70%)' }}
      animate={{ rotate: [0, 180, 360] }}
      transition={{ duration: 45, repeat: Infinity, ease: 'linear' }}
    />
    
    {/* Swirling Layer 2 - Dusty Mocha */}
    <motion.div
      className="absolute bottom-[-15%] right-[-10%] w-[70vw] h-[70vw] rounded-[60%_40%_30%_70%] blur-[130px] opacity-[0.12] dark:opacity-[0.07]"
      style={{ background: 'radial-gradient(circle, #9A7B88 0%, transparent 70%)' }}
      animate={{ rotate: [360, 180, 0] }}
      transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}
    />
  </div>
)

export default function HistoryPage() {
  const router = useRouter()
  const { token, loading: authLoading, clearAuth } = useAuth()
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  
  const [selectedSession, setSelectedSession] = useState<Session | null>(null)
  const [transcript, setTranscript] = useState<Message[]>([])
  const [transcriptLoading, setTranscriptLoading] = useState(false)
  
  const [modalOpen, setModalOpen] = useState(false)

  useEffect(() => {
    if (authLoading) return
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
  }, [router, authLoading, token])

  const handleSessionClick = async (session: Session) => {
    setSelectedSession(session)
    setTranscriptLoading(true)
    
    // Open modal on mobile
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
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
    <div className="relative min-h-[100dvh] w-full flex flex-col font-body-md text-[#2C2724] dark:text-[#FAF6EE] overflow-x-hidden">
      <AmbientBackground />

      {/* ── Background Dismiss Overlay for Menus (transparent, zero screen grab) ── */}
      {/* ── Left Sidebar Navigation Rail ── */}
      <SanctuaryNavRail variant="adaptive" />

      {/* ── Top-Left Floating Controls ── */}
      <div className="fixed top-3.5 sm:top-5 left-3 sm:left-6 z-40 flex items-center gap-1.5 sm:gap-2 pointer-events-auto">
        <Link
          href="/home"
          className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center bg-white/85 dark:bg-[#1E1B22]/85 backdrop-blur-md shadow-xs border border-[#E3D8CC]/80 dark:border-white/10 text-[#322119] dark:text-white/90 hover:scale-105 active:scale-95 transition-all"
          title="Return to Sanctuary"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
        </Link>
        <div className="h-8 sm:h-9 px-3 rounded-full bg-white/85 dark:bg-[#1E1B22]/85 backdrop-blur-md shadow-xs border border-[#E3D8CC]/80 dark:border-white/10 flex items-center gap-1.5 select-none">
          <span className="w-1.5 h-1.5 rounded-full bg-[#78B39B] animate-pulse" />
          <span className="font-serif text-[14px] sm:text-[15px] font-medium tracking-tight text-[#322119] dark:text-white/90">Reflections</span>
        </div>
      </div>

      {/* ── Top-Right Floating Controls ── */}
      <div className="fixed top-3.5 sm:top-5 right-3 sm:right-6 z-40 flex items-center gap-1.5 sm:gap-2 pointer-events-auto">
        <div className="h-8 sm:h-9 px-1.5 sm:px-2 rounded-full bg-white/85 dark:bg-[#1E1B22]/85 backdrop-blur-md shadow-xs border border-[#E3D8CC]/80 dark:border-white/10 flex items-center gap-1">
          <ThemeToggle />
          <button
            onClick={handleNewChat}
            className="h-7 px-2.5 rounded-full bg-[#322119] dark:bg-white text-[#FAF6F0] dark:text-[#322119] text-[11.5px] font-medium flex items-center gap-1 hover:scale-105 active:scale-95 transition-all shadow-xs"
            title="Begin New Reflection"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            <span className="hidden sm:inline">New Chat</span>
          </button>
        </div>
      </div>

      {/* ── Main Layout: Editorial Journal ── */}
      <main className="relative z-10 w-full max-w-[1300px] mx-auto px-4 md:px-8 pl-14 sm:pl-16 md:pl-24 pt-20 pb-8 flex flex-col md:flex-row gap-6 min-h-[calc(100dvh-5rem)]">
        
        {/* Left Side: Session River */}
        <section className="w-full md:w-[360px] lg:w-[400px] shrink-0 flex flex-col gap-4">
          <div className="flex items-center justify-between px-1 pt-2">
            <div>
              <h1 className="font-serif text-[22px] font-medium tracking-tight text-[#322119] dark:text-[#FAF6EE]">
                Past Reflections
              </h1>
              <p className="text-[12px] text-[#756A62] dark:text-[#A89D96]">
                Your archived conversations and insights
              </p>
            </div>
            <span className="text-[11px] font-semibold text-[#8B6250] bg-[#F1E6D7] dark:bg-white/10 px-2.5 py-1 rounded-full border border-[#E3D8CC]/60 dark:border-white/10">
              {sessions.length} {sessions.length === 1 ? 'entry' : 'entries'}
            </span>
          </div>
          
          <div className="flex-1 flex flex-col gap-2.5 overflow-y-auto pr-1 pb-8 hide-scrollbar max-h-[calc(100dvh-13rem)]">
            {loading ? (
              <div className="flex flex-col items-center justify-center p-12 text-[#8B6250]">
                <span className="material-symbols-outlined animate-spin text-3xl">progress_activity</span>
                <span className="text-xs mt-2 text-[#756A62]">Loading reflections...</span>
              </div>
            ) : sessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center rounded-3xl bg-white/70 dark:bg-[#1E1B22]/70 backdrop-blur-md border border-[#E3D8CC]/70 dark:border-white/10 h-64">
                <span className="material-symbols-outlined text-4xl text-[#8B6250] mb-2 opacity-60">history_edu</span>
                <p className="text-[14px] text-[#322119] dark:text-zinc-200 font-medium">No reflections recorded yet.</p>
                <p className="text-[12px] text-[#756A62] dark:text-zinc-400 mt-1 max-w-xs">Whenever you speak with Mythri, your thoughts are gently preserved here.</p>
                <button
                  onClick={handleNewChat}
                  className="mt-4 px-5 py-2 bg-[#322119] dark:bg-white text-[#FAF6F0] dark:text-[#322119] rounded-full text-[13px] font-medium hover:scale-105 active:scale-95 transition-all shadow-sm"
                >
                  Begin Reflection
                </button>
              </div>
            ) : (
              sessions.map(s => {
                const isActive = selectedSession?.session_id === s.session_id
                const isVoice = s.channel === 'voice'
                const dateObj = new Date(s.started_at)
                const dateStr = isNaN(dateObj.getTime())
                  ? 'Recent'
                  : dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                const timeStr = isNaN(dateObj.getTime())
                  ? ''
                  : dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

                return (
                  <button
                    key={s.session_id}
                    onClick={() => handleSessionClick(s)}
                    className={`text-left rounded-2xl p-4 flex items-center justify-between group transition-all duration-200 select-none ${
                      isActive
                        ? 'bg-white/95 dark:bg-[#251E26]/95 border-2 border-[#322119] dark:border-white/30 shadow-[0_8px_24px_rgba(45,30,20,0.1)] translate-x-1'
                        : 'bg-white/70 dark:bg-[#1E1B22]/70 backdrop-blur-md border border-[#E3D8CC]/80 dark:border-white/10 hover:bg-white/90 dark:hover:bg-[#1E1B22]/90 hover:border-[#8B6250]/40 shadow-xs'
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                          isActive
                            ? 'bg-[#322119] text-[#FAF6EE] dark:bg-white dark:text-[#322119]'
                            : 'bg-[#F1E6D7]/80 dark:bg-white/10 text-[#8B6250] dark:text-zinc-300 group-hover:bg-[#E8DFD5]'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[20px]">
                          {isVoice ? 'mic' : 'chat_bubble'}
                        </span>
                      </div>
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-[13.5px] font-medium truncate ${isActive ? 'text-[#322119] dark:text-white font-semibold' : 'text-[#322119] dark:text-zinc-200'}`}>
                            {dateStr}
                          </span>
                          {s.is_crisis_flagged && (
                            <span className="w-2 h-2 rounded-full bg-error shrink-0" title="Helpline guidance provided" />
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[11.5px] text-[#756A62] dark:text-[#A89D96]">
                          <span>{timeStr}</span>
                          <span>•</span>
                          <span>{isVoice ? 'Voice Sanctuary' : 'Text Reflection'}</span>
                        </div>
                      </div>
                    </div>
                    <span
                      className={`material-symbols-outlined text-[20px] transition-transform duration-200 ${
                        isActive
                          ? 'text-[#322119] dark:text-white translate-x-0.5'
                          : 'text-[#8B6250]/40 group-hover:text-[#8B6250] group-hover:translate-x-0.5'
                      }`}
                    >
                      chevron_right
                    </span>
                  </button>
                )
              })
            )}
          </div>
        </section>

        {/* Right Side: Editorial Transcript Viewer (Desktop) */}
        <section className="hidden md:flex flex-1 h-[calc(100dvh-7rem)] bg-white/90 dark:bg-[#1E1B22]/90 backdrop-blur-xl border border-[#E3D8CC]/90 dark:border-white/10 shadow-[0_16px_40px_-6px_rgba(45,30,20,0.08)] rounded-3xl flex-col relative overflow-hidden p-6 lg:p-8">
          {selectedSession ? (
            <div className="relative z-10 flex flex-col h-full w-full">
              {/* Transcript Header */}
              <div className="flex justify-between items-center pb-5 mb-6 border-b border-[#E3D8CC]/70 dark:border-white/10">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-serif text-[20px] font-medium tracking-tight text-[#322119] dark:text-[#FAF6EE]">
                      Session Transcript
                    </h2>
                    <span className="text-[11px] font-medium text-[#8B6250] bg-[#F1E6D7] dark:bg-white/10 px-2 py-0.5 rounded-full">
                      {selectedSession.channel === 'voice' ? 'Voice' : 'Text'}
                    </span>
                  </div>
                  <span className="text-[12px] text-[#756A62] dark:text-[#A89D96] block mt-0.5">
                    {new Date(selectedSession.started_at).toLocaleDateString(undefined, {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleResume(selectedSession.session_id)}
                    className="px-5 py-2 bg-[#322119] dark:bg-white text-[#FAF6F0] dark:text-[#322119] rounded-full text-[13px] font-medium flex items-center gap-1.5 hover:scale-105 active:scale-95 transition-all shadow-sm"
                  >
                    <span className="material-symbols-outlined text-[17px]">open_in_new</span>
                    <span>Resume Session</span>
                  </button>
                </div>
              </div>
              
              {/* Transcript Messages River (WhatsApp-style slim bubbles) */}
              <div className="flex-1 overflow-y-auto space-y-3.5 pr-3 hide-scrollbar pb-6">
                {transcriptLoading ? (
                  <div className="flex flex-col items-center justify-center p-12 text-[#8B6250] h-64">
                    <span className="material-symbols-outlined animate-spin text-3xl">progress_activity</span>
                    <span className="text-xs mt-2 text-[#756A62]">Retrieving sanctuary transcript...</span>
                  </div>
                ) : transcript.length === 0 ? (
                  <p className="text-[13px] text-[#756A62] text-center mt-12 italic">
                    No recorded messages in this reflection.
                  </p>
                ) : (
                  transcript.map((m, i) => (
                    <div
                      key={i}
                      className={`flex flex-col ${
                        m.role === 'user'
                          ? 'items-end self-end max-w-[80%]'
                          : 'items-start self-start max-w-[85%]'
                      }`}
                    >
                      {m.role === 'assistant' && (
                        <span className="text-[11px] font-medium text-[#756A62] dark:text-[#A89D96] mb-1 ml-2 select-none">
                          Mythri
                        </span>
                      )}
                      {m.role === 'user' ? (
                        <div className="rounded-2xl rounded-tr-xs bg-[#322119] dark:bg-[#251A14] text-[#FAF6F0] px-4 py-2.5 shadow-sm">
                          <p className="text-[14.5px] leading-relaxed whitespace-pre-wrap break-words">
                            {m.content}
                          </p>
                        </div>
                      ) : (
                        <div className="rounded-2xl rounded-tl-xs bg-[#FAF7F2] dark:bg-[#27212C] text-[#241C18] dark:text-[#EAE5DF] px-4.5 py-3 shadow-xs border border-[#E7DFD5]/90 dark:border-white/10">
                          <p className="text-[14.5px] leading-relaxed whitespace-pre-wrap break-words">
                            {m.content}
                          </p>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center p-8 space-y-4 h-full">
              <div className="w-20 h-20 rounded-full bg-[#F1E6D7] dark:bg-white/10 flex items-center justify-center text-[#8B6250] dark:text-zinc-200">
                <span className="material-symbols-outlined text-4xl">auto_stories</span>
              </div>
              <div className="max-w-sm">
                <h3 className="font-serif text-[20px] font-medium text-[#322119] dark:text-[#FAF6EE] mb-1">
                  Silence is a blank page
                </h3>
                <p className="text-[13px] text-[#756A62] dark:text-[#A89D96] leading-relaxed">
                  Your history is a sanctuary of past self-reflections. Select an entry from the river to review.
                </p>
              </div>
              <button
                onClick={handleNewChat}
                className="bg-[#322119] dark:bg-white text-[#FAF6F0] dark:text-[#322119] px-6 py-2.5 rounded-full text-[13px] font-medium flex items-center gap-1.5 hover:scale-105 active:scale-95 transition-all shadow-sm"
              >
                <span className="material-symbols-outlined text-[18px]">add</span> Begin New Reflection
              </button>
            </div>
          )}
        </section>
      </main>

      {/* ── Mobile Transcript Modal ── */}
      <div
        className={`md:hidden fixed inset-0 z-[60] flex items-center justify-center p-4 transition-opacity duration-300 ${
          modalOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          onClick={() => setModalOpen(false)}
        />
        <div
          className={`relative w-full max-w-sm max-h-[85vh] bg-[#FCFAF6]/98 dark:bg-[#1C1820]/98 backdrop-blur-xl border border-[#E3D8CC] dark:border-white/15 rounded-3xl p-6 shadow-2xl flex flex-col transition-transform duration-300 ${
            modalOpen ? 'scale-100' : 'scale-95'
          }`}
        >
          <div className="flex justify-between items-start pb-3 border-b border-[#E3D8CC]/60 dark:border-white/10 mb-3">
            <div>
              <h3 className="font-serif text-[18px] font-medium text-[#322119] dark:text-[#FAF6EE]">
                Reflection Details
              </h3>
              <p className="text-[11px] text-[#756A62] dark:text-[#A89D96]">
                {selectedSession ? new Date(selectedSession.started_at).toLocaleString() : ''}
              </p>
            </div>
            <button
              onClick={() => setModalOpen(false)}
              className="w-8 h-8 rounded-full flex items-center justify-center text-[#756A62] hover:text-[#322119] hover:bg-[#F1E6D7]/60"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2.5 py-2 hide-scrollbar">
            {transcriptLoading ? (
              <p className="text-xs text-[#756A62] text-center py-6">Loading transcript...</p>
            ) : transcript.length === 0 ? (
              <p className="text-xs text-[#756A62] text-center py-6">No messages recorded.</p>
            ) : (
              transcript.slice(0, 10).map((m, i) => (
                <div
                  key={i}
                  className={`p-3 rounded-xl text-xs leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-[#322119] text-[#FAF6F0] ml-4'
                      : 'bg-white dark:bg-[#251E26] text-[#2C2724] dark:text-[#E8E2DD] mr-4 border border-[#E3D8CC]/60 dark:border-white/10'
                  }`}
                >
                  <span className="font-semibold block mb-0.5 opacity-70">
                    {m.role === 'user' ? 'You' : 'Mythri'}
                  </span>
                  <p className="whitespace-pre-wrap">{m.content}</p>
                </div>
              ))
            )}
          </div>

          <div className="flex gap-2.5 pt-4 border-t border-[#E3D8CC]/60 dark:border-white/10 mt-2">
            <button
              onClick={() => setModalOpen(false)}
              className="flex-1 py-2.5 px-4 rounded-full border border-[#E3D8CC] dark:border-white/20 bg-white/60 dark:bg-white/10 text-[#49362D] dark:text-zinc-200 text-xs font-medium"
            >
              Close
            </button>
            <button
              onClick={() => selectedSession && handleResume(selectedSession.session_id)}
              className="flex-[1.5] py-2.5 px-4 rounded-full bg-[#322119] dark:bg-white text-white dark:text-[#322119] text-xs font-medium flex justify-center items-center gap-1.5 shadow-sm"
            >
              <span>Resume</span>
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
