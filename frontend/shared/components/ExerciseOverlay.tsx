'use client'
import { useState, useEffect, useRef } from 'react'

export default function ExerciseOverlay({ exerciseMode, onClose }: { exerciseMode: string | null, onClose: () => void }) {
  const [breathPhase, setBreathPhase] = useState({ text: 'IN', size: 'w-40 h-40 md:w-24 md:h-24', color: 'bg-primary/50 md:bg-primary/40' })
  const breathIntervalRef = useRef<NodeJS.Timeout | null>(null)
  
  const [timeLeft, setTimeLeft] = useState(120) // 2 minutes

  useEffect(() => {
    if (!exerciseMode) {
      if (breathIntervalRef.current) clearInterval(breathIntervalRef.current)
      return
    }
    
    setTimeLeft(120)
    
    if (exerciseMode === 'BREATHING') {
      const phases = [
        { text: 'IN', size: 'w-40 h-40 md:w-32 md:h-32', color: 'bg-primary/50' },
        { text: 'HOLD', size: 'w-40 h-40 md:w-32 md:h-32', color: 'bg-primary/60' },
        { text: 'OUT', size: 'w-24 h-24 md:w-20 md:h-20', color: 'bg-primary/30' },
        { text: 'HOLD', size: 'w-24 h-24 md:w-20 md:h-20', color: 'bg-primary/40' }
      ]
      let step = 0
      setBreathPhase(phases[step])
      breathIntervalRef.current = setInterval(() => {
        step = (step + 1) % 4
        setBreathPhase(phases[step])
      }, 4000)
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1)
    }, 1000)
    
    return () => {
      if (breathIntervalRef.current) clearInterval(breathIntervalRef.current)
      clearInterval(timer)
    }
  }, [exerciseMode])

  useEffect(() => {
    if (exerciseMode && timeLeft <= 0) {
      onClose()
    }
  }, [timeLeft, exerciseMode, onClose])



  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const isVisible = !!exerciseMode

  return (
    <>
      {/* Desktop Exercise Panel (Left) */}
      <aside className={`hidden lg:flex fixed left-8 top-1/2 -translate-y-1/2 w-80 bg-white/70 backdrop-blur-3xl border border-white/50 shadow-2xl rounded-3xl p-8 flex-col gap-6 transition-all duration-700 z-50 ${isVisible ? 'translate-x-0 opacity-100 pointer-events-auto' : '-translate-x-[150%] opacity-0 pointer-events-none'}`}>
        
        {exerciseMode === 'BREATHING' && (
          <>
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-primary text-[32px]">self_improvement</span>
              <h2 className="text-headline-md font-headline-md text-primary">Box Breathing</h2>
            </div>
            <p className="text-body-md text-on-surface-variant leading-relaxed">
              Let's take a moment to center yourself. Follow the pattern to relieve stress and regain focus.
            </p>
            <div className="mt-2 p-5 bg-primary/5 rounded-2xl border border-primary/10">
              <ul className="space-y-4 text-body-sm text-on-surface-variant font-medium">
                <li className="flex items-center gap-3"><div className="w-2.5 h-2.5 rounded-full bg-primary"></div> Inhale deeply (4s)</li>
                <li className="flex items-center gap-3"><div className="w-2.5 h-2.5 rounded-full bg-primary/60"></div> Hold your breath (4s)</li>
                <li className="flex items-center gap-3"><div className="w-2.5 h-2.5 rounded-full bg-primary/30"></div> Exhale slowly (4s)</li>
                <li className="flex items-center gap-3"><div className="w-2.5 h-2.5 rounded-full bg-primary/10"></div> Hold empty (4s)</li>
              </ul>
            </div>
          </>
        )}

        {exerciseMode === 'GROUNDING' && (
          <>
             <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-primary text-[32px]">psychology</span>
              <h2 className="text-headline-md font-headline-md text-primary">5-4-3-2-1 Grounding</h2>
            </div>
            <p className="text-body-md text-on-surface-variant leading-relaxed">
              When overwhelmed, use your senses to return to the present moment. Take your time.
            </p>
            <div className="mt-2 p-5 bg-primary/5 rounded-2xl border border-primary/10">
              <ul className="space-y-4 text-body-sm text-on-surface-variant font-medium">
                <li className="flex items-center gap-3"><span className="font-bold text-primary">5</span> things you can see</li>
                <li className="flex items-center gap-3"><span className="font-bold text-primary">4</span> things you can feel</li>
                <li className="flex items-center gap-3"><span className="font-bold text-primary">3</span> things you can hear</li>
                <li className="flex items-center gap-3"><span className="font-bold text-primary">2</span> things you can smell</li>
                <li className="flex items-center gap-3"><span className="font-bold text-primary">1</span> thing you can taste</li>
              </ul>
            </div>
          </>
        )}

        {exerciseMode === 'REFLECTION' && (
          <>
             <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-primary text-[32px]">volunteer_activism</span>
              <h2 className="text-headline-md font-headline-md text-primary">Self-Compassion</h2>
            </div>
            <p className="text-body-md text-on-surface-variant leading-relaxed">
              Place a hand over your heart. Acknowledge your pain without judgment.
            </p>
            <div className="mt-2 p-5 bg-primary/5 rounded-2xl border border-primary/10">
              <ul className="space-y-4 text-body-sm text-on-surface-variant font-medium">
                <li className="flex items-start gap-3"><span className="text-primary mt-0.5">•</span> "This is a moment of suffering."</li>
                <li className="flex items-start gap-3"><span className="text-primary mt-0.5">•</span> "Suffering is a part of life."</li>
                <li className="flex items-start gap-3"><span className="text-primary mt-0.5">•</span> "May I be kind to myself."</li>
                <li className="flex items-start gap-3"><span className="text-primary mt-0.5">•</span> "May I give myself the compassion I need."</li>
              </ul>
            </div>
          </>
        )}

      </aside>

      {/* Desktop Timer Panel (Right) */}
      <aside className={`hidden lg:flex fixed right-8 top-1/2 -translate-y-1/2 w-80 bg-white/70 backdrop-blur-3xl border border-white/50 shadow-2xl rounded-3xl p-8 flex-col items-center justify-center gap-8 transition-all duration-700 z-50 ${isVisible ? 'translate-x-0 opacity-100 pointer-events-auto' : 'translate-x-[150%] opacity-0 pointer-events-none'}`}>
        
        {exerciseMode === 'BREATHING' ? (
          <>
            <h3 className="text-headline-md font-headline-md text-primary text-center">Current Phase</h3>
            <div className="relative w-48 h-48 flex items-center justify-center">
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse"></div>
              <div className={`absolute rounded-full shadow-lg flex items-center justify-center transition-all duration-[4000ms] ease-in-out ${breathPhase.size} ${breathPhase.color}`}>
                <span className="text-headline-md font-bold text-white tracking-widest drop-shadow-md">{breathPhase.text}</span>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-4">
             <span className="material-symbols-outlined text-[64px] text-primary/40 animate-pulse">{exerciseMode === 'GROUNDING' ? 'visibility' : 'favorite'}</span>
          </div>
        )}
        
        <div className="text-center w-full mt-4">
          <div className="text-display-lg font-display-lg text-primary font-bold mb-2">{formatTime(timeLeft)}</div>
          <span className="text-label-md text-on-surface-variant">Remaining</span>
        </div>

        <button
          onClick={onClose}
          className="mt-2 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl border border-error/30 text-error text-label-md font-label-md hover:bg-error/10 active:scale-95 transition-all duration-200"
        >
          <span className="material-symbols-outlined text-[18px]">close</span>
          End Exercise
        </button>

      </aside>

      {/* Mobile Exercise Overlay */}
      <div className={`md:hidden fixed inset-x-0 bottom-0 z-[60] bg-white/80 backdrop-blur-3xl border-t border-white/50 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] rounded-t-[2rem] p-6 flex flex-col gap-6 transition-all duration-500 ${isVisible ? 'translate-y-0 opacity-100 pointer-events-auto' : 'translate-y-full opacity-0 pointer-events-none'}`}>
        <div className="w-12 h-1.5 bg-outline-variant/40 rounded-full mx-auto mb-2"></div>
        <div className="flex flex-col items-center gap-2 text-center">
          <span className="material-symbols-outlined text-primary text-[32px]">
            {exerciseMode === 'BREATHING' ? 'self_improvement' : exerciseMode === 'GROUNDING' ? 'psychology' : 'volunteer_activism'}
          </span>
          <h2 className="text-headline-md font-headline-md text-primary">
            {exerciseMode === 'BREATHING' ? 'Box Breathing' : exerciseMode === 'GROUNDING' ? '5-4-3-2-1 Grounding' : 'Self-Compassion'}
          </h2>
          <p className="text-body-sm text-on-surface-variant">
            {exerciseMode === 'BREATHING' ? 'Regain focus and center yourself.' : exerciseMode === 'GROUNDING' ? 'Use your senses to return to the present.' : 'Acknowledge your pain without judgment.'}
          </p>
        </div>
        
        {exerciseMode === 'BREATHING' ? (
          <div className="relative w-40 h-40 flex items-center justify-center mx-auto my-4">
            <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse"></div>
            <div className={`absolute rounded-full shadow-lg flex items-center justify-center transition-all duration-[4000ms] ease-in-out ${breathPhase.size} ${breathPhase.color}`}>
              <span className="text-label-md font-bold text-white tracking-widest drop-shadow-md">{breathPhase.text}</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 py-8">
             <span className="material-symbols-outlined text-[64px] text-primary/40 animate-pulse">{exerciseMode === 'GROUNDING' ? 'visibility' : 'favorite'}</span>
          </div>
        )}

        <div className="text-center w-full">
          <div className="text-display-lg font-display-lg text-primary font-bold mb-1">{formatTime(timeLeft)}</div>
          <span className="text-label-md text-on-surface-variant">Remaining</span>
        </div>

        <button
          onClick={onClose}
          className="mt-2 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl border border-error/30 text-error text-label-md font-label-md hover:bg-error/10 active:scale-95 transition-all duration-200"
        >
          <span className="material-symbols-outlined text-[18px]">close</span>
          End Exercise
        </button>

      </div>
    </>
  )
}
