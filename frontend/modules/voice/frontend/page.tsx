'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { startSession, sendVoiceMessage, getTranscript } from '@/core/api'
import { useMitraStore } from '@/shared/stores/mitraStore'
import ExerciseOverlay from '@/shared/components/ExerciseOverlay'

type ConvState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'paused'

const SILENCE_THRESHOLD = 0.05
const SILENCE_MS = 3000

const translations = {
  en: { statusSpeak: "MYTHRI IS SPEAKING", statusListen: "LISTENING", statusThink: "THINKING", statusMute: "MICROPHONE MUTED", statusPause: "PAUSED", titleListen: "I'm listening to you.", titleThink: "The Space Between Thoughts", titlePause: "Conversation Paused", titleIdle: "Mythri is resting" },
  hi: { statusSpeak: "मैत्री बोल रही है", statusListen: "सुन रही है", statusThink: "सोच रही है", statusMute: "माइक्रोफोन म्यूट है", statusPause: "रुका हुआ", titleListen: "मैं आपको सुन रही हूँ।", titleThink: "विचारों के बीच की जगह", titlePause: "बातचीत रुकी हुई है", titleIdle: "मैत्री आराम कर रही है" },
  te: { statusSpeak: "మైత్రి మాట్లాడుతోంది", statusListen: "వింటుంది", statusThink: "ఆలోచిస్తోంది", statusMute: "మైక్రోఫోన్ మ్యూట్ చేయబడింది", statusPause: "పాజ్ చేయబడింది", titleListen: "నేను వింటున్నాను.", titleThink: "ఆలోచనల మధ్య ఖాళీ", titlePause: "సంభాషణ పాజ్ చేయబడింది", titleIdle: "మైత్రి విశ్రాంతి తీసుకుంటోంది" },
  ta: { statusSpeak: "மைத்ரி பேசுகிறார்", statusListen: "கேட்கிறது", statusThink: "சிந்திக்கிறது", statusMute: "மைக்ரோஃபோன் ஒலியடக்கப்பட்டது", statusPause: "இடைநிறுத்தப்பட்டது", titleListen: "நான் கேட்கிறேன்.", titleThink: "எண்ணங்களுக்கு இடையே உள்ள இடைவெளி", titlePause: "உரையாடல் இடைநிறுத்தப்பட்டது", titleIdle: "மைத்ரி ஓய்வெடுக்கிறார்" }
}

export default function VoiceModePage() {
  const router = useRouter()

  const [sessionId, setSessionId] = useState<string | null>(null)
  const [convState, setConvState] = useState<ConvState>('listening')
  const [isMuted, setIsMuted] = useState(false)
  const [isPaused, setIsPaused] = useState(false)

  const [userTranscript, setUserTranscript] = useState<string>('')
  const [agentResponse, setAgentResponse] = useState<string>('')

  const [langMenuOpen, setLangMenuOpen] = useState(false)
  const [mainMenuOpen, setMainMenuOpen] = useState(false)
  const [exerciseMode, setExerciseMode] = useState<string | null>(null)
  const [currentLang, setCurrentLang] = useState<'en' | 'hi' | 'te' | 'ta'>('en')

  const initialized = useRef(false)
  const streamRef = useRef<MediaStream | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const maxDurationTimerRef = useRef<NodeJS.Timeout | null>(null)
  const isListeningRef = useRef(false)
  const isSpeakingRef = useRef(false)
  const isAssistantSpeakingRef = useRef(false)
  const voiceSessionIdRef = useRef<number>(0)
  const animFrameRef = useRef<number>(0)
  const sessionIdRef = useRef<string | null>(null)
  const languageRef = useRef('en-IN')
  const isMutedRef = useRef(false)
  const activeAudioSourceRef = useRef<AudioBufferSourceNode | null>(null)

  const canvasRef = useRef<HTMLCanvasElement>(null)

  const mitraStore = useMitraStore()

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('mb_token') : null
    if (!token) {
      router.replace('/login')
      return
    }

    const handleLangChange = () => {
      const newLang = localStorage.getItem('mb_language') || 'en-IN'
      languageRef.current = newLang
      if (newLang.startsWith('hi')) setCurrentLang('hi')
      else if (newLang.startsWith('te')) setCurrentLang('te')
      else if (newLang.startsWith('ta')) setCurrentLang('ta')
      else setCurrentLang('en')
    }

    handleLangChange()
    window.addEventListener('mb_language_changed', handleLangChange)

    if (!initialized.current) {
      initialized.current = true
      initSession()
    }

    return () => {
      window.removeEventListener('mb_language_changed', handleLangChange)
      stopVoice()
    }
  }, [router])

  const initSession = async () => {
    try {
      const existingSessionId = sessionStorage.getItem('mb_session_id')
      if (existingSessionId) {
        try {
          await getTranscript(existingSessionId)
          setSessionId(existingSessionId)
          sessionIdRef.current = existingSessionId
          startVoice()
          return
        } catch (e) {
          // Invalid session, fallback to new
        }
      }
      const data = await startSession()
      setSessionId(data.session_id)
      sessionIdRef.current = data.session_id
      sessionStorage.setItem('mb_session_id', data.session_id)
      startVoice()
    } catch {
      router.replace('/home')
    }
  }

  const toggleMute = () => {
    const nextMuted = !isMuted
    if (streamRef.current) {
      streamRef.current.getAudioTracks().forEach(track => {
        track.enabled = !nextMuted
      })
    }
    setIsMuted(nextMuted)
    isMutedRef.current = nextMuted

    if (nextMuted) {
      if (isListeningRef.current) {
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current)
          silenceTimerRef.current = null
        }
        flushChunk()
      }
    } else {
      if (activeAudioSourceRef.current) {
        activeAudioSourceRef.current.stop()
        activeAudioSourceRef.current = null
      }
      if (!isListeningRef.current && !isPaused) {
        isListeningRef.current = true
        setConvState('listening')
        mitraStore.setState('listening')
        startChunk()
      }
    }
  }

  const togglePause = () => {
    if (isPaused) {
      setIsPaused(false)
      setConvState('listening')
      mitraStore.setState('listening')
      isListeningRef.current = true
      startChunk()
    } else {
      setIsPaused(true)
      setConvState('paused')
      mitraStore.setState('idle')
      isListeningRef.current = false
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current)
        silenceTimerRef.current = null
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.onstop = null
        mediaRecorderRef.current.stop()
      }
    }
  }

  const startVoice = async () => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices) return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } })
      streamRef.current = stream
      isListeningRef.current = true
      isSpeakingRef.current = false
      voiceSessionIdRef.current += 1

      setConvState('listening')
      mitraStore.setState('listening')

      const { audioCtx, analyser } = initAudio()
      const source = audioCtx.createMediaStreamSource(stream)
      source.connect(analyser)

      startChunk()
      startVisualizer()
    } catch (err) {
      console.error(err)
      alert('Mythri needs microphone access to hear you.')
    }
  }

  const initAudio = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume()
    }
    if (!analyserRef.current) {
      const analyser = audioCtxRef.current.createAnalyser()
      analyser.fftSize = 256
      analyser.smoothingTimeConstant = 0.85
      const dummyGain = audioCtxRef.current.createGain()
      dummyGain.gain.value = 0
      analyser.connect(dummyGain)
      dummyGain.connect(audioCtxRef.current.destination)
      analyserRef.current = analyser
    }
    return { audioCtx: audioCtxRef.current, analyser: analyserRef.current }
  }

  const processVoiceTurn = async (blob: Blob, currentVoiceSession: number) => {
    const sid = sessionIdRef.current
    if (!sid) return

    setConvState('thinking')
    mitraStore.setState('curious')

    const formData = new FormData()
    formData.append('audio', blob, 'audio.webm')
    formData.append('language', languageRef.current)
    formData.append('session_id', sid)

    try {
      const data = await sendVoiceMessage(sid, formData)

      if (data.transcript && data.transcript !== "[Silence]") {
        setUserTranscript(data.transcript)
      }

      let match = null
      if (data.response) {
        let cleanResponse = data.response
        match = cleanResponse.match(/\[EXERCISE:\s*(.*?)\]/i)
        if (match) {
          setExerciseMode(match[1].toUpperCase())
          cleanResponse = cleanResponse.replace(/\[EXERCISE:\s*(.*?)\]/gi, '').trim()

          if (!isPaused) {
            setIsPaused(true)
            setConvState('paused')
            mitraStore.setState('idle')
            isListeningRef.current = false
            if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
              mediaRecorderRef.current.onstop = null
              mediaRecorderRef.current.stop()
            }
          }
        }
        setAgentResponse(cleanResponse)
      }

      if (data.audio_b64 && (isListeningRef.current || match)) {
        setConvState('speaking')
        mitraStore.setState('comforting')
        isAssistantSpeakingRef.current = true

        await playWav(data.audio_b64)

        isAssistantSpeakingRef.current = false
      }
    } catch (e) {
      console.error(e)
    } finally {
      if (isListeningRef.current && voiceSessionIdRef.current === currentVoiceSession && !isMutedRef.current) {
        setConvState('listening')
        mitraStore.setState('listening')
        startChunk()
      } else if (!isPaused) {
        isListeningRef.current = false
        setConvState('idle')
        mitraStore.setState('idle')
      }
    }
  }

  const playWav = async (data: ArrayBuffer | Uint8Array | string) => {
    try {
      const { audioCtx, analyser } = initAudio()
      let arrayBuffer: ArrayBuffer
      if (typeof data === 'string') {
        const binary = atob(data); const bytes = new Uint8Array(binary.length)
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
        arrayBuffer = bytes.buffer
      } else if (data instanceof Uint8Array) {
        arrayBuffer = new Uint8Array(data).buffer as ArrayBuffer
      } else {
        arrayBuffer = data as ArrayBuffer
      }
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer)
      const source = audioCtx.createBufferSource()
      source.buffer = audioBuffer
      source.connect(analyser)
      source.connect(audioCtx.destination)
      activeAudioSourceRef.current = source
      const playPromise = new Promise((resolve) => {
        source.onended = () => {
          source.disconnect()
          if (activeAudioSourceRef.current === source) {
            activeAudioSourceRef.current = null
          }
          resolve(true)
        }
      })
      source.start(0)
      return playPromise
    } catch (err) { return Promise.resolve(false) }
  }

  const stopVoice = () => {
    isListeningRef.current = false
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
    if (maxDurationTimerRef.current) clearTimeout(maxDurationTimerRef.current)
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.onstop = null
      mediaRecorderRef.current.stop()
    }
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null

    if (activeAudioSourceRef.current) {
      activeAudioSourceRef.current.stop()
      activeAudioSourceRef.current.disconnect()
      activeAudioSourceRef.current = null
    }

    setConvState('idle')
    mitraStore.setState('idle')
  }

  const handleStopConversation = () => {
    stopVoice()
    router.push('/text-chat')
  }

  useEffect(() => {
    const handleShortcutMute = () => toggleMute()
    const handleShortcutEndCall = () => handleStopConversation()
    window.addEventListener('shortcut:toggle-mute', handleShortcutMute)
    window.addEventListener('shortcut:end-call', handleShortcutEndCall)
    return () => {
      window.removeEventListener('shortcut:toggle-mute', handleShortcutMute)
      window.removeEventListener('shortcut:end-call', handleShortcutEndCall)
    }
  }, [isMuted, isPaused, toggleMute, handleStopConversation])

  const startChunk = () => {
    if (!streamRef.current || !isListeningRef.current) return
    try {
      const types = ['audio/webm', 'audio/mp4', 'audio/ogg', '']
      let selectedType = ''
      for (const t of types) {
        if (t === '' || MediaRecorder.isTypeSupported(t)) {
          selectedType = t
          break
        }
      }
      const options = selectedType ? { mimeType: selectedType } : {}
      const recorder = new MediaRecorder(streamRef.current, options)
      const chunks: BlobPart[] = []
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data) }
      recorder.onstop = async () => {
        if (chunks.length > 0 && isListeningRef.current) {
          const blob = new Blob(chunks, { type: selectedType || recorder.mimeType || 'audio/webm' })
          await processVoiceTurn(blob, voiceSessionIdRef.current)
        }
      }
      recorder.start(250)
      mediaRecorderRef.current = recorder

      if (maxDurationTimerRef.current) clearTimeout(maxDurationTimerRef.current)
      // Removed 28s auto-flush to allow natural conversation length until silence.
    } catch (e) {
      console.error(e)
    }
  }

  const startVisualizer = () => {
    const analyser = analyserRef.current
    if (!analyser) return
    const freqData = new Uint8Array(analyser.frequencyBinCount)
    const timeData = new Float32Array(analyser.fftSize)

    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return

    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)

    const tick = () => {
      analyser.getByteFrequencyData(freqData)
      analyser.getFloatTimeDomainData(timeData)
      let sum = 0
      for (let i = 0; i < timeData.length; i++) sum += timeData[i] * timeData[i]
      const rms = Math.sqrt(sum / timeData.length)
      const isVoiceDetected = rms > SILENCE_THRESHOLD

      // Handle silence detection logic
      if (isListeningRef.current && !isMutedRef.current) {
        if (isVoiceDetected) {
          if (!isSpeakingRef.current) isSpeakingRef.current = true
          if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null }
        } else {
          if (!silenceTimerRef.current && isSpeakingRef.current) {
            silenceTimerRef.current = setTimeout(() => {
              silenceTimerRef.current = null
              if (isListeningRef.current) flushChunk()
            }, SILENCE_MS)
          }
        }
      }

      // Draw visualization
      ctx.clearRect(0, 0, 256, 256)

      const isActuallySpeaking = (isListeningRef.current && !isMutedRef.current) || isAssistantSpeakingRef.current

      const centerX = 128
      const centerY = 128
      const radiusBase = 68

      const points = 64
      const timeSec = Date.now() / 1000

      ctx.lineCap = 'round'
      ctx.lineWidth = 4
      ctx.strokeStyle = 'rgba(122, 74, 95, 0.7)'

      for (let i = 0; i < points; i++) {
        const angle = (i / points) * Math.PI * 2
        let barHeight = 2 // Base dot size

        if (isActuallySpeaking) {
          // Symmetric mapping: left side and right side mirror each other
          const distFromCenter = Math.abs(i - points / 2)
          // Map to frequency bins (using lower 50% of spectrum for voice frequencies)
          const dataIndex = Math.floor((distFromCenter / (points / 2)) * (freqData.length * 0.5))
          const val = freqData[dataIndex] / 255.0

          barHeight += val * 45 // Extend up to 45px outward
        } else {
          // Soft breathing idle animation for the dots
          const noise = Math.sin(timeSec * 2 + angle * 4) * 2
          barHeight += Math.max(0, noise)
        }

        const innerX = centerX + radiusBase * Math.cos(angle - Math.PI / 2)
        const innerY = centerY + radiusBase * Math.sin(angle - Math.PI / 2)

        const outerX = centerX + (radiusBase + barHeight) * Math.cos(angle - Math.PI / 2)
        const outerY = centerY + (radiusBase + barHeight) * Math.sin(angle - Math.PI / 2)

        ctx.beginPath()
        ctx.moveTo(innerX, innerY)
        ctx.lineTo(outerX, outerY)
        ctx.stroke()
      }

      animFrameRef.current = requestAnimationFrame(tick)
    }

    animFrameRef.current = requestAnimationFrame(tick)
  }

  const flushChunk = () => {
    if (maxDurationTimerRef.current) {
      clearTimeout(maxDurationTimerRef.current)
      maxDurationTimerRef.current = null
    }
    const recorder = mediaRecorderRef.current
    if (!recorder || recorder.state === 'inactive') return
    recorder.stop()
    isSpeakingRef.current = false
  }

  const changeLanguage = (lang: 'en' | 'hi' | 'te' | 'ta') => {
    setCurrentLang(lang)
    let code = 'en-IN'
    if (lang === 'hi') code = 'hi-IN'
    if (lang === 'te') code = 'te-IN'
    if (lang === 'ta') code = 'ta-IN'
    localStorage.setItem('mb_language', code)
    languageRef.current = code
    window.dispatchEvent(new Event('mb_language_changed'))
    setLangMenuOpen(false)
  }

  const t = translations['en']
  let currentStatusText = t.statusListen
  if (convState === 'thinking') currentStatusText = t.statusThink
  else if (convState === 'speaking') currentStatusText = t.statusSpeak
  else if (isPaused) currentStatusText = t.statusPause
  else if (isMuted) currentStatusText = t.statusMute
  else if (convState === 'idle') currentStatusText = "IDLE"

  let currentTitle = t.titleListen
  if (isPaused) currentTitle = t.titlePause
  else if (convState === 'thinking') currentTitle = t.titleThink
  else if (convState === 'idle') currentTitle = t.titleIdle

  return (
    <>
      <ExerciseOverlay
        exerciseMode={exerciseMode}
        onClose={() => {
          setExerciseMode(null)
          setIsPaused(false)
          setConvState('listening')
          mitraStore.setState('listening')
          isListeningRef.current = true
          startChunk()
        }}
      />
      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes orb-breathe {
            0%, 100% { transform: scale(1); box-shadow: 0 0 20px rgba(122, 74, 95, 0.2); }
            50% { transform: scale(1.05); box-shadow: 0 0 35px rgba(122, 74, 95, 0.4); }
        }
        @keyframes orb-listen {
            0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(122, 74, 95, 0.4); }
            70% { transform: scale(1.1); box-shadow: 0 0 0 30px rgba(122, 74, 95, 0); }
            100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(122, 74, 95, 0); }
        }
        @keyframes orb-think {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        @keyframes orb-speak {
            0%, 100% { transform: scale(1); box-shadow: 0 0 30px rgba(122, 74, 95, 0.4); }
            50% { transform: scale(1.15); box-shadow: 0 0 60px rgba(122, 74, 95, 0.7); }
        }
        
        .state-idle .orb { animation: orb-breathe 4s infinite ease-in-out; }
        .state-listening .orb { animation: orb-listen 2s infinite cubic-bezier(0.2, 0.8, 0.2, 1); }
        .state-speaking .orb { animation: orb-speak 4s infinite ease-in-out; }
        .state-paused .orb { animation: orb-breathe 6s infinite ease-in-out; filter: grayscale(50%); }
        
        .state-thinking .orb-ring {
            border: 2px dashed rgba(122, 74, 95, 0.5);
            animation: orb-think 4s linear infinite;
            opacity: 1;
        }

        .orb-ring {
            position: absolute;
            inset: -12px;
            border-radius: 50%;
            border: 2px solid transparent;
            opacity: 0;
            transition: all 0.5s ease;
        }
        
        .bg-gradient-voice {
            background-color: #fff8f5;
        }
      `}} />
      <div className={`bg-gradient-voice h-[100dvh] flex flex-col items-center justify-between overflow-hidden fixed inset-0 state-${convState}`}>

        {/* Background Atmospheric Shader */}
        <div className="absolute inset-0 z-0 pointer-events-none grain-overlay opacity-[0.04] mix-blend-overlay" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E\")" }}></div>
        <div className="absolute rounded-full filter blur-[80px] opacity-40 z-0 pointer-events-none bg-secondary-fixed w-96 h-96 top-[10%] left-[-10%]"></div>
        <div className="absolute rounded-full filter blur-[80px] opacity-40 z-0 pointer-events-none bg-tertiary-fixed w-96 h-96 bottom-[10%] right-[-10%]"></div>
        <div className="absolute rounded-full filter blur-[80px] opacity-30 z-0 pointer-events-none bg-primary-fixed-dim w-[500px] h-[500px] top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2"></div>

        {/* TopAppBar */}
        <nav className="fixed top-0 w-full z-50 flex justify-between items-center px-4 md:px-margin-desktop py-4 md:py-6 bg-transparent animate-fade-in-up">
          <div className="text-headline-md font-headline-md font-medium text-primary ml-2">Mythri</div>
          <div className="flex gap-3 md:gap-4 items-center relative mr-2">
            <button onClick={() => { setLangMenuOpen(!langMenuOpen); setMainMenuOpen(false) }} className="material-symbols-outlined text-on-surface-variant hover:bg-surface-container-high p-2 rounded-full transition-colors">language</button>
            <button onClick={() => { setMainMenuOpen(!mainMenuOpen); setLangMenuOpen(false) }} className="hidden md:block material-symbols-outlined text-on-surface-variant hover:bg-surface-container-high p-2 rounded-full transition-colors">grid_view</button>
            <button onClick={() => router.replace('/text-chat')} className="md:hidden material-symbols-outlined text-on-surface-variant hover:bg-surface-container-high p-2 rounded-full transition-colors">close</button>
          </div>

          {/* Desktop Main Menu */}
          <nav className={`absolute right-4 md:right-8 top-[100%] mt-2 w-56 bg-white/70 backdrop-blur-3xl border border-white/50 shadow-2xl rounded-2xl flex-col p-2 gap-1 origin-top transition-all duration-300 hidden md:flex ${mainMenuOpen ? 'scale-y-100 opacity-100 pointer-events-auto' : 'scale-y-0 opacity-0 pointer-events-none'}`}>
            <Link href="/home" className="text-on-surface-variant hover:bg-white/60 transition-colors px-4 py-2.5 rounded-xl flex items-center gap-3 font-label-md">
              <span className="material-symbols-outlined text-[20px]">home</span> Sanctuary
            </Link>
            <Link href="/text-chat" className="text-on-surface-variant hover:bg-white/60 transition-colors px-4 py-2.5 rounded-xl flex items-center gap-3 font-label-md">
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
          <div className={`absolute right-16 md:right-20 top-[100%] mt-2 w-40 bg-white/70 backdrop-blur-3xl border border-white/50 shadow-2xl rounded-2xl flex flex-col p-2 gap-1 origin-top-right transition-all duration-300 ${langMenuOpen ? 'scale-100 opacity-100 pointer-events-auto' : 'scale-95 opacity-0 pointer-events-none'}`}>
            <button onClick={() => changeLanguage('en')} className={`transition-colors px-4 py-2 rounded-xl text-left font-label-md ${currentLang === 'en' ? 'text-primary font-bold bg-white/80 hover:bg-white/90' : 'text-on-surface-variant hover:bg-white/60'}`}>English</button>
            <button onClick={() => changeLanguage('hi')} className={`transition-colors px-4 py-2 rounded-xl text-left font-label-md ${currentLang === 'hi' ? 'text-primary font-bold bg-white/80 hover:bg-white/90' : 'text-on-surface-variant hover:bg-white/60'}`}>Hindi</button>
            <button onClick={() => changeLanguage('te')} className={`transition-colors px-4 py-2 rounded-xl text-left font-label-md ${currentLang === 'te' ? 'text-primary font-bold bg-white/80 hover:bg-white/90' : 'text-on-surface-variant hover:bg-white/60'}`}>Telugu</button>
            <button onClick={() => changeLanguage('ta')} className={`transition-colors px-4 py-2 rounded-xl text-left font-label-md ${currentLang === 'ta' ? 'text-primary font-bold bg-white/80 hover:bg-white/90' : 'text-on-surface-variant hover:bg-white/60'}`}>Tamil</button>
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex-1 w-full flex flex-col items-center justify-center z-10 px-4 h-full pb-16 md:pb-20 pt-20 animate-fade-in-up relative">
          <div className="text-center transition-opacity duration-500">
            <p className={`text-label-md font-label-md opacity-60 tracking-[0.2em] uppercase ${isMuted ? 'text-error' : 'text-primary'}`}>
              {currentStatusText}
            </p>
          </div>

          <div className="relative flex flex-shrink-0 items-center justify-center w-64 h-64 my-6 md:my-12">
            <div className="orb-ring"></div>
            <div className="orb w-32 h-32 rounded-full bg-gradient-to-br from-primary-fixed to-secondary-fixed-dim shadow-lg flex items-center justify-center relative z-10 transition-all duration-700">
              <div className="absolute inset-0 rounded-full bg-white/30 mix-blend-overlay"></div>
              <div className="w-16 h-16 rounded-full bg-primary/10 backdrop-blur-sm mix-blend-multiply"></div>
            </div>
            <canvas ref={canvasRef} width="256" height="256" className={`absolute inset-0 w-full h-full object-contain z-20 pointer-events-none transition-opacity duration-400 ${convState === 'listening' || convState === 'speaking' ? 'opacity-100' : 'opacity-0'}`}></canvas>
          </div>

          <div className="text-center max-w-lg w-full flex flex-col items-center gap-4 md:gap-6">
            <h1 className="text-headline-lg font-headline-md text-primary transition-opacity duration-500" style={{ opacity: convState === 'thinking' ? 0.4 : 1 }}>
              {currentTitle}
            </h1>

            <div className="flex flex-col items-center gap-2 w-full text-body-md md:text-body-lg font-body-md text-on-surface-variant min-h-[60px] md:min-h-[80px] max-h-[25vh] overflow-y-auto px-2">
              <p className="font-medium text-on-surface-variant italic opacity-70">
                {userTranscript ? `"${userTranscript}"` : ""}
              </p>
              <p className="font-medium text-primary">
                {agentResponse}
              </p>
            </div>
          </div>
        </main>

        {/* Controls Footer */}
        <footer className="w-full pb-12 md:pb-16 pt-4 flex flex-col items-center z-20 fixed bottom-0 bg-gradient-to-t from-[#fff8f5] via-[#fff8f5]/90 to-transparent transition-transform duration-600">
          <div className="flex items-center gap-8 md:gap-16 justify-center">
            <button onClick={toggleMute} disabled={isPaused} className="group flex flex-col items-center gap-2 disabled:opacity-50">
              <div className={`w-12 h-12 md:w-14 md:h-14 rounded-full border flex items-center justify-center transition-transform duration-150 active:scale-[0.98] hover:scale-[1.02] shadow-sm backdrop-blur-md ${isMuted ? 'border-error text-error bg-error/10' : 'border-outline/30 text-on-surface-variant group-hover:bg-white/60 group-hover:border-outline/50'}`}>
                <span className="material-symbols-outlined text-[22px] md:text-[26px]" style={{ fontVariationSettings: isMuted ? "'FILL' 1" : "'FILL' 0" }}>
                  {isMuted ? 'mic_off' : 'mic'}
                </span>
              </div>
            </button>

            <button onClick={togglePause} className="group relative flex items-center justify-center mx-2 md:mx-0">
              <div className="absolute inset-0 bg-primary opacity-5 rounded-full scale-125 md:scale-150 blur-xl transition-all group-hover:scale-150 md:group-hover:scale-[1.7]"></div>
              <div className={`w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center transition-transform duration-150 active:scale-[0.98] hover:scale-[1.02] shadow-lg relative z-10 ${isPaused ? 'bg-transparent text-primary border-2 border-primary/50' : 'bg-primary text-on-primary hover:bg-primary/90 shadow-primary/20'}`}>
                <span className="material-symbols-outlined text-[28px] md:text-[36px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                  {isPaused ? 'play_arrow' : 'pause'}
                </span>
              </div>
            </button>

            <button onClick={handleStopConversation} className="group flex flex-col items-center gap-2">
              <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-error/10 border border-error/20 flex items-center justify-center text-error hover:bg-error hover:text-on-error transition-transform duration-150 active:scale-[0.98] hover:scale-[1.02] shadow-sm backdrop-blur-md">
                <span className="material-symbols-outlined text-[22px] md:text-[26px]" style={{ fontVariationSettings: "'FILL' 1" }}>call_end</span>
              </div>
            </button>
          </div>
          {/* Removed the hint text since idle state is not fully implemented in the same way, we just rely on pause/mute */}
        </footer>
      </div>
    </>
  )
}
