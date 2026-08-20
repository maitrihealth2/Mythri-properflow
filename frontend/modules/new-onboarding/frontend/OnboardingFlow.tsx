'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { submitOnboarding } from '@/core/api'
import ChoiceBubble from './components/ChoiceBubble'
import { onboardingService, OnboardingMessage, OnboardingState } from './services/onboardingService'
import MythriAura from '@/shared/components/MythriAura'

type ConsentData = {
  eligibility: boolean
}

type ConversationEntry = {
  id: string
  role: 'assistant' | 'user'
  content: string
  choices?: string[]
}

export default function OnboardingFlow() {
  const router = useRouter()
  
  // Phase 0 = Consent, 1 = Conversation, 2 = Completing
  const [phase, setPhase] = useState<0 | 1 | 2>(0)
  const [consent, setConsent] = useState<ConsentData>({ eligibility: false })
  
  const [history, setHistory] = useState<ConversationEntry[]>([])
  const [isTyping, setIsTyping] = useState(false)
  const [currentChoices, setCurrentChoices] = useState<string[] | undefined>()
  
  const bottomRef = useRef<HTMLDivElement>(null)

  // Start conversation after consent
  const startConversation = async () => {
    setPhase(1)
    setIsTyping(true)
    const initial = await onboardingService.getInitialGreeting()
    setIsTyping(false)
    setHistory([initial])
    setCurrentChoices(initial.choices)
  }

  // Handle user making a choice or typing (we'll stick to choices for this mock)
  const handleChoice = async (choice: string) => {
    // 1. Add user choice to history
    const userEntry: ConversationEntry = { id: Date.now().toString(), role: 'user', content: choice }
    setHistory(prev => [...prev, userEntry])
    setCurrentChoices(undefined) // Hide choices while loading
    setIsTyping(true)
    
    // 2. Send to service
    const { response, state } = await onboardingService.sendMessage(choice)
    
    setIsTyping(false)
    setHistory(prev => [...prev, response])
    
    if (state.isComplete) {
      setPhase(2)
      finishOnboarding()
    } else {
      setCurrentChoices(response.choices)
    }
  }

  const finishOnboarding = async () => {
    try {
      // Create a dummy payload to satisfy the API
      const dataPayload = {
        preferred_name: "Traveler", // In a real app, this is extracted from the conversation
        language: "en-IN",
        conversation_style: "Listen quietly",
        communication_mode: "Text",
        initial_emotion: "Exploring",
        primary_goal: "Self-discovery",
        check_in_preference: "Weekly",
        goals: ["Understanding"],
        reasons: ["Exploring"],
        consent: {
          consented: true,
          consentedAt: new Date().toISOString()
        }
      }

      await submitOnboarding(dataPayload)
      localStorage.setItem('mb_username', 'Traveler')
      
      // Artificial delay for smooth transition
      setTimeout(() => {
        router.push('/text-chat')
      }, 2000)
    } catch (e) {
      console.error("Failed to submit onboarding data:", e)
      router.push('/text-chat') // Fallback
    }
  }

  // Auto-scroll
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [history, isTyping])

  if (phase === 0) {
    return (
      <div className="flex-1 w-full flex items-center justify-center relative overflow-hidden min-h-[100dvh] bg-[#FFFDF9] dark:bg-[#141218]">
        {/* Abstract Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#FFFDF9] via-[#FDF5F2] to-[#F5E6E1] dark:from-[#141218] dark:via-[#1A161E] dark:to-[#221A21] z-0" />
        <div className="absolute top-[-10%] right-[-10%] w-[60vw] h-[60vw] rounded-full blur-[120px] bg-primary-container/10 z-0 pointer-events-none" />
        
        <main className="relative z-10 w-full max-w-lg m-auto px-6 py-12 flex flex-col items-center">
          <div className="frosted-card rounded-3xl p-8 w-full flex flex-col shadow-sm">
            <h1 className="text-primary font-headline-md text-3xl mb-2 text-center">Sanctuary</h1>
            <h2 className="text-on-surface-variant font-headline-sm text-center mb-8">Before we begin</h2>
            
            <p className="text-on-surface-variant font-body-md mb-6 leading-relaxed">
              Mythri is a safe space for reflection. By entering, you agree to our data and privacy principles, ensuring your thoughts remain yours.
            </p>

            <div className="space-y-4 text-on-surface font-body-sm bg-white/40 dark:bg-black/20 p-5 rounded-2xl border border-outline-variant/30">
              <label className="flex items-start space-x-4 cursor-pointer group">
                <input 
                  type="checkbox" 
                  className="mt-1 w-5 h-5 rounded border-outline text-primary focus:ring-primary accent-primary" 
                  checked={consent.eligibility} 
                  onChange={(e) => setConsent({...consent, eligibility: e.target.checked})} 
                />
                <span className="text-base text-on-surface-variant group-hover:text-primary transition-colors">
                  I confirm that I am 18 years of age or older and agree to the Terms of Service.
                </span>
              </label>
            </div>

            <button 
              onClick={startConversation} 
              disabled={!consent.eligibility}
              className="mt-10 py-4 w-full bg-primary text-white rounded-full font-label-md transition-all hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100 shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
            >
              Enter Sanctuary <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </button>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="flex-1 w-full min-h-[100dvh] bg-[#FFFDF9] dark:bg-[#141218] flex flex-col relative overflow-hidden selection:bg-primary/20">
      {/* Story Canvas Ambient Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute inset-0 bg-gradient-to-b from-[#FFFDF9] via-[#FFFDF9] to-[#F5E6E1] dark:from-[#141218] dark:via-[#141218] dark:to-[#221A21]" />
        <motion.div
          className="absolute top-1/4 left-0 w-[100vw] h-[50vw] rounded-full blur-[140px] opacity-[0.15] dark:opacity-[0.08]"
          style={{ background: 'radial-gradient(ellipse, #7A4A5F 0%, transparent 60%)' }}
          animate={{ scale: [1, 1.1, 1], rotate: [0, 5, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      {/* Main Conversation Area */}
      <main className="relative z-10 flex-1 w-full max-w-3xl mx-auto flex flex-col pt-16 pb-32 px-6 overflow-y-auto hide-scrollbar">
        <div className="flex-1 flex flex-col justify-end min-h-full">
          <AnimatePresence initial={false}>
            {history.map((msg, index) => {
              const isAssistant = msg.role === 'assistant'
              const isLast = index === history.length - 1
              
              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: isLast ? 1 : 0.6, y: 0, scale: isLast ? 1 : 0.98 }}
                  className={`w-full flex ${isAssistant ? 'justify-start' : 'justify-end'} mb-10 origin-bottom`}
                >
                  <div className={`max-w-[85%] ${isAssistant ? 'text-left' : 'text-right'}`}>
                    {isAssistant && (
                      <div className="text-display-sm md:text-display-md font-headline-md text-primary leading-tight tracking-tight">
                        {msg.content}
                      </div>
                    )}
                    {!isAssistant && (
                      <div className="inline-block px-6 py-3 rounded-3xl frosted-card text-on-surface-variant font-body-lg text-lg">
                        {msg.content}
                      </div>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>

          {isTyping && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full flex justify-start mb-10"
            >
              <MythriAura state="processing" size="sm" />
            </motion.div>
          )}

          <div ref={bottomRef} className="h-4" />
        </div>
      </main>

      {/* Choices Footer */}
      <AnimatePresence>
        {currentChoices && currentChoices.length > 0 && !isTyping && (
          <motion.footer
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-0 left-0 w-full z-20 pb-10 pt-16 bg-gradient-to-t from-[#FFFDF9] via-[#FFFDF9]/90 to-transparent dark:from-[#141218] dark:via-[#141218]/90 pointer-events-none"
          >
            <div className="max-w-3xl mx-auto px-6 flex flex-wrap gap-3 justify-center pointer-events-auto">
              {currentChoices.map((choice) => (
                <ChoiceBubble
                  key={choice}
                  label={choice}
                  onClick={() => handleChoice(choice)}
                />
              ))}
            </div>
          </motion.footer>
        )}
      </AnimatePresence>

      {/* Completion Overlay */}
      <AnimatePresence>
        {phase === 2 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-50 bg-[#FFFDF9] dark:bg-[#141218] flex flex-col items-center justify-center p-6"
          >
            <MythriAura state="success" size="lg" className="mb-8" />
            <motion.h2 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0, transition: { delay: 0.5 } }}
              className="text-display-md font-headline-md text-primary text-center"
            >
              Your space is ready.
            </motion.h2>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
