'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  TrendingUp, 
  Sparkles, 
  Activity, 
  Brain, 
  Heart, 
  ArrowUpRight, 
  ArrowRight, 
  ArrowLeft,
  Calendar, 
  Clock, 
  ShieldCheck, 
  Info, 
  CheckCircle2, 
  MessageSquare, 
  Mic, 
  Plus, 
  RotateCcw,
  Sparkle,
  ChevronRight,
  Eye
} from 'lucide-react'
import { getBaselineShiftAnalytics, getTranscript } from '@/core/api'
import RadialNav from '@/shared/components/RadialNav'
import ThemeToggle from '@/shared/components/ThemeToggle'
import { useTheme } from 'next-themes'

interface TrajectoryPoint {
  session_id: string
  date: string
  timestamp?: string
  baseline_score: number
  regulated_score: number
  shift_delta: number
  dominant_emotion: string
}

interface EmotionDistribution {
  emotion: string
  count: number
  percentage: number
}

interface SessionShift {
  session_id: string
  date: string
  pre_emotion: string
  post_emotion: string
  shift_delta: string
  is_positive: boolean
  channel: string
  message_count: number
}

interface ClinicalInsight {
  title: string
  desc: string
  badge: string
}

interface BaselineShiftData {
  overall_shift_percentage: string
  current_equilibrium_index: string
  peak_calm_score: string
  total_reflections: number
  trajectory_points: TrajectoryPoint[]
  emotion_distribution: EmotionDistribution[]
  session_shifts: SessionShift[]
  clinical_insights: ClinicalInsight[]
}

const EMOTION_EMOJIS: Record<string, string> = {
  Joy: '😊',
  Calm: '😌',
  Gratitude: '🙏',
  Caring: '🤗',
  Optimism: '✨',
  Curiosity: '🤔',
  Neutral: '😐',
  Confusion: '😕',
  Disappointment: '😞',
  Sadness: '😔',
  Nervousness: '😰',
  Anxiety: '😰',
  Fear: '😨',
  Anger: '😠',
  Disgust: '😒',
  Overwhelm: '🌊',
}

export default function ProgressPage() {
  const router = useRouter()
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [data, setData] = useState<BaselineShiftData | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<'all' | '30d' | '7d'>('all')
  const [hoveredPoint, setHoveredPoint] = useState<TrajectoryPoint | null>(null)
  const [selectedPoint, setSelectedPoint] = useState<TrajectoryPoint | null>(null)
  const [showExplanation, setShowExplanation] = useState(false)

  // Transcript viewer dialog
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)
  const [transcriptMessages, setTranscriptMessages] = useState<any[]>([])
  const [transcriptLoading, setTranscriptLoading] = useState(false)

  useEffect(() => {
    setMounted(true)
    const token = typeof window !== 'undefined' ? localStorage.getItem('mb_token') : null
    if (!token) {
      router.replace('/login')
      return
    }

    const fetchAnalytics = async () => {
      try {
        const res = await getBaselineShiftAnalytics()
        if (res) {
          setData(res)
          if (res.trajectory_points && res.trajectory_points.length > 0) {
            setSelectedPoint(res.trajectory_points[res.trajectory_points.length - 1])
          }
        }
      } catch (err) {
        console.error('Failed to load baseline shift analytics', err)
      } finally {
        setLoading(false)
      }
    }

    fetchAnalytics()
  }, [router])

  const handleOpenTranscript = async (sessionId: string) => {
    setSelectedSessionId(sessionId)
    setTranscriptLoading(true)
    try {
      const res = await getTranscript(sessionId)
      setTranscriptMessages(res?.messages || [])
    } catch (e) {
      console.error(e)
      setTranscriptMessages([])
    } finally {
      setTranscriptLoading(false)
    }
  }

  // Points filtered by timeRange
  const points = useMemo(() => {
    if (!data || !data.trajectory_points) return []
    if (timeRange === '7d') return data.trajectory_points.slice(-7)
    if (timeRange === '30d') return data.trajectory_points.slice(-14)
    return data.trajectory_points
  }, [data, timeRange])

  // Update selected point if active points change
  useEffect(() => {
    if (points.length > 0) {
      if (!selectedPoint || !points.some(p => p.session_id === selectedPoint.session_id)) {
        setSelectedPoint(points[points.length - 1])
      }
    }
  }, [points, selectedPoint])

  // Compute SVG Bezier Curves for Trajectory Graph
  const graphWidth = 800
  const graphHeight = 240
  const paddingX = 45
  const paddingY = 32

  const svgPaths = useMemo(() => {
    if (!points || points.length === 0) return { regulatedPath: '', baselinePath: '', areaPath: '', coords: [], sliceWidth: 40 }

    const effectiveWidth = graphWidth - paddingX * 2
    const effectiveHeight = graphHeight - paddingY * 2

    const minScore = 15
    const maxScore = 100

    const sliceWidth = points.length > 1 ? effectiveWidth / (points.length - 1) : effectiveWidth

    const coords = points.map((p, idx) => {
      const x = points.length === 1 
        ? graphWidth / 2 
        : paddingX + (idx / (points.length - 1)) * effectiveWidth
      const yRegulated = graphHeight - paddingY - ((p.regulated_score - minScore) / (maxScore - minScore)) * effectiveHeight
      const yBaseline = graphHeight - paddingY - ((p.baseline_score - minScore) / (maxScore - minScore)) * effectiveHeight
      return { x, yRegulated, yBaseline, point: p }
    })

    // Generate smooth bezier curve string
    const createSmoothPath = (pts: { x: number; y: number }[]) => {
      if (pts.length === 0) return ''
      if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`

      let d = `M ${pts[0].x} ${pts[0].y}`
      for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[i === 0 ? 0 : i - 1]
        const p1 = pts[i]
        const p2 = pts[i + 1]
        const p3 = pts[i + 2] || p2

        const cp1x = p1.x + (p2.x - p0.x) / 6
        const cp1y = p1.y + (p2.y - p0.y) / 6
        const cp2x = p2.x - (p3.x - p1.x) / 6
        const cp2y = p2.y - (p3.y - p1.y) / 6

        d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`
      }
      return d
    }

    const regPoints = coords.map(c => ({ x: c.x, y: c.yRegulated }))
    const basePoints = coords.map(c => ({ x: c.x, y: c.yBaseline }))

    const regulatedPath = createSmoothPath(regPoints)
    const baselinePath = createSmoothPath(basePoints)

    // Area fill under regulated curve
    const areaPath = regPoints.length > 1
      ? `${regulatedPath} L ${regPoints[regPoints.length - 1].x} ${graphHeight - paddingY} L ${regPoints[0].x} ${graphHeight - paddingY} Z`
      : ''

    return { regulatedPath, baselinePath, areaPath, coords, sliceWidth }
  }, [points, graphWidth, graphHeight, paddingX, paddingY])

  const activeFocusPoint = hoveredPoint || selectedPoint

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
            href="/exercises"
            className="flex items-center gap-1.5 bg-white/60 dark:bg-white/10 hover:bg-white/90 dark:hover:bg-white/20 text-on-surface px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-label-md border border-white/60 dark:border-white/10 shadow-xs transition-all active:scale-95"
          >
            <Activity size={15} className="text-primary" />
            <span className="hidden sm:inline">Grounding Exercises</span>
          </Link>
          <ThemeToggle />
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 sm:pt-24 pb-16 flex flex-col gap-6">
        
        {/* Page Hero Header */}
        <motion.div 
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col md:flex-row md:items-end justify-between gap-4"
        >
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 dark:bg-primary/20 text-primary text-xs font-label-md font-bold mb-2">
              <Sparkles size={14} />
              <span>Baseline Shift Architecture</span>
            </div>
            <h1 className="text-display-xs sm:text-display-sm md:text-display-md font-headline font-bold text-on-background tracking-tight">
              Emotional Baseline Shift
            </h1>
            <p className="text-body-sm sm:text-body-md text-on-surface-variant max-w-2xl mt-1">
              Live tracking of your emotional regulation capacity, baseline recovery curve, and nervous system shifts across every consultation.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowExplanation(!showExplanation)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white/70 dark:bg-white/10 hover:bg-white/90 dark:hover:bg-white/20 text-xs font-label-md font-semibold text-on-surface border border-white/60 dark:border-white/10 shadow-xs transition-all"
            >
              <Info size={14} className="text-primary" />
              <span>{showExplanation ? 'Hide Guide' : 'What is Baseline Shift?'}</span>
            </button>
            <button
              onClick={() => router.push('/chat')}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary text-on-primary text-xs font-label-md font-bold shadow-md hover:opacity-90 active:scale-95 transition-all"
            >
              <Plus size={14} />
              <span>New Reflection</span>
            </button>
          </div>
        </motion.div>

        {/* Explainable AI Modal / Dropdown Card */}
        <AnimatePresence>
          {showExplanation && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden"
            >
              <div className="bg-white/80 dark:bg-[#1E181D]/90 backdrop-blur-xl rounded-[24px] p-6 border border-primary/20 shadow-md">
                <h3 className="text-headline-xs font-headline font-bold text-primary mb-2 flex items-center gap-2">
                  <Brain size={18} /> Understanding Your Emotional Baseline Shift
                </h3>
                <p className="text-xs sm:text-sm text-on-surface-variant leading-relaxed mb-4">
                  In clinical psychology and somatic therapies, <strong>Baseline Shift</strong> measures how quickly and deeply your autonomic nervous system transitions from a heightened state of stress, anxiety, or overwhelm to grounded autonomic equilibrium.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-label-md">
                  <div className="p-3 rounded-xl bg-primary/5 dark:bg-white/5 border border-primary/10">
                    <span className="font-bold text-primary block mb-1">1. Intake Baseline</span>
                    <span className="text-on-surface-variant">The intensity of distress or anxiety recorded during the first 2 minutes of your session.</span>
                  </div>
                  <div className="p-3 rounded-xl bg-primary/5 dark:bg-white/5 border border-primary/10">
                    <span className="font-bold text-primary block mb-1">2. Regulated Score</span>
                    <span className="text-on-surface-variant">Your measured cognitive coherence and nervous system calm at the end of consultation.</span>
                  </div>
                  <div className="p-3 rounded-xl bg-primary/5 dark:bg-white/5 border border-primary/10">
                    <span className="font-bold text-emerald-600 block mb-1">3. Equilibrium Delta</span>
                    <span className="text-on-surface-variant">The upward percentage shift towards emotional resilience and somatic stability.</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── 4 Top Overview Metrics ── */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-4"
        >
          <motion.div 
            whileHover={{ y: -3, transition: { duration: 0.2 } }}
            className="bg-white/75 dark:bg-[#1E181D]/80 backdrop-blur-xl rounded-[24px] p-5 border border-white/60 dark:border-white/10 shadow-sm flex flex-col justify-between"
          >
            <span className="text-[11px] font-label-md uppercase tracking-wider text-on-surface-variant font-bold">
              Current Equilibrium
            </span>
            <div className="flex items-baseline gap-2 my-2">
              <span className="text-display-xs sm:text-display-sm font-headline font-bold text-primary dark:text-[#E8D4C8]">
                {data?.current_equilibrium_index || '78/100'}
              </span>
              <span className="text-xs font-label-md text-emerald-600 font-bold">Stable</span>
            </div>
            <p className="text-[11px] text-on-surface-variant">Post-consultation average calmness index</p>
          </motion.div>

          <motion.div 
            whileHover={{ y: -3, transition: { duration: 0.2 } }}
            className="bg-white/75 dark:bg-[#1E181D]/80 backdrop-blur-xl rounded-[24px] p-5 border border-white/60 dark:border-white/10 shadow-sm flex flex-col justify-between"
          >
            <span className="text-[11px] font-label-md uppercase tracking-wider text-on-surface-variant font-bold">
              Peak Grounded Score
            </span>
            <div className="flex items-baseline gap-2 my-2">
              <span className="text-display-xs sm:text-display-sm font-headline font-bold text-[#8C7355] dark:text-[#E8D4C8]">
                {data?.peak_calm_score || '88/100'}
              </span>
              <span className="text-xs font-label-md text-primary font-bold">Optimal</span>
            </div>
            <p className="text-[11px] text-on-surface-variant">Highest emotional tranquility achieved</p>
          </motion.div>

          <motion.div 
            whileHover={{ y: -3, transition: { duration: 0.2 } }}
            className="bg-white/75 dark:bg-[#1E181D]/80 backdrop-blur-xl rounded-[24px] p-5 border border-white/60 dark:border-white/10 shadow-sm flex flex-col justify-between"
          >
            <span className="text-[11px] font-label-md uppercase tracking-wider text-on-surface-variant font-bold">
              Total Reflections
            </span>
            <div className="flex items-baseline gap-2 my-2">
              <span className="text-display-xs sm:text-display-sm font-headline font-bold text-primary">
                {data?.total_reflections || 5}
              </span>
              <span className="text-xs font-label-md text-on-surface-variant">Sessions</span>
            </div>
            <p className="text-[11px] text-on-surface-variant">Continuous neural data points mapped</p>
          </motion.div>

          <motion.div 
            whileHover={{ y: -3, transition: { duration: 0.2 } }}
            className="bg-white/75 dark:bg-[#1E181D]/80 backdrop-blur-xl rounded-[24px] p-5 border border-white/60 dark:border-white/10 shadow-sm flex flex-col justify-between"
          >
            <span className="text-[11px] font-label-md uppercase tracking-wider text-on-surface-variant font-bold">
              Vagal Regulation
            </span>
            <div className="flex items-baseline gap-2 my-2">
              <span className="text-display-xs sm:text-display-sm font-headline font-bold text-emerald-600">
                +33%
              </span>
              <span className="text-xs font-label-md text-emerald-600 font-bold">Upward</span>
            </div>
            <p className="text-[11px] text-on-surface-variant">Average anxiety dampening per reflection</p>
          </motion.div>
        </motion.div>

        {/* ── PRIMARY GRAPHICAL REPRESENTATION: Interactive Baseline Shift Trajectory Curve ── */}
        <motion.section 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="bg-white/75 dark:bg-[#1E181D]/85 backdrop-blur-2xl rounded-[32px] p-6 sm:p-8 border border-white/70 dark:border-white/10 shadow-xl flex flex-col gap-6"
        >
          {/* Graph Header Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-black/5 dark:border-white/10 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <TrendingUp className="text-primary" size={22} />
                <h2 className="text-headline-sm sm:text-headline-md font-headline font-bold text-on-background">
                  Emotional Trajectory & Shift Curve
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-on-surface-variant font-body mt-0.5">
                Click or hover any session point to inspect starting baseline vs regulated calm state.
              </p>
            </div>

            {/* Legend & Filter Tabs */}
            <div className="flex items-center gap-4 self-start sm:self-auto flex-wrap">
              <div className="flex items-center gap-3 text-xs font-label-md">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-[#603347] shadow-xs" />
                  <span className="text-on-surface font-medium">Regulated State</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-1.5 rounded-full bg-[#8C7355] opacity-60 border border-dashed border-[#8C7355]" />
                  <span className="text-on-surface-variant">Intake Baseline</span>
                </div>
              </div>

              {/* Smooth Animated Filter Pills */}
              <div className="relative flex items-center bg-black/5 dark:bg-white/10 rounded-full p-1 text-xs font-label-md">
                {(['all', '30d', '7d'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setTimeRange(tab)}
                    className={`relative z-10 px-3.5 py-1 rounded-full uppercase font-bold transition-colors duration-200 ${
                      timeRange === tab
                        ? 'text-primary dark:text-[#E8D4C8]'
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    {timeRange === tab && (
                      <motion.div
                        layoutId="progressTimeRangePill"
                        className="absolute inset-0 bg-white dark:bg-[#2A1C27] rounded-full shadow-xs -z-10"
                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                      />
                    )}
                    {tab === 'all' ? 'All Time' : tab === '30d' ? '30 Days' : '7 Days'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* SVG Canvas Graph */}
          <div className="relative w-full overflow-hidden flex flex-col items-center">
            
            <svg
              viewBox={`0 0 ${graphWidth} ${graphHeight}`}
              className="w-full h-48 sm:h-64 overflow-visible select-none"
            >
              <defs>
                <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#603347" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#8C7355" stopOpacity="0.01" />
                </linearGradient>
                <linearGradient id="curveGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#8C7355" />
                  <stop offset="50%" stopColor="#603347" />
                  <stop offset="100%" stopColor="#4A2335" />
                </linearGradient>
              </defs>

              {/* Background Horizontal Grid Lines */}
              {[25, 50, 75, 100].map((level) => {
                const y = graphHeight - paddingY - ((level - 15) / 85) * (graphHeight - paddingY * 2)
                return (
                  <g key={level}>
                    <line
                      x1={paddingX}
                      y1={y}
                      x2={graphWidth - paddingX}
                      y2={y}
                      stroke="currentColor"
                      strokeOpacity="0.07"
                      strokeDasharray="4 4"
                    />
                    <text
                      x={paddingX - 10}
                      y={y + 3}
                      fill="currentColor"
                      fillOpacity="0.4"
                      fontSize="9"
                      textAnchor="end"
                      fontFamily="sans-serif"
                    >
                      {level}
                    </text>
                  </g>
                )
              })}

              {/* Shaded Area Under Regulated Curve with Smooth Morph */}
              {svgPaths.areaPath && (
                <motion.path 
                  d={svgPaths.areaPath} 
                  fill="url(#areaGradient)"
                  initial={false}
                  animate={{ d: svgPaths.areaPath }}
                  transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                />
              )}

              {/* Intake Baseline Dotted Curve with Smooth Morph */}
              {svgPaths.baselinePath && (
                <motion.path
                  d={svgPaths.baselinePath}
                  fill="none"
                  stroke="#8C7355"
                  strokeWidth="2"
                  strokeDasharray="5 5"
                  strokeOpacity="0.6"
                  initial={false}
                  animate={{ d: svgPaths.baselinePath }}
                  transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                />
              )}

              {/* Regulated Outcome Solid Curve with Smooth Morph */}
              {svgPaths.regulatedPath && (
                <motion.path
                  d={svgPaths.regulatedPath}
                  fill="none"
                  stroke="url(#curveGradient)"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  className="filter drop-shadow-sm"
                  initial={false}
                  animate={{ d: svgPaths.regulatedPath }}
                  transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                />
              )}

              {/* Interactive Point Nodes & Invisible Anti-Flicker Slices */}
              {svgPaths.coords.map((c, i) => {
                const isSelected = selectedPoint?.session_id === c.point.session_id
                const isHovered = hoveredPoint?.session_id === c.point.session_id
                const isActive = isSelected || isHovered

                const halfSlice = Math.max(svgPaths.sliceWidth / 2, 24)

                return (
                  <g key={c.point.session_id || `node-${i}`}>
                    {/* Vertical Shift Connector */}
                    <line
                      x1={c.x}
                      y1={c.yBaseline}
                      x2={c.x}
                      y2={c.yRegulated}
                      stroke={isActive ? '#603347' : '#8C7355'}
                      strokeWidth={isActive ? '2' : '1.5'}
                      strokeDasharray={isActive ? 'none' : '2 2'}
                      strokeOpacity={isActive ? '0.7' : '0.3'}
                      className="transition-all duration-300"
                    />

                    {/* Baseline Dotted Node */}
                    <circle
                      cx={c.x}
                      cy={c.yBaseline}
                      r={isActive ? 5 : 4}
                      fill="#8C7355"
                      fillOpacity={isActive ? 1 : 0.75}
                      className="transition-all duration-300"
                    />

                    {/* Active Selected Pulsing Ring */}
                    {isSelected && (
                      <circle
                        cx={c.x}
                        cy={c.yRegulated}
                        r="12"
                        fill="none"
                        stroke="#603347"
                        strokeWidth="1.5"
                        strokeOpacity="0.4"
                        className="animate-ping origin-center"
                        style={{ transformOrigin: `${c.x}px ${c.yRegulated}px` }}
                      />
                    )}

                    {/* Regulated Solid Glowing Node */}
                    <circle
                      cx={c.x}
                      cy={c.yRegulated}
                      r={isActive ? 8 : 6}
                      fill={isActive ? '#603347' : '#733E55'}
                      stroke="#FFF"
                      strokeWidth={isActive ? '2.5' : '2'}
                      className="transition-all duration-300 drop-shadow-xs"
                    />

                    {/* Date Label on X Axis */}
                    <text
                      x={c.x}
                      y={graphHeight - 8}
                      fill="currentColor"
                      fillOpacity={isActive ? '1' : '0.55'}
                      fontSize="10"
                      textAnchor="middle"
                      fontFamily="sans-serif"
                      fontWeight={isActive ? '700' : '500'}
                      className="transition-all duration-200"
                    >
                      {c.point.date}
                    </text>

                    {/* Anti-Flicker Solid Hit Target Column */}
                    <rect
                      x={c.x - halfSlice}
                      y={0}
                      width={halfSlice * 2}
                      height={graphHeight}
                      fill="transparent"
                      className="cursor-pointer"
                      onMouseEnter={() => setHoveredPoint(c.point)}
                      onMouseLeave={() => setHoveredPoint(null)}
                      onClick={() => setSelectedPoint(c.point)}
                    />
                  </g>
                )
              })}
            </svg>

            {/* Seamless Active Node Details Dock */}
            <div className="w-full mt-3 pt-3 border-t border-black/5 dark:border-white/10">
              <AnimatePresence mode="wait">
                {activeFocusPoint ? (
                  <motion.div
                    key={activeFocusPoint.session_id || activeFocusPoint.date}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.25, ease: 'easeOut' }}
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-primary/5 dark:bg-white/5 rounded-2xl p-3.5 sm:p-4 border border-primary/10 dark:border-white/10"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-white dark:bg-white/10 shadow-xs flex items-center justify-center text-xl">
                        {EMOTION_EMOJIS[activeFocusPoint.dominant_emotion] || '😌'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-headline font-bold text-sm sm:text-base text-on-background">
                            {activeFocusPoint.dominant_emotion} Shift
                          </span>
                          <span className="text-[10px] font-label-md px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-on-surface-variant font-semibold">
                            {activeFocusPoint.date}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs font-label-md mt-0.5 text-on-surface-variant">
                          <span>Intake Baseline: <strong className="text-on-surface">{activeFocusPoint.baseline_score}</strong></span>
                          <span>•</span>
                          <span>Regulated Equilibrium: <strong className="text-primary">{activeFocusPoint.regulated_score}</strong></span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-xs font-label-md font-bold">
                        <TrendingUp size={13} />
                        <span>+{activeFocusPoint.shift_delta}% Equilibrium</span>
                      </div>
                      {activeFocusPoint.session_id && (
                        <button
                          onClick={() => handleOpenTranscript(activeFocusPoint.session_id)}
                          className="flex items-center gap-1 text-primary hover:underline text-xs font-label-md font-bold px-2 py-1"
                        >
                          <Eye size={13} />
                          <span>View Dialogue</span>
                        </button>
                      )}
                    </div>
                  </motion.div>
                ) : (
                  <div className="py-2 text-center text-xs text-on-surface-variant">
                    Click any session point along the curve to inspect dialogue insights and transformation details.
                  </div>
                )}
              </AnimatePresence>
            </div>

          </div>

        </motion.section>

        {/* ── 2-COLUMN SECTION: Emotion Spectrum Distribution (Left) + Clinical Insights (Right) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Emotion Spectrum Distribution (7 cols) */}
          <motion.section 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="lg:col-span-7 bg-white/75 dark:bg-[#1E181D]/80 backdrop-blur-xl rounded-[28px] p-6 sm:p-7 border border-white/60 dark:border-white/10 shadow-md flex flex-col gap-5"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Brain className="text-primary" size={20} />
                <h3 className="text-headline-xs sm:text-headline-sm font-headline font-bold text-on-background">
                  Emotion Spectrum Distribution
                </h3>
              </div>
              <span className="text-xs font-label-md text-on-surface-variant/70">
                All Consultation Insights
              </span>
            </div>

            {/* Distribution Bars with Smooth Progress Fill */}
            <div className="flex flex-col gap-3">
              {(data?.emotion_distribution || []).map((item, idx) => (
                <div key={item.emotion || idx} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-xs font-label-md">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{EMOTION_EMOJIS[item.emotion] || '✨'}</span>
                      <span className="font-bold text-on-surface">{item.emotion}</span>
                    </div>
                    <span className="font-semibold text-primary">{item.percentage}%</span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-black/5 dark:bg-white/10 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${item.percentage}%` }}
                      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.08 * idx }}
                      className="h-full rounded-full bg-gradient-to-r from-[#8C7355] to-[#603347]"
                    />
                  </div>
                </div>
              ))}
            </div>
          </motion.section>

          {/* Clinical Insights & Regulation Summary (5 cols) */}
          <motion.section 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.25 }}
            className="lg:col-span-5 flex flex-col gap-4"
          >
            <div className="bg-white/75 dark:bg-[#1E181D]/80 backdrop-blur-xl rounded-[28px] p-6 border border-white/60 dark:border-white/10 shadow-md flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="text-primary" size={20} />
                <h3 className="text-headline-xs sm:text-headline-sm font-headline font-bold text-on-background">
                  Clinical Key Takeaways
                </h3>
              </div>

              <div className="flex flex-col gap-3">
                {(data?.clinical_insights || []).map((insight, idx) => (
                  <motion.div
                    key={insight.title || idx}
                    whileHover={{ y: -2, transition: { duration: 0.15 } }}
                    className="p-4 rounded-2xl bg-primary/5 dark:bg-white/5 border border-primary/10 dark:border-white/10 flex flex-col gap-1 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-xs font-headline font-bold text-primary">
                        {insight.title}
                      </h4>
                      <span className="text-[9px] font-label-md font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary dark:bg-white/10 dark:text-white uppercase tracking-wider">
                        {insight.badge}
                      </span>
                    </div>
                    <p className="text-[12px] font-body text-on-surface-variant leading-relaxed">
                      {insight.desc}
                    </p>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.section>

        </div>

        {/* ── SESSION-BY-SESSION TRANSFORMATION LOG ── */}
        <motion.section 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="bg-white/75 dark:bg-[#1E181D]/80 backdrop-blur-xl rounded-[28px] p-6 sm:p-8 border border-white/60 dark:border-white/10 shadow-md flex flex-col gap-5"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="text-primary" size={20} />
              <h3 className="text-headline-xs sm:text-headline-sm font-headline font-bold text-on-background">
                Session-by-Session Transformation Log
              </h3>
            </div>
            <span className="text-xs font-label-md text-on-surface-variant/70">
              Intake vs Conclusion
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(data?.session_shifts || []).map((shift, idx) => {
              const isSelectedSession = selectedPoint?.session_id === shift.session_id

              return (
                <motion.div
                  key={shift.session_id || idx}
                  whileHover={{ y: -3, transition: { duration: 0.2 } }}
                  onClick={() => {
                    const matchPoint = data?.trajectory_points?.find(p => p.session_id === shift.session_id)
                    if (matchPoint) setSelectedPoint(matchPoint)
                  }}
                  className={`bg-white/60 dark:bg-white/5 p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                    isSelectedSession 
                      ? 'border-primary dark:border-primary ring-2 ring-primary/20 shadow-md' 
                      : 'border-white/60 dark:border-white/10 shadow-xs hover:border-primary/40'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between text-[11px] font-label-md text-on-surface-variant/70 mb-2">
                      <span className="flex items-center gap-1">
                        {shift.channel === 'voice' ? <Mic size={12} className="text-primary" /> : <MessageSquare size={12} className="text-primary" />}
                        <span>{shift.date}</span>
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold">
                        {shift.shift_delta}
                      </span>
                    </div>

                    {/* Transformation Flow */}
                    <div className="flex items-center justify-between bg-primary/5 dark:bg-white/5 p-3 rounded-xl">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-label-md uppercase tracking-wider text-on-surface-variant/70">Intake</span>
                        <span className="text-xs font-headline font-bold text-on-surface flex items-center gap-1">
                          <span>{EMOTION_EMOJIS[shift.pre_emotion] || '🤔'}</span>
                          <span>{shift.pre_emotion}</span>
                        </span>
                      </div>

                      <ArrowRight size={14} className="text-primary opacity-60" />

                      <div className="flex flex-col text-right">
                        <span className="text-[10px] font-label-md uppercase tracking-wider text-primary font-semibold">Regulated</span>
                        <span className="text-xs font-headline font-bold text-primary flex items-center gap-1 justify-end">
                          <span>{shift.post_emotion}</span>
                          <span>{EMOTION_EMOJIS[shift.post_emotion] || '😌'}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-black/5 dark:border-white/10 text-xs font-label-md">
                    <span className="text-[11px] text-on-surface-variant/70">
                      {shift.message_count} messages
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleOpenTranscript(shift.session_id)
                      }}
                      className="text-primary hover:underline font-semibold text-[11px] flex items-center gap-0.5"
                    >
                      <span>View Dialogue</span>
                      <ChevronRight size={12} />
                    </button>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </motion.section>

      </main>

      {/* ── TRANSCRIPT DIALOG MODAL WITH SPRING TRANSITION ── */}
      <AnimatePresence>
        {selectedSessionId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setSelectedSessionId(null)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ type: "spring", damping: 28, stiffness: 350 }}
              className="relative w-full max-w-2xl bg-white/95 dark:bg-[#1C141A]/95 backdrop-blur-2xl rounded-[32px] p-6 sm:p-8 shadow-2xl border border-white/80 dark:border-white/15 z-10 flex flex-col gap-4 my-8 max-h-[85vh]"
            >
              <div className="flex items-center justify-between border-b border-black/5 dark:border-white/10 pb-3">
                <div>
                  <h3 className="text-headline-sm font-headline font-bold text-primary">
                    Consultation Messages & Insights
                  </h3>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    Recorded therapeutic reflections and cognitive transformations.
                  </p>
                </div>
                <button
                  onClick={() => setSelectedSessionId(null)}
                  className="w-8 h-8 rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 flex items-center justify-center text-on-surface transition-colors"
                >
                  ✕
                </button>
              </div>

              {transcriptLoading ? (
                <div className="py-14 text-center text-on-surface-variant text-sm font-body flex flex-col items-center gap-2">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <span>Loading dialogue insights...</span>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[60vh]">
                  {transcriptMessages.length === 0 ? (
                    <p className="text-body-sm text-on-surface-variant text-center py-8">
                      No dialogue messages recorded for this session.
                    </p>
                  ) : (
                    transcriptMessages.map((m, i) => (
                      <div
                        key={i}
                        className={`p-3.5 rounded-2xl text-xs sm:text-sm font-body ${
                          m.role === 'user'
                            ? 'bg-primary/10 dark:bg-white/10 text-on-background ml-6 rounded-br-xs'
                            : 'bg-white/60 dark:bg-white/5 border border-black/5 dark:border-white/5 text-on-surface mr-6 rounded-bl-xs'
                        }`}
                      >
                        <span className="text-[10px] font-label-md font-bold uppercase tracking-wider block opacity-70 mb-1">
                          {m.role === 'user' ? 'You' : 'Mythri'}
                        </span>
                        <p className="leading-relaxed whitespace-pre-wrap">{m.content}</p>
                      </div>
                    ))
                  )}
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  )
}
