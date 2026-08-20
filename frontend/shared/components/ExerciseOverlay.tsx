'use client'
import { useState, useEffect, useRef } from 'react'

export default function ExerciseOverlay({ exerciseMode, onClose }: { exerciseMode: string | null, onClose: () => void }) {
  const [breathPhase, setBreathPhase] = useState({ text: 'INHALE', size: 'w-40 h-40 md:w-24 md:h-24', color: 'bg-primary/50 md:bg-primary/40' })
  const breathIntervalRef = useRef<NodeJS.Timeout | null>(null)
  
  const [timeLeft, setTimeLeft] = useState(120) // 2 minutes
  const [exerciseData, setExerciseData] = useState<{title: string, description: string, steps: string[]} | null>(null)

  useEffect(() => {
    if (!exerciseMode) {
      if (breathIntervalRef.current) clearInterval(breathIntervalRef.current)
      setExerciseData(null)
      return
    }
    
    try {
      const parsed = typeof exerciseMode === 'string' ? JSON.parse(exerciseMode) : exerciseMode;
      if (parsed && parsed.title) {
        setExerciseData(parsed);
      } else {
        setExerciseData({
          title: exerciseMode === 'BREATHING' ? 'Box Breathing' : 'Grounding Exercise',
          description: "Let's take a moment to center yourself.",
          steps: ['Inhale deeply', 'Hold', 'Exhale slowly']
        })
      }
    } catch (e) {
      setExerciseData({
        title: 'Mindful Exercise',
        description: "Follow the prompts and take your time.",
        steps: ['Focus on your breath', 'Stay present']
      })
    }

    setTimeLeft(120)
    
    const phases = [
      { text: 'INHALE', size: 'w-40 h-40 md:w-32 md:h-32', color: 'bg-primary/50' },
      { text: 'EXHALE', size: 'w-24 h-24 md:w-20 md:h-20', color: 'bg-primary/30' }
    ]
    let step = 0
    setBreathPhase(phases[step])
    breathIntervalRef.current = setInterval(() => {
      step = (step + 1) % 2
      setBreathPhase(phases[step])
    }, 5000)

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
      <aside className={`hidden lg:flex fixed left-8 top-1/2 -translate-y-1/2 w-80 frosted-card rounded-3xl p-8 flex-col gap-6 transition-all duration-700 z-50 ${isVisible ? 'translate-x-0 opacity-100 pointer-events-auto' : '-translate-x-[150%] opacity-0 pointer-events-none'}`}>
        
        {exerciseData && (
          <>
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-primary text-[32px]">self_improvement</span>
              <h2 className="text-headline-md font-headline-md text-primary">{exerciseData.title}</h2>
            </div>
            <p className="text-body-md text-on-surface-variant leading-relaxed">
              {exerciseData.description}
            </p>
            <div className="mt-2 p-5 bg-primary/5 rounded-2xl border border-primary/10">
              <ul className="space-y-4 text-body-sm text-on-surface-variant font-medium">
                {exerciseData.steps.map((step, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <span className="text-primary mt-0.5">•</span> {step}
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}

      </aside>

      {/* Desktop Timer Panel (Right) */}
      <aside className={`hidden lg:flex fixed right-8 top-1/2 -translate-y-1/2 w-80 frosted-card rounded-3xl p-8 flex-col items-center justify-center gap-8 transition-all duration-700 z-50 ${isVisible ? 'translate-x-0 opacity-100 pointer-events-auto' : 'translate-x-[150%] opacity-0 pointer-events-none'}`}>
        
        <h3 className="text-headline-md font-headline-md text-primary text-center">Current Phase</h3>
        <div className="relative w-48 h-48 flex items-center justify-center">
          <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse"></div>
          <div className={`absolute rounded-full shadow-lg flex items-center justify-center transition-all duration-[5000ms] ease-in-out ${breathPhase.size} ${breathPhase.color}`}>
            <span className="text-headline-md font-bold text-white tracking-widest drop-shadow-md">{breathPhase.text}</span>
          </div>
        </div>
        
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
      <div className={`md:hidden fixed inset-x-0 bottom-0 z-[60] frosted-card border-t border-white/50 dark:border-white/10 rounded-t-[2rem] p-6 flex flex-col gap-6 transition-all duration-500 ${isVisible ? 'translate-y-0 opacity-100 pointer-events-auto' : 'translate-y-full opacity-0 pointer-events-none'}`}>
        <div className="w-12 h-1.5 bg-outline-variant/40 rounded-full mx-auto mb-2"></div>
        
        {exerciseData && (
          <div className="flex flex-col items-center gap-2 text-center">
            <span className="material-symbols-outlined text-primary text-[32px]">self_improvement</span>
            <h2 className="text-headline-md font-headline-md text-primary">{exerciseData.title}</h2>
            <p className="text-body-sm text-on-surface-variant">
              {exerciseData.description}
            </p>
          </div>
        )}
        
        <div className="relative w-40 h-40 flex items-center justify-center mx-auto my-4">
          <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse"></div>
          <div className={`absolute rounded-full shadow-lg flex items-center justify-center transition-all duration-[5000ms] ease-in-out ${breathPhase.size} ${breathPhase.color}`}>
            <span className="text-label-md font-bold text-white tracking-widest drop-shadow-md">{breathPhase.text}</span>
          </div>
        </div>

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
