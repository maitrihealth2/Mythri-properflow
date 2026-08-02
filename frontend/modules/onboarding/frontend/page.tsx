'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { submitOnboarding } from '@/core/api'

type OnboardingData = {
  preferred_name: string
  language: string
  conversation_style: string
  communication_mode: string
  initial_emotion: string
  primary_goal: string
  check_in_preference: string
  reasons: string[]
  goals: string[]
}

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<OnboardingData>({
    preferred_name: '',
    language: 'en-IN',
    conversation_style: '',
    communication_mode: '',
    initial_emotion: '',
    primary_goal: '',
    check_in_preference: '',
    reasons: [],
    goals: []
  })

  // For Screen 14 Rotating Messages
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0)
  const loadingMsgs = [
    "Creating your private space...",
    "Learning your preferences...",
    "Preparing your conversations...",
    "Almost ready..."
  ]

  const nextStep = () => setStep(prev => prev + 1)
  const prevStep = () => setStep(prev => Math.max(1, prev - 1))

  const toggleArrayItem = (field: 'reasons' | 'goals', item: string) => {
    setData(prev => {
      const arr = prev[field]
      if (arr.includes(item)) {
        return { ...prev, [field]: arr.filter(i => i !== item) }
      } else {
        return { ...prev, [field]: [...arr, item] }
      }
    })
  }

  const handleFinish = async () => {
    setLoading(true)
    try {
      await submitOnboarding(data)
    } catch (err) {
      console.error("Failed to save onboarding:", err)
    }
  }

  useEffect(() => {
    if (step === 14) {
      handleFinish();
      const int = setInterval(() => {
        setLoadingMsgIdx(idx => {
          if (idx >= loadingMsgs.length - 1) {
            clearInterval(int)
            setTimeout(() => setStep(15), 500)
            return idx
          }
          return idx + 1
        })
      }, 800)
      return () => clearInterval(int)
    }
  }, [step])

  const renderStep = () => {
    switch(step) {
      case 1:
        return (
          <div className="flex flex-col items-center text-center space-y-6 animate-fade-in-up">
            <h1 className="text-plum-high-contrast font-display-lg text-3xl md:text-4xl">Welcome to Mythri</h1>
            <p className="text-on-surface-variant font-body-lg">A private space to talk, reflect, and understand yourself without judgment.</p>
            <button onClick={nextStep} className="w-full py-4 mt-6 bg-primary text-white rounded-full font-label-md transition-transform hover:scale-[1.02]">
              Continue
            </button>
            <button onClick={() => router.push('/login')} className="text-on-surface-variant font-label-md mt-2 underline">
              Already have an account?
            </button>
          </div>
        )
      case 2:
        const reasonsList = ['Exam Stress', 'Relationships', 'Family', 'Career', 'Burnout', 'Anxiety', 'Loneliness', 'Overthinking', 'Personal Growth', 'Just Exploring']
        return (
          <div className="flex flex-col space-y-6 animate-fade-in-up w-full">
            <h2 className="text-plum-high-contrast font-headline-md text-2xl text-center">What brings you here today?</h2>
            <div className="grid grid-cols-2 gap-3 mt-4">
              {reasonsList.map(r => (
                <button key={r} onClick={() => toggleArrayItem('reasons', r)}
                  className={`p-4 rounded-xl border transition-all text-left font-body-md ${data.reasons.includes(r) ? 'bg-primary/10 border-primary text-primary' : 'bg-white/40 border-outline-variant/30 text-on-surface hover:bg-white/60'}`}>
                  {r}
                </button>
              ))}
            </div>
            <button onClick={nextStep} disabled={data.reasons.length === 0} className="w-full py-4 mt-4 bg-primary text-white rounded-full font-label-md disabled:opacity-50">Continue</button>
          </div>
        )
      case 3:
        const emotionsList = ['Happy', 'Calm', 'Okay', 'Stressed', 'Anxious', 'Sad', 'Frustrated', 'Empty', 'Confused', 'Exhausted']
        return (
          <div className="flex flex-col space-y-6 animate-fade-in-up w-full">
            <h2 className="text-plum-high-contrast font-headline-md text-2xl text-center">How have you been feeling lately?</h2>
            <div className="grid grid-cols-2 gap-3 mt-4">
              {emotionsList.map(e => (
                <button key={e} onClick={() => setData({...data, initial_emotion: e})}
                  className={`p-4 rounded-xl border transition-all text-left font-body-md ${data.initial_emotion === e ? 'bg-primary/10 border-primary text-primary' : 'bg-white/40 border-outline-variant/30 text-on-surface hover:bg-white/60'}`}>
                  {e}
                </button>
              ))}
            </div>
            <button onClick={nextStep} disabled={!data.initial_emotion} className="w-full py-4 mt-4 bg-primary text-white rounded-full font-label-md disabled:opacity-50">Continue</button>
          </div>
        )
      case 4:
        const goalsList = ['Reduce stress', 'Study better', 'Sleep better', 'Understand emotions', 'Improve relationships', 'Build confidence', 'Daily reflection', 'Someone to listen', 'Healthy habits']
        return (
          <div className="flex flex-col space-y-6 animate-fade-in-up w-full">
            <h2 className="text-plum-high-contrast font-headline-md text-2xl text-center">What would you like Mythri to help with?</h2>
            <div className="grid grid-cols-2 gap-3 mt-4">
              {goalsList.map(g => (
                <button key={g} onClick={() => toggleArrayItem('goals', g)}
                  className={`p-3 rounded-xl border transition-all text-left font-body-md ${data.goals.includes(g) ? 'bg-primary/10 border-primary text-primary' : 'bg-white/40 border-outline-variant/30 text-on-surface hover:bg-white/60'}`}>
                  {g}
                </button>
              ))}
            </div>
            <button onClick={nextStep} disabled={data.goals.length === 0} className="w-full py-4 mt-4 bg-primary text-white rounded-full font-label-md disabled:opacity-50">Continue</button>
          </div>
        )
      case 5:
        const styles = [
          {id: 'Gentle Listener', desc: 'Provides a safe, quiet space to vent.'},
          {id: 'Supportive Friend', desc: 'Warm, empathetic, and always on your side.'},
          {id: 'Thought Partner', desc: 'Helps you untangle complex thoughts.'},
          {id: 'Practical Coach', desc: 'Focuses on action and steady progress.'},
          {id: 'Balanced', desc: 'A natural mix of listening and guiding.'}
        ]
        return (
          <div className="flex flex-col space-y-6 animate-fade-in-up w-full">
            <h2 className="text-plum-high-contrast font-headline-md text-2xl text-center">Conversation Style</h2>
            <div className="flex flex-col gap-3 mt-4">
              {styles.map(s => (
                <button key={s.id} onClick={() => setData({...data, conversation_style: s.id})}
                  className={`p-4 rounded-xl border transition-all text-left ${data.conversation_style === s.id ? 'bg-primary/10 border-primary' : 'bg-white/40 border-outline-variant/30 hover:bg-white/60'}`}>
                  <div className={`font-label-md ${data.conversation_style === s.id ? 'text-primary' : 'text-on-surface'}`}>{s.id}</div>
                  <div className="text-on-surface-variant font-body-sm text-sm mt-1">{s.desc}</div>
                </button>
              ))}
            </div>
            <button onClick={nextStep} disabled={!data.conversation_style} className="w-full py-4 mt-4 bg-primary text-white rounded-full font-label-md disabled:opacity-50">Continue</button>
          </div>
        )
      case 6:
        const langs = [
          {id: 'en-IN', label: 'English'},
          {id: 'hi-IN', label: 'Hindi (हिंदी)'},
          {id: 'te-IN', label: 'Telugu (తెలుగు)'},
          {id: 'ta-IN', label: 'Tamil (தமிழ்)'}
        ]
        return (
          <div className="flex flex-col space-y-6 animate-fade-in-up w-full">
            <h2 className="text-plum-high-contrast font-headline-md text-2xl text-center">Language</h2>
            <div className="flex flex-col gap-3 mt-4">
              {langs.map(l => (
                <button key={l.id} onClick={() => setData({...data, language: l.id})}
                  className={`p-4 rounded-xl border transition-all text-left font-body-md ${data.language === l.id ? 'bg-primary/10 border-primary text-primary' : 'bg-white/40 border-outline-variant/30 text-on-surface hover:bg-white/60'}`}>
                  {l.label}
                </button>
              ))}
            </div>
            <button onClick={nextStep} disabled={!data.language} className="w-full py-4 mt-4 bg-primary text-white rounded-full font-label-md disabled:opacity-50">Continue</button>
          </div>
        )
      case 7:
        const modes = ['Voice', 'Text', 'Both']
        return (
          <div className="flex flex-col space-y-6 animate-fade-in-up w-full">
            <h2 className="text-plum-high-contrast font-headline-md text-2xl text-center">Communication Mode</h2>
            <div className="flex flex-col gap-3 mt-4">
              {modes.map(m => (
                <button key={m} onClick={() => setData({...data, communication_mode: m})}
                  className={`p-4 rounded-xl border transition-all text-center font-body-md ${data.communication_mode === m ? 'bg-primary/10 border-primary text-primary' : 'bg-white/40 border-outline-variant/30 text-on-surface hover:bg-white/60'}`}>
                  {m}
                </button>
              ))}
            </div>
            <button onClick={nextStep} disabled={!data.communication_mode} className="w-full py-4 mt-4 bg-primary text-white rounded-full font-label-md disabled:opacity-50">Continue</button>
          </div>
        )
      case 8:
        const checks = ['Daily', 'A few times a week', 'Only when I open Mythri', "I'll decide later"]
        return (
          <div className="flex flex-col space-y-6 animate-fade-in-up w-full">
            <h2 className="text-plum-high-contrast font-headline-md text-2xl text-center">Check-in Preference</h2>
            <div className="flex flex-col gap-3 mt-4">
              {checks.map(c => (
                <button key={c} onClick={() => setData({...data, check_in_preference: c})}
                  className={`p-4 rounded-xl border transition-all text-center font-body-md ${data.check_in_preference === c ? 'bg-primary/10 border-primary text-primary' : 'bg-white/40 border-outline-variant/30 text-on-surface hover:bg-white/60'}`}>
                  {c}
                </button>
              ))}
            </div>
            <button onClick={nextStep} disabled={!data.check_in_preference} className="w-full py-4 mt-4 bg-primary text-white rounded-full font-label-md disabled:opacity-50">Continue</button>
          </div>
        )
      case 9:
        return (
          <div className="flex flex-col space-y-6 animate-fade-in-up w-full">
            <h2 className="text-plum-high-contrast font-headline-md text-2xl text-center">Privacy matters.</h2>
            <div className="space-y-4 text-on-surface-variant font-body-md mt-4">
              <div className="flex items-start gap-3"><span className="text-primary mt-1">✔</span> Conversations are private.</div>
              <div className="flex items-start gap-3"><span className="text-primary mt-1">✔</span> Data is protected.</div>
              <div className="flex items-start gap-3"><span className="text-primary mt-1">✔</span> Mythri remembers only what you allow.</div>
              <div className="flex items-start gap-3"><span className="text-primary mt-1">✔</span> Mythri never judges.</div>
              <div className="flex items-start gap-3"><span className="text-primary mt-1">✔</span> Mythri is AI support—not a licensed therapist.</div>
            </div>
            <button onClick={nextStep} className="w-full py-4 mt-8 bg-primary text-white rounded-full font-label-md transition-transform hover:scale-[1.02]">I Understand</button>
          </div>
        )
      case 10:
        const helps = ['Emotional support', 'Reflection', 'Stress management', 'Daily check-ins', 'Journaling', 'Personal growth']
        return (
          <div className="flex flex-col space-y-6 animate-fade-in-up w-full">
            <h2 className="text-plum-high-contrast font-headline-md text-2xl text-center">What Mythri Can Help With</h2>
            <div className="grid grid-cols-2 gap-3 mt-4">
              {helps.map(h => (
                <div key={h} className="p-4 rounded-xl border border-outline-variant/30 bg-white/40 text-center font-body-md text-on-surface">{h}</div>
              ))}
            </div>
            <button onClick={nextStep} className="w-full py-4 mt-6 bg-primary text-white rounded-full font-label-md">Continue</button>
          </div>
        )
      case 11:
        const notHelps = ['Diagnose mental illness', 'Replace therapists', 'Handle emergencies', 'Make life decisions']
        return (
          <div className="flex flex-col space-y-6 animate-fade-in-up w-full">
            <h2 className="text-plum-high-contrast font-headline-md text-2xl text-center">What Mythri Cannot Do</h2>
            <div className="grid grid-cols-1 gap-3 mt-4">
              {notHelps.map(h => (
                <div key={h} className="p-4 rounded-xl border border-outline-variant/30 bg-white/40 text-center font-body-md text-on-surface flex items-center justify-center gap-3">
                  <span className="text-error">✖</span> {h}
                </div>
              ))}
            </div>
            <p className="text-xs text-on-surface-variant/70 text-center mt-4">If you are in a crisis, please contact local emergency services or a helpline.</p>
            <button onClick={nextStep} className="w-full py-4 mt-4 bg-primary text-white rounded-full font-label-md">I Understand</button>
          </div>
        )
      case 12:
        return (
          <div className="flex flex-col space-y-6 animate-fade-in-up w-full text-center">
            <h2 className="text-plum-high-contrast font-headline-md text-2xl">What should Mythri call you?</h2>
            <p className="text-on-surface-variant font-body-md">An optional nickname for a more personal touch.</p>
            <input 
              type="text" 
              placeholder="Your nickname" 
              value={data.preferred_name}
              onChange={e => setData({...data, preferred_name: e.target.value})}
              className="w-full h-14 mt-6 px-5 rounded-2xl border border-outline-variant/30 bg-white/40 font-body-md placeholder:text-outline/40 focus:bg-white/80 transition-all outline-none text-center"
            />
            <button onClick={nextStep} className="w-full py-4 mt-6 bg-primary text-white rounded-full font-label-md">
              {data.preferred_name.trim() ? "Continue" : "Skip"}
            </button>
          </div>
        )
      case 13:
        const pGoals = ['Feel calmer', 'Study consistently', 'Reduce overthinking', 'Improve sleep', 'Understand myself', 'Improve relationships', 'No goal yet']
        return (
          <div className="flex flex-col space-y-6 animate-fade-in-up w-full">
            <h2 className="text-plum-high-contrast font-headline-md text-2xl text-center">Primary Goal</h2>
            <div className="flex flex-col gap-3 mt-4">
              {pGoals.map(g => (
                <button key={g} onClick={() => setData({...data, primary_goal: g})}
                  className={`p-4 rounded-xl border transition-all text-center font-body-md ${data.primary_goal === g ? 'bg-primary/10 border-primary text-primary' : 'bg-white/40 border-outline-variant/30 text-on-surface hover:bg-white/60'}`}>
                  {g}
                </button>
              ))}
            </div>
            <button onClick={nextStep} disabled={!data.primary_goal} className="w-full py-4 mt-4 bg-primary text-white rounded-full font-label-md disabled:opacity-50">Continue</button>
          </div>
        )
      case 14:
        return (
          <div className="flex flex-col items-center justify-center space-y-8 animate-fade-in w-full py-12">
            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-primary/40 to-primary/10 animate-pulse flex items-center justify-center">
              <div className="w-8 h-8 rounded-full bg-primary/60 blur-sm"></div>
            </div>
            <p className="text-plum-high-contrast font-body-lg text-lg animate-pulse text-center h-8">
              {loadingMsgs[loadingMsgIdx]}
            </p>
          </div>
        )
      case 15:
        return (
          <div className="flex flex-col items-center justify-center space-y-8 animate-fade-in-up w-full text-center py-6">
            <div className="w-32 h-32 mb-4 rounded-full bg-gradient-to-tr from-primary/30 to-primary/5 shadow-[0_0_40px_rgba(140,115,85,0.2)] flex items-center justify-center">
               <div className="w-16 h-16 rounded-full bg-primary/40 blur-md animate-pulse"></div>
            </div>
            <h1 className="text-plum-high-contrast font-display-lg text-4xl">Hi, {data.preferred_name || 'there'}</h1>
            <div className="space-y-2">
              <p className="text-on-surface-variant font-body-lg">I'm glad you're here.</p>
              <p className="text-on-surface-variant font-body-lg">Whenever you're ready, tell me what's on your mind.</p>
            </div>
            <button onClick={() => router.push('/text-chat')} className="w-full py-4 mt-8 bg-primary text-white rounded-full font-label-md transition-transform hover:scale-[1.02]">
              Start First Conversation
            </button>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className="flex-1 w-full flex items-center justify-center relative overflow-hidden min-h-[100dvh] bg-surface">
      <div className="fixed inset-0 bg-plum-high-contrast/5 backdrop-blur-[2px] z-0 pointer-events-none"></div>
      
      <main className="relative z-10 w-full max-w-[480px] m-auto px-6 py-12 flex flex-col items-center">
        {step > 1 && step < 14 && (
          <div className="w-full flex items-center justify-between mb-8 animate-fade-in">
             <button onClick={prevStep} className="text-on-surface-variant hover:text-primary transition-colors p-2 -ml-2">
               ← Back
             </button>
             <div className="flex gap-1">
               {[...Array(12)].map((_, i) => (
                 <div key={i} className={`h-1.5 rounded-full transition-all duration-500 ${step - 1 >= i + 1 ? 'w-4 bg-primary' : 'w-2 bg-outline-variant/40'}`}></div>
               ))}
             </div>
          </div>
        )}
        
        <div className="frosted-card rounded-3xl p-6 md:p-10 w-full flex flex-col items-center shadow-sm">
          {renderStep()}
        </div>
      </main>
    </div>
  )
}
