'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { startSession, sendMessage, getTranscript } from '@/core/api'
import ExerciseOverlay from '@/shared/components/ExerciseOverlay'

interface Message {
  role: 'user' | 'assistant'
  content: string
  is_crisis?: boolean
  helplines?: string[]
  emotion?: string
  emotion_emoji?: string
  rag_used?: boolean
  via?: 'text' | 'voice'
  is_new?: boolean
  exercise_trigger?: string
}

function TypewriterText({ text, animate, onComplete }: { text: string; animate: boolean, onComplete?: () => void }) {
  const [displayed, setDisplayed] = useState(animate ? '' : text)
  const completedRef = useRef(false)
  const textRef = useRef(text)
  const onCompleteRef = useRef(onComplete)

  useEffect(() => {
    onCompleteRef.current = onComplete
  }, [onComplete])
  
  if (text !== textRef.current) {
    textRef.current = text
    completedRef.current = false
    setDisplayed(animate ? '' : text)
  }

  useEffect(() => {
    if (!animate) {
      setDisplayed(text)
      if (onCompleteRef.current && !completedRef.current) {
        completedRef.current = true
        onCompleteRef.current()
      }
      return
    }
    
    if (completedRef.current) return;
    
    let currentText = ''
    const words = text.split(/(\s+)/)
    let i = 0
    
    const interval = setInterval(() => {
      if (i < words.length) {
        currentText += words[i]
        setDisplayed(currentText)
        i++
      } else {
        clearInterval(interval)
        if (!completedRef.current) {
          completedRef.current = true
          if (onCompleteRef.current) onCompleteRef.current()
        }
      }
    }, 50)
    
    return () => clearInterval(interval)
  }, [text, animate])

  return <>{displayed}</>
}

const INPUT_PLACEHOLDERS: Record<string, string> = {
  'en-IN': "Describe your feelings...",
  'hi-IN': "अपनी भावनाओं का वर्णन करें...",
  'te-IN': "మీ భావాలను వివరించండి...",
  'ta-IN': "உங்கள் உணர்வுகளை விவரிக்கவும்..."
}

export default function ConsultationPage() {
  const router = useRouter()
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [language, setLanguage] = useState('en-IN')
  const [starting, setStarting] = useState(true)
  
  const [menuOpen, setMenuOpen] = useState(false)
  const [langMenuOpen, setLangMenuOpen] = useState(false)
  const [exerciseMode, setExerciseMode] = useState<string | null>(null)

  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const initialized = useRef(false)

  const inputPlaceholder = INPUT_PLACEHOLDERS[language] || INPUT_PLACEHOLDERS['en-IN']

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('mb_token') : null
    if (!token) { router.replace('/login'); return }

    const savedLanguage = typeof window !== 'undefined' ? localStorage.getItem('mb_language') : null
    if (savedLanguage) setLanguage(savedLanguage)
    
    const savedDraft = typeof window !== 'undefined' ? localStorage.getItem('mb_chat_draft') : null
    if (savedDraft) setInput(savedDraft)

    const handleLangEvent = () => {
      const newLang = localStorage.getItem('mb_language')
      if (newLang) setLanguage(newLang)
    }
    window.addEventListener('mb_language_changed', handleLangEvent)

    if (!initialized.current) {
      initialized.current = true
      initSession()
    }
    
    return () => window.removeEventListener('mb_language_changed', handleLangEvent)
  }, [router])

  useEffect(() => {
    if (messages.length > 0) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, loading])

  // Lock body scroll for the chat interface
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    document.body.style.height = '100dvh'
    return () => {
      document.body.style.overflow = ''
      document.body.style.height = ''
    }
  }, [])

  const initSession = async () => {
    try {
      const existingSessionId = sessionStorage.getItem('mb_session_id')
      if (existingSessionId) {
        try {
          const data = await getTranscript(existingSessionId)
          setSessionId(existingSessionId)
          if (data.messages && data.messages.length > 0) {
            setMessages(data.messages)
            setStarting(false)
            return
          }
        } catch (e) {
          // Invalid session, fallback to new
        }
      }

      const data = await startSession()
      setSessionId(data.session_id)
      sessionStorage.setItem('mb_session_id', data.session_id)
      
      // Removed hardcoded WELCOME_MSGS fallback to rely purely on dynamic backend opening.
      const welcome = data.message;
      if (welcome && welcome !== "Session started.") {
        setMessages([{ role: 'assistant', content: welcome, is_new: true }])
      }
    } catch {
      // router.replace('/')
    } finally {
      setStarting(false)
    }
  }

  const handleTextSend = async (text?: string) => {
    const msg = (text || input).trim()
    if (!msg || !sessionId || loading) return
    setInput(''); setLoading(true)
    setMessages(prev => [...prev, { role: 'user', content: msg, via: 'text', is_new: true }])
    
    if (textareaRef.current) textareaRef.current.style.height = 'auto'

    try {
      const data = await sendMessage(sessionId, msg, language)
      
      // Clear draft on success
      localStorage.removeItem('mb_chat_draft')

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.response,
        is_crisis: data.is_crisis,
        helplines: data.helplines,
        emotion: data.emotion,
        emotion_emoji: data.emotion_emoji,
        rag_used: data.rag_used,
        is_new: true,
        exercise_trigger: data.exercise_state !== 'idle' ? data.exercise_type : undefined,
      }])

      // Exercise overlay — show when exercise is suggested or in progress
      if (data.exercise_state === 'suggested' || data.exercise_state === 'in_progress') {
        setExerciseMode(data.exercise_type || null)
      } else if (data.exercise_state === 'completed' || data.exercise_state === 'idle') {
        setExerciseMode(null)
      }
    } catch (err) {
      console.error("Chat send error:", err)
      // Remove optimistic user message and restore input text
      setMessages(prev => prev.slice(0, -1))
      setInput(msg)
      setMessages(prev => [...prev, { role: 'assistant', content: 'Connection issue. Please try again.', is_new: true }])
    } finally { setLoading(false) }
  }

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    localStorage.setItem('mb_chat_draft', e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = `${e.target.scrollHeight}px`
  }

  const changeLanguage = (lang: string) => {
    setLanguage(lang)
    localStorage.setItem('mb_language', lang)
    setLangMenuOpen(false)
  }

  const handleNewChat = () => {
    sessionStorage.removeItem('mb_session_id')
    setSessionId(null)
    setMessages([])
    setStarting(true)
    initialized.current = false
    initSession()
  }

  useEffect(() => {
    const handleShortcutNewChat = () => handleNewChat()
    window.addEventListener('shortcut:new-chat', handleShortcutNewChat)
    return () => {
      window.removeEventListener('shortcut:new-chat', handleShortcutNewChat)
    }
  }, [handleNewChat])

  if (starting) return (
    <div className="bg-background text-on-background min-h-screen flex items-center justify-center pt-24">
       <div className="flex flex-col items-center gap-4 opacity-70">
           <span className="material-symbols-outlined text-4xl text-primary/80 animate-pulse" style={{ animationDuration: '2s' }}>spa</span>
           <span className="text-primary font-label-md tracking-widest uppercase text-xs animate-pulse" style={{ animationDuration: '2s' }}>Preparing Space</span>
       </div>
    </div>
  )

  return (
    <div className="relative flex flex-col min-h-[100dvh] w-full">
      <div 
        className="fixed inset-0 w-full h-[100dvh] bg-cover bg-center bg-no-repeat z-0"
        style={{ backgroundImage: "url('/assets/mythri-chat-scenery.png')" }}
      ></div>
      <div className="fixed inset-0 w-full h-[100dvh] bg-white/10 md:bg-white/5 pointer-events-none z-0"></div>
      <ExerciseOverlay exerciseMode={exerciseMode} onClose={() => setExerciseMode(null)} />

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes msgEnter {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-msg-enter {
          animation: msgEnter 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes breathe {
          0%, 100% { opacity: 0.4; transform: scale(0.9); }
          50% { opacity: 1; transform: scale(1.1); }
        }
        .animate-breathe {
          animation: breathe 2.5s ease-in-out infinite;
        }
      `}} suppressHydrationWarning />

      {/* Desktop Header */}
      <header className="hidden md:flex fixed top-0 z-40 justify-between items-center w-full px-margin-desktop py-4 pointer-events-none animate-fade-in-up bg-transparent" style={{ animationDelay: '0.1s' }}>
        <div className="flex items-center gap-4 pointer-events-auto">
          <Link href="/home" className="material-symbols-outlined text-primary bg-white/60 backdrop-blur-md border border-white/50 p-2 rounded-full transition-all duration-150 hover:bg-white/80 active:scale-[0.98] hover:scale-[1.02] shadow-sm">home</Link>
          <span className="text-headline-md font-headline-md font-medium text-primary drop-shadow-md">Mythri</span>
        </div>
        <div className="flex items-center gap-4 relative pointer-events-auto">
          <button onClick={handleNewChat} title="New Chat" className="material-symbols-outlined text-primary bg-white/60 backdrop-blur-md border border-white/50 shadow-sm hover:bg-white/80 p-2 rounded-full transition-all duration-150 active:scale-[0.98] hover:scale-[1.02]">add</button>
          <button onClick={() => {setLangMenuOpen(!langMenuOpen); setMenuOpen(false);}} className="material-symbols-outlined text-primary bg-white/60 backdrop-blur-md border border-white/50 shadow-sm hover:bg-white/80 p-2 rounded-full transition-all duration-150 active:scale-[0.98] hover:scale-[1.02]">language</button>
          <button onClick={() => {setMenuOpen(!menuOpen); setLangMenuOpen(false);}} className="material-symbols-outlined text-primary bg-white/60 backdrop-blur-md border border-white/50 shadow-sm hover:bg-white/80 p-2 rounded-full transition-all duration-150 active:scale-[0.98] hover:scale-[1.02]">grid_view</button>
          
          {/* Dropdown Menu */}
          <nav className={`absolute right-0 top-[100%] mt-2 w-56 bg-white/70 backdrop-blur-3xl border border-white/50 shadow-2xl rounded-2xl flex flex-col p-2 gap-1 origin-top transition-all duration-300 ${menuOpen ? 'scale-y-100 opacity-100 pointer-events-auto' : 'scale-y-0 opacity-0 pointer-events-none'}`}>
            <Link href="/home" className="text-on-surface-variant hover:bg-white/60 transition-colors px-4 py-2.5 rounded-xl flex items-center gap-3 font-label-md">
              <span className="material-symbols-outlined text-[20px]">home</span> Sanctuary
            </Link>
            <Link href="/text-chat" className="text-primary font-bold bg-white/80 px-4 py-2.5 rounded-xl flex items-center gap-3 font-label-md">
              <span className="material-symbols-outlined text-[20px]">health_and_safety</span> Consultation
            </Link>
            <Link href="/history" className="text-on-surface-variant hover:bg-white/60 transition-colors px-4 py-2.5 rounded-xl flex items-center gap-3 font-label-md">
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
          
          {/* Language Menu */}
          <div className={`absolute right-12 top-[100%] mt-2 w-40 bg-white/70 backdrop-blur-3xl border border-white/50 shadow-2xl rounded-2xl flex flex-col p-2 gap-1 origin-top-right transition-all duration-300 ${langMenuOpen ? 'scale-100 opacity-100 pointer-events-auto' : 'scale-95 opacity-0 pointer-events-none'}`}>
            <button onClick={() => changeLanguage('en-IN')} className={`px-4 py-2 rounded-xl text-left font-label-md transition-colors ${language === 'en-IN' ? 'text-primary font-bold bg-white/80' : 'text-on-surface-variant hover:bg-white/60'}`}>English</button>
            <button onClick={() => changeLanguage('hi-IN')} className={`px-4 py-2 rounded-xl text-left font-label-md transition-colors ${language === 'hi-IN' ? 'text-primary font-bold bg-white/80' : 'text-on-surface-variant hover:bg-white/60'}`}>Hindi</button>
            <button onClick={() => changeLanguage('te-IN')} className={`px-4 py-2 rounded-xl text-left font-label-md transition-colors ${language === 'te-IN' ? 'text-primary font-bold bg-white/80' : 'text-on-surface-variant hover:bg-white/60'}`}>Telugu</button>
            <button onClick={() => changeLanguage('ta-IN')} className={`px-4 py-2 rounded-xl text-left font-label-md transition-colors ${language === 'ta-IN' ? 'text-primary font-bold bg-white/80' : 'text-on-surface-variant hover:bg-white/60'}`}>Tamil</button>
          </div>
        </div>
      </header>

      {/* Mobile Header */}
      <header className="flex md:hidden fixed top-0 z-40 justify-between items-center w-full px-4 py-3 bg-white/60 backdrop-blur-md border-b border-white/40 shadow-sm pointer-events-none">
        <div className="flex items-center gap-3 pointer-events-auto">
          <Link href="/home" className="material-symbols-outlined text-primary bg-white/60 backdrop-blur-md border border-white/50 p-2 rounded-full transition-all duration-150 active:scale-[0.98] hover:scale-[1.02] shadow-sm">home</Link>
          <span className="text-headline-md font-headline-md font-medium text-primary drop-shadow-md">Mythri</span>
        </div>
        <div className="flex items-center gap-2 relative pointer-events-auto mr-2">
          <button onClick={handleNewChat} title="New Chat" className="material-symbols-outlined text-primary bg-white/60 backdrop-blur-md border border-white/50 p-2 rounded-full transition-all duration-150 active:scale-[0.98] hover:scale-[1.02] shadow-sm">add</button>
          <button onClick={() => setLangMenuOpen(!langMenuOpen)} className="material-symbols-outlined text-primary bg-white/60 backdrop-blur-md border border-white/50 p-2 rounded-full transition-all duration-150 active:scale-[0.98] hover:scale-[1.02] shadow-sm">language</button>
          <div className={`absolute right-0 top-[100%] mt-2 w-40 bg-white/70 backdrop-blur-3xl border border-white/50 shadow-2xl rounded-2xl flex flex-col p-2 gap-1 origin-top-right transition-all duration-300 ${langMenuOpen ? 'scale-100 opacity-100 pointer-events-auto' : 'scale-95 opacity-0 pointer-events-none'}`}>
            <button onClick={() => changeLanguage('en-IN')} className={`px-4 py-2 rounded-xl text-left font-label-md transition-colors ${language === 'en-IN' ? 'text-primary font-bold bg-white/80' : 'text-on-surface-variant hover:bg-white/60'}`}>English</button>
            <button onClick={() => changeLanguage('hi-IN')} className={`px-4 py-2 rounded-xl text-left font-label-md transition-colors ${language === 'hi-IN' ? 'text-primary font-bold bg-white/80' : 'text-on-surface-variant hover:bg-white/60'}`}>Hindi</button>
            <button onClick={() => changeLanguage('te-IN')} className={`px-4 py-2 rounded-xl text-left font-label-md transition-colors ${language === 'te-IN' ? 'text-primary font-bold bg-white/80' : 'text-on-surface-variant hover:bg-white/60'}`}>Telugu</button>
            <button onClick={() => changeLanguage('ta-IN')} className={`px-4 py-2 rounded-xl text-left font-label-md transition-colors ${language === 'ta-IN' ? 'text-primary font-bold bg-white/80' : 'text-on-surface-variant hover:bg-white/60'}`}>Tamil</button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className={`flex-1 min-h-0 flex flex-col w-full max-w-[1200px] md:w-[94vw] lg:w-[90vw] xl:w-[88vw] mx-auto px-margin-mobile relative md:px-8 lg:px-12 pt-20 md:pt-16 z-10 transition-all duration-700 animate-fade-in-up ${exerciseMode ? 'opacity-30 scale-[0.95] blur-[2px] pointer-events-none' : ''}`} style={{ animationDelay: '0.2s' }}>
        
        {/* Chat Thread */}
        <div className="flex-1 overflow-y-auto pt-4 pb-48 md:pb-36 flex flex-col gap-6 hide-scrollbar pr-2" onClick={() => {setMenuOpen(false); setLangMenuOpen(false);}}>
          {messages.map((m, i) => (
            <div key={i} className={`flex flex-col ${m.role === 'user' ? 'items-end self-end max-w-[90%] md:max-w-[65%]' : 'items-start max-w-[90%] md:max-w-[65%]'} ${m.is_new ? 'animate-msg-enter' : ''}`}>
              <span className={`text-label-md text-on-surface-variant/70 mb-1.5 ${m.role === 'user' ? 'mr-3' : 'ml-3'}`}>
                {m.role === 'user' ? 'You' : 'Mythri'}
              </span>
              {m.role === 'user' ? (
                <div className="frosted-plum rounded-tr-sm bg-plum-high-contrast/90 text-white px-6 py-4 rounded-2xl shadow-sm transition-all hover:shadow-md border border-white/20">
                  <p className="text-body-lg leading-relaxed text-white">
                    {m.content}
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-3 w-full">
                  {m.content.split('\n\n').filter(s => s.trim()).map((segment, idx, arr) => (
                    <div key={idx} className={`frosted-blush ${idx === 0 ? 'rounded-tl-sm' : ''} bg-white/70 px-6 py-4 rounded-2xl shadow-sm transition-all hover:shadow-md border border-white/20`}>
                      <p className="text-body-lg leading-relaxed text-on-primary-fixed">
                        <TypewriterText 
                          text={segment.trim()} 
                          animate={!!m.is_new} 
                          onComplete={() => {
                            if (idx === arr.length - 1 && m.exercise_trigger) {
                              setExerciseMode(m.exercise_trigger)
                            }
                          }} 
                        />
                      </p>
                    </div>
                  ))}
                  {/* Crisis & Helplines */}
                  {m.is_crisis && m.helplines && m.helplines.length > 0 && (
                    <div className="mt-2 p-4 bg-error-container/80 backdrop-blur-sm border border-error/20 rounded-xl">
                      <span className="font-label-sm text-error block mb-2 font-bold flex items-center gap-2">
                        <span className="material-symbols-outlined text-[16px]">emergency</span> Helpline Information
                      </span>
                      <ul className="list-disc pl-5 space-y-1 text-xs text-on-error-container">
                        {m.helplines.map((h, hi) => (
                          <li key={hi}>{h}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {/* RAG metadata badge */}
                  {m.rag_used && (
                    <div className="mt-1 flex items-center gap-1.5 text-[10px] text-primary/70 bg-white/40 px-2.5 py-1 rounded-full w-fit border border-white/50 shadow-sm">
                      <span className="material-symbols-outlined text-[12px]">library_books</span>
                      <span>Sanctuary Library Referenced</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex flex-col items-start transition-opacity duration-300 animate-msg-enter">
              <span className="text-label-md text-on-surface-variant/70 mb-1.5 ml-3">Mythri</span>
              <div className="frosted-blush bg-white/70 px-6 py-4 rounded-2xl rounded-tl-sm flex items-center gap-3 shadow-sm border border-white/20">
                <div className="flex gap-1.5 py-1">
                  <div className="w-2 h-2 rounded-full bg-primary/60 animate-breathe"></div>
                  <div className="w-2 h-2 rounded-full bg-primary/60 animate-breathe" style={{ animationDelay: '0.4s' }}></div>
                  <div className="w-2 h-2 rounded-full bg-primary/60 animate-breathe" style={{ animationDelay: '0.8s' }}></div>
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </main>

      {/* Floating Composer — fixed, no strip wrapper */}
      <div className={`fixed bottom-0 left-0 right-0 z-[60] flex flex-col items-center px-margin-mobile md:px-8 lg:px-12 pb-20 md:pb-8 pointer-events-none transition-all duration-700 ${exerciseMode ? 'opacity-30 pointer-events-none' : ''}`}>
        <div className="w-full max-w-[1200px] md:w-[94vw] lg:w-[90vw] xl:w-[88vw] mx-auto flex flex-col items-center pointer-events-auto">

          {/* Floating Glass Composer */}
          <div className={`relative flex items-center gap-2 md:gap-4 backdrop-blur-3xl border border-white/60 rounded-[2rem] p-2 md:p-2.5 pl-6 md:pl-8 transition-all duration-300 shadow-lg w-full ${exerciseMode ? 'bg-white/50' : 'bg-white/75'} focus-within:bg-white/90 focus-within:border-white focus-within:shadow-xl focus-within:shadow-plum-high-contrast/10 focus-within:-translate-y-0.5`}>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleTextareaChange}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleTextSend() } }}
              className="flex-1 bg-transparent border-none focus:ring-0 text-body-md py-2 md:py-3 resize-none max-h-24 md:max-h-32 hide-scrollbar text-on-surface placeholder:text-on-surface-variant/60 font-body-md focus:outline-none transition-colors"
              placeholder={inputPlaceholder}
              rows={1}
            />
            <div className="flex items-center gap-1 md:gap-2 pr-1">
              <button onClick={() => router.push('/voice-chat')} className="material-symbols-outlined text-primary/70 bg-primary/5 md:bg-transparent md:text-outline p-3 hover:bg-white/60 rounded-full transition-all duration-150 hover:text-primary hover:scale-[1.02] active:scale-[0.98] shadow-sm md:shadow-none hover:shadow-sm">mic</button>
              <button
                onClick={() => handleTextSend()}
                disabled={!input.trim() || loading}
                className={`p-3 md:p-3.5 rounded-full transition-all duration-150 flex items-center justify-center shadow-sm ${!input.trim() || loading ? 'bg-primary/20 text-white shadow-none' : 'bg-plum-high-contrast text-white hover:scale-[1.02] active:scale-[0.98] hover:shadow-md'}`}
              >
                <span className="material-symbols-outlined text-[20px] md:text-[22px]">arrow_upward</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}