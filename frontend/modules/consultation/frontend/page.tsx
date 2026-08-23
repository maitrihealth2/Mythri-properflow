'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { startSession, sendMessage, getTranscript, logout } from '@/core/api'
import ExerciseOverlay from '@/shared/components/ExerciseOverlay'
import ThemeToggle from '@/shared/components/ThemeToggle'
import { useTheme } from 'next-themes'
import { motion } from 'framer-motion'
import MythriAura from '@/shared/components/MythriAura'

// ─── Types ────────────────────────────────────────────────────────────────────

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
  /** True on the last bubble of an assistant response group */
  is_last_in_group?: boolean
}

/** A segment waiting to be typed out as a bubble */
interface BubbleItem {
  content: string
  is_crisis?: boolean
  helplines?: string[]
  emotion?: string
  emotion_emoji?: string
  rag_used?: boolean
  exercise_trigger?: string
  is_last_in_group?: boolean
}

// ─── Constants ────────────────────────────────────────────────────────────────

const INPUT_PLACEHOLDERS: Record<string, string> = {
  'en-IN': 'Describe your feelings...',
  'hi-IN': 'अपनी भावनाओं का वर्णन करें...',
  'te-IN': 'మీ భావాలను వివరించండి...',
  'ta-IN': 'உங்கள் உணர்வுகளை விவரிக்கவும்...',
}

// ─── Component ────────────────────────────────────────────────────────────────

const AmbientBackground = ({ isAiActive }: { isAiActive: boolean }) => {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0 bg-[#FFFDF9] dark:bg-[#0a080c]">
      {/* Base image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-1000 bg-[url('/mythri_gradient_bg.jpg')] dark:bg-[url('/mythri_gradient_bg_dark_v2.jpg')]"
      />
      
      {/* Semi-transparent overlay to ensure text readability */}
      <div className="absolute inset-0 bg-white/40 dark:bg-black/10" />
      
      {/* Base gradient (softened to let the image peek through) */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#FFFDF9]/60 via-[#FDF5F2]/50 to-[#F5E6E1]/60 dark:from-[#141218]/20 dark:via-transparent dark:to-[#221A21]/20" />
      
      {/* Swirling Layer 1 - Muted Plum */}
      <motion.div
        className="absolute top-[-20%] left-[-10%] w-[80vw] h-[80vw] rounded-[40%_60%_70%_30%] blur-[100px] opacity-[0.15] dark:opacity-[0.08]"
        style={{ background: 'radial-gradient(circle, #7A4A5F 0%, transparent 70%)' }}
        animate={{ 
          rotate: [0, 90, 180, 270, 360],
          scale: isAiActive ? [1, 1.2, 1] : [1, 1.05, 1],
          borderRadius: ['40% 60% 70% 30%', '50% 50% 40% 60%', '60% 40% 50% 50%', '40% 60% 70% 30%']
        }}
        transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
      />
      
      {/* Swirling Layer 2 - Dusty Mauve */}
      <motion.div
        className="absolute top-[30%] right-[-20%] w-[70vw] h-[70vw] rounded-[60%_40%_30%_70%] blur-[120px] opacity-[0.12] dark:opacity-[0.07]"
        style={{ background: 'radial-gradient(circle, #9A7B88 0%, transparent 70%)' }}
        animate={{ 
          rotate: [360, 270, 180, 90, 0],
          scale: isAiActive ? [1, 1.15, 1] : [1, 1.05, 1],
          x: [0, -50, 0],
          y: [0, 30, 0]
        }}
        transition={{ duration: 35, repeat: Infinity, ease: "linear" }}
      />
      
      {/* Swirling Layer 3 - Warm Brown / Blush */}
      <motion.div
        className="absolute bottom-[-20%] left-[20%] w-[90vw] h-[60vw] rounded-[50%] blur-[140px] opacity-[0.1] dark:opacity-[0.05]"
        style={{ background: 'radial-gradient(ellipse, #A68A80 0%, transparent 60%)' }}
        animate={{ 
          rotate: [0, -45, 0, 45, 0],
          scale: isAiActive ? [1.05, 1.25, 1.05] : [1, 1.1, 1]
        }}
        transition={{ duration: 50, repeat: Infinity, ease: "linear" }}
      />
      
      {/* Subtle Breathing overlay during AI Activity */}
      <motion.div 
        className="absolute inset-0 bg-[#7A4A5F]/[0.02] dark:bg-[#d0bcff]/[0.01]"
        animate={{ opacity: isAiActive ? [0, 1, 0] : 0 }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />
      
      {/* Center content mask to keep readability high */}
      <div className="absolute inset-x-[10%] inset-y-[5%] bg-white/[0.25] dark:bg-black/[0.15] blur-[80px] rounded-full pointer-events-none" />
    </div>
  )
}

export default function ConsultationPage() {
  const router = useRouter()
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [language, setLanguage] = useState('en-IN')
  const [starting, setStarting] = useState(true)

  // ── Natural multi-bubble state ──────────────────────────────────────────────
  /**
   * Completed segments buffered during streaming.  Drained one-at-a-time
   * into activeBubble for sequential typing animation.
   */
  const [bubbleQueue, setBubbleQueue] = useState<BubbleItem[]>([])
  /** The segment currently being typed out on screen. */
  const [activeBubble, setActiveBubble] = useState<BubbleItem | null>(null)
  /** Text revealed so far inside activeBubble. */
  const [activeBubbleText, setActiveBubbleText] = useState('')
  // ── ──────────────────────────────────────────────────────────────────────────


  const [menuOpen, setMenuOpen] = useState(false)
  const [langMenuOpen, setLangMenuOpen] = useState(false)
  const [exerciseMode, setExerciseMode] = useState<string | null>(null)

  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const initialized = useRef(false)
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null)
  const sendingRef = useRef(false)

  const inputPlaceholder = INPUT_PLACEHOLDERS[language] || INPUT_PLACEHOLDERS['en-IN']

  // ─── Auth + language + session init ───────────────────────────────────────
  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('mb_token') : null
    if (!token) { router.replace('/login'); return }

    const savedLanguage = typeof window !== 'undefined' ? localStorage.getItem('mb_language') : null
    if (savedLanguage) setLanguage(savedLanguage)

    const savedDraft = typeof window !== 'undefined' ? localStorage.getItem('mb_chat_draft') : null
    if (savedDraft) setInput(savedDraft)

    const existingSessionId = sessionStorage.getItem('mb_session_id')
    if (existingSessionId) {
      const savedMessages = localStorage.getItem('mb_chat_history_' + existingSessionId)
      if (savedMessages && messages.length === 0) {
        try { setMessages(JSON.parse(savedMessages)) } catch (_) {}
      }
    }

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
  }, [router]) // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Scroll + persist whenever committed messages change ──────────────────
  useEffect(() => {
    if (messages.length > 0 && sessionId && !activeBubble) {
      if (scrollContainerRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current
        // Only auto-scroll if the user is already near the bottom (within 150px)
        if (scrollHeight - scrollTop - clientHeight < 150) {
          scrollContainerRef.current.scrollTo({ top: scrollHeight, behavior: 'smooth' })
        }
      }
      localStorage.setItem('mb_chat_history_' + sessionId, JSON.stringify(messages))
    }
  }, [messages, sessionId, activeBubble])

  // ─── Queue processor: start next bubble when idle ─────────────────────────
  useEffect(() => {
    if (bubbleQueue.length > 0 && !activeBubble) {
      const [next, ...rest] = bubbleQueue
      setActiveBubble(next)
      setActiveBubbleText('')
      setBubbleQueue(rest)
    }
  }, [bubbleQueue, activeBubble])

  // ─── Typing animation: word-by-word, ~40 ms/word ─────────────────────────
  useEffect(() => {
    if (!activeBubble) return

    const fullText = activeBubble.content
    const words = fullText.split(' ')
    const revealedWords = activeBubbleText ? activeBubbleText.split(' ') : []

    if (revealedWords.length < words.length) {
      typingTimerRef.current = setTimeout(() => {
        setActiveBubbleText(words.slice(0, revealedWords.length + 1).join(' '))
        if (scrollContainerRef.current) {
          const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current
          // Smart scroll during typing: only scroll if near the bottom
          if (scrollHeight - scrollTop - clientHeight < 150) {
            scrollContainerRef.current.scrollTop = scrollHeight
          }
        }
      }, 40)
    } else {
      // Typing complete — commit bubble to the message list
      typingTimerRef.current = setTimeout(() => {
        setMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            content: fullText,
            is_new: true,
            is_crisis: activeBubble.is_crisis,
            helplines: activeBubble.helplines,
            emotion: activeBubble.emotion,
            emotion_emoji: activeBubble.emotion_emoji,
            rag_used: activeBubble.rag_used,
            exercise_trigger: activeBubble.exercise_trigger,
            is_last_in_group: activeBubble.is_last_in_group,
          },
        ])
        if (activeBubble.exercise_trigger) {
          setExerciseMode(activeBubble.exercise_trigger)
        }
        setActiveBubble(null)
        setActiveBubbleText('')
      }, 300)
    }

    return () => { if (typingTimerRef.current) clearTimeout(typingTimerRef.current) }
  }, [activeBubble, activeBubbleText])

  // ─── Lock body scroll ─────────────────────────────────────────────────────
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    document.body.style.height = '100dvh'
    return () => {
      document.body.style.overflow = ''
      document.body.style.height = ''
    }
  }, [])

  // ─── Session init ─────────────────────────────────────────────────────────
  const initSession = async () => {
    try {
      const existingSessionId = sessionStorage.getItem('mb_session_id')
      if (existingSessionId) {
        try {
          const data = await getTranscript(existingSessionId)
          setSessionId(existingSessionId)
          if (data.messages && data.messages.length > 0) {
            // Restore history, splitting assistant messages by \n\n to match live bubble segmentation
            const expandedMessages: Message[] = []
            
            for (const m of data.messages) {
              if (m.role === 'assistant' && m.content) {
                const chunks = m.content.split('\n\n').filter((c: string) => c.trim().length > 0)
                chunks.forEach((chunk: string, index: number) => {
                  const isLast = index === chunks.length - 1
                  expandedMessages.push({
                    ...m,
                    content: chunk.trim(),
                    is_new: false,
                    is_last_in_group: isLast,
                    // Clear out special flags on non-final chunks to prevent duplicated UI elements
                    is_crisis: isLast ? m.is_crisis : false,
                    helplines: isLast ? m.helplines : undefined,
                    rag_used: isLast ? m.rag_used : false,
                    exercise_trigger: isLast ? m.exercise_trigger : undefined
                  })
                })
              } else {
                expandedMessages.push({ ...m, is_new: false })
              }
            }
            
            setMessages(expandedMessages)
            setStarting(false)
            return
          }
        } catch (_) { /* invalid session — fall through to new */ }
      }

      const data = await startSession()
      setSessionId(data.session_id)
      sessionStorage.setItem('mb_session_id', data.session_id)

      const welcome = data.message
      if (welcome && welcome !== 'Session started.') {
        setMessages([{ role: 'assistant', content: welcome, is_new: true, is_last_in_group: true }])
      }
    } catch (_) {
      // silent — user stays on page
    } finally {
      setStarting(false)
    }
  }

  // ─── Send message ─────────────────────────────────────────────────────────
  /**
   * Natural segmentation algorithm:
   *   - Chunks accumulate into fullContent (never split mid-sentence)
   *   - When \n\n appears in unprocessed content → completed paragraph → push to bubbleQueue
   *   - Stream ends → flush remaining partial segment as final bubble
   *   - Result: DB always holds ONE assistant message; UI renders sequential bubbles
   */
  const handleTextSend = async (text?: string) => {
    if (sendingRef.current) return
    const msg = (text || input).trim()
    if (!msg || !sessionId || loading) return
    
    sendingRef.current = true
    setInput('')
    setLoading(true)
    setMessages(prev => [...prev, { role: 'user', content: msg, via: 'text', is_new: true }])
    if (textareaRef.current) textareaRef.current.style.height = 'auto'

    let fullContent = ''      // complete accumulated text from this response
    let processedChars = 0   // chars of fullContent already pushed to bubbleQueue

    try {
      const doFetch = async (isRetry = false): Promise<Response> => {
        const token = localStorage.getItem('mb_token') || ''
        const apiUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000').replace(/\/$/, '')
        const res = await fetch(`${apiUrl}/api/consultation/message`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ session_id: sessionId, message: msg, language }),
        })

        if (res.status === 401 && !isRetry) {
          try {
            const apiUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000').replace(/\/$/, '')
            await fetch(`${apiUrl}/api/auth/me`, { headers: { Authorization: `Bearer ${localStorage.getItem('mb_token') || ''}` } }) // Trigger token refresh
          } catch {
            throw new Error('AUTH_FAILED')
          }
          return doFetch(true)
        }
        return res
      }

      const res = await doFetch()

      if (res.status === 404) {
        sessionStorage.removeItem('mb_session_id')
        localStorage.removeItem('mb_chat_history_' + sessionId)
        initialized.current = false
        setMessages([])
        await initSession()
        return
      }
      if (!res.ok) throw new Error(`HTTP error: ${res.status}`)

      const reader = res.body?.getReader()
      if (!reader) throw new Error('No readable stream')

      const decoder = new TextDecoder()
      let metadataObj: any = null
      let ndjsonBuffer = ''
      let firstSegmentQueued = false

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        ndjsonBuffer += decoder.decode(value, { stream: true })
        const lines = ndjsonBuffer.split('\n')
        ndjsonBuffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.trim()) continue
          try {
            const data = JSON.parse(line)
            if (data.type === 'initial_metadata' || data.type === 'metadata') {
              metadataObj = { ...metadataObj, ...data }
            } else if (data.type === 'chunk') {
              fullContent += data.text

              let unprocessed = fullContent.slice(processedChars)

              if (!firstSegmentQueued) {
                // First-bubble responsiveness: don't wait for \n\n if a sentence ends early.
                const nnIdx = unprocessed.indexOf('\n\n')
                const match = unprocessed.match(/([.!?])\s/)
                
                let splitIdx = -1
                let skip = 0
                
                if (nnIdx !== -1) {
                  splitIdx = nnIdx
                  skip = 2
                } else if (match && match.index !== undefined && match.index > 15) {
                  splitIdx = match.index + 1
                  skip = 0
                }
                
                if (splitIdx !== -1) {
                  const segment = unprocessed.slice(0, splitIdx).trim()
                  if (segment) {
                    setBubbleQueue(prev => [...prev, { content: segment }])
                  }
                  processedChars += splitIdx + skip
                  unprocessed = fullContent.slice(processedChars)
                  firstSegmentQueued = true
                }
              }

              // Natural boundary detection: split on paragraph breaks (\n\n) for subsequent bubbles.
              while (firstSegmentQueued && unprocessed.includes('\n\n')) {
                const nnIdx = unprocessed.indexOf('\n\n')
                const segment = unprocessed.slice(0, nnIdx).trim()
                if (segment) {
                  // Intermediate segment — no response-level metadata yet
                  setBubbleQueue(prev => [...prev, { content: segment }])
                }
                processedChars += nnIdx + 2
                unprocessed = fullContent.slice(processedChars)
              }
            }
          } catch (_) {
            // malformed NDJSON line — skip
          }
        }
      }

      // ── Stream complete: flush the final partial segment ─────────────────
      const remaining = fullContent.slice(processedChars).trim()

      // Extract dynamically generated exercise from the final text payload
      let finalExerciseTrigger = metadataObj?.exercise_state !== 'idle' ? metadataObj?.exercise_type : undefined;
      
      if (metadataObj?.full_text) {
        const match = metadataObj.full_text.match(/<EXERCISE>\s*(.*?)\s*<\/EXERCISE>/i);
        if (match) {
          finalExerciseTrigger = match[1];
        }
      }

      const responseMeta: Partial<BubbleItem> = {
        is_crisis: metadataObj?.is_crisis,
        helplines: metadataObj?.helplines,
        emotion: metadataObj?.emotion,
        emotion_emoji: metadataObj?.emotion_emoji,
        rag_used: metadataObj?.rag_used,
        exercise_trigger: finalExerciseTrigger,
        is_last_in_group: true,
      }

      if (remaining) {
        // Typical case: response ends with text (no trailing \n\n)
        setBubbleQueue(prev => [...prev, { content: remaining, ...responseMeta }])
      } else if (processedChars > 0) {
        // Response ended exactly on \n\n — tag the last queued segment with meta
        setBubbleQueue(prev => {
          if (prev.length > 0) {
            const updated = [...prev]
            updated[updated.length - 1] = { ...updated[updated.length - 1], ...responseMeta }
            return updated
          }
          return prev
        })
      }

      localStorage.removeItem('mb_chat_draft')

    } catch (err: any) {
      if (err.message === 'AUTH_FAILED') return // Interceptor will redirect to login
      console.error('Chat send error:', err)
      
      const remaining = fullContent.slice(processedChars).trim()
      if (remaining) {
        setBubbleQueue(prev => [...prev, { content: remaining, is_last_in_group: false }])
      }
      
      setBubbleQueue(prev => [
        ...prev,
        {
          content: "Couldn't reach Mythri right now \uD83D\uDE4F Please try again in a moment.",
          is_last_in_group: true,
        },
      ])
    } finally {
      setLoading(false)
      sendingRef.current = false
    }
  }

  // ─── Textarea auto-resize ─────────────────────────────────────────────────
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    localStorage.setItem('mb_chat_draft', e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = `${e.target.scrollHeight}px`
  }

  // ─── Language switch ──────────────────────────────────────────────────────
  const changeLanguage = (lang: string) => {
    setLanguage(lang)
    localStorage.setItem('mb_language', lang)
    setLangMenuOpen(false)
  }

  // ─── New chat ─────────────────────────────────────────────────────────────
  const handleNewChat = useCallback(() => {
    sessionStorage.removeItem('mb_session_id')
    setSessionId(null)
    setMessages([])
    setBubbleQueue([])
    setActiveBubble(null)
    setActiveBubbleText('')
    setStarting(true)
    initialized.current = false
    initSession()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handler = () => handleNewChat()
    window.addEventListener('shortcut:new-chat', handler)
    return () => window.removeEventListener('shortcut:new-chat', handler)
  }, [handleNewChat])

  // ─── Computed helpers ─────────────────────────────────────────────────────
  /** True while waiting for TTFT (loading but nothing typed/queued yet) */
  const showLoadingDots = loading && !activeBubble && bubbleQueue.length === 0

  /** Should we show the "Mythri" label above the active bubble? */
  const showMythriLabelOnActive =
    !messages.length || messages[messages.length - 1].role !== 'assistant'

  // ─── Loading screen ────────────────────────────────────────────────────────
  if (starting) return (
    <div className="bg-background text-on-background min-h-screen flex items-center justify-center pt-24">
      <div className="flex flex-col items-center gap-4 opacity-70">
        <span className="material-symbols-outlined text-4xl text-primary/80 animate-pulse" style={{ animationDuration: '2s' }}>spa</span>
        <span className="text-primary font-label-md tracking-widest uppercase text-xs animate-pulse" style={{ animationDuration: '2s' }}>Preparing Space</span>
      </div>
    </div>
  )

  const isAiActive = loading || activeBubble !== null

  // ─── Main UI ───────────────────────────────────────────────────────────────
  return (
    <div className="relative flex flex-col min-h-[100dvh] w-full">
      <AmbientBackground isAiActive={isAiActive} />
      <ExerciseOverlay exerciseMode={exerciseMode} onClose={() => setExerciseMode(null)} />

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes msgEnter {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .animate-msg-enter { animation: msgEnter 0.3s cubic-bezier(0.16,1,0.3,1) forwards; }
        @keyframes breathe {
          0%, 100% { opacity: 0.4; transform: scale(0.9); }
          50%       { opacity: 1;   transform: scale(1.1); }
        }
        .animate-breathe { animation: breathe 2.5s ease-in-out infinite; }
      `}} suppressHydrationWarning />

      {/* ── Desktop Header ── */}
      <header className="hidden md:flex fixed top-0 z-40 justify-between items-center w-full px-margin-desktop py-4 pointer-events-none animate-fade-in-up bg-transparent" style={{ animationDelay: '0.1s' }}>
        <div className="flex items-center gap-4 pointer-events-auto">
          <Link href="/home" className="material-symbols-outlined text-primary dark:text-white/90 bg-white/60 dark:bg-white/10 backdrop-blur-md border border-white/50 dark:border-white/20 p-2 rounded-full transition-all duration-150 hover:bg-white/80 dark:hover:bg-white/20 active:scale-[0.98] hover:scale-[1.02] shadow-sm">home</Link>
          <span className="text-headline-md font-headline-md font-medium text-primary dark:text-white/90 drop-shadow-md">Mythri</span>
        </div>
        <div className="flex items-center gap-4 relative pointer-events-auto">
          <ThemeToggle />
          <button onClick={handleNewChat} title="New Chat" className="material-symbols-outlined text-primary dark:text-white/90 bg-white/60 backdrop-blur-md border border-white/50 shadow-sm hover:bg-white/80 p-2 rounded-full transition-all duration-150 active:scale-[0.98] hover:scale-[1.02] dark:bg-white/10 dark:border-white/20 dark:hover:bg-white/20">add</button>
          <button onClick={() => { setLangMenuOpen(!langMenuOpen); setMenuOpen(false) }} className="material-symbols-outlined text-primary dark:text-white/90 bg-white/60 backdrop-blur-md border border-white/50 shadow-sm hover:bg-white/80 p-2 rounded-full transition-all duration-150 active:scale-[0.98] hover:scale-[1.02] dark:bg-white/10 dark:border-white/20 dark:hover:bg-white/20">language</button>
          <button onClick={() => { setMenuOpen(!menuOpen); setLangMenuOpen(false) }} className="material-symbols-outlined text-primary dark:text-white/90 bg-white/60 backdrop-blur-md border border-white/50 shadow-sm hover:bg-white/80 p-2 rounded-full transition-all duration-150 active:scale-[0.98] hover:scale-[1.02] dark:bg-white/10 dark:border-white/20 dark:hover:bg-white/20">grid_view</button>

          {/* Dropdown */}
          <nav className={`absolute right-0 top-[100%] mt-2 w-56 bg-white/70 dark:bg-[#121212]/90 backdrop-blur-3xl border border-white/50 dark:border-white/10 shadow-2xl rounded-2xl flex flex-col p-2 gap-1 origin-top transition-all duration-300 ${menuOpen ? 'scale-y-100 opacity-100 pointer-events-auto' : 'scale-y-0 opacity-0 pointer-events-none'}`}>
            <Link href="/home" className="text-on-surface-variant hover:bg-white/60 dark:hover:bg-white/10 transition-colors px-4 py-2.5 rounded-xl flex items-center gap-3 font-label-md">
              <span className="material-symbols-outlined text-[20px]">home</span> Sanctuary
            </Link>
            <Link href="/text-chat" className="text-primary font-bold bg-white/80 dark:bg-white/20 px-4 py-2.5 rounded-xl flex items-center gap-3 font-label-md">
              <span className="material-symbols-outlined text-[20px]">health_and_safety</span> Consultation
            </Link>
            <Link href="/history" className="text-on-surface-variant hover:bg-white/60 dark:hover:bg-white/10 transition-colors px-4 py-2.5 rounded-xl flex items-center gap-3 font-label-md">
              <span className="material-symbols-outlined text-[20px]">history</span> Your Sessions
            </Link>
            <Link href="/profile" className="text-on-surface-variant hover:bg-white/60 dark:hover:bg-white/10 transition-colors px-4 py-2.5 rounded-xl flex items-center gap-3 font-label-md">
              <span className="material-symbols-outlined text-[20px]">person</span> Profile
            </Link>
            <Link href="/feedback" className="text-on-surface-variant hover:bg-white/60 dark:hover:bg-white/10 transition-colors px-4 py-2.5 rounded-xl flex items-center gap-3 font-label-md">
              <span className="material-symbols-outlined text-[20px]">feedback</span> Feedback
            </Link>
            <div className="h-px bg-outline-variant/30 my-1 mx-2" />
            <button onClick={async () => { await logout(); localStorage.clear(); sessionStorage.removeItem('mb_session_id'); router.replace('/login') }} className="text-error hover:bg-error/10 dark:hover:bg-error/20 transition-colors px-4 py-2.5 rounded-xl flex items-center gap-3 font-label-md text-left w-full">
              <span className="material-symbols-outlined text-[20px]">logout</span> Logout
            </button>
          </nav>

          {/* Language menu */}
          <div className={`absolute right-12 top-[100%] mt-2 w-40 bg-white/70 dark:bg-[#121212]/90 backdrop-blur-3xl border border-white/50 dark:border-white/10 shadow-2xl rounded-2xl flex flex-col p-2 gap-1 origin-top-right transition-all duration-300 ${langMenuOpen ? 'scale-100 opacity-100 pointer-events-auto' : 'scale-95 opacity-0 pointer-events-none'}`}>
            <button onClick={() => changeLanguage('en-IN')} className={`px-4 py-2 rounded-xl text-left font-label-md transition-colors ${language === 'en-IN' ? 'bg-white/80 dark:bg-white/20 text-primary font-bold' : 'text-on-surface-variant hover:bg-white/60 dark:hover:bg-white/10'}`}>English</button>
            <button onClick={() => changeLanguage('hi-IN')} className={`px-4 py-2 rounded-xl text-left font-label-md transition-colors ${language === 'hi-IN' ? 'bg-white/80 dark:bg-white/20 text-primary font-bold' : 'text-on-surface-variant hover:bg-white/60 dark:hover:bg-white/10'}`}>हिंदी (Hindi)</button>
            <button onClick={() => changeLanguage('te-IN')} className={`px-4 py-2 rounded-xl text-left font-label-md transition-colors ${language === 'te-IN' ? 'bg-white/80 dark:bg-white/20 text-primary font-bold' : 'text-on-surface-variant hover:bg-white/60 dark:hover:bg-white/10'}`}>తెలుగు (Telugu)</button>
            <button onClick={() => changeLanguage('ta-IN')} className={`px-4 py-2 rounded-xl text-left font-label-md transition-colors ${language === 'ta-IN' ? 'bg-white/80 dark:bg-white/20 text-primary font-bold' : 'text-on-surface-variant hover:bg-white/60 dark:hover:bg-white/10'}`}>தமிழ் (Tamil)</button>
          </div>
        </div>
      </header>

      {/* ── Mobile Header ── */}
      <header className="flex md:hidden fixed top-0 z-40 justify-between items-center w-full px-4 py-3 bg-white/60 dark:bg-[#121212]/80 backdrop-blur-md border-b border-white/40 dark:border-white/10 shadow-sm pointer-events-none">
        <div className="flex items-center gap-3 pointer-events-auto">
          <Link href="/home" className="material-symbols-outlined text-primary bg-white/60 backdrop-blur-md border border-white/50 p-2 rounded-full transition-all duration-150 active:scale-[0.98] hover:scale-[1.02] shadow-sm">home</Link>
          <span className="text-headline-md font-headline-md font-medium text-primary drop-shadow-md">Mythri</span>
        </div>
        <div className="flex items-center gap-2 relative pointer-events-auto mr-2">
          <ThemeToggle />
          <button onClick={handleNewChat} title="New Chat" className="material-symbols-outlined text-primary bg-white/60 backdrop-blur-md border border-white/50 p-2 rounded-full transition-all duration-150 active:scale-[0.98] hover:scale-[1.02] shadow-sm dark:bg-white/10 dark:border-white/20">add</button>
          <button onClick={() => setLangMenuOpen(!langMenuOpen)} className="material-symbols-outlined text-primary bg-white/60 backdrop-blur-md border border-white/50 p-2 rounded-full transition-all duration-150 active:scale-[0.98] hover:scale-[1.02] shadow-sm dark:bg-white/10 dark:border-white/20">language</button>
          <div className={`absolute right-0 top-[100%] mt-2 w-40 bg-white/70 dark:bg-[#121212]/90 backdrop-blur-3xl border border-white/50 dark:border-white/10 shadow-2xl rounded-2xl flex flex-col p-2 gap-1 origin-top-right transition-all duration-300 ${langMenuOpen ? 'scale-100 opacity-100 pointer-events-auto' : 'scale-95 opacity-0 pointer-events-none'}`}>
            <button onClick={() => changeLanguage('en-IN')} className={`px-4 py-2 rounded-xl text-left font-label-md transition-colors ${language === 'en-IN' ? 'bg-white/80 dark:bg-white/20 text-primary font-bold' : 'text-on-surface-variant hover:bg-white/60 dark:hover:bg-white/10'}`}>English</button>
            <button onClick={() => changeLanguage('hi-IN')} className={`px-4 py-2 rounded-xl text-left font-label-md transition-colors ${language === 'hi-IN' ? 'bg-white/80 dark:bg-white/20 text-primary font-bold' : 'text-on-surface-variant hover:bg-white/60 dark:hover:bg-white/10'}`}>हिंदी (Hindi)</button>
            <button onClick={() => changeLanguage('te-IN')} className={`px-4 py-2 rounded-xl text-left font-label-md transition-colors ${language === 'te-IN' ? 'bg-white/80 dark:bg-white/20 text-primary font-bold' : 'text-on-surface-variant hover:bg-white/60 dark:hover:bg-white/10'}`}>తెలుగు (Telugu)</button>
            <button onClick={() => changeLanguage('ta-IN')} className={`px-4 py-2 rounded-xl text-left font-label-md transition-colors ${language === 'ta-IN' ? 'bg-white/80 dark:bg-white/20 text-primary font-bold' : 'text-on-surface-variant hover:bg-white/60 dark:hover:bg-white/10'}`}>தமிழ் (Tamil)</button>
          </div>
        </div>
      </header>

      {/* ── Chat Area ── */}
      <main
        className={`flex-1 min-h-0 flex flex-col w-full max-w-[1200px] md:w-[94vw] lg:w-[90vw] xl:w-[88vw] mx-auto px-margin-mobile relative md:px-8 lg:px-12 pt-20 md:pt-16 z-10 transition-all duration-700 animate-fade-in-up ${exerciseMode ? 'opacity-30 scale-[0.95] blur-[2px] pointer-events-none' : ''}`}
        style={{ animationDelay: '0.2s' }}
      >
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto pt-4 pb-48 md:pb-36 flex flex-col gap-3 hide-scrollbar pr-2"
          onClick={() => { setMenuOpen(false); setLangMenuOpen(false) }}
        >
          {/* ── Committed messages ── */}
          {messages.map((m, i) => {
            const showLabel = i === 0 || messages[i - 1].role !== m.role
            return (
              <div
                key={i}
                className={`flex flex-col ${m.role === 'user' ? 'items-end self-end max-w-[90%] md:max-w-[65%]' : 'items-start max-w-[90%] md:max-w-[65%]'} ${m.is_new ? 'animate-msg-enter' : ''}`}
              >
                {showLabel && (
                  <span className={`text-label-md text-on-surface-variant/70 mb-1.5 ${m.role === 'user' ? 'mr-3' : 'ml-3'}`}>
                    {m.role === 'user' ? 'You' : 'Mythri'}
                  </span>
                )}
                {m.role === 'user' ? (
                  <div className="frosted-plum rounded-tr-sm bg-plum-high-contrast/90 dark:bg-primary-container/80 text-white px-6 py-4 rounded-2xl shadow-sm transition-all hover:shadow-md border border-white/20 dark:border-white/10">
                    <p className="text-body-lg leading-relaxed text-white dark:text-white/95 whitespace-pre-wrap">{m.content}</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <div className="frosted-blush rounded-tl-sm bg-white/70 dark:bg-black/50 px-6 py-4 rounded-2xl shadow-sm transition-all hover:shadow-md border border-white/20 dark:border-white/10">
                      <p className="text-body-lg leading-relaxed text-on-primary-fixed dark:text-white/90 whitespace-pre-wrap">{m.content}</p>
                    </div>
                    {/* Crisis helplines — only on last bubble of group */}
                    {m.is_last_in_group && m.is_crisis && m.helplines && m.helplines.length > 0 && (
                      <div className="mt-1 p-4 bg-error-container/80 backdrop-blur-sm border border-error/20 rounded-xl">
                        <span className="font-label-sm text-error block mb-2 font-bold flex items-center gap-2">
                          <span className="material-symbols-outlined text-[16px]">emergency</span> Helpline Information
                        </span>
                        <ul className="list-disc pl-5 space-y-1 text-xs text-on-error-container">
                          {m.helplines.map((h, hi) => <li key={hi}>{h}</li>)}
                        </ul>
                      </div>
                    )}
                    {/* RAG badge — only on last bubble of group */}
                    {m.is_last_in_group && m.rag_used && (
                      <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-primary/70 bg-white/40 px-2.5 py-1 rounded-full w-fit border border-white/50 shadow-sm">
                        <span className="material-symbols-outlined text-[12px]">library_books</span>
                        <span>Sanctuary Library Referenced</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}

          {/* ── Active bubble (currently typing out via animation) ── */}
          {activeBubble && (
            <div className="flex flex-col items-start max-w-[90%] md:max-w-[65%] animate-msg-enter">
              {showMythriLabelOnActive && (
                <span className="text-label-md text-on-surface-variant/70 mb-1.5 ml-3">Mythri</span>
              )}
              <div className="frosted-blush bg-white/70 dark:bg-black/50 px-6 py-4 rounded-2xl rounded-tl-sm shadow-sm border border-white/20 dark:border-white/10">
                <p className="text-body-lg leading-relaxed text-on-primary-fixed dark:text-white/90 whitespace-pre-wrap">
                  {activeBubbleText}
                  <span className="inline-block w-1.5 h-4 ml-1 bg-primary/40 dark:bg-white/40 animate-pulse" />
                </p>
              </div>
            </div>
          )}

          {/* ── Breathing dots: TTFT wait (loading, nothing streaming or typing yet) ── */}
          {showLoadingDots && (
            <div className="flex flex-col items-start animate-msg-enter mt-2 mb-2">
              <MythriAura state="processing" size="sm" className="ml-4" />
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </main>

      {/* ── Floating Composer ── */}
      <div className={`fixed bottom-0 left-0 right-0 z-[60] flex flex-col items-center px-margin-mobile md:px-8 lg:px-12 pb-20 md:pb-8 pointer-events-none transition-all duration-700 ${exerciseMode ? 'opacity-30 pointer-events-none' : ''}`}>
        <div className="w-full max-w-[1200px] md:w-[94vw] lg:w-[90vw] xl:w-[88vw] mx-auto flex flex-col items-center pointer-events-auto">
          <div className={`relative flex items-center gap-2 md:gap-4 backdrop-blur-3xl border border-white/60 dark:border-white/20 rounded-[2rem] p-2 md:p-2.5 pl-6 md:pl-8 transition-all duration-300 shadow-lg w-full ${exerciseMode ? 'bg-white/50' : 'bg-white/75 dark:bg-black/60'} focus-within:bg-white/90 dark:focus-within:bg-black/80 focus-within:border-white focus-within:shadow-xl focus-within:shadow-plum-high-contrast/10 focus-within:-translate-y-0.5`}>
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
