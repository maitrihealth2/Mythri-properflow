'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import api, { startSession, sendMessage, getTranscript, logout, getProfile, getInMemoryToken, getWsTicket, getActiveApiUrl, getWebSocketUrl, fetchWithFailover, getFeedbackMode, refreshToken } from '@/core/api'
import { useAuth } from '@/shared/components/contexts/AuthContext'
import ExerciseOverlay from '@/shared/components/ExerciseOverlay'
import ThemeToggle from '@/shared/components/ThemeToggle'
import SanctuaryNavRail from '@/shared/components/SanctuaryNavRail'
import { motion } from 'framer-motion'
import PersonaOverlay from '@/shared/components/PersonaOverlay'
import TypingIndicator from '@/shared/components/TypingIndicator'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp?: string
  status?: 'sending' | 'sent' | 'delivered' | 'read'
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
  timestamp?: string
  is_crisis?: boolean
  helplines?: string[]
  emotion?: string
  emotion_emoji?: string
  rag_used?: boolean
  exercise_trigger?: string
  is_last_in_group?: boolean
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getFormattedTime = (date?: Date | string | number) => {
  try {
    const d = date ? new Date(date) : new Date()
    if (isNaN(d.getTime())) {
      return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
    }
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
  } catch {
    return '10:00 AM'
  }
}

/** Authentic WhatsApp tick marks component */
const WhatsAppTick = ({ status = 'read' }: { status?: 'sending' | 'sent' | 'delivered' | 'read' }) => {
  if (status === 'sending') {
    return (
      <span className="inline-block w-2.5 h-2.5 border border-white/60 border-t-transparent rounded-full animate-spin ml-0.5 align-middle" />
    )
  }

  const isRead = status === 'read'
  const isDelivered = status === 'delivered' || isRead
  // Authentic WhatsApp colors: #53bdeb for read, #C5B4A5 for delivered/sent in espresso bubble
  const tickColor = isRead ? '#53bdeb' : '#C5B4A5'

  if (!isDelivered) {
    return (
      <svg className="w-3.5 h-2.5 inline-block ml-0.5 align-middle" viewBox="0 0 16 11" fill="none">
        <path d="M12.5 1.5L5.5 8.5L2 5" stroke={tickColor} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }

  return (
    <svg className="w-4 h-2.5 inline-block ml-0.5 align-middle" viewBox="0 0 18 11" fill="none">
      <path d="M11 1.5L5 8.5L2 5.5" stroke={tickColor} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 1.5L10 8.5L8.5 7" stroke={tickColor} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ─── Constants ────────────────────────────────────────────────────────────────

export const LANGUAGES = [
  { code: 'en-IN', name: 'English', native: 'Default • English', badge: 'EN' },
  { code: 'hi-IN', name: 'Hindi', native: 'हिंदी', badge: 'HI' },
  { code: 'te-IN', name: 'Telugu', native: 'తెలుగు', badge: 'TE' },
  { code: 'ta-IN', name: 'Tamil', native: 'தமிழ்', badge: 'TA' },
]

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
    </div>
  )
}

export default function ConsultationPage() {
  const router = useRouter()
  const { token, loading: authLoading, clearAuth } = useAuth()
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [language, setLanguage] = useState('en-IN')
  const [isTyping, setIsTyping] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)

  // ── Natural multi-bubble state ──────────────────────────────────────────────
  const [bubbleQueue, setBubbleQueue] = useState<BubbleItem[]>([])
  const [activeBubble, setActiveBubble] = useState<BubbleItem | null>(null)
  const [activeBubbleText, setActiveBubbleText] = useState('')

  const [langMenuOpen, setLangMenuOpen] = useState(false)
  const [langToast, setLangToast] = useState<string | null>(null)
  const [personaOpen, setPersonaOpen] = useState(false)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [exerciseMode, setExerciseMode] = useState<string | null>(null)

  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const initialized = useRef(false)
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null)
  const sendingRef = useRef(false)
  const sessionIdRef = useRef<string | null>(null)
  const messageCountRef = useRef(0)

  useEffect(() => {
    sessionIdRef.current = sessionId
  }, [sessionId])

  useEffect(() => {
    messageCountRef.current = messages.length
  }, [messages.length])

  // ── Auto-close & Summarize Session on Tab Exit or Component Unmount ──
  useEffect(() => {
    const triggerAutoEndSession = () => {
      const currentSid = sessionIdRef.current
      if (!currentSid || messageCountRef.current < 2) return
      
      const API_URL = getActiveApiUrl()
      const authToken = getInMemoryToken()
      const endUrl = `${API_URL}/api/consultation/${currentSid}/end`

      fetch(endUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        credentials: 'include',
        keepalive: true,
      }).catch(() => {})
    }

    const handleBeforeUnload = () => {
      triggerAutoEndSession()
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      triggerAutoEndSession()
    }
  }, [])

  const inputPlaceholder = INPUT_PLACEHOLDERS[language] || INPUT_PLACEHOLDERS['en-IN']

  // ── WebSocket with ticket authentication (CRIT-04) ──────────────────────
  useEffect(() => {
    if (!sessionId) return
    let ws: WebSocket | null = null
    let interval: NodeJS.Timeout | null = null
    let isCancelled = false

    const connectWs = async () => {
      try {
        const ticket = await getWsTicket()
        if (isCancelled) return
        const wsUrl = getWebSocketUrl(`/api/consultation/ws/events?session_id=${sessionId}&ticket=${encodeURIComponent(ticket)}`)
        
        ws = new WebSocket(wsUrl)
        ws.onmessage = (event) => {
          if (event.data === "pong") return
          try {
            const data = JSON.parse(event.data)
            if (data.type === "typing_start") {
              setIsTyping(true)
            } else if (data.type === "typing_stop") {
              setIsTyping(false)
            }
          } catch (e) {}
        }
        wsRef.current = ws
        
        interval = setInterval(() => {
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send("ping")
          }
        }, 30000)
      } catch {
        // Suppress WS connection noise
      }
    }

    connectWs()

    return () => {
      isCancelled = true
      if (interval) clearInterval(interval)
      if (ws) ws.close()
    }
  }, [sessionId])

  // ── Auth + language + session init ───────────────────────────────────────
  useEffect(() => {
    if (authLoading) return
    if (!token) { router.replace('/login'); return }

    const savedLanguage = typeof window !== 'undefined' ? localStorage.getItem('mb_language') : null
    if (savedLanguage) setLanguage(savedLanguage)

    const savedDraft = typeof window !== 'undefined' ? sessionStorage.getItem('mb_chat_draft') : null
    if (savedDraft) setInput(savedDraft)

    const existingSessionId = sessionStorage.getItem('mb_session_id')
    if (existingSessionId) {
      const savedMessages = sessionStorage.getItem('mb_chat_history_' + existingSessionId)
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
      
      // Fetch user profile for persona overlay
      getProfile().then(data => {
        if (data) setUserProfile(data)
      }).catch(() => {})
    }

    return () => window.removeEventListener('mb_language_changed', handleLangEvent)
  }, [router, authLoading, token])

  // ── Scroll + persist whenever committed messages change ──────────────────
  useEffect(() => {
    if (messages.length > 0 && sessionId && !activeBubble) {
      if (scrollContainerRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current
        if (scrollHeight - scrollTop - clientHeight < 180) {
          scrollContainerRef.current.scrollTo({ top: scrollHeight, behavior: 'smooth' })
        }
      }
      sessionStorage.setItem('mb_chat_history_' + sessionId, JSON.stringify(messages))
      
      try {
        const historyKeys: string[] = []
        for (let i = 0; i < sessionStorage.length; i++) {
          const k = sessionStorage.key(i)
          if (k && k.startsWith('mb_chat_history_') && k !== 'mb_chat_history_' + sessionId) {
            historyKeys.push(k)
          }
        }
        if (historyKeys.length > 3) {
          historyKeys.slice(0, historyKeys.length - 3).forEach(k => sessionStorage.removeItem(k))
        }
      } catch (_) {}
    }
  }, [messages, sessionId, activeBubble])

  // ── Queue processor: start next bubble when idle ─────────────────────────
  useEffect(() => {
    if (bubbleQueue.length > 0 && !activeBubble) {
      const [next, ...rest] = bubbleQueue
      setActiveBubble(next)
      setActiveBubbleText('')
      setBubbleQueue(rest)
    }
  }, [bubbleQueue, activeBubble])

  // ── Turn last user message ticks to blue 'read' when Mythri starts typing ──
  useEffect(() => {
    if (activeBubble) {
      setMessages(prev => {
        let changed = false
        const next = prev.map(m => {
          if (m.role === 'user' && m.status !== 'read') {
            changed = true
            return { ...m, status: 'read' as const }
          }
          return m
        })
        return changed ? next : prev
      })
    }
  }, [activeBubble])

  // ── Typing animation: word-by-word, natural calm cadence (~55-65ms/word) ──
  useEffect(() => {
    if (!activeBubble) return

    const fullText = activeBubble.content
    const words = fullText.split(' ')
    const revealedWords = activeBubbleText ? activeBubbleText.split(' ') : []

    if (revealedWords.length < words.length) {
      const nextWord = words[revealedWords.length]
      // Pacing: 58ms base, with subtle pause on punctuation marks for human breath
      const hasPunctuation = /[.,!?;:]$/.test(nextWord || '')
      const delay = hasPunctuation ? 115 : 58

      typingTimerRef.current = setTimeout(() => {
        setActiveBubbleText(words.slice(0, revealedWords.length + 1).join(' '))
        if (scrollContainerRef.current) {
          const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current
          if (scrollHeight - scrollTop - clientHeight < 180) {
            scrollContainerRef.current.scrollTop = scrollHeight
          }
        }
      }, delay)
    } else {
      // Typing complete — commit bubble to the message list
      typingTimerRef.current = setTimeout(() => {
        setMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            content: fullText,
            timestamp: activeBubble.timestamp || getFormattedTime(),
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
      }, 240)
    }

    return () => { if (typingTimerRef.current) clearTimeout(typingTimerRef.current) }
  }, [activeBubble, activeBubbleText])

  // ── Lock body scroll ─────────────────────────────────────────────────────
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    document.body.style.height = '100dvh'
    return () => {
      document.body.style.overflow = ''
      document.body.style.height = ''
    }
  }, [])

  // ── Natural Assistant Content Segmenter ──────────────────────────────────
  const segmentAssistantContent = (content: string): string[] => {
    if (!content) return []
    const trimmed = content.trim()
    if (!trimmed) return []

    // 1. Explicit paragraph breaks (\n\n or more)
    if (/\n\s*\n/.test(trimmed)) {
      const parts = trimmed.split(/\n\s*\n/).map(s => s.trim()).filter(s => s.length > 0)
      if (parts.length > 1) {
        return parts.flatMap(p => segmentAssistantContent(p))
      }
    }

    // 2. Explicit line breaks (bullet points or multiline notes)
    if (trimmed.includes('\n')) {
      const lines = trimmed.split('\n').map(s => s.trim()).filter(s => s.length > 0)
      if (lines.length > 1) {
        return lines.flatMap(l => segmentAssistantContent(l))
      }
    }

    // 3. Natural first sentence boundary matching live stream responsiveness
    const sentenceMatch = trimmed.match(/^([^\n.!?]{15,140}[.!?])\s+([\s\S]+)$/)
    if (sentenceMatch) {
      const firstSentence = sentenceMatch[1].trim()
      const remainder = sentenceMatch[2].trim()
      if (firstSentence && remainder) {
        return [firstSentence, ...segmentAssistantContent(remainder)]
      }
    }

    return [trimmed]
  }

  // ── Session init ─────────────────────────────────────────────────────────
  const initSession = async () => {
    try {
      const existingSessionId = sessionStorage.getItem('mb_session_id')
      if (existingSessionId) {
        try {
          const data = await getTranscript(existingSessionId)
          setSessionId(existingSessionId)
          if (data.messages && data.messages.length > 0) {
            const savedRaw = sessionStorage.getItem('mb_chat_history_' + existingSessionId)
            let cachedMessages: Message[] | null = null
            if (savedRaw) {
              try {
                const parsed = JSON.parse(savedRaw)
                if (Array.isArray(parsed) && parsed.length > 0) {
                  cachedMessages = parsed
                }
              } catch (_) {}
            }

            const dbUserCount = data.messages.filter((m: any) => m.role === 'user').length
            const cachedUserCount = cachedMessages ? cachedMessages.filter(m => m.role === 'user').length : 0

            if (cachedMessages && cachedMessages.length > 0 && cachedUserCount === dbUserCount) {
              setMessages(cachedMessages)
              return
            }

            const expandedMessages: Message[] = []
            
            for (let idx = 0; idx < data.messages.length; idx++) {
              const m = data.messages[idx]
              const msgTime = m.timestamp || (m.created_at ? getFormattedTime(m.created_at) : getFormattedTime())
              if (m.role === 'assistant' && m.content) {
                if (idx === 0) {
                  expandedMessages.push({
                    ...m,
                    content: m.content.trim(),
                    timestamp: msgTime,
                    is_new: false,
                    is_last_in_group: true,
                    is_crisis: m.is_crisis,
                    helplines: m.helplines,
                    rag_used: m.rag_used,
                    exercise_trigger: m.exercise_trigger
                  })
                  continue
                }

                const chunks = segmentAssistantContent(m.content)
                chunks.forEach((chunk: string, index: number) => {
                  const isLast = index === chunks.length - 1
                  expandedMessages.push({
                    ...m,
                    content: chunk.trim(),
                    timestamp: msgTime,
                    is_new: false,
                    is_last_in_group: isLast,
                    is_crisis: isLast ? m.is_crisis : false,
                    helplines: isLast ? m.helplines : undefined,
                    rag_used: isLast ? m.rag_used : false,
                    exercise_trigger: isLast ? m.exercise_trigger : undefined
                  })
                })
              } else {
                expandedMessages.push({
                  ...m,
                  timestamp: msgTime,
                  status: 'read',
                  is_new: false
                })
              }
            }
            
            setMessages(expandedMessages)
            return
          }
        } catch (_) { /* invalid session — fall through to new */ }
      }

      setLoading(true)
      const data = await startSession()
      setSessionId(data.session_id)
      sessionStorage.setItem('mb_session_id', data.session_id)

      const welcome = data.message
      if (welcome && welcome !== 'Session started.') {
        setBubbleQueue([{
          content: welcome.trim(),
          timestamp: getFormattedTime(),
          is_last_in_group: true,
        }])
      }
    } catch (_) {
      // silent — user stays on page
    } finally {
      setLoading(false)
    }
  }

  // ── Send message ─────────────────────────────────────────────────────────
  const handleTextSend = async (text?: string) => {
    if (sendingRef.current) return
    const msg = (text || input).trim()
    if (!msg || !sessionId || loading) return
    
    sendingRef.current = true
    setInput('')
    setLoading(true)
    const sentTime = getFormattedTime()
    // Initial state: single tick (sent)
    setMessages(prev => [...prev, { role: 'user', content: msg, via: 'text', is_new: true, timestamp: sentTime, status: 'sent' }])
    if (textareaRef.current) textareaRef.current.style.height = 'auto'

    let fullContent = ''
    let processedChars = 0

    try {
      const doFetch = async (isRetry = false): Promise<Response> => {
        const authToken = getInMemoryToken() || ''
        const res = await fetchWithFailover('/api/consultation/message', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
          },
          credentials: 'include',
          body: JSON.stringify({ session_id: sessionId, message: msg, language }),
        })

        if (res.status === 401 && !isRetry) {
          try {
            const newToken = await refreshToken()
            if (!newToken) throw new Error('AUTH_FAILED')
          } catch {
            throw new Error('AUTH_FAILED')
          }
          return doFetch(true)
        }
        return res
      }

      const res = await doFetch()

      // Mark user message as delivered (double gray ticks) once the server acknowledges
      setMessages(prev => {
        const lastUserIdx = [...prev].reverse().findIndex(m => m.role === 'user')
        if (lastUserIdx !== -1) {
          const idx = prev.length - 1 - lastUserIdx
          if (prev[idx].status === 'sent') {
            const copy = [...prev]
            copy[idx] = { ...copy[idx], status: 'delivered' }
            return copy
          }
        }
        return prev
      })

      if (res.status === 404) {
        sessionStorage.removeItem('mb_session_id')
        sessionStorage.removeItem('mb_chat_history_' + sessionId)
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

              // First token received: update user message to read (double blue ticks)
              setMessages(prev => {
                const lastUserIdx = [...prev].reverse().findIndex(m => m.role === 'user')
                if (lastUserIdx !== -1) {
                  const idx = prev.length - 1 - lastUserIdx
                  if (prev[idx].status !== 'read') {
                    const copy = [...prev]
                    copy[idx] = { ...copy[idx], status: 'read' }
                    return copy
                  }
                }
                return prev
              })

              let unprocessed = fullContent.slice(processedChars)

              if (!firstSegmentQueued) {
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
                    setBubbleQueue(prev => [...prev, { content: segment, timestamp: getFormattedTime() }])
                  }
                  processedChars += splitIdx + skip
                  unprocessed = fullContent.slice(processedChars)
                  firstSegmentQueued = true
                }
              }

              while (firstSegmentQueued && unprocessed.includes('\n\n')) {
                const nnIdx = unprocessed.indexOf('\n\n')
                const segment = unprocessed.slice(0, nnIdx).trim()
                if (segment) {
                  setBubbleQueue(prev => [...prev, { content: segment, timestamp: getFormattedTime() }])
                }
                processedChars += nnIdx + 2
                unprocessed = fullContent.slice(processedChars)
              }
            }
          } catch (_) {}
        }
      }

      const remaining = fullContent.slice(processedChars).trim()
      let finalExerciseTrigger = metadataObj?.exercise_state !== 'idle' ? metadataObj?.exercise_type : undefined
      
      if (metadataObj?.full_text) {
        const match = metadataObj.full_text.match(/<EXERCISE>\s*(.*?)\s*<\/EXERCISE>/i)
        if (match) {
          finalExerciseTrigger = match[1]
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
        timestamp: getFormattedTime(),
      }

      if (remaining) {
        setBubbleQueue(prev => [...prev, { content: remaining, ...responseMeta }])
      } else if (processedChars > 0) {
        setBubbleQueue(prev => {
          if (prev.length > 0) {
            const updated = [...prev]
            updated[updated.length - 1] = { ...updated[updated.length - 1], ...responseMeta }
            return updated
          }
          return prev
        })
      }

      sessionStorage.removeItem('mb_chat_draft')

    } catch (err: any) {
      if (err.message === 'AUTH_FAILED') return
      const remaining = fullContent.slice(processedChars).trim()
      if (remaining) {
        setBubbleQueue(prev => [...prev, { content: remaining, is_last_in_group: false, timestamp: getFormattedTime() }])
      }
      
      setBubbleQueue(prev => [
        ...prev,
        {
          content: "Couldn't reach Mythri right now 🙏 Please try again in a moment.",
          timestamp: getFormattedTime(),
          is_last_in_group: true,
        },
      ])
    } finally {
      setLoading(false)
      sendingRef.current = false
    }
  }

  // ── Computed helpers ─────────────────────────────────────────────────────
  const showLoadingDots = loading && !activeBubble && bubbleQueue.length === 0
  const showMythriLabelOnActive = !messages.length || messages[messages.length - 1].role !== 'assistant'
  const isAiActive = loading || activeBubble !== null

  // ── Textarea auto-resize ─────────────────────────────────────────────────
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    sessionStorage.setItem('mb_chat_draft', e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = `${e.target.scrollHeight}px`
  }

  // ── Language switch ──────────────────────────────────────────────────────
  const changeLanguage = (lang: string) => {
    setLanguage(lang)
    localStorage.setItem('mb_language', lang)
    setLangMenuOpen(false)
    const target = LANGUAGES.find(l => l.code === lang)
    if (target) {
      setLangToast(`Sanctuary language set to ${target.name}`)
      setTimeout(() => setLangToast(null), 2500)
    }
  }

  // ── New chat ─────────────────────────────────────────────────────────────
  const handleNewChat = useCallback(() => {
    sessionStorage.removeItem('mb_session_id')
    setSessionId(null)
    setMessages([])
    setBubbleQueue([])
    setActiveBubble(null)
    setActiveBubbleText('')
    initialized.current = false
    initSession()
  }, [])

  useEffect(() => {
    const handler = () => handleNewChat()
    window.addEventListener('shortcut:new-chat', handler)
    return () => window.removeEventListener('shortcut:new-chat', handler)
  }, [handleNewChat])

  // ── Exit Navigation (Feedback intercept) ─────────────────────────────────
  const handleExitNavigation = async (targetHref: string) => {
    setLangMenuOpen(false)
    if (targetHref === '/feedback') {
      router.push(targetHref)
      return
    }

    try {
      const modeRes = await getFeedbackMode()
      if (modeRes.mode === 'new') {
        const sid = sessionId || sessionStorage.getItem('mb_session_id') || ''
        router.push(`/feedback?from=exit&session_id=${sid}&target=${encodeURIComponent(targetHref)}`)
        return
      }
    } catch {
      // fallback
    }
    router.push(targetHref)
  }

  // ── Main UI ───────────────────────────────────────────────────────────────
  return (
    <div className="relative flex flex-col min-h-[100dvh] w-full">
      <AmbientBackground isAiActive={isAiActive} />
      <ExerciseOverlay exerciseMode={exerciseMode} onClose={() => setExerciseMode(null)} />
      <PersonaOverlay isOpen={personaOpen} onClose={() => setPersonaOpen(false)} profile={userProfile} />

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes msgEnterUser {
          0% { opacity: 0; transform: translateY(6px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes msgEnterAi {
          0% { opacity: 0; transform: translateY(6px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .animate-msg-enter-user { animation: msgEnterUser 0.2s ease-out forwards; }
        .animate-msg-enter-ai { animation: msgEnterAi 0.2s ease-out forwards; }
      `}} suppressHydrationWarning />

      {/* ── Background dismiss overlay for language menu (transparent, zero screen grab) ── */}
      {langMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-transparent"
          onClick={() => setLangMenuOpen(false)}
        />
      )}

      {/* ── Language Confirmation Toast ── */}
      <div
        className={`fixed top-16 left-1/2 -translate-x-1/2 z-50 pointer-events-none transition-all duration-300 ${
          langToast
            ? 'opacity-100 translate-y-0 scale-100'
            : 'opacity-0 -translate-y-2 scale-95 pointer-events-none'
        }`}
      >
        <div className="bg-[#322119] dark:bg-[#1E1B22] text-[#FAF6F0] px-3.5 py-1.5 rounded-full shadow-md flex items-center gap-1.5 border border-[#E3D8CC]/30 text-[11.5px] font-medium backdrop-blur-md">
          <span className="material-symbols-outlined text-[15px] text-[#78B39B]">check_circle</span>
          <span>{langToast}</span>
        </div>
      </div>

      {/* ── Left Sidebar Navigation Rail ── */}
      <SanctuaryNavRail variant="adaptive" />

      {/* ── Top-Left Floating Controls ── */}
      <div className="fixed top-3.5 sm:top-5 left-3 sm:left-6 z-40 flex items-center gap-1.5 sm:gap-2 pointer-events-auto">
        <button
          onClick={() => handleExitNavigation('/home')}
          className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center bg-white/85 dark:bg-[#1E1B22]/85 backdrop-blur-md shadow-xs border border-[#E3D8CC]/80 dark:border-white/10 text-[#322119] dark:text-white/90 hover:scale-105 active:scale-95 transition-all"
          title="Return to Sanctuary"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
        </button>
        <div className="h-8 sm:h-9 px-3 rounded-full bg-white/85 dark:bg-[#1E1B22]/85 backdrop-blur-md shadow-xs border border-[#E3D8CC]/80 dark:border-white/10 flex items-center gap-1.5 select-none">
          <span className="w-1.5 h-1.5 rounded-full bg-[#78B39B] animate-pulse" />
          <span className="font-serif text-[14px] sm:text-[15px] font-medium tracking-tight text-[#322119] dark:text-white/90">Mythri</span>
        </div>
      </div>

      {/* ── Top-Right Floating Controls ── */}
      <div className="fixed top-3.5 sm:top-5 right-3 sm:right-6 z-40 flex items-center gap-1.5 sm:gap-2 pointer-events-auto">
        <div className="h-8 sm:h-9 px-1.5 rounded-full bg-white/85 dark:bg-[#1E1B22]/85 backdrop-blur-md shadow-xs border border-[#E3D8CC]/80 dark:border-white/10 flex items-center gap-0.5 sm:gap-1">
          <ThemeToggle />
          
          {/* Compact Language Selector Button */}
          <button
            onClick={() => setLangMenuOpen(!langMenuOpen)}
            title="Sanctuary Language"
            className={`h-7 px-2 rounded-full flex items-center gap-1 transition-all duration-150 select-none ${
              langMenuOpen
                ? 'bg-[#322119] text-[#FAF6EE] shadow-xs dark:bg-white dark:text-[#322119]'
                : 'text-[#322119] dark:text-white/90 hover:bg-black/5 dark:hover:bg-white/10'
            }`}
          >
            <span className="material-symbols-outlined text-[15px]">translate</span>
            <span className="text-[10.5px] font-bold tracking-wider uppercase">
              {language.split('-')[0]}
            </span>
            <span className={`material-symbols-outlined text-[13px] transition-transform duration-200 ${langMenuOpen ? 'rotate-180' : ''}`}>
              expand_more
            </span>
          </button>
        </div>

        {/* ── Compact Language Dropdown Menu ── */}
        <div
          className={`absolute right-0 top-10 sm:top-11 mt-1 w-38 sm:w-42 rounded-xl bg-white/95 dark:bg-[#1E1B22]/95 backdrop-blur-md shadow-[0_6px_24px_rgba(45,30,20,0.1)] dark:shadow-[0_6px_24px_rgba(0,0,0,0.4)] border border-[#E3D8CC]/80 dark:border-white/10 p-1 origin-top-right transition-all duration-150 z-50 ${
            langMenuOpen
              ? 'scale-100 opacity-100 translate-y-0 pointer-events-auto'
              : 'scale-95 opacity-0 -translate-y-1 pointer-events-none'
          }`}
        >
          <div className="flex flex-col gap-0.5">
            {LANGUAGES.map((lang) => {
              const isSelected = language === lang.code
              return (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => changeLanguage(lang.code)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-[12.5px] transition-colors ${
                    isSelected
                      ? 'bg-[#322119] text-[#FAF6EE] font-medium dark:bg-white dark:text-[#322119]'
                      : 'text-[#322119] dark:text-zinc-200 hover:bg-[#F1E6D7]/60 dark:hover:bg-white/10'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="text-[10px] font-bold opacity-60 uppercase w-4">{lang.badge}</span>
                    <span>{lang.name}</span>
                  </span>
                  {isSelected && (
                    <span className="material-symbols-outlined text-[14px]">check</span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Chat Stream (Editorial Width ~760px) ── */}
      <main
        className={`flex-1 min-h-0 flex flex-col w-full max-w-[760px] mx-auto px-4 pt-20 pb-24 relative z-10 transition-all duration-700 ${exerciseMode ? 'opacity-30 scale-[0.98] blur-[2px] pointer-events-none' : ''}`}
      >
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto py-2 flex flex-col gap-3 hide-scrollbar pr-1"
          onClick={() => { setLangMenuOpen(false) }}
        >
          {/* Subtle date harbor marker */}
          <div className="flex justify-center my-1 select-none">
            <span className="text-[11px] font-medium text-[#8C7B71] dark:text-[#A4978F] bg-[#F1E6D7]/50 dark:bg-white/5 px-3 py-0.5 rounded-full border border-[#E3D8CC]/40 dark:border-white/5">
              Today
            </span>
          </div>

          {/* ── Committed messages ── */}
          {messages.map((m, i) => {
            const showLabel = i === 0 || messages[i - 1].role !== m.role
            return (
              <div
                key={i}
                className={`flex flex-col ${m.role === 'user' ? 'items-end self-end max-w-[82%] sm:max-w-[70%] md:max-w-[56%]' : 'items-start self-start max-w-[86%] sm:max-w-[76%] md:max-w-[64%]'} ${m.is_new ? (m.role === 'user' ? 'animate-msg-enter-user' : 'animate-msg-enter-ai') : ''}`}
              >
                {showLabel && m.role === 'assistant' && (
                  <span className="text-[11.5px] font-medium text-[#7A6C62] dark:text-[#A89D96] mb-1 ml-2 select-none">
                    Mythri
                  </span>
                )}
                {m.role === 'user' ? (
                  <div className="rounded-2xl rounded-tr-xs bg-[#322119] dark:bg-[#251A14] text-[#FAF6F0] px-4 py-2.5 shadow-sm relative group">
                    <p className="text-[14.5px] sm:text-[15px] leading-relaxed text-[#FAF6F0] whitespace-pre-wrap break-words">
                      {m.content}
                    </p>
                    <div className="flex items-center justify-end gap-1 mt-1 -mb-0.5 select-none text-[10.5px] text-[#D8C7B8]/80 font-normal">
                      <span>{m.timestamp || getFormattedTime()}</span>
                      <WhatsAppTick status={m.status || 'read'} />
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-1.5 w-full">
                    <div className="rounded-2xl rounded-tl-xs bg-white/95 dark:bg-[#1C1820]/95 backdrop-blur-md text-[#221B17] dark:text-[#E8E2DD] px-4 py-2.5 sm:px-4.5 sm:py-3 shadow-[0_2px_14px_rgba(50,33,25,0.05)] border border-[#E7DFD5]/90 dark:border-white/10 relative">
                      <p className="text-[14.5px] sm:text-[15px] leading-relaxed text-[#2B231E] dark:text-[#E8E1DA] whitespace-pre-wrap break-words">
                        {m.content}
                      </p>
                      <div className="flex items-center justify-end mt-1 -mb-0.5 select-none text-[10.5px] text-[#9A8B80] dark:text-[#9A918B] font-normal">
                        <span>{m.timestamp || getFormattedTime()}</span>
                      </div>
                    </div>
                    {/* Crisis helplines — only on last bubble of group */}
                    {m.is_last_in_group && m.is_crisis && m.helplines && m.helplines.length > 0 && (
                      <div className="mt-1 p-3.5 bg-error-container/80 backdrop-blur-sm border border-error/20 rounded-xl text-xs">
                        <span className="text-error block mb-1 font-bold flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[15px]">emergency</span> Helpline Information
                        </span>
                        <ul className="list-disc pl-4 space-y-0.5 text-on-error-container">
                          {m.helplines.map((h, hi) => <li key={hi}>{h}</li>)}
                        </ul>
                      </div>
                    )}
                    {/* RAG badge — only on last bubble of group */}
                    {m.is_last_in_group && m.rag_used && (
                      <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-[#8B6250] dark:text-[#CBB8A9] bg-white/60 dark:bg-white/10 px-2.5 py-0.5 rounded-full w-fit border border-[#E3D8CC]/50 dark:border-white/10 shadow-xs">
                        <span className="material-symbols-outlined text-[12px]">library_books</span>
                        <span>Sanctuary Library Referenced</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}

          {/* ── Active bubble (Word-by-word streaming generation) ── */}
          {activeBubble && (
            <div className="flex flex-col items-start self-start max-w-[86%] sm:max-w-[76%] md:max-w-[64%] animate-msg-enter-ai">
              {showMythriLabelOnActive && (
                <span className="text-[11.5px] font-medium text-[#7A6C62] dark:text-[#A89D96] mb-1 ml-2 select-none">Mythri</span>
              )}
              <div className="rounded-2xl rounded-tl-xs bg-white/95 dark:bg-[#1C1820]/95 backdrop-blur-md text-[#221B17] dark:text-[#E8E2DD] px-4 py-2.5 sm:px-4.5 sm:py-3 shadow-[0_2px_14px_rgba(50,33,25,0.05)] border border-[#E7DFD5]/90 dark:border-white/10 relative w-full">
                <p className="text-[14.5px] sm:text-[15px] leading-relaxed text-[#2B231E] dark:text-[#E8E1DA] whitespace-pre-wrap break-words">
                  {activeBubbleText}
                  <span className="inline-block w-1.5 h-3.5 ml-1 bg-[#8B6250]/70 dark:bg-white/60 animate-pulse align-middle rounded-full" />
                </p>
                <div className="flex items-center justify-end mt-1 -mb-0.5 select-none text-[10.5px] text-[#9A8B80] dark:text-[#9A918B] font-normal">
                  <span>{activeBubble.timestamp || getFormattedTime()}</span>
                </div>
              </div>
            </div>
          )}

          {/* ── Responding Typing Indicator (dots while connecting/waiting) ── */}
          {(showLoadingDots || (isTyping && !loading && !activeBubble)) && (
            <TypingIndicator />
          )}

          <div ref={bottomRef} className="h-6 shrink-0" />
        </div>
      </main>

      {/* ── Floating Input Composer (No Footer Div) ── */}
      <div className={`fixed bottom-4 sm:bottom-6 inset-x-0 z-40 flex justify-center px-4 pointer-events-none transition-all duration-700 ${exerciseMode ? 'opacity-30 pointer-events-none' : ''}`}>
        <div className="w-full max-w-[760px] pointer-events-auto">
          <div className="relative flex items-center gap-2 bg-white/95 dark:bg-[#1E1B22]/95 backdrop-blur-md rounded-full shadow-[0_8px_30px_rgba(45,30,20,0.08)] border border-[#E3D8CC]/80 dark:border-white/10 p-1.5 pl-4 sm:pl-5 transition-all focus-within:shadow-[0_8px_32px_rgba(45,30,20,0.14)] focus-within:border-[#8B6250]/50">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleTextareaChange}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleTextSend() } }}
              className="flex-1 bg-transparent border-none focus:ring-0 text-[15px] py-2 resize-none max-h-24 hide-scrollbar text-[#2C2724] dark:text-[#FAF6F0] placeholder:text-[#9A8A80]/70 focus:outline-none"
              placeholder={inputPlaceholder}
              rows={1}
            />
            <div className="flex items-center gap-1.5 pr-1 flex-shrink-0">
              <button
                onClick={() => router.push('/voice-chat')}
                title="Voice Conversation"
                className="w-9 h-9 rounded-full flex items-center justify-center text-[#8B6250] hover:bg-[#F1E6D7]/60 dark:hover:bg-white/10 active:scale-95 transition-all"
              >
                <span className="material-symbols-outlined text-[20px]">mic</span>
              </button>
              <button
                onClick={() => handleTextSend()}
                disabled={!input.trim() || loading}
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-150 shadow-sm ${
                  !input.trim() || loading
                    ? 'bg-[#49362D]/20 text-white/50 cursor-not-allowed shadow-none'
                    : 'bg-[#322119] dark:bg-[#49362D] text-[#FAF6F0] hover:scale-105 active:scale-95 hover:shadow-md'
                }`}
                title="Send message"
              >
                <span className="material-symbols-outlined text-[19px]">arrow_upward</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
