'use client'

import React, { useState, useEffect, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Wind, 
  Eye, 
  ShieldCheck, 
  Compass, 
  Scale, 
  Clock, 
  Footprints, 
  Sparkles, 
  CheckCircle2, 
  Moon,
  Play, 
  Pause, 
  RotateCcw, 
  X, 
  ArrowLeft, 
  ArrowRight,
  Brain,
  Activity,
  Heart,
  Check,
  ChevronRight,
  Sparkle,
  Calendar,
  CheckSquare,
  Square,
  HelpCircle,
  LucideIcon
} from 'lucide-react'
import RadialNav from '@/shared/components/RadialNav'
import ThemeToggle from '@/shared/components/ThemeToggle'
import { useTheme } from 'next-themes'

interface Exercise {
  id: string
  number: number
  title: string
  shortTitle: string
  tagline: string
  category: 'Breathing' | 'Grounding' | 'Cognitive' | 'Somatic' | 'Action'
  categoryLabel: string
  icon: LucideIcon
  color: string
  accentBg: string
  darkAccentBg: string
  summary: string
  steps: string[]
  principle: string
  practiceType: 'breath-sigh' | 'sensory-54321' | 'labeling' | 'somatic-feet' | 'fact-prediction' | 'worry-postpone' | 'movement-walk' | 'defusion' | 'micro-action' | 'defer-solve'
}

const EXERCISES: Exercise[] = [
  {
    id: 'physiological-sigh',
    number: 1,
    title: 'Physiological Sigh',
    shortTitle: 'Break the Panic Loop',
    tagline: 'Break the panic loop with neural breath resets',
    category: 'Breathing',
    categoryLabel: 'Breathing & Vagal Reset',
    icon: Wind,
    color: '#8C7355',
    accentBg: 'rgba(140, 115, 85, 0.12)',
    darkAccentBg: 'rgba(140, 115, 85, 0.25)',
    summary: 'A fast-acting dual-inhale and prolonged exhale technique that physically resets blood gas chemistry and triggers the vagus nerve.',
    steps: [
      'Inhale deeply through your nose until lungs feel mostly full.',
      'Take a second, smaller inhale on top of it to expand all air sacs (alveoli).',
      'Slowly exhale through your mouth with a soft, long sigh.',
      'Repeat 3–5 times, allowing your shoulders and jaw to drop.'
    ],
    principle: 'Panic often creates rapid, shallow breathing, which can amplify physical sensations and the perception of danger. A longer exhale helps interrupt that feedback loop.',
    practiceType: 'breath-sigh'
  },
  {
    id: '54321-grounding',
    number: 2,
    title: '5–4–3–2–1 Grounding',
    shortTitle: 'Bring Attention into the Present',
    tagline: 'Bring attention firmly into the tangible present',
    category: 'Grounding',
    categoryLabel: 'Sensory Grounding',
    icon: Eye,
    color: '#603347',
    accentBg: 'rgba(96, 51, 71, 0.12)',
    darkAccentBg: 'rgba(96, 51, 71, 0.25)',
    summary: 'A structured sensory scanning technique that systematically engages sight, touch, sound, smell, and taste to pull focus away from catastrophic thoughts.',
    steps: [
      'Look around and identify 5 things you can see (colors, shapes, light).',
      'Identify 4 things you can physically feel (feet on ground, fabric, air).',
      'Identify 3 things you can hear (ambient hum, birds, your breath).',
      'Identify 2 things you can smell (soap, coffee, fresh air).',
      'Identify 1 thing you can taste (or recall your favorite taste). Don\'t rush it.'
    ],
    principle: 'Panic pulls attention toward imagined future threats. Grounding deliberately redirects attention toward present sensory information.',
    practiceType: 'sensory-54321'
  },
  {
    id: 'name-the-experience',
    number: 3,
    title: 'Name the Experience',
    shortTitle: '“This is Panic, Not Danger”',
    tagline: '“My brain is detecting danger right now. I don\'t have to solve everything this second.”',
    category: 'Cognitive',
    categoryLabel: 'Cognitive Distancing & Labeling',
    icon: ShieldCheck,
    color: '#7A3D58',
    accentBg: 'rgba(122, 61, 88, 0.12)',
    darkAccentBg: 'rgba(122, 61, 88, 0.25)',
    summary: 'Observe internal bodily sensations without catastrophizing them as immediate biological danger.',
    steps: [
      'Say to yourself: “My brain is detecting danger right now. I don\'t have to solve everything this second.”',
      'Identify what you\'re experiencing: “My heart is racing.”',
      'Acknowledge: “My chest feels tight.”',
      'Acknowledge: “My thoughts are moving quickly.”',
      'Avoid immediately interpreting the sensations as catastrophic.'
    ],
    principle: 'This is a form of cognitive distancing/labeling. You are observing the experience rather than becoming completely fused with it.',
    practiceType: 'labeling'
  },
  {
    id: 'feet-on-floor',
    number: 4,
    title: 'Feet-on-Floor Orientation',
    shortTitle: 'Somatic Physical Anchoring',
    tagline: 'Physical root contact & temporal orientation',
    category: 'Somatic',
    categoryLabel: 'Somatic Orientation',
    icon: Compass,
    color: '#8C7355',
    accentBg: 'rgba(140, 115, 85, 0.12)',
    darkAccentBg: 'rgba(140, 115, 85, 0.25)',
    summary: 'Anchor your nervous system through physical weight distribution and spatial-temporal grounding.',
    steps: [
      'Put both feet firmly on the ground.',
      'Notice: pressure under your heels, pressure under your toes.',
      'Notice: temperature of the floor, texture of your shoes/socks, position of your body.',
      'Then slowly look around and name where you are and what day it is.',
      'Example: “I\'m sitting in my room. It\'s Saturday. I\'m here, I\'m safe in this moment, and I don\'t need to figure everything out right now.”'
    ],
    principle: 'Orientation tells the brain, “I am here, now—not inside the imagined scenario.”',
    practiceType: 'somatic-feet'
  },
  {
    id: 'facts-vs-predictions',
    number: 5,
    title: 'What Do I Actually Know?',
    shortTitle: 'Facts vs Predictions',
    tagline: 'Separate verifiable reality from catastrophic fear projections',
    category: 'Cognitive',
    categoryLabel: 'Cognitive Reframing',
    icon: Scale,
    color: '#603347',
    accentBg: 'rgba(96, 51, 71, 0.12)',
    darkAccentBg: 'rgba(96, 51, 71, 0.25)',
    summary: 'Divide your thoughts into verifiable facts versus imagined future predictions.',
    steps: [
      'When panic produces catastrophic thoughts, divide a piece of paper mentally or physically into FACTS and PREDICTIONS.',
      'FACTS: What do I actually know for certain? (e.g. “They haven\'t replied.”)',
      'PREDICTIONS: What am I afraid might happen? (e.g. “They hate me and everything is ruined.”)',
      'Don\'t argue with the prediction. Simply separate it from reality.'
    ],
    principle: 'Panic tends to treat possibilities as certainties. This exercise restores cognitive flexibility.',
    practiceType: 'fact-prediction'
  },
  {
    id: 'worry-postponement',
    number: 6,
    title: 'Worry Postponement',
    shortTitle: 'Scheduled Container for the Brain',
    tagline: 'Give your brain a scheduled container',
    category: 'Action',
    categoryLabel: 'Attention Control',
    icon: Clock,
    color: '#7A3D58',
    accentBg: 'rgba(122, 61, 88, 0.12)',
    darkAccentBg: 'rgba(122, 61, 88, 0.25)',
    summary: 'Acknowledge concerns while delaying rumination until a scheduled 15-minute appointment later in the day.',
    steps: [
      'Tell yourself: “I\'m not ignoring this. I\'m postponing it.”',
      'Choose a specific time later—for example, 7:30 PM for 15 minutes.',
      'If the thought returns: “Not now. I have a time for this.”',
      'Write the thought down and return to what you\'re doing.'
    ],
    principle: 'This reduces the urge to continuously engage with intrusive worry while still acknowledging it.',
    practiceType: 'worry-postpone'
  },
  {
    id: 'movement-reset',
    number: 7,
    title: 'Five-Minute Movement Reset',
    shortTitle: 'Bilateral Somatic Reset',
    tagline: 'Synchronize physical movement with steady attention',
    category: 'Somatic',
    categoryLabel: 'Somatic Movement',
    icon: Footprints,
    color: '#8C7355',
    accentBg: 'rgba(140, 115, 85, 0.12)',
    darkAccentBg: 'rgba(140, 115, 85, 0.25)',
    summary: 'Rhythmic walking that channels excess adrenaline and redirects attention externally.',
    steps: [
      'Walk slowly for five minutes.',
      'While walking, synchronize attention with your body: Left → right → left → right.',
      'Notice your arms, legs and breathing.',
      'Don\'t use the exercise to “escape” the panic. Let the sensations exist while continuing to move.'
    ],
    principle: 'This helps break the cycle of internal monitoring and gives your attention an external, controllable task.',
    practiceType: 'movement-walk'
  },
  {
    id: 'cognitive-defusion',
    number: 8,
    title: 'Cognitive Defusion',
    shortTitle: 'Change “I am” into “I am having”',
    tagline: 'Uncouple identity from temporary threat predictions',
    category: 'Cognitive',
    categoryLabel: 'Acceptance & ACT',
    icon: Sparkles,
    color: '#603347',
    accentBg: 'rgba(96, 51, 71, 0.12)',
    darkAccentBg: 'rgba(96, 51, 71, 0.25)',
    summary: 'Transform rigid, frightening thoughts into neutral observed mental events using Acceptance & Commitment principles.',
    steps: [
      'Take the frightening thought: “Something terrible is going to happen.”',
      'Change it to: “I\'m having the thought that something terrible is going to happen.”',
      'Then: “My brain is producing a threat prediction.”',
      'Notice how the statement changes.'
    ],
    principle: 'This comes from Acceptance and Commitment Therapy (ACT). The objective isn\'t to prove the thought false; it\'s to create distance from it.',
    practiceType: 'defusion'
  },
  {
    id: 'one-small-action',
    number: 9,
    title: 'One-Small-Action Exercise',
    shortTitle: 'Restore Immediate Agency',
    tagline: 'What is the smallest useful thing I can do in the next 5 minutes?',
    category: 'Action',
    categoryLabel: 'Behavioral Activation',
    icon: CheckCircle2,
    color: '#7A3D58',
    accentBg: 'rgba(122, 61, 88, 0.12)',
    darkAccentBg: 'rgba(122, 61, 88, 0.25)',
    summary: 'Cut through helplessness and overwhelm by executing a single small achievable task.',
    steps: [
      'When everything feels overwhelming, ask: “What is the smallest useful thing I can do in the next 5 minutes?”',
      'Pick one: Drink water • Wash your face • Sit somewhere quieter • Put your phone down.',
      'Or: Open the document • Send one message • Take a shower • Lie down and rest.',
      'Do only that one thing.'
    ],
    principle: 'Panic creates a perception of lack of control. Completing a small, achievable action restores agency.',
    practiceType: 'micro-action'
  },
  {
    id: 'not-solve-tonight',
    number: 10,
    title: '“I Don’t Need to Solve Tonight”',
    shortTitle: 'Regulate First → Think Second',
    tagline: 'Pause life-solving while the nervous system is overwhelmed',
    category: 'Cognitive',
    categoryLabel: 'Nervous System Regulation',
    icon: Moon,
    color: '#8C7355',
    accentBg: 'rgba(140, 115, 85, 0.12)',
    darkAccentBg: 'rgba(140, 115, 85, 0.25)',
    summary: 'Stop exhausting problem-solving cycles when your nervous system is in an activated state.',
    steps: [
      'Say: “This problem may be important. But I don\'t need to solve my entire life while my nervous system is overwhelmed.”',
      'Ask Checkpoint 1: Is there an immediate danger?',
      'Ask Checkpoint 2: Is there something that genuinely needs to happen within the next hour?',
      'Ask Checkpoint 3: If not, can this wait until my brain is calmer? If yes, pause the problem-solving.'
    ],
    principle: 'Trying to intellectually solve a major problem while highly aroused often produces more catastrophic thinking. Regulate first → think second.',
    practiceType: 'defer-solve'
  }
]

const CATEGORIES = [
  { id: 'All', label: 'All Exercises' },
  { id: 'Breathing', label: 'Breathing & Vagal' },
  { id: 'Grounding', label: 'Sensory Grounding' },
  { id: 'Cognitive', label: 'Cognitive & ACT' },
  { id: 'Somatic', label: 'Somatic & Body' },
  { id: 'Action', label: 'Action & Agency' },
]

export default function ExercisesPage() {
  const router = useRouter()
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [activeExercise, setActiveExercise] = useState<Exercise | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])
  
  // 2-Minute Guided Practice Timer State
  const [isPracticing, setIsPracticing] = useState(false)
  const [timeLeft, setTimeLeft] = useState(120) // 120 seconds
  const [isTimerRunning, setIsTimerRunning] = useState(false)
  const [practiceCompleted, setPracticeCompleted] = useState(false)

  // Physiological sigh breath animation state
  const [sighPhase, setSighPhase] = useState<'inhale1' | 'inhale2' | 'exhale'>('inhale1')
  const [sighCycle, setSighCycle] = useState(1)

  // 5-4-3-2-1 Interactive Step State
  const [groundingStep, setGroundingStep] = useState(0)

  // Cognitive Labeling Checkboxes
  const [labeledSensations, setLabeledSensations] = useState<Record<string, boolean>>({})

  // Somatic Feet Checklist
  const [somaticChecks, setSomaticChecks] = useState<Record<string, boolean>>({})

  // Facts vs Predictions Interactive Inputs
  const [factInput, setFactInput] = useState('')
  const [predInput, setPredInput] = useState('')

  // Worry Postponement State
  const [worryNote, setWorryNote] = useState('')
  const [postponeTime, setPostponeTime] = useState('7:30 PM')
  const [worryPostponed, setWorryPostponed] = useState(false)

  // Movement Reset Left/Right Step State
  const [stepSide, setStepSide] = useState<'left' | 'right'>('left')
  const [stepCount, setStepCount] = useState(0)

  // Defusion Interactive Stage (0, 1, 2)
  const [defusionStage, setDefusionStage] = useState(0)
  const [customDefusionThought, setCustomDefusionThought] = useState('Something terrible is going to happen.')

  // Micro-Action Selector
  const [selectedMicroAction, setSelectedMicroAction] = useState('Drink a glass of cold water')

  // Defer Solve Checkpoints (Q1, Q2, Q3)
  const [deferAnswers, setDeferAnswers] = useState({ q1: false, q2: false, q3: true })

  // Filtered exercises
  const filteredExercises = useMemo(() => {
    if (selectedCategory === 'All') return EXERCISES
    return EXERCISES.filter(ex => ex.category === selectedCategory)
  }, [selectedCategory])

  // Timer interval
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null
    if (isPracticing && isTimerRunning && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setIsTimerRunning(false)
            setPracticeCompleted(true)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => {
      if (timer) clearInterval(timer)
    }
  }, [isPracticing, isTimerRunning, timeLeft])

  // Physiological sigh cycle runner
  useEffect(() => {
    let cycleTimeout: NodeJS.Timeout | null = null
    if (isPracticing && isTimerRunning && activeExercise?.practiceType === 'breath-sigh') {
      const runCycle = () => {
        setSighPhase('inhale1')
        cycleTimeout = setTimeout(() => {
          setSighPhase('inhale2')
          cycleTimeout = setTimeout(() => {
            setSighPhase('exhale')
            cycleTimeout = setTimeout(() => {
              setSighCycle(c => c + 1)
              runCycle()
            }, 5500) // 5.5s exhale
          }, 1500) // 1.5s second inhale
        }, 2500) // 2.5s first inhale
      }
      runCycle()
    }
    return () => {
      if (cycleTimeout) clearTimeout(cycleTimeout)
    }
  }, [isPracticing, isTimerRunning, activeExercise])

  // Movement Reset step interval
  useEffect(() => {
    let stepInterval: NodeJS.Timeout | null = null
    if (isPracticing && isTimerRunning && activeExercise?.practiceType === 'movement-walk') {
      stepInterval = setInterval(() => {
        setStepSide(prev => (prev === 'left' ? 'right' : 'left'))
        setStepCount(c => c + 1)
      }, 1400)
    }
    return () => {
      if (stepInterval) clearInterval(stepInterval)
    }
  }, [isPracticing, isTimerRunning, activeExercise])

  const handleStartPractice = (exercise: Exercise) => {
    setActiveExercise(exercise)
    setIsPracticing(true)
    setTimeLeft(120)
    setIsTimerRunning(true)
    setPracticeCompleted(false)
    setGroundingStep(0)
    setDefusionStage(0)
    setSighCycle(1)
    setLabeledSensations({})
    setSomaticChecks({})
    setWorryPostponed(false)
    setStepCount(0)
  }

  const handleEndPractice = () => {
    setIsPracticing(false)
    setIsTimerRunning(false)
    setTimeLeft(120)
    setPracticeCompleted(false)
  }

  const handleResetTimer = () => {
    setTimeLeft(120)
    setIsTimerRunning(true)
    setPracticeCompleted(false)
  }

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const isDark = mounted && resolvedTheme === 'dark'

  return (
    <div className="relative min-h-[100dvh] w-full flex flex-col bg-[#FFF8F5] dark:bg-[#120F12] text-on-background">
      {/* Ambient Background Wallpaper */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0 bg-[#fff8f5] dark:bg-[#120F12]">
        <div className="absolute inset-0 bg-cover bg-center transition-opacity duration-700 opacity-50 dark:opacity-40 bg-[url('/assets/background.png')] dark:bg-[url('/assets/Gemini_Generated_Image_psevl6psevl6psev-clean.png')]"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-[#fff8f5]/70 via-[#fff8f5]/40 to-[#fff8f5]/90 dark:from-[#120F12]/85 dark:via-[#120F12]/60 dark:to-[#120F12]/95"></div>
        <div className="absolute inset-0 bg-grain opacity-[0.03] mix-blend-overlay"></div>
      </div>

      {/* Top Header */}
      <header className="fixed top-0 z-40 flex justify-between items-center w-full px-4 sm:px-6 md:px-8 py-3.5 sm:py-4 backdrop-blur-md bg-white/40 dark:bg-black/40 border-b border-white/40 dark:border-white/10 pointer-events-none transition-colors">
        <div className="flex items-center gap-3 pointer-events-auto">
          <RadialNav />
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push('/home')}>
            <span className="material-symbols-outlined text-primary text-2xl sm:text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>spa</span>
            <span className="font-headline text-xl sm:text-2xl font-bold tracking-tight text-on-background">Mythri</span>
          </div>
        </div>

        <div className="flex items-center gap-2.5 sm:gap-3 pointer-events-auto">
          <Link
            href="/home"
            className="flex items-center gap-1.5 bg-white/60 dark:bg-white/10 hover:bg-white/90 dark:hover:bg-white/20 text-on-surface px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-label-md border border-white/60 dark:border-white/10 shadow-xs transition-all active:scale-95"
          >
            <ArrowLeft size={15} />
            <span className="hidden sm:inline">Sanctuary Home</span>
          </Link>
          <ThemeToggle />
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 sm:pt-24 pb-16 flex flex-col gap-6">
        
        {/* Page Hero Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 animate-fade-in-up">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-0.5 rounded-full text-[11px] font-label-md font-bold uppercase tracking-wider bg-primary/10 text-primary dark:bg-white/10 dark:text-white">
                Somatic & Cognitive Toolkit
              </span>
              <span className="text-xs text-on-surface-variant/70 font-label-md">10 Evidence-Based Exercises</span>
            </div>
            <h1 className="text-display-sm sm:text-display-md font-headline font-bold text-primary tracking-tight">
              Grounding & Regulation Sanctuary
            </h1>
            <p className="text-body-sm sm:text-body-md text-on-surface-variant/80 font-body mt-1">
              Select any exercise to view the neurological breakdown and instructions, or click <strong>Try for 2 min</strong> to start an interactive guided practice.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-white/60 dark:bg-white/5 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/60 dark:border-white/10 shadow-xs self-start sm:self-auto">
            <Activity size={18} className="text-primary" />
            <div className="text-xs font-label-md text-on-surface-variant">
              <span>Principle: </span>
              <strong className="text-primary font-bold">Regulate First → Think Second</strong>
            </div>
          </div>
        </div>

        {/* Category Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-label-md font-semibold whitespace-nowrap transition-all duration-200 border ${
                selectedCategory === cat.id
                  ? 'bg-[#603347] text-white border-[#603347] shadow-sm shadow-[#603347]/20 scale-[1.02]'
                  : 'bg-white/60 dark:bg-white/5 hover:bg-white/90 dark:hover:bg-white/15 text-on-surface border-white/60 dark:border-white/10'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* 10 Exercises Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          {filteredExercises.map((exercise) => {
            const Icon = exercise.icon
            return (
              <motion.div
                key={exercise.id}
                whileHover={{ y: -3 }}
                transition={{ duration: 0.2 }}
                onClick={() => setActiveExercise(exercise)}
                className="group relative bg-white/70 dark:bg-[#1E181D]/80 backdrop-blur-xl rounded-[28px] p-6 border border-white/60 dark:border-white/10 shadow-md hover:shadow-xl transition-all duration-300 flex flex-col justify-between cursor-pointer"
              >
                <div>
                  {/* Card Top Row: Number & Category Badge */}
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary/10 dark:bg-white/10 flex items-center justify-center text-primary dark:text-white font-headline font-bold text-xs">
                        #{exercise.number}
                      </div>
                      <span className="text-[11px] font-label-md font-bold text-on-surface-variant/70 uppercase tracking-wider">
                        {exercise.categoryLabel}
                      </span>
                    </div>

                    <div className="w-9 h-9 rounded-2xl bg-white/80 dark:bg-white/10 border border-white/60 dark:border-white/10 flex items-center justify-center text-primary dark:text-white group-hover:scale-110 transition-transform">
                      <Icon size={18} strokeWidth={2.2} />
                    </div>
                  </div>

                  {/* Title & Tagline */}
                  <h3 className="text-headline-xs sm:text-headline-sm font-headline font-bold text-primary dark:text-[#E8D4C8] group-hover:text-primary/90 dark:group-hover:text-white transition-colors">
                    {exercise.title}
                  </h3>
                  <p className="text-body-xs sm:text-body-sm text-on-surface font-medium opacity-90 mt-1 mb-3">
                    {exercise.tagline}
                  </p>

                  {/* Summary Snippet */}
                  <p className="text-[12px] sm:text-[13px] font-body text-on-surface-variant leading-relaxed line-clamp-3 mb-4">
                    {exercise.summary}
                  </p>
                </div>

                {/* Card Action Footer */}
                <div className="pt-4 border-t border-black/5 dark:border-white/10 flex items-center justify-between gap-2">
                  <span className="text-[11px] font-label-md text-primary dark:text-[#E8D4C8] font-semibold flex items-center gap-1 group-hover:underline">
                    View Steps & Details <ChevronRight size={14} />
                  </span>

                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleStartPractice(exercise)
                    }}
                    className="flex items-center gap-1.5 bg-[#603347] text-white hover:bg-[#4E2839] dark:bg-[#E8D4C8] dark:text-[#28131F] dark:hover:bg-[#F3B5CE] px-3.5 py-1.5 rounded-full text-xs font-label-md font-semibold shadow-xs hover:shadow-md transition-all active:scale-95"
                  >
                    <Play size={12} fill="currentColor" />
                    <span>Try for 2 min</span>
                  </button>
                </div>
              </motion.div>
            )
          })}
        </div>

      </main>

      {/* ── EXERCISE DETAIL MODAL / DIALOG ── */}
      <AnimatePresence>
        {activeExercise && !isPracticing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveExercise(null)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm"
            />

            {/* Modal Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative w-full max-w-2xl bg-white/95 dark:bg-[#1C141A]/95 backdrop-blur-2xl rounded-[32px] p-6 sm:p-8 shadow-2xl border border-white/80 dark:border-white/15 z-10 flex flex-col gap-6 my-8 max-h-[85vh] overflow-y-auto"
            >
              {/* Close Button */}
              <button
                onClick={() => setActiveExercise(null)}
                className="absolute top-5 right-5 w-9 h-9 rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 flex items-center justify-center text-on-surface transition-colors"
                aria-label="Close details"
              >
                <X size={18} />
              </button>

              {/* Header Title */}
              <div className="flex items-start gap-4 pr-10">
                <div className="w-12 h-12 rounded-2xl bg-[#603347] text-white flex items-center justify-center flex-shrink-0 shadow-md">
                  {React.createElement(activeExercise.icon, { size: 24, strokeWidth: 2.2 })}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-label-md font-bold uppercase tracking-wider text-primary">
                      Exercise #{activeExercise.number} • {activeExercise.categoryLabel}
                    </span>
                  </div>
                  <h2 className="text-headline-sm sm:text-headline-md font-headline font-bold text-on-background">
                    {activeExercise.title}
                  </h2>
                  <p className="text-body-sm text-on-surface-variant font-medium">
                    {activeExercise.tagline}
                  </p>
                </div>
              </div>

              {/* How to Perform Steps */}
              <div className="bg-primary/5 dark:bg-white/5 rounded-2xl p-5 border border-primary/10 dark:border-white/10 flex flex-col gap-3">
                <h4 className="text-xs font-label-md font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                  <Sparkle size={14} /> How:
                </h4>
                <div className="flex flex-col gap-2.5">
                  {activeExercise.steps.map((step, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-primary/20 dark:bg-white/20 text-primary dark:text-white flex items-center justify-center text-[11px] font-bold flex-shrink-0 mt-0.5">
                        {idx + 1}
                      </div>
                      <p className="text-body-sm font-body text-on-surface leading-relaxed">
                        {step}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Psychological Principle */}
              <div className="bg-[#8C7355]/10 dark:bg-[#8C7355]/20 rounded-2xl p-5 border border-[#8C7355]/20 flex flex-col gap-2">
                <h4 className="text-xs font-label-md font-bold uppercase tracking-wider text-[#8C7355] dark:text-[#E8D4C8] flex items-center gap-1.5">
                  <Brain size={15} /> Psychological Principle:
                </h4>
                <p className="text-body-sm font-body text-on-surface italic leading-relaxed">
                  “{activeExercise.principle}”
                </p>
              </div>

              {/* Modal Footer CTA */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                <div className="flex items-center gap-2 text-xs font-label-md text-on-surface-variant/70">
                  <Clock size={15} />
                  <span>Interactive 2-minute paced timer</span>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <button
                    onClick={() => setActiveExercise(null)}
                    className="flex-1 sm:flex-none px-4 py-2.5 rounded-full text-xs font-label-md font-semibold text-on-surface-variant hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                  >
                    Close
                  </button>

                  <button
                    onClick={() => handleStartPractice(activeExercise)}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-[#603347] hover:bg-[#4E2839] text-white px-6 py-2.5 rounded-full text-sm font-label-md font-bold shadow-lg shadow-[#603347]/25 transition-all active:scale-95"
                  >
                    <Play size={16} fill="currentColor" />
                    <span>Try for 2 min</span>
                  </button>
                </div>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── 2-MINUTE INTERACTIVE GUIDED PRACTICE MODE (FULLSCREEN FOCUS VIEW) ── */}
      <AnimatePresence>
        {isPracticing && activeExercise && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="fixed inset-0 z-50 bg-[#FFF8F5]/95 dark:bg-[#120F12]/95 backdrop-blur-3xl flex flex-col justify-between p-4 sm:p-8"
          >
            {/* Top Bar: Exercise Name, Time Badge & End Button */}
            <div className="w-full max-w-4xl mx-auto flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#603347] text-white flex items-center justify-center shadow-md">
                  {React.createElement(activeExercise.icon, { size: 20, strokeWidth: 2.2 })}
                </div>
                <div>
                  <span className="text-[10px] font-label-md font-bold uppercase tracking-wider text-primary">
                    Guided 2-Minute Practice
                  </span>
                  <h2 className="text-headline-xs sm:text-headline-sm font-headline font-bold text-on-background">
                    {activeExercise.title}
                  </h2>
                </div>
              </div>

              <button
                onClick={handleEndPractice}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-error/40 text-error hover:bg-error/10 text-xs font-label-md font-bold shadow-xs transition-all active:scale-95"
              >
                <X size={15} />
                <span>End Exercise</span>
              </button>
            </div>

            {/* Middle: Custom Interactive Experience by Practice Type */}
            <div className="w-full max-w-3xl mx-auto my-auto flex flex-col items-center justify-center text-center gap-8 py-4">
              
              {practiceCompleted ? (
                /* Completion Screen */
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white/80 dark:bg-[#1E141C]/90 rounded-[32px] p-8 border border-white/80 dark:border-white/10 shadow-2xl flex flex-col items-center gap-4 max-w-lg"
                >
                  <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <CheckCircle2 size={36} />
                  </div>
                  <h3 className="text-headline-md font-headline font-bold text-primary">
                    2 Minutes Completed
                  </h3>
                  <p className="text-body-sm text-on-surface-variant font-body">
                    Wonderful job taking time to regulate your nervous system. Notice any shifts in your heart rate, muscle tension, or clarity.
                  </p>
                  <div className="flex items-center gap-3 mt-3">
                    <button
                      onClick={handleResetTimer}
                      className="px-4 py-2 rounded-full bg-primary/10 text-primary hover:bg-primary/20 text-xs font-label-md font-bold transition-all"
                    >
                      Repeat 2 Min
                    </button>
                    <button
                      onClick={handleEndPractice}
                      className="px-6 py-2 rounded-full bg-primary text-white hover:bg-primary/90 text-xs font-label-md font-bold shadow-md transition-all"
                    >
                      Done
                    </button>
                  </div>
                </motion.div>
              ) : (
                <>
                  {/* 1. Physiological Sigh Custom Interactive Breath Orb */}
                  {activeExercise.practiceType === 'breath-sigh' && (
                    <div className="flex flex-col items-center gap-6">
                      <div className="relative w-56 h-56 sm:w-64 sm:h-64 flex items-center justify-center">
                        {/* Outer Glow Halo */}
                        <motion.div
                          animate={{
                            scale: sighPhase === 'exhale' ? 0.75 : sighPhase === 'inhale2' ? 1.3 : 1.1,
                            opacity: sighPhase === 'exhale' ? 0.2 : 0.6,
                          }}
                          transition={{ duration: sighPhase === 'exhale' ? 5.5 : sighPhase === 'inhale2' ? 1.5 : 2.5, ease: 'easeInOut' }}
                          className="absolute inset-0 rounded-full bg-[#8C7355]/25 filter blur-2xl"
                        />

                        {/* Central Animated Breathing Bubble */}
                        <motion.div
                          animate={{
                            scale: sighPhase === 'exhale' ? 0.7 : sighPhase === 'inhale2' ? 1.25 : 1.05,
                          }}
                          transition={{ duration: sighPhase === 'exhale' ? 5.5 : sighPhase === 'inhale2' ? 1.5 : 2.5, ease: 'easeInOut' }}
                          className="w-44 h-44 sm:w-52 sm:h-52 rounded-full bg-gradient-to-tr from-[#603347] to-[#8C7355] text-white flex flex-col items-center justify-center shadow-2xl p-4"
                        >
                          <span className="text-[11px] font-label-md font-bold uppercase tracking-widest text-white/80">
                            {sighPhase === 'inhale1' ? '1st Inhale (Nose)' : sighPhase === 'inhale2' ? '2nd Inhale (Top)' : 'Slow Exhale (Mouth)'}
                          </span>
                          <span className="text-headline-sm sm:text-headline-md font-headline font-bold mt-1">
                            {sighPhase === 'inhale1' ? 'Inhale Deeply' : sighPhase === 'inhale2' ? 'Second Sniff' : 'Slow Exhale...'}
                          </span>
                        </motion.div>
                      </div>

                      <div className="bg-white/60 dark:bg-white/5 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/60 dark:border-white/10 text-xs font-label-md text-on-surface-variant">
                        Cycle #{sighCycle} • Follow the expanding & contracting orb
                      </div>
                    </div>
                  )}

                  {/* 2. 5-4-3-2-1 Sensory Interactive Checklist */}
                  {activeExercise.practiceType === 'sensory-54321' && (
                    <div className="w-full max-w-xl flex flex-col items-center gap-4">
                      <div className="w-full bg-white/75 dark:bg-[#1E141C]/85 backdrop-blur-xl rounded-[28px] p-6 border border-white/60 dark:border-white/10 shadow-lg text-left">
                        <span className="text-[11px] font-label-md font-bold uppercase tracking-wider text-primary">
                          Sensory Checkpoint {groundingStep + 1} of 5
                        </span>
                        <h3 className="text-headline-sm font-headline font-bold text-on-background mt-1 mb-2">
                          {groundingStep === 0 && '👀 5 Things You Can SEE'}
                          {groundingStep === 1 && '✋ 4 Things You Can FEEL'}
                          {groundingStep === 2 && '👂 3 Things You Can HEAR'}
                          {groundingStep === 3 && '👃 2 Things You Can SMELL'}
                          {groundingStep === 4 && '👅 1 Thing You Can TASTE'}
                        </h3>
                        <p className="text-body-sm text-on-surface-variant mb-5">
                          {groundingStep === 0 && 'Look around and identify 5 things you can see (colors, light reflections, objects). Don’t rush it.'}
                          {groundingStep === 1 && 'Identify 4 things you can physically feel (feet on floor, clothes on skin, temperature).'}
                          {groundingStep === 2 && 'Identify 3 distinct sounds in your present environment.'}
                          {groundingStep === 3 && 'Identify 2 things you can smell around you.'}
                          {groundingStep === 4 && 'Identify 1 thing you can taste, or recall a soothing warm taste.'}
                        </p>

                        <div className="flex items-center justify-between pt-3 border-t border-black/5 dark:border-white/10">
                          <button
                            disabled={groundingStep === 0}
                            onClick={() => setGroundingStep(s => Math.max(0, s - 1))}
                            className="px-3.5 py-1.5 rounded-full text-xs font-label-md font-semibold text-on-surface-variant disabled:opacity-30 hover:bg-black/5 dark:hover:bg-white/10"
                          >
                            Previous
                          </button>
                          <button
                            onClick={() => setGroundingStep(s => (s + 1) % 5)}
                            className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#603347] text-white text-xs font-label-md font-bold shadow-xs hover:bg-[#4E2839]"
                          >
                            <span>Next Step</span>
                            <ArrowRight size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 3. Name the Experience Interactive Labeling */}
                  {activeExercise.practiceType === 'labeling' && (
                    <div className="w-full max-w-xl bg-white/80 dark:bg-[#1E141C]/85 backdrop-blur-xl rounded-[28px] p-6 sm:p-8 border border-white/60 dark:border-white/10 shadow-lg text-left flex flex-col gap-4">
                      <div className="bg-primary/10 dark:bg-white/10 rounded-2xl p-4 border border-primary/20 text-center">
                        <p className="text-headline-xs sm:text-headline-sm font-headline font-bold text-primary dark:text-[#E8D4C8]">
                          “My brain is detecting danger right now.<br/>I don’t have to solve everything this second.”
                        </p>
                      </div>
                      
                      <p className="text-body-xs font-label-md uppercase tracking-wider text-on-surface-variant font-bold mt-2">
                        Identify What You Are Experiencing:
                      </p>

                      <div className="flex flex-col gap-2.5">
                        {[
                          'My heart is racing.',
                          'My chest feels tight.',
                          'My thoughts are moving quickly.',
                          'This is a biological alarm, not actual danger.'
                        ].map((sens, idx) => (
                          <div 
                            key={idx}
                            onClick={() => setLabeledSensations(prev => ({ ...prev, [sens]: !prev[sens] }))}
                            className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                              labeledSensations[sens]
                                ? 'bg-[#603347]/10 dark:bg-[#603347]/30 border-[#603347] text-primary dark:text-white font-medium'
                                : 'bg-white/60 dark:bg-white/5 border-white/60 dark:border-white/10 text-on-surface'
                            }`}
                          >
                            {labeledSensations[sens] ? <CheckSquare size={18} className="text-primary" /> : <Square size={18} className="opacity-50" />}
                            <span className="text-body-sm">“{sens}”</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 4. Feet-on-Floor Orientation */}
                  {activeExercise.practiceType === 'somatic-feet' && (
                    <div className="w-full max-w-xl bg-white/80 dark:bg-[#1E141C]/85 backdrop-blur-xl rounded-[28px] p-6 sm:p-8 border border-white/60 dark:border-white/10 shadow-lg text-left flex flex-col gap-4">
                      <div className="flex items-center gap-2">
                        <Compass size={18} className="text-primary" />
                        <span className="text-[11px] font-label-md font-bold uppercase tracking-wider text-primary">
                          Somatic Anchor Checkpoints
                        </span>
                      </div>

                      <div className="flex flex-col gap-2.5">
                        {[
                          'Pressure under both heels firmly planted on the floor',
                          'Pressure beneath your toes and balls of your feet',
                          'Temperature and hardness of the ground',
                          'Texture of your shoes / socks / flooring',
                          'Position and weight of your physical body right now'
                        ].map((item, idx) => (
                          <div
                            key={idx}
                            onClick={() => setSomaticChecks(prev => ({ ...prev, [item]: !prev[item] }))}
                            className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                              somaticChecks[item]
                                ? 'bg-[#8C7355]/15 border-[#8C7355] text-primary dark:text-[#E8D4C8] font-medium'
                                : 'bg-white/60 dark:bg-white/5 border-white/60 dark:border-white/10 text-on-surface'
                            }`}
                          >
                            {somaticChecks[item] ? <CheckSquare size={18} className="text-[#8C7355]" /> : <Square size={18} className="opacity-50" />}
                            <span className="text-body-sm">{item}</span>
                          </div>
                        ))}
                      </div>

                      <div className="bg-[#8C7355]/10 dark:bg-[#8C7355]/20 rounded-2xl p-4 border border-[#8C7355]/20 mt-2 text-center">
                        <p className="text-body-sm font-headline italic text-on-surface">
                          “I am sitting in my space. It is today. I am here, I am safe in this moment, and I don’t need to figure everything out right now.”
                        </p>
                      </div>
                    </div>
                  )}

                  {/* 5. Facts vs Predictions */}
                  {activeExercise.practiceType === 'fact-prediction' && (
                    <div className="w-full max-w-xl bg-white/80 dark:bg-[#1E141C]/85 backdrop-blur-xl rounded-[28px] p-6 border border-white/60 dark:border-white/10 shadow-lg text-left flex flex-col gap-4">
                      <span className="text-[11px] font-label-md font-bold uppercase tracking-wider text-primary">
                        Cognitive Separation Divider
                      </span>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="bg-emerald-500/10 rounded-2xl p-4 border border-emerald-500/20 flex flex-col gap-2">
                          <span className="text-xs font-label-md font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                            FACTS (What I actually know)
                          </span>
                          <textarea
                            value={factInput}
                            onChange={(e) => setFactInput(e.target.value)}
                            placeholder="e.g., 'They haven’t replied yet.'"
                            className="w-full h-20 bg-white/70 dark:bg-black/30 rounded-xl p-2.5 text-xs text-on-surface focus:outline-none border border-emerald-500/20 resize-none font-body"
                          />
                        </div>

                        <div className="bg-amber-500/10 rounded-2xl p-4 border border-amber-500/20 flex flex-col gap-2">
                          <span className="text-xs font-label-md font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                            PREDICTIONS (What I fear)
                          </span>
                          <textarea
                            value={predInput}
                            onChange={(e) => setPredInput(e.target.value)}
                            placeholder="e.g., 'They hate me and everything is ruined.'"
                            className="w-full h-20 bg-white/70 dark:bg-black/30 rounded-xl p-2.5 text-xs text-on-surface focus:outline-none border border-amber-500/20 resize-none font-body"
                          />
                        </div>
                      </div>

                      <div className="bg-primary/5 rounded-xl p-3 border border-primary/10 text-center">
                        <p className="text-xs text-on-surface-variant font-medium">
                          Do not argue with the prediction. Simply separate verifiable facts from imagined fear projections.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* 6. Worry Postponement Container */}
                  {activeExercise.practiceType === 'worry-postpone' && (
                    <div className="w-full max-w-xl bg-white/80 dark:bg-[#1E141C]/85 backdrop-blur-xl rounded-[28px] p-6 sm:p-8 border border-white/60 dark:border-white/10 shadow-lg text-left flex flex-col gap-4">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-label-md font-bold uppercase tracking-wider text-primary">
                          Scheduled Container Box
                        </span>
                        <div className="flex items-center gap-1.5 text-xs font-label-md text-[#8C7355]">
                          <Clock size={14} />
                          <span>Appt: {postponeTime} (15m)</span>
                        </div>
                      </div>

                      {!worryPostponed ? (
                        <>
                          <p className="text-body-sm text-on-surface">
                            Jot down the intrusive thought here to deposit it into the scheduled container:
                          </p>
                          <input
                            type="text"
                            value={worryNote}
                            onChange={(e) => setWorryNote(e.target.value)}
                            placeholder="What worry is seeking your attention?"
                            className="w-full bg-white/90 dark:bg-black/30 rounded-xl p-3 text-sm text-on-surface border border-primary/20 focus:outline-none"
                          />
                          <button
                            onClick={() => setWorryPostponed(true)}
                            className="w-full py-2.5 rounded-xl bg-[#603347] text-white font-label-md font-bold text-xs shadow-md hover:bg-[#4E2839] transition-all"
                          >
                            Postpone Worry to {postponeTime}
                          </button>
                        </>
                      ) : (
                        <div className="bg-emerald-500/10 rounded-2xl p-6 border border-emerald-500/20 text-center flex flex-col gap-2">
                          <CheckCircle2 size={32} className="text-emerald-600 mx-auto" />
                          <h4 className="font-headline font-bold text-emerald-800 dark:text-emerald-400">
                            Worry Locked in Container
                          </h4>
                          <p className="text-xs text-on-surface-variant">
                            “I’m not ignoring this. I’m postponing it. If the thought returns, remind yourself: <em>‘Not now. I have a reserved time for this.’</em>”
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 7. Five-Minute Movement Reset */}
                  {activeExercise.practiceType === 'movement-walk' && (
                    <div className="w-full max-w-xl bg-white/80 dark:bg-[#1E141C]/85 backdrop-blur-xl rounded-[28px] p-6 sm:p-8 border border-white/60 dark:border-white/10 shadow-lg text-center flex flex-col items-center gap-6">
                      <span className="text-[11px] font-label-md font-bold uppercase tracking-wider text-primary">
                        Bilateral Somatic Movement
                      </span>

                      {/* Step Pacer Indicators */}
                      <div className="flex items-center gap-8">
                        <motion.div
                          animate={{
                            scale: stepSide === 'left' ? 1.25 : 0.9,
                            opacity: stepSide === 'left' ? 1 : 0.35,
                          }}
                          className={`w-24 h-24 rounded-3xl flex flex-col items-center justify-center font-headline font-bold text-lg shadow-xl ${
                            stepSide === 'left' ? 'bg-[#603347] text-white' : 'bg-black/5 dark:bg-white/10 text-on-surface'
                          }`}
                        >
                          <Footprints size={28} />
                          <span>LEFT</span>
                        </motion.div>

                        <div className="text-xs font-label-md text-on-surface-variant font-bold">
                          Step #{stepCount}
                        </div>

                        <motion.div
                          animate={{
                            scale: stepSide === 'right' ? 1.25 : 0.9,
                            opacity: stepSide === 'right' ? 1 : 0.35,
                          }}
                          className={`w-24 h-24 rounded-3xl flex flex-col items-center justify-center font-headline font-bold text-lg shadow-xl ${
                            stepSide === 'right' ? 'bg-[#8C7355] text-white' : 'bg-black/5 dark:bg-white/10 text-on-surface'
                          }`}
                        >
                          <Footprints size={28} />
                          <span>RIGHT</span>
                        </motion.div>
                      </div>

                      <p className="text-body-xs text-on-surface-variant italic max-w-md">
                        Walk slowly in your space. Synchronize your attention with each footfall: Left → right → left → right. Let the sensations exist while continuing to move.
                      </p>
                    </div>
                  )}

                  {/* 8. Cognitive Defusion 3-Stage Stepper */}
                  {activeExercise.practiceType === 'defusion' && (
                    <div className="w-full max-w-xl bg-white/80 dark:bg-[#1E141C]/85 backdrop-blur-xl rounded-[28px] p-6 sm:p-8 border border-white/60 dark:border-white/10 shadow-lg text-left flex flex-col gap-4">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-label-md font-bold uppercase tracking-wider text-primary">
                          Defusion Transformation Stage {defusionStage + 1} of 3
                        </span>
                      </div>

                      <div className="bg-primary/5 dark:bg-white/5 rounded-2xl p-5 border border-primary/10 flex flex-col gap-3 text-center">
                        <span className="text-[10px] font-label-md uppercase tracking-wider text-on-surface-variant font-bold">
                          {defusionStage === 0 && 'Level 0: The Raw Catastrophic Thought'}
                          {defusionStage === 1 && 'Level 1: Adding Cognitive Distance'}
                          {defusionStage === 2 && 'Level 2: Neuro-Observation (ACT)'}
                        </span>

                        <h3 className="text-headline-xs sm:text-headline-sm font-headline font-bold text-primary dark:text-[#E8D4C8]">
                          {defusionStage === 0 && `“${customDefusionThought}”`}
                          {defusionStage === 1 && `“I am having the thought that ${customDefusionThought.toLowerCase()}”`}
                          {defusionStage === 2 && `“My brain is producing a threat prediction right now.”`}
                        </h3>
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        <button
                          disabled={defusionStage === 0}
                          onClick={() => setDefusionStage(s => Math.max(0, s - 1))}
                          className="px-4 py-2 rounded-full text-xs font-label-md font-semibold text-on-surface-variant disabled:opacity-30 hover:bg-black/5"
                        >
                          Previous
                        </button>
                        <button
                          onClick={() => setDefusionStage(s => (s + 1) % 3)}
                          className="flex items-center gap-1.5 px-5 py-2 rounded-full bg-[#603347] text-white text-xs font-label-md font-bold shadow-md hover:bg-[#4E2839]"
                        >
                          <span>{defusionStage === 2 ? 'Restart Defusion' : 'Next Defusion Level'}</span>
                          <ArrowRight size={13} />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* 9. One Small Action Chooser */}
                  {activeExercise.practiceType === 'micro-action' && (
                    <div className="w-full max-w-xl bg-white/80 dark:bg-[#1E141C]/85 backdrop-blur-xl rounded-[28px] p-6 sm:p-8 border border-white/60 dark:border-white/10 shadow-lg text-left flex flex-col gap-4">
                      <span className="text-[11px] font-label-md font-bold uppercase tracking-wider text-primary">
                        Select 1 Microscopic Action for this 2 Minutes
                      </span>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {[
                          'Drink a glass of cold water',
                          'Wash your face with cold water',
                          'Sit somewhere quieter & breathe',
                          'Put your phone in another room',
                          'Open the document / notes',
                          'Send one simple message',
                          'Take a warm shower',
                          'Lie down and rest your eyes'
                        ].map((act, i) => (
                          <div
                            key={i}
                            onClick={() => setSelectedMicroAction(act)}
                            className={`p-3 rounded-xl border text-xs font-label-md cursor-pointer transition-all ${
                              selectedMicroAction === act
                                ? 'bg-[#603347] text-white border-[#603347] shadow-sm font-bold'
                                : 'bg-white/60 dark:bg-white/5 border-white/60 dark:border-white/10 text-on-surface hover:bg-white/80'
                            }`}
                          >
                            {act}
                          </div>
                        ))}
                      </div>

                      <div className="bg-emerald-500/10 rounded-2xl p-3 border border-emerald-500/20 text-center">
                        <p className="text-xs font-medium text-emerald-800 dark:text-emerald-300">
                          Focus only on doing: <strong>{selectedMicroAction}</strong>. Ignore everything else.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* 10. “I Don’t Need to Solve Tonight” Checkpoint */}
                  {activeExercise.practiceType === 'defer-solve' && (
                    <div className="w-full max-w-xl bg-white/80 dark:bg-[#1E141C]/85 backdrop-blur-xl rounded-[28px] p-6 sm:p-8 border border-white/60 dark:border-white/10 shadow-lg text-left flex flex-col gap-4">
                      <div className="bg-[#8C7355]/15 rounded-2xl p-4 border border-[#8C7355]/30 text-center">
                        <p className="text-headline-xs font-headline font-bold text-primary dark:text-[#E8D4C8]">
                          “This problem may be important. But I don’t need to solve my entire life while my nervous system is overwhelmed.”
                        </p>
                      </div>

                      <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between p-3 rounded-xl bg-white/60 dark:bg-white/5 border border-white/60 dark:border-white/10 text-xs">
                          <span>1. Is there an immediate physical danger right now?</span>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">NO</span>
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-xl bg-white/60 dark:bg-white/5 border border-white/60 dark:border-white/10 text-xs">
                          <span>2. Must something genuinely happen within 60 mins?</span>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">NO</span>
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-xl bg-white/60 dark:bg-white/5 border border-white/60 dark:border-white/10 text-xs">
                          <span>3. Can this wait until my brain is calm?</span>
                          <span className="font-bold text-[#603347] dark:text-[#E8D4C8]">YES</span>
                        </div>
                      </div>

                      <div className="bg-primary/10 rounded-2xl p-3 border border-primary/20 text-center">
                        <strong className="text-xs font-label-md uppercase tracking-wider text-primary">
                          Regulate First → Think Second
                        </strong>
                      </div>
                    </div>
                  )}
                </>
              )}

            </div>

            {/* Bottom Controls Bar: Play/Pause, Timer & Reset */}
            <div className="w-full max-w-md mx-auto flex items-center justify-between bg-white/80 dark:bg-[#1C141A]/90 backdrop-blur-2xl rounded-full px-6 py-3 border border-white/80 dark:border-white/10 shadow-xl">
              <button
                onClick={handleResetTimer}
                className="w-9 h-9 rounded-full flex items-center justify-center bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 text-on-surface transition-transform active:scale-95"
                title="Restart Timer"
              >
                <RotateCcw size={16} />
              </button>

              <div className="flex flex-col items-center">
                <span className="text-headline-sm sm:text-headline-md font-headline font-bold text-primary tracking-tight">
                  {formatTime(timeLeft)}
                </span>
                <span className="text-[9px] font-label-md uppercase tracking-wider text-on-surface-variant/70">
                  {isTimerRunning ? '2-Min Pacing Active' : 'Paused'}
                </span>
              </div>

              <button
                onClick={() => setIsTimerRunning(!isTimerRunning)}
                className="w-10 h-10 rounded-full flex items-center justify-center bg-[#603347] hover:bg-[#4E2839] text-white shadow-md transition-transform active:scale-95"
                title={isTimerRunning ? 'Pause' : 'Resume'}
              >
                {isTimerRunning ? <Pause size={18} /> : <Play size={18} fill="currentColor" />}
              </button>
            </div>

          </motion.div>
        )}
      </AnimatePresence>

    </div>
  )
}
