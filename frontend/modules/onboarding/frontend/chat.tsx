'use client'
import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { submitOnboarding } from '@/core/api'

type Message = {
  id: string
  role: 'mythri' | 'user'
  text: string
  isTyping?: boolean
}

type UIControl = 'reasons' | 'emotion' | 'goals' | 'support_style' | 'language' | 'communication' | 'check_in' | 'primary_goal' | null;

type Milestone = {
  id: string
  title: string
  messages: Message[]
  xOffset: number
  uiControl?: UIControl
}

const AmbientBackground = ({ isIntimate, isEnteringConsultation }: { isIntimate: boolean, isEnteringConsultation: boolean }) => {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0 bg-[#FFFDF9]">
      <motion.div 
        animate={{ 
          y: [0, isIntimate ? -20 : -40, 0], 
          opacity: isEnteringConsultation ? 0 : (isIntimate ? 0 : [0.2, 0.4, 0.2]), 
          scale: [1, 1.1, 1] 
        }} 
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -top-[10%] -left-[10%] w-[50vw] h-[50vw] rounded-full bg-[#9E7B86] blur-[140px]" 
      />
      <motion.div 
        animate={{ 
          x: [0, isIntimate ? 20 : 50, 0], 
          opacity: isEnteringConsultation ? 0 : (isIntimate ? 0.6 : [0.1, 0.3, 0.1]), 
          scale: isEnteringConsultation ? 3 : (isIntimate ? 2 : [1, 1.05, 1]),
          backgroundColor: isIntimate ? '#FFFDF9' : '#EEDCD8'
        }} 
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        className="absolute bottom-[10%] right-[5%] w-[60vw] h-[60vw] rounded-full blur-[150px]" 
      />
      <motion.div 
        animate={{ 
          scale: [1, 1.2, 1], 
          opacity: isEnteringConsultation ? 0 : (isIntimate ? 0 : [0.05, 0.15, 0.05]), 
          x: [0, -30, 0] 
        }} 
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 5 }}
        className="absolute top-[40%] left-[60%] w-[40vw] h-[40vw] rounded-full bg-[#603347] blur-[120px]" 
      />
      
      {/* Central Finale Aura */}
      <motion.div
        animate={{ 
          opacity: isIntimate ? (isEnteringConsultation ? 1 : 0.8) : 0, 
          scale: isEnteringConsultation ? 5 : (isIntimate ? 1 : 0) 
        }}
        transition={{ duration: isEnteringConsultation ? 3 : 4, ease: "easeInOut" }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vw] max-w-[800px] max-h-[800px] rounded-full bg-gradient-to-tr from-[#9E7B86]/20 to-[#603347]/10 blur-[100px]"
      />
    </div>
  )
}

const ORGANIC_OFFSETS = [25, 75, 35, 65, 50, 50, 50, 50, 50, 50, 50, 50]; 

const generateMockResponse = (inputText: string, milestoneCount: number): { text: string, newMilestone?: string, uiControl?: UIControl, isComplete?: boolean } => {
  if (milestoneCount === 1) return { text: "Thank you for sharing that. How have you been feeling lately?", newMilestone: "Emotional State", uiControl: 'emotion' };
  else if (milestoneCount === 2) return { text: "I understand. What would you like Mythri to help with?", newMilestone: "Looking Forward", uiControl: 'goals' };
  else if (milestoneCount === 3) return { text: "Got it. What kind of support would you like from Mythri?", newMilestone: "Support Style", uiControl: 'support_style' };
  else if (milestoneCount === 4) return { text: "Which language would you prefer?", newMilestone: "Language", uiControl: 'language' };
  else if (milestoneCount === 5) return { text: "When you need me, how would you rather talk?", newMilestone: "Communication Mode", uiControl: 'communication' };
  else if (milestoneCount === 6) return { text: "Would you like Mythri to check in with you?", newMilestone: "Check-ins", uiControl: 'check_in' };
  else if (milestoneCount === 7) return { text: "Before we finish, what should I call you?", newMilestone: "Name" };
  else if (milestoneCount === 8) return { text: `Nice to meet you. Just one last question... what is your primary goal right now?`, newMilestone: "Primary Goal", uiControl: 'primary_goal' };
  else return { text: "", isComplete: true };
}

// Multi-select component for Reasons
const ReasonsControl = ({ onSelect }: { onSelect: (val: string) => void }) => {
  const [selected, setSelected] = useState<string[]>([])
  const opts = ['Exam Stress', 'Relationships', 'Family', 'Career', 'Burnout', 'Anxiety', 'Loneliness', 'Overthinking', 'Personal Growth', 'Just Exploring']
  
  const toggle = (o: string) => {
    if (selected.includes(o)) setSelected(selected.filter(x => x !== o))
    else setSelected([...selected, o])
  }

  return (
    <div className="flex flex-col items-center w-full">
      <div className="flex flex-wrap justify-center gap-3 mt-8 max-w-2xl">
        {opts.map(o => (
          <button key={o} onClick={() => toggle(o)} 
            className={`px-5 py-3 rounded-xl backdrop-blur-md border transition-all shadow-sm font-body-md ${
              selected.includes(o) 
                ? 'bg-[#603347] text-white border-[#603347]' 
                : 'bg-white/50 border-white/60 text-[#4A2B38] hover:bg-white/80'
            }`}>
            {o}
          </button>
        ))}
      </div>
      <button 
        onClick={() => onSelect(selected.join(', '))}
        disabled={selected.length === 0}
        className="mt-8 px-10 py-3 rounded-full bg-[#603347] text-white font-label-md disabled:opacity-50 transition-all hover:scale-105 shadow-[0_4px_14px_rgba(96,51,71,0.2)]"
      >
        Continue
      </button>
    </div>
  )
}

// Multi-select component for Goals
const GoalsControl = ({ onSelect }: { onSelect: (val: string) => void }) => {
  const [selected, setSelected] = useState<string[]>([])
  const opts = ['Reduce stress', 'Study better', 'Sleep better', 'Understand emotions', 'Improve relationships', 'Build confidence', 'Daily reflection', 'Someone to listen', 'Healthy habits']
  
  const toggle = (o: string) => {
    if (selected.includes(o)) setSelected(selected.filter(x => x !== o))
    else setSelected([...selected, o])
  }

  return (
    <div className="flex flex-col items-center w-full">
      <div className="flex flex-wrap justify-center gap-3 mt-8 max-w-2xl">
        {opts.map(o => (
          <button key={o} onClick={() => toggle(o)} 
            className={`px-5 py-3 rounded-xl backdrop-blur-md border transition-all shadow-sm font-body-md ${
              selected.includes(o) 
                ? 'bg-[#603347] text-white border-[#603347]' 
                : 'bg-white/50 border-white/60 text-[#4A2B38] hover:bg-white/80'
            }`}>
            {o}
          </button>
        ))}
      </div>
      <button 
        onClick={() => onSelect(selected.join(', '))}
        disabled={selected.length === 0}
        className="mt-8 px-10 py-3 rounded-full bg-[#603347] text-white font-label-md disabled:opacity-50 transition-all hover:scale-105 shadow-[0_4px_14px_rgba(96,51,71,0.2)]"
      >
        Continue
      </button>
    </div>
  )
}


const UIControlsRenderer = ({ control, onSelect }: { control: UIControl, onSelect: (val: string) => void }) => {
  if (control === 'reasons') {
    return <ReasonsControl onSelect={onSelect} />
  }
  if (control === 'goals') {
    return <GoalsControl onSelect={onSelect} />
  }
  if (control === 'emotion') {
    const opts = ['Happy', 'Calm', 'Okay', 'Stressed', 'Anxious', 'Sad', 'Frustrated', 'Empty', 'Confused', 'Exhausted']
    return (
      <div className="flex flex-wrap justify-center gap-3 mt-8 max-w-2xl">
        {opts.map(o => <button key={o} onClick={() => onSelect(o)} className="px-5 py-3 rounded-xl bg-white/50 backdrop-blur-md border border-white/60 text-[#4A2B38] font-body-md hover:bg-white/80 transition-all shadow-sm">{o}</button>)}
      </div>
    )
  }
  if (control === 'support_style') {
    const opts = [
      {id: 'Gentle Listener', desc: 'Provides a safe, quiet space to vent'},
      {id: 'Supportive Friend', desc: 'Warm, empathetic, and always on your side'},
      {id: 'Thought Partner', desc: 'Helps you untangle complex thoughts'},
      {id: 'Practical Coach', desc: 'Focuses on action and steady progress'}
    ]
    return (
      <div className="flex flex-col gap-4 mt-8 w-full max-w-md mx-auto">
        {opts.map(o => <button key={o.id} onClick={() => onSelect(o.id)} className="w-full p-5 text-left rounded-2xl bg-white/50 backdrop-blur-md border border-white/60 hover:bg-white/80 transition-all shadow-sm"><div className="font-headline-sm text-lg text-[#603347] mb-1">{o.id}</div><div className="font-body-sm text-[#504448] opacity-80">{o.desc}</div></button>)}
      </div>
    )
  }
  if (control === 'language') {
    const langs = [{id: 'English', label: 'English'}, {id: 'Hindi', label: 'हिंदी'}, {id: 'Telugu', label: 'తెలుగు'}, {id: 'Tamil', label: 'தமிழ்'}]
    return (
      <div className="flex flex-wrap justify-center gap-4 mt-8">
        {langs.map(l => <button key={l.id} onClick={() => onSelect(l.id)} className="px-8 py-4 rounded-full bg-white/50 backdrop-blur-md border border-white/60 text-[#4A2B38] font-body-lg hover:bg-white/80 transition-all shadow-sm">{l.label}</button>)}
      </div>
    )
  }
  if (control === 'communication') {
    const modes = [{id: 'Voice', desc: "I'd rather speak."}, {id: 'Text', desc: "I'd rather type."}, {id: 'Both', desc: "I'll choose depending on the day."}]
    return (
      <div className="flex flex-col gap-4 mt-8 w-full max-w-md mx-auto">
        {modes.map(m => <button key={m.id} onClick={() => onSelect(m.id)} className="w-full p-6 text-left rounded-[2rem] bg-white/50 backdrop-blur-md border border-white/60 hover:bg-white/80 transition-all shadow-sm"><div className="font-headline-md text-xl text-[#603347] mb-1">{m.id}</div><div className="font-body-sm text-[#504448] opacity-80">{m.desc}</div></button>)}
      </div>
    )
  }
  if (control === 'check_in') {
    const checks = ['Daily', 'A few times a week', 'Only when I open Mythri', 'I\'ll decide later']
    return (
      <div className="flex flex-col gap-4 mt-8 w-full max-w-md mx-auto">
        {checks.map(c => <button key={c} onClick={() => onSelect(c)} className="w-full p-6 text-left rounded-[2rem] bg-white/50 backdrop-blur-md border border-white/60 hover:bg-white/80 transition-all shadow-sm"><div className="font-headline-md text-xl text-[#603347]">{c}</div></button>)}
      </div>
    )
  }
  if (control === 'primary_goal') {
    const opts = ['Feel calmer', 'Study consistently', 'Reduce overthinking', 'Improve sleep', 'Understand myself', 'Improve relationships', 'No goal yet']
    return (
      <div className="flex flex-wrap justify-center gap-3 mt-8 max-w-2xl">
        {opts.map(o => <button key={o} onClick={() => onSelect(o)} className="px-5 py-3 rounded-xl bg-white/50 backdrop-blur-md border border-white/60 text-[#4A2B38] font-body-md hover:bg-white/80 transition-all shadow-sm">{o}</button>)}
      </div>
    )
  }
  return null;
}

export default function OnboardingChat() {
  const router = useRouter()
  const [milestones, setMilestones] = useState<Milestone[]>([
    {
      id: 'm1',
      title: 'Arrival',
      xOffset: ORGANIC_OFFSETS[0],
      uiControl: 'reasons',
      messages: [
        { id: 'msg1', role: 'mythri', text: "What brings you here today?" }
      ]
    }
  ])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [inputValue, setInputValue] = useState('')
  const [isAiTyping, setIsAiTyping] = useState(false)
  const [userName, setUserName] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const collectedData = useRef<any>({})

  // Finale States
  const [finaleStep, setFinaleStep] = useState(0)
  const [isEnteringConsultation, setIsEnteringConsultation] = useState(false)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [milestones])

  // Sequence Orchestration for Phase 5 and 6
  useEffect(() => {
    if (finaleStep === 1) setTimeout(() => setFinaleStep(2), 2500); // Zoom out -> Text 1
    else if (finaleStep === 2) setTimeout(() => setFinaleStep(3), 3500); // Text 1 -> Text 2
    else if (finaleStep === 3) setTimeout(() => setFinaleStep(4), 3500); // Text 2 -> Converge Aura
    else if (finaleStep === 4) setTimeout(() => setFinaleStep(5), 4000); // Converge Aura -> "Your space is ready"
    else if (finaleStep === 5) setTimeout(() => setFinaleStep(6), 3500); // "Your space is ready" -> "Hi, Name"
    else if (finaleStep === 6) setTimeout(() => setFinaleStep(7), 3000); // "Hi, Name" -> "I'm glad you're here" & CTA
  }, [finaleStep])

  const submitMessage = (text: string) => {
    if (!text.trim() || isAiTyping) return;
    
    // Capture user name dynamically (in step 7, which means milestone count is 8)
    if (milestones.length === 8 && !userName) {
      const name = text.trim().split(' ')[0];
      setUserName(name); 
      collectedData.current.preferred_name = name;
    }
    
    const control = milestones[currentIdx].uiControl;
    if (control === 'reasons') collectedData.current.reasons = text.split(', ');
    else if (control === 'goals') collectedData.current.goals = text.split(', ');
    else if (control === 'emotion') collectedData.current.initial_emotion = text;
    else if (control === 'support_style') collectedData.current.conversation_style = text;
    else if (control === 'language') collectedData.current.language = text;
    else if (control === 'communication') collectedData.current.communication_mode = text;
    else if (control === 'check_in') collectedData.current.check_in_preference = text;
    else if (control === 'primary_goal') collectedData.current.primary_goal = text;
    
    const userMsg: Message = { id: `user-${Date.now()}-${Math.random()}`, role: 'user', text: text.trim() };
    const updatedMilestones = [...milestones];
    updatedMilestones[currentIdx].messages.push(userMsg);
    setMilestones(updatedMilestones);
    setInputValue('');
    setIsAiTyping(true);

    setTimeout(() => {
      const response = generateMockResponse(userMsg.text, milestones.length);
      
      if (response.isComplete) {
        setIsAiTyping(false);
        setFinaleStep(1); 
      } else if (response.newMilestone) {
        const nextXOffset = ORGANIC_OFFSETS[milestones.length] || 50; 
        const newM: Milestone = {
          id: `m-${Date.now()}-${Math.random()}`,
          title: response.newMilestone,
          xOffset: nextXOffset,
          uiControl: response.uiControl,
          messages: [{ id: `mythri-${Date.now()}-${Math.random()}`, role: 'mythri', text: response.text }]
        }
        setMilestones(prev => [...prev, newM]);
        setCurrentIdx(prev => prev + 1);
        setIsAiTyping(false);
      } else {
        const mythriMsg: Message = { id: `mythri-${Date.now()}-${Math.random()}`, role: 'mythri', text: response.text };
        const nextMilestones = [...updatedMilestones];
        nextMilestones[currentIdx].messages.push(mythriMsg);
        setMilestones(nextMilestones);
        setIsAiTyping(false);
      }
    }, 1500);
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submitMessage(inputValue);
    }
  }

  const handleStartConsultation = async () => {
    setIsEnteringConsultation(true);
    
    try {
      await submitOnboarding(collectedData.current);
      if (collectedData.current.preferred_name) {
        localStorage.setItem('mb_username', collectedData.current.preferred_name);
      }
    } catch (e) {
      console.error('Failed to submit onboarding data:', e);
    }

    setTimeout(() => {
      router.push('/text-chat');
    }, 2500);
  }

  const calculatePath = () => {
    const count = milestones.length;
    if (count === 1) return `M ${milestones[0].xOffset} 50 L ${milestones[0].xOffset} 50`;
    
    let d = `M ${finaleStep >= 4 ? 50 : milestones[0].xOffset} 50`;
    for(let i = 1; i < count; i++) {
       const prevY = (i - 1) * 100 + 50;
       const currY = i * 100 + 50;
       const midY = (prevY + currY) / 2;
       
       const prevX = finaleStep >= 4 ? 50 : milestones[i-1].xOffset;
       const currX = finaleStep >= 4 ? 50 : milestones[i].xOffset;
       
       const renderPrevY = finaleStep >= 4 ? (count * 100) / 2 : prevY;
       const renderCurrY = finaleStep >= 4 ? (count * 100) / 2 : currY;
       const renderMidY = finaleStep >= 4 ? (count * 100) / 2 : midY;

       d += ` C ${prevX} ${renderMidY}, ${currX} ${renderMidY}, ${currX} ${renderCurrY}`;
    }
    return d;
  }

  // Phase 4 "intimacy" begins at milestone 4 (Language)
  const isPhase4 = milestones.length >= 4;
  const isFinale = finaleStep >= 1;
  const isConverged = finaleStep >= 4;

  const finaleScale = 0.8 / Math.max(1, milestones.length);
  const containerScale = isFinale ? finaleScale : 1;
  const containerY = isFinale ? -((milestones.length * 100) / 2 - 50) : -(currentIdx * 100);

  return (
    <div className="relative w-full h-[100dvh] overflow-hidden bg-[#FFFDF9] font-literata selection:bg-[#603347]/20">
      <AmbientBackground isIntimate={isPhase4 || isFinale} isEnteringConsultation={isEnteringConsultation} />

      {/* Cinematic Finale Text Sequence (Phase 5 & 6) */}
      <div className="absolute inset-0 z-50 pointer-events-none flex flex-col items-center justify-center pt-32">
        <AnimatePresence mode="wait">
          {finaleStep === 2 && (
            <motion.div key="text1" initial={{ opacity: 0, y: 10, filter: 'blur(10px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} exit={{ opacity: 0, filter: 'blur(10px)' }} transition={{ duration: 1.5 }} className="text-[#4A2B38] font-display-lg text-3xl md:text-5xl text-center max-w-2xl px-6 tracking-tight">
              I think I understand you a little better now.
            </motion.div>
          )}
          {finaleStep === 3 && (
            <motion.div key="text2" initial={{ opacity: 0, y: 10, filter: 'blur(10px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} exit={{ opacity: 0, filter: 'blur(10px)' }} transition={{ duration: 1.5 }} className="text-[#4A2B38] font-display-lg text-3xl md:text-5xl text-center max-w-2xl px-6 tracking-tight">
              Let me make this space feel a little more like yours.
            </motion.div>
          )}
          {finaleStep === 5 && (
            <motion.div key="text3" initial={{ opacity: 0, y: 10, filter: 'blur(10px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} exit={{ opacity: 0, filter: 'blur(10px)' }} transition={{ duration: 1.5 }} className="text-[#4A2B38] font-display-lg text-3xl md:text-5xl text-center max-w-2xl px-6 tracking-tight">
              Your space is ready.
            </motion.div>
          )}
          {finaleStep === 6 && (
            <motion.div key="text4" initial={{ opacity: 0, y: 10, filter: 'blur(10px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} exit={{ opacity: 0, filter: 'blur(10px)' }} transition={{ duration: 1.5 }} className="text-[#4A2B38] font-display-lg text-4xl md:text-6xl text-center max-w-2xl px-6 tracking-tight">
              Hi{userName ? `, ${userName}` : ''}.
            </motion.div>
          )}
          {finaleStep >= 7 && (
            <motion.div key="text5" initial={{ opacity: 0, y: 10, filter: 'blur(10px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} exit={{ opacity: 0, filter: 'blur(10px)' }} transition={{ duration: 1.5 }} className="flex flex-col items-center justify-center max-w-2xl px-6">
              <div className="text-[#4A2B38] font-display-lg text-3xl md:text-5xl text-center tracking-tight mb-4">
                I'm glad you're here.
              </div>
              <div className="text-[#8C7355] font-body-lg text-xl text-center mb-16 opacity-90">
                Whenever you're ready, tell me what's on your mind.
              </div>
              <motion.button 
                onClick={handleStartConsultation}
                disabled={isEnteringConsultation}
                whileHover={{ scale: 1.05 }}
                className="pointer-events-auto relative px-12 py-5 rounded-full font-label-md text-white bg-[#603347] shadow-[0_8px_30px_rgba(96,51,71,0.25)] transition-all duration-500 ease-out outline-none"
              >
                Start your first conversation
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <motion.div 
        className="absolute top-0 left-0 w-full flex flex-col z-10"
        animate={{ y: `${containerY}dvh`, scale: containerScale }}
        transition={{ duration: 2.5, ease: [0.22, 1, 0.36, 1] }}
        style={{ height: `${milestones.length * 100}dvh`, transformOrigin: 'center center' }}
      >
        {/* Background SVG Path */}
        <div className="absolute inset-0 pointer-events-none z-0">
          <svg className="w-full h-full" viewBox={`0 0 100 ${milestones.length * 100}`} preserveAspectRatio="none">
            <motion.path 
              d={calculatePath()} 
              animate={{ d: calculatePath() }}
              transition={{ duration: 3, ease: "easeInOut" }}
              stroke={isConverged ? "url(#finaleGradient)" : "rgba(158, 123, 134, 0.15)"} 
              strokeWidth={isConverged ? "4" : "0.2"} 
              fill="none" 
              vectorEffect="non-scaling-stroke" 
            />
            {!isConverged && (
              <motion.path 
                d={calculatePath()} 
                stroke="url(#pathGradient)" 
                strokeWidth={isPhase4 ? 4 : 2} 
                strokeLinecap="round"
                fill="none" 
                vectorEffect="non-scaling-stroke"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
              />
            )}
            {/* Illumination line when entering consultation */}
            <motion.path 
                d={calculatePath()} 
                stroke="#FFFDF9" 
                strokeWidth={8} 
                strokeLinecap="round"
                fill="none" 
                vectorEffect="non-scaling-stroke"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: isEnteringConsultation ? 1 : 0, opacity: isEnteringConsultation ? 1 : 0 }}
                transition={{ duration: 1.5, ease: "easeOut" }}
                style={{ filter: 'blur(4px)' }}
              />
            <defs>
              <linearGradient id="pathGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#9E7B86" />
                <stop offset="100%" stopColor="#603347" />
              </linearGradient>
              <radialGradient id="finaleGradient">
                <stop offset="0%" stopColor="#9E7B86" />
                <stop offset="100%" stopColor="#603347" stopOpacity="0" />
              </radialGradient>
            </defs>
          </svg>
        </div>

        {/* Milestone Render */}
        {milestones.map((milestone, idx) => {
          const isActive = idx === currentIdx;
          const isIntimateMilestone = idx >= 4; // Becomes intimate at 'Language' and beyond
          
          return (
            <div key={milestone.id} className="h-[100dvh] w-full flex flex-col relative z-10">
              
              <motion.div 
                className="absolute top-1/2 -translate-y-1/2 z-0 pointer-events-none flex flex-col items-center"
                animate={{ 
                  left: isConverged ? '50%' : `${milestone.xOffset}%`,
                  y: isConverged ? `${(milestones.length / 2 - idx - 0.5) * 100}dvh` : '0dvh' 
                }}
                transition={{ duration: 3, ease: "easeInOut" }}
                style={{ transform: 'translate(-50%, -50%)' }}
              >
                <motion.div 
                  initial={{ scale: 0, opacity: 0 }} 
                  animate={{ 
                    scale: isConverged ? 4 : (isActive ? (isIntimateMilestone ? 1.5 : 1) : 0.6), 
                    opacity: isConverged ? 0.1 : 1 
                  }} 
                  transition={{ duration: isConverged ? 3 : 1 }}
                  className={`w-32 h-32 rounded-full bg-gradient-to-tr from-[#603347]/10 to-transparent flex items-center justify-center blur-xl ${isIntimateMilestone ? 'bg-[#FFFDF9]' : ''}`}
                />
                {!isIntimateMilestone && (
                  <motion.span 
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: isFinale ? 0 : (isActive ? 1 : 0.4), y: 0 }} transition={{ duration: 1 }}
                    className="absolute mt-24 text-[#8C7355] font-label-md tracking-wider uppercase text-xs whitespace-nowrap"
                  >
                    {milestone.title}
                  </motion.span>
                )}
              </motion.div>

              <motion.div 
                animate={{ opacity: isFinale ? 0 : 1 }}
                transition={{ duration: 1.5 }}
                className="flex-1 w-full max-w-3xl mx-auto px-6 pt-24 pb-48 flex flex-col justify-center overflow-y-auto hide-scrollbar relative z-10"
              >
                <AnimatePresence>
                  {milestone.messages.map((msg, mIdx) => (
                    <motion.div 
                      key={msg.id}
                      initial={{ opacity: 0, y: 15, filter: 'blur(10px)' }}
                      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                      transition={{ duration: 1, delay: mIdx * 0.2 }}
                      className={`mb-10 w-full flex ${msg.role === 'mythri' ? 'justify-start' : 'justify-end'}`}
                    >
                      {msg.role === 'mythri' ? (
                        <div className={`max-w-[85%] text-[#4A2B38] font-display-lg leading-relaxed tracking-tight ${isIntimateMilestone ? 'text-3xl md:text-4xl text-center mx-auto' : 'text-2xl md:text-3xl'}`}>
                          {msg.text}
                        </div>
                      ) : (
                        <div className="max-w-[75%] bg-white/60 backdrop-blur-md border border-white/80 px-6 py-4 rounded-2xl rounded-tr-sm shadow-[0_4px_20px_rgba(96,51,71,0.04)] text-[#603347] font-body-md text-lg">
                          {msg.text}
                        </div>
                      )}
                    </motion.div>
                  ))}
                  
                  {isAiTyping && isActive && (
                    <motion.div key="typing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className={`text-[#8C7355] font-body-lg italic opacity-60 ml-2 ${isIntimateMilestone ? 'text-center mx-auto' : ''}`}>Mythri is reflecting...</motion.div>
                  )}
                  
                  {milestone.uiControl && isActive && !isAiTyping && (
                    <motion.div key={`ui-${milestone.id}`} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 1 }} className="w-full flex justify-center pb-12 relative z-50">
                      <UIControlsRenderer control={milestone.uiControl} onSelect={submitMessage} />
                    </motion.div>
                  )}
                  <div key="scrollRef" ref={messagesEndRef} />
                </AnimatePresence>
              </motion.div>
            </div>
          )
        })}
      </motion.div>

      {/* Floating Input Area */}
      <div className={`absolute bottom-0 left-0 w-full p-6 md:p-10 z-40 transition-opacity duration-1000 ${isFinale || isAiTyping ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-none'}`}>
        <div className="max-w-3xl mx-auto w-full pointer-events-auto flex items-end gap-4">
          <div className="relative flex-1 rounded-[2rem] bg-white/60 backdrop-blur-xl border border-white/80 shadow-[0_8px_40px_rgba(96,51,71,0.06)] overflow-hidden flex items-end">
            <textarea value={inputValue} onChange={(e) => setInputValue(e.target.value)} onKeyDown={handleKeyDown} disabled={isAiTyping || isFinale} placeholder="Type your response..." rows={1} style={{ minHeight: '60px', maxHeight: '200px' }} className="w-full bg-transparent border-none outline-none resize-none px-8 py-5 text-[#4A2B38] font-body-lg text-lg placeholder:text-[#8C7355]/40 disabled:opacity-50 hide-scrollbar" />
            <button onClick={() => submitMessage(inputValue)} disabled={!inputValue.trim() || isAiTyping || isFinale} className="absolute right-4 bottom-3 w-10 h-10 rounded-full bg-[#603347] text-white flex items-center justify-center transition-all disabled:opacity-30 disabled:scale-90 hover:scale-105 shadow-md"><svg className="w-4 h-4 translate-x-[1px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5M5 12l7-7 7 7" /></svg></button>
          </div>
          {/* Allow skipping/not sure if there's no UI control active, just for flexibility */}
          {!milestones[currentIdx].uiControl && !isFinale && !isAiTyping && (
             <button onClick={() => submitMessage("Skip")} className="px-6 py-4 rounded-[2rem] bg-white/40 backdrop-blur-md border border-white/60 text-[#8C7355] font-label-md text-sm transition-all hover:bg-white/80 shadow-sm whitespace-nowrap h-[60px]">
               Skip
             </button>
          )}
        </div>
      </div>
    </div>
  )
}
