'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { useTheme } from 'next-themes'
import { useAuth } from '@/shared/components/contexts/AuthContext'
import { logout, completeWaitlist, reportIssue } from '@/core/api'
import { ArcadeModal } from './arcade/ArcadeModal'
import {
  Gamepad2,
  Sun,
  Moon,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Users,
  ArrowRight,
  Sparkles,
  FileText,
  Wind,
  Quote,
  X,
  Check,
  CheckCircle2,
  Flag,
  Send,
  RotateCcw,
  Copy,
  Plus,
  Trash2,
  Play,
  Pause,
  LogOut,
  ShieldCheck,
} from 'lucide-react'

// Curated sanctuary quotes for bottom banner and quotes explorer
const SANCTUARY_QUOTES = [
  'You don’t have to be at your best to take the next step. You just have to take it.',
  'Breathe gently. There is nothing you have to prove in this quiet moment.',
  'Peace is not the absence of trouble, but the presence of grace within it.',
  'Small steps, taken with tenderness, carry us the furthest.',
  'Give yourself permission to pause. Rest is not a reward, it is a vital rhythm.',
  'Whatever you are carrying right now, you are allowed to put it down for a breath.',
]

const JOURNAL_PROMPTS = [
  '🌿 What am I feeling in this exact moment?',
  '✨ One small thing that brought me quiet comfort today',
  '🌊 A thought or worry I choose to release right now',
  '🕊️ A gentle kindness I want to offer myself',
  '💭 Free-form brain dump: write anything without judgment',
]

export default function WaitlistPage() {
  const router = useRouter()
  const { user, refreshUser } = useAuth()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Auth & user info
  const [loggingOut, setLoggingOut] = useState(false)
  const [entering, setEntering] = useState(false)
  const [statusMsg, setStatusMsg] = useState<string | null>(null)
  const [showProfileMenu, setShowProfileMenu] = useState(false)

  // Ticket number & display name
  const ticketNumber = user?.waitlist_number ?? (user?.id ? (user.id % 120) + 14 : 2)
  const displayName = user?.preferred_name || user?.username || 'john_bha'

  // Interactive slider state
  const [totalWaitlistCount, setTotalWaitlistCount] = useState<number>(2480)

  // Modals state
  const [showArcadeModal, setShowArcadeModal] = useState<boolean>(false)
  const [showJournalModal, setShowJournalModal] = useState<boolean>(false)
  const [showBreathingModal, setShowBreathingModal] = useState<boolean>(false)
  const [showQuotesModal, setShowQuotesModal] = useState<boolean>(false)
  const [showReportModal, setShowReportModal] = useState<boolean>(false)

  // Report issue form state
  const [reportType, setReportType] = useState<string>('Technical Issue')
  const [reportDescription, setReportDescription] = useState<string>('')
  const [reportSubmitted, setReportSubmitted] = useState<boolean>(false)
  const [isSubmittingReport, setIsSubmittingReport] = useState<boolean>(false)

  // Journal state
  const [journalText, setJournalText] = useState<string>('')
  const [savedEntries, setSavedEntries] = useState<Array<{ id: string; text: string; date: string }>>([])
  const [journalSavedAlert, setJournalSavedAlert] = useState<boolean>(false)

  // Breathing space state
  const [breathingPhase, setBreathingPhase] = useState<'Inhale' | 'Hold' | 'Exhale' | 'Pause'>('Inhale')
  const [breathingSecondsLeft, setBreathingSecondsLeft] = useState<number>(4)
  const [breathingCycleCount, setBreathingCycleCount] = useState<number>(0)
  const [isBreathingActive, setIsBreathingActive] = useState<boolean>(true)

  // Bottom quote banner state
  const [activeQuoteIndex, setActiveQuoteIndex] = useState<number>(0)
  const [copiedQuote, setCopiedQuote] = useState<boolean>(false)

  // Card horizontal scroll ref
  const cardsContainerRef = useRef<HTMLDivElement>(null)
  const profileDropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMounted(true)

    // Load saved journal entries from localStorage
    try {
      const stored = localStorage.getItem('mythri_waitlist_journal')
      if (stored) {
        setSavedEntries(JSON.parse(stored))
      }
    } catch {
      // ignore
    }
  }, [])

  // Close profile dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Auto rotate quote every 10 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveQuoteIndex((prev) => (prev + 1) % 4)
    }, 10000)
    return () => clearInterval(timer)
  }, [])

  // Breathing timer loop
  useEffect(() => {
    if (!showBreathingModal || !isBreathingActive) return

    const timer = setInterval(() => {
      setBreathingSecondsLeft((prev) => {
        if (prev <= 1) {
          // Advance phase
          setBreathingPhase((currentPhase) => {
            if (currentPhase === 'Inhale') return 'Hold'
            if (currentPhase === 'Hold') return 'Exhale'
            if (currentPhase === 'Exhale') return 'Pause'
            // Finished Pause -> complete 1 full cycle
            setBreathingCycleCount((c) => c + 1)
            return 'Inhale'
          })
          return 4
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [showBreathingModal, isBreathingActive])

  // Horizontal scroll controls for explore cards
  const scrollCards = (direction: 'left' | 'right') => {
    if (cardsContainerRef.current) {
      const offset = direction === 'left' ? -280 : 280
      cardsContainerRef.current.scrollBy({ left: offset, behavior: 'smooth' })
    }
  }

  // Handle Journal Save
  const handleSaveJournal = () => {
    if (!journalText.trim()) return
    const newEntry = {
      id: Date.now().toString(),
      text: journalText.trim(),
      date: new Date().toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
    }
    const updated = [newEntry, ...savedEntries]
    setSavedEntries(updated)
    try {
      localStorage.setItem('mythri_waitlist_journal', JSON.stringify(updated))
    } catch {
      // ignore
    }
    setJournalText('')
    setJournalSavedAlert(true)
    setTimeout(() => setJournalSavedAlert(false), 2500)
  }

  const handleDeleteJournal = (id: string) => {
    const updated = savedEntries.filter((e) => e.id !== id)
    setSavedEntries(updated)
    try {
      localStorage.setItem('mythri_waitlist_journal', JSON.stringify(updated))
    } catch {
      // ignore
    }
  }

  // Handle Enter Sanctuary
  const handleEnterSanctuary = async () => {
    setEntering(true)
    setStatusMsg(null)
    try {
      await completeWaitlist({
        intentions: 'Mindful personal growth',
        vibe: 'Gentle, compassionate & listening',
        cadence: 'Morning mindset & daily intention',
        agreed_privacy: true,
        affirmation: 'Small gentle steps lead to lasting peace.',
      })
      await refreshUser()
      setStatusMsg('Welcome to the Sanctuary! Your access is approved.')
      setTimeout(() => {
        router.replace('/home')
      }, 1000)
    } catch {
      setStatusMsg('Entering Sanctuary…')
      setTimeout(() => {
        router.replace('/home')
      }, 1000)
    } finally {
      setEntering(false)
    }
  }

  // Submit Report
  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reportDescription.trim()) return

    setIsSubmittingReport(true)
    try {
      await reportIssue({
        issue_type: reportType,
        description: reportDescription,
        contact_email: user?.email,
      })
      setReportSubmitted(true)
    } catch {
      setReportSubmitted(true)
    } finally {
      setIsSubmittingReport(false)
    }
  }

  // Handle Logout
  const handleLogout = async () => {
    setLoggingOut(true)
    try {
      await logout()
    } catch {
      window.location.href = '/login'
    }
  }

  // Copy Quote to clipboard
  const handleCopyQuote = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedQuote(true)
    setTimeout(() => setCopiedQuote(false), 2000)
  }

  // Slider derived percentages
  const minSlider = 100
  const maxSlider = 10000
  const sliderPercent = Math.min(100, Math.max(0, ((totalWaitlistCount - minSlider) / (maxSlider - minSlider)) * 100))
  const aheadPercent = Math.max(1, Math.min(100, Math.round(((totalWaitlistCount - ticketNumber) / totalWaitlistCount) * 100)))

  const isDark = mounted && theme === 'dark'

  return (
    <div className="relative min-h-screen w-full flex flex-col bg-[#F4EFEA] dark:bg-[#1D1714] text-[#382820] dark:text-[#F3EDE3] selection:bg-[#784429]/20 font-sans overflow-x-hidden transition-colors duration-300">

      {/* ── Background Subtle Topographic Contour Wave Pattern ─────── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden select-none z-0 opacity-40 dark:opacity-20">
        <svg
          className="w-full h-[600px] object-cover"
          viewBox="0 0 1440 600"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M-100 140C260 90 520 220 900 120C1200 40 1380 180 1550 130"
            stroke="#80523B"
            strokeWidth="0.8"
            strokeDasharray="4 4"
            opacity="0.3"
          />
          <path
            d="M-80 200C300 130 620 270 1020 180C1280 110 1420 220 1560 170"
            stroke="#80523B"
            strokeWidth="1"
            opacity="0.25"
          />
          <path
            d="M-50 280C340 210 700 340 1100 240C1340 160 1480 300 1580 230"
            stroke="#80523B"
            strokeWidth="0.8"
            strokeDasharray="6 6"
            opacity="0.2"
          />
          <path
            d="M-30 360C400 300 780 410 1180 320C1400 240 1520 380 1600 310"
            stroke="#80523B"
            strokeWidth="1"
            opacity="0.15"
          />
        </svg>
      </div>

      {/* ── TOP FLOATING NAVIGATION (NO HEADER STRIP) ──────────────── */}
      {/* Individual elements folding / wrapping independently with no background bar or border strip */}
      <nav className="relative z-30 w-full max-w-7xl mx-auto px-5 sm:px-10 pt-7 pb-4 flex flex-wrap items-center justify-between gap-4">
        
        {/* Floating Brand Badge (Left) */}
        <div className="flex items-center gap-3 select-none">
          <div className="w-10 h-10 rounded-xl bg-[#5C3826] text-white flex items-center justify-center font-serif font-bold text-lg shadow-[0_4px_12px_rgba(92,56,38,0.25)] hover:scale-105 transition-transform duration-200">
            M
          </div>
          <div className="flex flex-col">
            <span
              className="text-lg font-serif font-semibold text-[#382820] dark:text-[#F3EDE3] tracking-tight leading-none"
              style={{ fontFamily: 'var(--font-literata), Georgia, serif' }}
            >
              Mythri
            </span>
            <span className="text-[9px] uppercase tracking-[0.22em] text-[#8C7355] dark:text-[#C5A88F] font-semibold mt-1">
              SANCTUARY QUEUE
            </span>
          </div>
        </div>

        {/* Floating Action Controls (Right) - Standalone individual pills */}
        <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
          
          {/* Floating Pill 1: Gaming Lounge */}
          <button
            onClick={() => setShowArcadeModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/75 dark:bg-[#261E1A]/80 backdrop-blur-md border border-[#E3D7C9] dark:border-[#42342A] text-xs font-semibold text-[#382820] dark:text-[#F3EDE3] hover:bg-white dark:hover:bg-[#342922] shadow-[0_2px_10px_rgba(56,40,32,0.04)] hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
          >
            <Gamepad2 className="w-4 h-4 text-[#80523B] dark:text-[#D1A184]" />
            <span>Gaming Lounge</span>
          </button>

          {/* Floating Pill 2: Theme Toggle (Sun & Moon) */}
          <button
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-white/75 dark:bg-[#261E1A]/80 backdrop-blur-md border border-[#E3D7C9] dark:border-[#42342A] text-xs shadow-[0_2px_10px_rgba(56,40,32,0.04)] hover:bg-white dark:hover:bg-[#342922] hover:scale-105 active:scale-95 transition-all cursor-pointer"
          >
            <Sun
              className={`w-3.5 h-3.5 transition-colors ${
                !isDark ? 'text-[#80523B] stroke-[2.5]' : 'text-[#80523B]/35 dark:text-[#C2B1A0]/35'
              }`}
            />
            <Moon
              className={`w-3.5 h-3.5 transition-colors ${
                isDark ? 'text-amber-300 stroke-[2.5]' : 'text-[#80523B]/35'
              }`}
            />
          </button>

          {/* Floating Pill 3: User Profile Dropdown */}
          <div className="relative" ref={profileDropdownRef}>
            <button
              onClick={() => setShowProfileMenu((prev) => !prev)}
              className="flex items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-full bg-white/75 dark:bg-[#261E1A]/80 backdrop-blur-md border border-[#E3D7C9] dark:border-[#42342A] text-xs font-semibold text-[#382820] dark:text-[#F3EDE3] hover:bg-white dark:hover:bg-[#342922] shadow-[0_2px_10px_rgba(56,40,32,0.04)] hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
            >
              <div className="w-6 h-6 rounded-full bg-[#5C3826] text-white flex items-center justify-center text-[11px] font-bold uppercase shadow-sm">
                {displayName.charAt(0) || 'J'}
              </div>
              <span className="font-semibold text-xs tracking-tight text-[#382820] dark:text-[#F3EDE3]">
                {displayName}
              </span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-[#726056] dark:text-[#C2B1A0] transition-transform duration-200 ${
                  showProfileMenu ? 'rotate-180' : ''
                }`}
              />
            </button>

            {/* Profile Dropdown Menu */}
            {showProfileMenu && (
              <div className="absolute right-0 mt-2.5 w-60 bg-[#FFFCF8] dark:bg-[#261E1A] rounded-2xl p-2.5 border border-[#E3D7C9] dark:border-[#42342A] shadow-[0_16px_40px_rgba(56,40,32,0.12)] z-50 animate-fadeIn flex flex-col gap-1">
                <div className="px-3 py-2 border-b border-[#EBE3D7] dark:border-[#3E2F26]">
                  <p className="text-xs font-semibold text-[#382820] dark:text-[#F3EDE3] truncate">
                    {displayName}
                  </p>
                  <p className="text-[11px] text-[#8C7355] dark:text-[#C5A88F] flex items-center gap-1 mt-0.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Ticket #{ticketNumber} Confirmed</span>
                  </p>
                </div>

                {/* Enter Sanctuary Action */}
                <button
                  onClick={() => {
                    setShowProfileMenu(false)
                    handleEnterSanctuary()
                  }}
                  disabled={entering}
                  className="w-full px-3 py-2 text-left text-xs font-medium text-[#80523B] dark:text-[#D1A184] hover:bg-[#F3EDE3] dark:hover:bg-[#342922] rounded-xl flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{entering ? 'Entering Sanctuary…' : 'Enter Sanctuary'}</span>
                </button>

                {/* Report Issue Action */}
                <button
                  onClick={() => {
                    setShowProfileMenu(false)
                    setShowReportModal(true)
                  }}
                  className="w-full px-3 py-2 text-left text-xs font-medium text-[#726056] dark:text-[#C2B1A0] hover:bg-[#F3EDE3] dark:hover:bg-[#342922] rounded-xl flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <Flag className="w-3.5 h-3.5 text-rose-500" />
                  <span>Report an Issue</span>
                </button>

                {/* Sign Out Action */}
                <button
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="w-full px-3 py-2 text-left text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl flex items-center gap-2 transition-colors cursor-pointer"
                >
                  {loggingOut ? (
                    <span className="w-3.5 h-3.5 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <LogOut className="w-3.5 h-3.5" />
                  )}
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>

        </div>
      </nav>

      {/* ── HERO & WAITLIST TICKET ROW ─────────────────────────────── */}
      <section className="relative z-10 w-full max-w-7xl mx-auto px-5 sm:px-10 pt-6 sm:pt-10 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        
        {/* Left Column: Welcome & Affirmation */}
        <div className="lg:col-span-7 flex flex-col">
          <span className="text-[11px] font-bold tracking-[0.24em] uppercase text-[#8C5338] dark:text-[#D19B75] mb-2 sm:mb-3">
            A CALMER YOU AWAITS
          </span>
          <h1
            className="text-4xl sm:text-5xl lg:text-[54px] font-serif font-normal text-[#382820] dark:text-[#F3EDE3] leading-[1.12]"
            style={{ fontFamily: 'var(--font-literata), Georgia, serif' }}
          >
            Welcome back,
            <br />
            <span className="font-semibold text-[#5C3826] dark:text-[#D19B75]">
              {displayName}
            </span>
          </h1>
          <p className="text-sm sm:text-base text-[#726056] dark:text-[#B5A192] mt-4 max-w-lg leading-relaxed font-sans">
            Your ticket <strong className="font-semibold text-[#382820] dark:text-[#F3EDE3]">#{ticketNumber}</strong> is confirmed. While you wait, take a moment for yourself — explore, play, or simply breathe. You&apos;re in a safe space.
          </p>

          {statusMsg && (
            <div className="mt-4 max-w-md p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 border border-emerald-300/60 text-xs font-medium animate-fadeIn">
              {statusMsg}
            </div>
          )}
        </div>

        {/* Right Column: Place in Line Card */}
        <div className="lg:col-span-5">
          <div className="w-full bg-[#FFFCF8] dark:bg-[#261E1A] rounded-3xl p-6 sm:p-7 border border-[#EBE3D7] dark:border-[#3E2F26] shadow-[0_12px_36px_rgba(56,40,32,0.05)] grid grid-cols-1 sm:grid-cols-12 gap-5 items-center">
            
            {/* Left Sub-Box: Assigned Number In Line */}
            <div className="sm:col-span-5 flex flex-col items-center justify-center text-center sm:pr-4 sm:border-r border-[#EBE3D7] dark:border-[#3E2F26]">
              <span className="text-[10px] uppercase tracking-[0.2em] font-semibold text-[#8C7355] dark:text-[#C5A88F]">
                YOUR PLACE IN LINE
              </span>
              <div
                className="text-5xl sm:text-6xl font-serif font-bold text-[#382820] dark:text-[#F3EDE3] my-1 sm:my-2"
                style={{ fontFamily: 'var(--font-literata), Georgia, serif' }}
              >
                #{ticketNumber}
              </div>
              <span className="text-[10px] uppercase tracking-[0.25em] font-bold text-[#8C7355] dark:text-[#C5A88F]">
                IN QUEUE
              </span>
            </div>

            {/* Right Sub-Box: Community Size & Philosophy */}
            <div className="sm:col-span-7 flex flex-col justify-center text-left">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#F3EDE3] dark:bg-[#342922] flex items-center justify-center text-[#80523B] dark:text-[#D1A184] shrink-0">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <div
                    className="text-2xl font-serif font-bold text-[#382820] dark:text-[#F3EDE3] leading-none"
                    style={{ fontFamily: 'var(--font-literata), Georgia, serif' }}
                  >
                    {totalWaitlistCount.toLocaleString()}
                  </div>
                  <div className="text-xs text-[#8C7355] dark:text-[#B5A192] font-medium mt-0.5">
                    people waiting
                  </div>
                </div>
              </div>

              <p className="text-xs text-[#726056] dark:text-[#B5A192] leading-relaxed mt-3">
                We admit members in unhurried cohorts to maintain a calm and supportive space.
              </p>
            </div>

          </div>
        </div>

      </section>

      {/* ── COMMUNITY WAITLIST SLIDER BAR ──────────────────────────── */}
      <section className="relative z-10 w-full max-w-7xl mx-auto px-5 sm:px-10 pt-8 pb-4">
        <div className="w-full flex flex-col gap-2.5">
          
          {/* Custom Styled Interactive Slider Track */}
          <div className="relative w-full flex items-center py-2">
            <input
              type="range"
              min={minSlider}
              max={maxSlider}
              step="50"
              value={totalWaitlistCount}
              onChange={(e) => setTotalWaitlistCount(Number(e.target.value))}
              className="w-full cursor-pointer z-10 opacity-0 h-6 absolute inset-0"
              aria-label="Simulate waitlist size"
            />
            
            {/* Visual track with filled bar */}
            <div className="w-full h-3 rounded-full bg-[#E5DACE] dark:bg-[#382B22] overflow-hidden relative shadow-inner">
              <div
                className="h-full bg-[#784429] rounded-full transition-all duration-75"
                style={{ width: `${sliderPercent}%` }}
              />
            </div>

            {/* Circular Thumb Knob */}
            <div
              className="w-5 h-5 rounded-full bg-[#784429] border-2 border-[#F4EFEA] dark:border-[#261E1A] shadow-md absolute pointer-events-none transition-all duration-75 -translate-x-1/2"
              style={{ left: `${sliderPercent}%` }}
            />
          </div>

          {/* Under-slider Informational Labels */}
          <div className="flex items-center justify-between text-xs text-[#726056] dark:text-[#B5A192] px-0.5">
            <span>Small Batch (100)</span>
            <span className="text-center">
              You are ahead of{' '}
              <strong className="font-bold text-[#382820] dark:text-[#F3EDE3]">
                {aheadPercent}%
              </strong>{' '}
              of aspirants!
            </span>
            <span>Global Wave (10,000)</span>
          </div>

        </div>
      </section>

      {/* ── THINGS TO EXPLORE WHILE YOU WAIT SECTION ──────────────── */}
      <section className="relative z-10 w-full max-w-7xl mx-auto px-5 sm:px-10 pt-8 pb-4">
        
        {/* Section Header with Carousel Arrows */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2
              className="text-2xl sm:text-3xl font-serif font-semibold text-[#382820] dark:text-[#F3EDE3]"
              style={{ fontFamily: 'var(--font-literata), Georgia, serif' }}
            >
              Things to explore while you wait
            </h2>
            <p className="text-xs sm:text-sm text-[#726056] dark:text-[#C2B1A0] mt-1">
              Simple and calming activities to help you feel a little better.
            </p>
          </div>

          {/* Arrow Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => scrollCards('left')}
              title="Previous cards"
              className="w-9 h-9 rounded-full bg-white dark:bg-[#261E1A] border border-[#E3D7C9] dark:border-[#42342A] shadow-sm flex items-center justify-center text-[#382820] dark:text-[#F3EDE3] hover:scale-105 active:scale-95 transition-all cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => scrollCards('right')}
              title="Next cards"
              className="w-9 h-9 rounded-full bg-white dark:bg-[#261E1A] border border-[#E3D7C9] dark:border-[#42342A] shadow-sm flex items-center justify-center text-[#382820] dark:text-[#F3EDE3] hover:scale-105 active:scale-95 transition-all cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 4 Activity Cards Grid */}
        <div
          ref={cardsContainerRef}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 pt-5 overflow-x-auto scrollbar-none"
        >
          
          {/* Card 1: Games */}
          <div
            onClick={() => setShowArcadeModal(true)}
            className="relative bg-[#FFFCF8] dark:bg-[#261E1A] rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-[#EBE3D7] dark:border-[#3E2F26] shadow-[0_8px_24px_rgba(56,40,32,0.04)] hover:shadow-[0_12px_32px_rgba(56,40,32,0.08)] transition-all duration-300 flex flex-col justify-between min-h-[195px] overflow-hidden group cursor-pointer hover:-translate-y-1"
          >
            <div>
              <div className="w-8 h-8 rounded-lg bg-[#F4EFEA] dark:bg-[#342922] flex items-center justify-center text-[#382820] dark:text-[#F3EDE3]">
                <Gamepad2 className="w-4 h-4 text-[#80523B] dark:text-[#D1A184]" />
              </div>
              <h3
                className="text-base sm:text-lg font-serif font-semibold text-[#382820] dark:text-[#F3EDE3] mt-2.5"
                style={{ fontFamily: 'var(--font-literata), Georgia, serif' }}
              >
                Games
              </h3>
              <p className="text-xs text-[#726056] dark:text-[#C2B1A0] mt-1 max-w-[130px] leading-relaxed">
                Play simple, mindful games to refresh your mind.
              </p>
            </div>

            {/* Bottom Circular Action Arrow */}
            <div className="pt-4 z-10">
              <div className="w-8 h-8 rounded-full bg-white dark:bg-[#342922] border border-[#E3D7C9] dark:border-[#4A3A30] shadow-sm flex items-center justify-center text-[#382820] dark:text-[#F3EDE3] group-hover:bg-[#784429] group-hover:text-white group-hover:border-[#784429] transition-all">
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Right Illustration: Zen Stacked Balancing Stones */}
            <div className="absolute right-0 bottom-0 top-0 w-[45%] pointer-events-none select-none flex items-end justify-end overflow-hidden">
              <Image
                src="/waitlist/art-stones-fade.png"
                alt="Mindful Zen Stones"
                width={126}
                height={163}
                className="object-contain object-right-bottom h-full max-h-[165px] dark:opacity-85"
              />
            </div>
          </div>

          {/* Card 2: Mini Journal */}
          <div
            onClick={() => setShowJournalModal(true)}
            className="relative bg-[#FFFCF8] dark:bg-[#261E1A] rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-[#EBE3D7] dark:border-[#3E2F26] shadow-[0_8px_24px_rgba(56,40,32,0.04)] hover:shadow-[0_12px_32px_rgba(56,40,32,0.08)] transition-all duration-300 flex flex-col justify-between min-h-[195px] overflow-hidden group cursor-pointer hover:-translate-y-1"
          >
            <div>
              <div className="w-8 h-8 rounded-lg bg-[#F4EFEA] dark:bg-[#342922] flex items-center justify-center text-[#382820] dark:text-[#F3EDE3]">
                <FileText className="w-4 h-4 text-[#80523B] dark:text-[#D1A184]" />
              </div>
              <h3
                className="text-base sm:text-lg font-serif font-semibold text-[#382820] dark:text-[#F3EDE3] mt-2.5"
                style={{ fontFamily: 'var(--font-literata), Georgia, serif' }}
              >
                Mini Journal
              </h3>
              <p className="text-xs text-[#726056] dark:text-[#C2B1A0] mt-1 max-w-[130px] leading-relaxed">
                Write, reflect or dump your thoughts.
              </p>
            </div>

            {/* Bottom Circular Action Arrow */}
            <div className="pt-4 z-10">
              <div className="w-8 h-8 rounded-full bg-white dark:bg-[#342922] border border-[#E3D7C9] dark:border-[#4A3A30] shadow-sm flex items-center justify-center text-[#382820] dark:text-[#F3EDE3] group-hover:bg-[#784429] group-hover:text-white group-hover:border-[#784429] transition-all">
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Right Illustration: Notebook and Fountain Pen */}
            <div className="absolute right-0 bottom-0 top-0 w-[45%] pointer-events-none select-none flex items-end justify-end overflow-hidden">
              <Image
                src="/waitlist/art-journal-fade.png"
                alt="Mini Journal notebook and pen"
                width={133}
                height={163}
                className="object-contain object-right-bottom h-full max-h-[165px] dark:opacity-85"
              />
            </div>
          </div>

          {/* Card 3: Breathing Space */}
          <div
            onClick={() => setShowBreathingModal(true)}
            className="relative bg-[#FFFCF8] dark:bg-[#261E1A] rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-[#EBE3D7] dark:border-[#3E2F26] shadow-[0_8px_24px_rgba(56,40,32,0.04)] hover:shadow-[0_12px_32px_rgba(56,40,32,0.08)] transition-all duration-300 flex flex-col justify-between min-h-[195px] overflow-hidden group cursor-pointer hover:-translate-y-1"
          >
            <div>
              <div className="w-8 h-8 rounded-lg bg-[#F4EFEA] dark:bg-[#342922] flex items-center justify-center text-[#382820] dark:text-[#F3EDE3]">
                <Wind className="w-4 h-4 text-[#80523B] dark:text-[#D1A184]" />
              </div>
              <h3
                className="text-base sm:text-lg font-serif font-semibold text-[#382820] dark:text-[#F3EDE3] mt-2.5"
                style={{ fontFamily: 'var(--font-literata), Georgia, serif' }}
              >
                Breathing Space
              </h3>
              <p className="text-xs text-[#726056] dark:text-[#C2B1A0] mt-1 max-w-[130px] leading-relaxed">
                Short guided exercises to help you relax.
              </p>
            </div>

            {/* Bottom Circular Action Arrow */}
            <div className="pt-4 z-10">
              <div className="w-8 h-8 rounded-full bg-white dark:bg-[#342922] border border-[#E3D7C9] dark:border-[#4A3A30] shadow-sm flex items-center justify-center text-[#382820] dark:text-[#F3EDE3] group-hover:bg-[#784429] group-hover:text-white group-hover:border-[#784429] transition-all">
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Right Illustration: Gentle Silky Waves */}
            <div className="absolute right-0 bottom-0 top-0 w-[45%] pointer-events-none select-none flex items-end justify-end overflow-hidden">
              <Image
                src="/waitlist/art-waves-fade.png"
                alt="Breathing silk sand waves"
                width={149}
                height={163}
                className="object-contain object-right-bottom h-full max-h-[165px] dark:opacity-85"
              />
            </div>
          </div>

          {/* Card 4: Daily Quotes */}
          <div
            onClick={() => setShowQuotesModal(true)}
            className="relative bg-[#FFFCF8] dark:bg-[#261E1A] rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-[#EBE3D7] dark:border-[#3E2F26] shadow-[0_8px_24px_rgba(56,40,32,0.04)] hover:shadow-[0_12px_32px_rgba(56,40,32,0.08)] transition-all duration-300 flex flex-col justify-between min-h-[195px] overflow-hidden group cursor-pointer hover:-translate-y-1"
          >
            <div>
              <div className="w-8 h-8 rounded-lg bg-[#F4EFEA] dark:bg-[#342922] flex items-center justify-center text-[#382820] dark:text-[#F3EDE3]">
                <Quote className="w-4 h-4 text-[#80523B] dark:text-[#D1A184]" />
              </div>
              <h3
                className="text-base sm:text-lg font-serif font-semibold text-[#382820] dark:text-[#F3EDE3] mt-2.5"
                style={{ fontFamily: 'var(--font-literata), Georgia, serif' }}
              >
                Daily Quotes
              </h3>
              <p className="text-xs text-[#726056] dark:text-[#C2B1A0] mt-1 max-w-[130px] leading-relaxed">
                A little positivity for your day.
              </p>
            </div>

            {/* Bottom Circular Action Arrow */}
            <div className="pt-4 z-10">
              <div className="w-8 h-8 rounded-full bg-white dark:bg-[#342922] border border-[#E3D7C9] dark:border-[#4A3A30] shadow-sm flex items-center justify-center text-[#382820] dark:text-[#F3EDE3] group-hover:bg-[#784429] group-hover:text-white group-hover:border-[#784429] transition-all">
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Right Illustration: Dried Botanical Branch & Affirmation Card */}
            <div className="absolute right-0 bottom-0 top-0 w-[45%] pointer-events-none select-none flex items-end justify-end overflow-hidden">
              <Image
                src="/waitlist/art-quotes-fade.png"
                alt="Daily quotes botanical card"
                width={151}
                height={163}
                className="object-contain object-right-bottom h-full max-h-[165px] dark:opacity-85"
              />
            </div>
          </div>

        </div>
      </section>

      {/* ── BOTTOM BANNER / QUOTE STRIP ────────────────────────────── */}
      <section className="relative z-10 w-full max-w-7xl mx-auto px-5 sm:px-10 pt-4 pb-12">
        <div className="w-full bg-[#FFFCF8]/90 dark:bg-[#261E1A]/90 backdrop-blur-sm rounded-2xl sm:rounded-full p-3.5 sm:px-6 sm:py-3.5 border border-[#EBE3D7] dark:border-[#3E2F26] shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
          
          {/* Sparkle Icon */}
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="w-7 h-7 rounded-full bg-[#F3EDE3] dark:bg-[#342922] flex items-center justify-center text-[#80523B] dark:text-[#D1A184] shrink-0">
              <Sparkles className="w-3.5 h-3.5" />
            </div>

            {/* Rotating Quote text */}
            <div className="flex-1 text-center sm:text-left">
              <p
                className="text-xs sm:text-sm font-serif italic text-[#726056] dark:text-[#C2B1A0] transition-all duration-300"
                style={{ fontFamily: 'var(--font-literata), Georgia, serif' }}
              >
                &ldquo;{SANCTUARY_QUOTES[activeQuoteIndex]}&rdquo;
              </p>
            </div>
          </div>

          {/* Carousel Pagination Dots */}
          <div className="flex items-center gap-2 shrink-0">
            {[0, 1, 2, 3].map((dotIndex) => (
              <button
                key={dotIndex}
                onClick={() => setActiveQuoteIndex(dotIndex)}
                title={`Quote ${dotIndex + 1}`}
                className={`w-2 h-2 rounded-full transition-all duration-200 cursor-pointer ${
                  activeQuoteIndex === dotIndex
                    ? 'bg-[#784429] scale-125'
                    : 'bg-[#DFD3C4] dark:bg-[#493A30] hover:bg-[#784429]/50'
                }`}
              />
            ))}
          </div>

        </div>
      </section>

      {/* ── 12-GAME ARCADE MODAL ────────────────────────────────────── */}
      <ArcadeModal isOpen={showArcadeModal} onClose={() => setShowArcadeModal(false)} />

      {/* ── MINI JOURNAL INTERACTIVE MODAL ─────────────────────────── */}
      {showJournalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-xl bg-[#FFFCF8] dark:bg-[#261E1A] rounded-3xl p-6 sm:p-7 border border-[#EBE3D7] dark:border-[#3E2F26] shadow-2xl flex flex-col gap-4 text-left max-h-[90vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#EBE3D7] dark:border-[#3E2F26]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#F4EFEA] dark:bg-[#342922] text-[#80523B] dark:text-[#D1A184] flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3
                    className="font-serif text-lg font-semibold text-[#382820] dark:text-[#F3EDE3]"
                    style={{ fontFamily: 'var(--font-literata), Georgia, serif' }}
                  >
                    Mini Journal
                  </h3>
                  <p className="text-[11px] text-[#726056] dark:text-[#C2B1A0]">
                    Write, reflect or dump your thoughts in quiet privacy.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowJournalModal(false)}
                className="w-8 h-8 rounded-full bg-[#F3EDE3] dark:bg-[#342922] flex items-center justify-center text-[#726056] dark:text-[#C2B1A0] hover:text-[#382820] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Inspiration Prompts */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#8C7355] dark:text-[#C5A88F]">
                Gentle Prompts (Click to insert)
              </span>
              <div className="flex flex-wrap gap-1.5">
                {JOURNAL_PROMPTS.map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => setJournalText((prev) => (prev ? `${prev}\n\n${prompt}\n` : `${prompt}\n`))}
                    className="text-[11px] px-2.5 py-1 rounded-full bg-[#F3EDE3] dark:bg-[#342922] text-[#726056] dark:text-[#D1A184] hover:bg-[#80523B] hover:text-white transition-all cursor-pointer"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>

            {/* Journal Textarea */}
            <div className="relative">
              <textarea
                rows={6}
                value={journalText}
                onChange={(e) => setJournalText(e.target.value)}
                placeholder="Let your thoughts flow freely. There is no right or wrong way to write here..."
                className="w-full p-4 rounded-2xl bg-[#F8F4EE] dark:bg-[#1D1714] border border-[#EBE3D7] dark:border-[#3E2F26] text-sm text-[#382820] dark:text-[#F3EDE3] outline-none focus:border-[#80523B] resize-none leading-relaxed"
              />
              <div className="flex items-center justify-between text-[11px] text-[#8C7355] dark:text-[#B5A192] px-1 mt-1">
                <span>{journalText.trim() ? `${journalText.trim().split(/\s+/).length} words` : '0 words'}</span>
                <span>Entries are stored privately on your device</span>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex items-center justify-between pt-1">
              {journalSavedAlert ? (
                <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Reflection quietly saved.</span>
                </div>
              ) : (
                <span />
              )}
              <button
                onClick={handleSaveJournal}
                disabled={!journalText.trim()}
                className="px-5 py-2.5 rounded-full bg-[#784429] text-white text-xs font-semibold hover:bg-[#5C3826] active:scale-95 disabled:opacity-40 transition-all flex items-center gap-2 cursor-pointer shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Save Reflection</span>
              </button>
            </div>

            {/* Saved Past Entries */}
            {savedEntries.length > 0 && (
              <div className="pt-3 border-t border-[#EBE3D7] dark:border-[#3E2F26] flex flex-col gap-2.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8C7355] dark:text-[#C5A88F]">
                  Past Reflections ({savedEntries.length})
                </span>
                <div className="flex flex-col gap-2 max-h-44 overflow-y-auto pr-1">
                  {savedEntries.map((entry) => (
                    <div
                      key={entry.id}
                      className="p-3 rounded-xl bg-[#F8F4EE] dark:bg-[#1D1714] border border-[#EBE3D7] dark:border-[#3E2F26] flex items-start justify-between gap-3 text-xs"
                    >
                      <div className="flex-1 whitespace-pre-wrap leading-relaxed text-[#382820] dark:text-[#F3EDE3]">
                        {entry.text}
                        <div className="text-[10px] text-[#8C7355] dark:text-[#B5A192] mt-1.5 font-medium">
                          {entry.date}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteJournal(entry.id)}
                        className="text-[#726056] hover:text-rose-600 dark:hover:text-rose-400 p-1 cursor-pointer transition-colors"
                        title="Delete reflection"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* ── BREATHING SPACE INTERACTIVE MODAL ───────────────────────── */}
      {showBreathingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-md bg-[#FFFCF8] dark:bg-[#261E1A] rounded-3xl p-6 sm:p-8 border border-[#EBE3D7] dark:border-[#3E2F26] shadow-2xl flex flex-col items-center text-center gap-5">
            
            {/* Modal Header */}
            <div className="w-full flex items-center justify-between pb-2 border-b border-[#EBE3D7] dark:border-[#3E2F26]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#F4EFEA] dark:bg-[#342922] text-[#80523B] dark:text-[#D1A184] flex items-center justify-center">
                  <Wind className="w-4 h-4" />
                </div>
                <h3
                  className="font-serif text-lg font-semibold text-[#382820] dark:text-[#F3EDE3]"
                  style={{ fontFamily: 'var(--font-literata), Georgia, serif' }}
                >
                  Breathing Space
                </h3>
              </div>
              <button
                onClick={() => setShowBreathingModal(false)}
                className="w-8 h-8 rounded-full bg-[#F3EDE3] dark:bg-[#342922] flex items-center justify-center text-[#726056] dark:text-[#C2B1A0] hover:text-[#382820] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Pattern Indicator */}
            <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#8C7355] dark:text-[#C5A88F]">
              4-4-4-4 Box Breathing
            </span>

            {/* Animated Breathing Circle */}
            <div className="relative w-48 h-48 sm:w-56 sm:h-56 flex items-center justify-center my-2">
              {/* Outer pulsing ring */}
              <div
                className={`absolute inset-0 rounded-full border-2 border-[#784429]/20 transition-all duration-1000 ${
                  breathingPhase === 'Inhale'
                    ? 'scale-105 opacity-100'
                    : breathingPhase === 'Exhale'
                    ? 'scale-90 opacity-40'
                    : 'scale-100 opacity-60'
                }`}
              />

              {/* Central animated bubble */}
              <div
                className={`w-36 h-36 sm:w-40 sm:h-40 rounded-full bg-gradient-to-tr from-[#784429] via-[#8C5338] to-[#D19B75] text-white flex flex-col items-center justify-center shadow-xl shadow-[#784429]/20 transition-all duration-1000 ease-in-out ${
                  breathingPhase === 'Inhale'
                    ? 'scale-110'
                    : breathingPhase === 'Hold'
                    ? 'scale-110'
                    : breathingPhase === 'Exhale'
                    ? 'scale-85'
                    : 'scale-85'
                }`}
              >
                <span className="text-sm font-semibold tracking-wide uppercase opacity-90">
                  {breathingPhase}
                </span>
                <span className="font-serif text-3xl font-bold my-0.5">
                  {breathingSecondsLeft}s
                </span>
                <span className="text-[10px] opacity-80">
                  {breathingPhase === 'Inhale'
                    ? 'Breathe in gently'
                    : breathingPhase === 'Hold'
                    ? 'Hold comfortably'
                    : breathingPhase === 'Exhale'
                    ? 'Release slowly'
                    : 'Rest in quiet'}
                </span>
              </div>
            </div>

            {/* Completed cycles & controls */}
            <div className="flex flex-col items-center gap-3">
              <span className="text-xs text-[#726056] dark:text-[#C2B1A0]">
                Completed mindful breaths:{' '}
                <strong className="text-[#382820] dark:text-[#F3EDE3] font-bold">
                  {breathingCycleCount}
                </strong>
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsBreathingActive((prev) => !prev)}
                  className="px-4 py-2 rounded-full bg-[#784429] text-white text-xs font-semibold hover:bg-[#5C3826] active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  {isBreathingActive ? (
                    <>
                      <Pause className="w-3.5 h-3.5" />
                      <span>Pause</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5" />
                      <span>Resume</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => {
                    setBreathingPhase('Inhale')
                    setBreathingSecondsLeft(4)
                    setBreathingCycleCount(0)
                  }}
                  className="px-3 py-2 rounded-full border border-[#E3D7C9] dark:border-[#42342A] text-xs font-medium text-[#726056] dark:text-[#C2B1A0] hover:bg-[#F3EDE3] dark:hover:bg-[#342922] transition-colors cursor-pointer"
                  title="Reset Counter"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ── DAILY QUOTES GALLERY MODAL ─────────────────────────────── */}
      {showQuotesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-lg bg-[#FFFCF8] dark:bg-[#261E1A] rounded-3xl p-6 sm:p-7 border border-[#EBE3D7] dark:border-[#3E2F26] shadow-2xl flex flex-col gap-5 text-left">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-2 border-b border-[#EBE3D7] dark:border-[#3E2F26]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#F4EFEA] dark:bg-[#342922] text-[#80523B] dark:text-[#D1A184] flex items-center justify-center">
                  <Quote className="w-4 h-4" />
                </div>
                <h3
                  className="font-serif text-lg font-semibold text-[#382820] dark:text-[#F3EDE3]"
                  style={{ fontFamily: 'var(--font-literata), Georgia, serif' }}
                >
                  Sanctuary Affirmations
                </h3>
              </div>
              <button
                onClick={() => setShowQuotesModal(false)}
                className="w-8 h-8 rounded-full bg-[#F3EDE3] dark:bg-[#342922] flex items-center justify-center text-[#726056] dark:text-[#C2B1A0] hover:text-[#382820] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Featured Quote Display Card */}
            <div className="p-6 rounded-2xl bg-[#F8F4EE] dark:bg-[#1D1714] border border-[#EBE3D7] dark:border-[#3E2F26] flex flex-col items-center text-center gap-3">
              <Sparkles className="w-6 h-6 text-[#784429]" />
              <p
                className="font-serif text-base sm:text-lg italic text-[#382820] dark:text-[#F3EDE3] leading-relaxed"
                style={{ fontFamily: 'var(--font-literata), Georgia, serif' }}
              >
                &ldquo;{SANCTUARY_QUOTES[activeQuoteIndex]}&rdquo;
              </p>
              <span className="text-[11px] font-medium text-[#8C7355] dark:text-[#C5A88F]">
                Affirmation #{activeQuoteIndex + 1} of {SANCTUARY_QUOTES.length}
              </span>
            </div>

            {/* Actions: Next Quote & Copy */}
            <div className="flex items-center justify-between gap-3 pt-1">
              <button
                onClick={() => handleCopyQuote(SANCTUARY_QUOTES[activeQuoteIndex])}
                className="px-4 py-2 rounded-full border border-[#E3D7C9] dark:border-[#42342A] text-xs font-medium text-[#726056] dark:text-[#C2B1A0] hover:bg-[#F3EDE3] dark:hover:bg-[#342922] flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {copiedQuote ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Quote</span>
                  </>
                )}
              </button>

              <button
                onClick={() => setActiveQuoteIndex((prev) => (prev + 1) % SANCTUARY_QUOTES.length)}
                className="px-5 py-2 rounded-full bg-[#784429] text-white text-xs font-semibold hover:bg-[#5C3826] active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <span>Next Quote</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ── REPORT AN ISSUE MODAL ──────────────────────────────────── */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-md bg-[#FFFCF8] dark:bg-[#261E1A] rounded-3xl p-6 border border-[#EBE3D7] dark:border-[#3E2F26] shadow-2xl flex flex-col gap-4 text-left">
            <div className="flex items-center justify-between pb-2 border-b border-[#EBE3D7] dark:border-[#3E2F26]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-rose-500/10 text-rose-600 flex items-center justify-center">
                  <Flag className="w-4 h-4" />
                </div>
                <h3 className="font-serif text-lg font-semibold text-[#382820] dark:text-[#F3EDE3]">
                  Report an Issue
                </h3>
              </div>
              <button
                onClick={() => {
                  setShowReportModal(false)
                  setReportSubmitted(false)
                }}
                className="w-8 h-8 rounded-full bg-[#EAE0D2] dark:bg-[#382820] flex items-center justify-center text-[#726056] hover:text-[#382820] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {reportSubmitted ? (
              <div className="py-6 flex flex-col items-center text-center gap-3">
                <CheckCircle2 className="w-12 h-12 text-emerald-600" />
                <h4 className="font-serif text-lg font-semibold text-[#382820] dark:text-white">
                  Report Received
                </h4>
                <p className="text-xs text-[#726056] dark:text-[#C2B1A0] max-w-xs">
                  Thank you for helping us maintain the sanctuary. Our team will review ticket #{ticketNumber}.
                </p>
                <button
                  onClick={() => {
                    setShowReportModal(false)
                    setReportSubmitted(false)
                  }}
                  className="mt-2 px-6 py-2 rounded-full bg-[#784429] text-white text-xs font-semibold cursor-pointer"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmitReport} className="flex flex-col gap-3.5">
                <div>
                  <label className="text-xs font-semibold text-[#382820] dark:text-[#F3EDE3] block mb-1">
                    Issue Category
                  </label>
                  <select
                    value={reportType}
                    onChange={(e) => setReportType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#F8F4EE] dark:bg-[#1D1714] border border-[#EBE3D7] dark:border-[#3E2F26] text-xs text-[#382820] dark:text-[#F3EDE3] outline-none"
                  >
                    <option>Technical Glitch / Bug</option>
                    <option>Waitlist Queue Inquiry</option>
                    <option>Audio / Microphone Issue</option>
                    <option>Privacy / Data Sovereignty</option>
                    <option>General Feedback &amp; Suggestion</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#382820] dark:text-[#F3EDE3] block mb-1">
                    Description
                  </label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Describe what occurred or how we can assist..."
                    value={reportDescription}
                    onChange={(e) => setReportDescription(e.target.value)}
                    className="w-full p-3 rounded-xl bg-[#F8F4EE] dark:bg-[#1D1714] border border-[#EBE3D7] dark:border-[#3E2F26] text-xs text-[#382820] dark:text-[#F3EDE3] outline-none focus:border-[#784429]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingReport}
                  className="w-full py-3 rounded-xl bg-[#784429] text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-md hover:bg-[#5C3826] cursor-pointer"
                >
                  {isSubmittingReport ? (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Submit Report</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  )
}
