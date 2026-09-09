'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Home, 
  Sparkles, 
  Mic, 
  BookOpen, 
  Shield, 
  HeartHandshake,
  Activity,
  TrendingUp,
  Menu, 
  X, 
  ChevronDown, 
  Compass,
  ArrowRight,
  LucideIcon
} from 'lucide-react'

interface NavItem {
  id: string
  href: string
  icon: LucideIcon
  label: string
  shortLabel: string
  description: string
  tag?: string
}

const NAV_ITEMS: NavItem[] = [
  {
    id: 'home',
    href: '/home',
    icon: Home,
    label: 'Sanctuary Home',
    shortLabel: 'Home',
    description: 'Daily overview & personalized haven',
  },
  {
    id: 'chat',
    href: '/text-chat',
    icon: Sparkles,
    label: 'Text Consultation',
    shortLabel: 'Consultation',
    description: 'Empathetic AI support & guidance',
  },
  {
    id: 'voice',
    href: '/voice-chat',
    icon: Mic,
    label: 'Voice Sanctuary',
    shortLabel: 'Voice',
    description: 'Real-time spoken dialogue with audio pacing',
  },
  {
    id: 'exercises',
    href: '/exercises',
    icon: Activity,
    label: 'Mindful Exercises',
    shortLabel: 'Exercises',
    description: 'Breathing, grounding & regulation practices',
  },

  {
    id: 'history',
    href: '/history',
    icon: BookOpen,
    label: 'Past Reflections',
    shortLabel: 'Reflections',
    description: 'Timeline, emotion tracking & calendar',
  },
  {
    id: 'feedback',
    href: '/feedback',
    icon: HeartHandshake,
    label: 'Experience Feedback',
    shortLabel: 'Feedback',
    description: 'Share thoughts & help improve Mythri',
  },
  {
    id: 'profile',
    href: '/profile',
    icon: Shield,
    label: 'Profile & Privacy',
    shortLabel: 'Profile',
    description: 'Manage preferences & biometric privacy',
  },
]

export default function RadialNav() {
  const [isOpen, setIsOpen] = useState(false)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const router = useRouter()
  const pathname = usePathname()
  const containerRef = useRef<HTMLDivElement>(null)

  // Auto-close on click outside or escape
  useEffect(() => {
    function handleClickOutside(e: MouseEvent | TouchEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setIsOpen(false)
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('touchstart', handleClickOutside)
      document.addEventListener('keydown', handleKeyDown)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  // Don't render navigation on auth/login or landing pages
  if (pathname === '/login' || pathname === '/') return null

  const activeItem = NAV_ITEMS.find((item) => 
    pathname === item.href || (item.href !== '/home' && pathname?.startsWith(item.href))
  ) || NAV_ITEMS[0]

  const handleNavigate = (href: string) => {
    setIsOpen(false)
    if (pathname !== href) {
      router.push(href)
    }
  }

  const ActiveIcon = activeItem.icon

  return (
    <div ref={containerRef} className="relative z-50 pointer-events-auto">
      {/* ── Resting Dynamic Island Capsule Trigger ── */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full backdrop-blur-xl border transition-all duration-200 shadow-sm ${
          isOpen
            ? 'bg-[#603347] text-white border-[#603347] shadow-md shadow-[#603347]/20'
            : 'bg-white/70 dark:bg-[#1E141C]/80 hover:bg-white/90 dark:hover:bg-[#2A1C27] border-white/60 dark:border-white/10 text-on-surface'
        }`}
        aria-expanded={isOpen}
        aria-label="Toggle navigation island dock"
      >
        <div className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 dark:bg-white/10 text-primary dark:text-white">
          <motion.div
            animate={{ rotate: isOpen ? 90 : 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          >
            {isOpen ? <X size={13} strokeWidth={2.5} /> : <Compass size={13} strokeWidth={2.2} />}
          </motion.div>
        </div>

        <div className="hidden sm:flex items-center gap-1.5 text-xs font-label-md font-semibold">
          <span>{activeItem.shortLabel}</span>
        </div>

        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="opacity-60"
        >
          <ChevronDown size={14} />
        </motion.div>
      </motion.button>

      {/* ── Expanded Dynamic Island Dock (Floating Spring Capsule) ── */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop veil */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/20 dark:bg-black/40 backdrop-blur-[2px] z-40"
            />

            {/* Island Floating Menu */}
            <motion.div
              initial={{ opacity: 0, y: -12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 340, damping: 25 }}
              className="absolute left-0 top-full mt-2.5 w-[310px] sm:w-[350px] bg-white/90 dark:bg-[#1C141A]/95 backdrop-blur-2xl rounded-[24px] p-2.5 shadow-2xl border border-white/80 dark:border-white/15 z-50 overflow-hidden"
            >
              {/* Island Header / Brand Subtitle */}
              <div className="flex items-center justify-between px-3 py-2 border-b border-black/5 dark:border-white/10 mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-label-md font-bold uppercase tracking-wider text-primary">
                    Sanctuary Portal
                  </span>
                </div>
                <span className="text-[10px] font-label-md text-on-surface-variant/70 bg-black/5 dark:bg-white/10 px-2 py-0.5 rounded-full">
                  {NAV_ITEMS.length} Destinations
                </span>
              </div>

              {/* Navigation Items List */}
              <div className="flex flex-col gap-1">
                {NAV_ITEMS.map((item) => {
                  const Icon = item.icon
                  const isActive = pathname === item.href || (item.href !== '/home' && pathname?.startsWith(item.href))
                  const isHovered = hoveredId === item.id

                  return (
                    <motion.button
                      key={item.id}
                      onClick={() => handleNavigate(item.href)}
                      onMouseEnter={() => setHoveredId(item.id)}
                      onMouseLeave={() => setHoveredId(null)}
                      whileHover={{ x: 3 }}
                      whileTap={{ scale: 0.98 }}
                      className={`relative flex items-center gap-3 w-full p-2.5 rounded-2xl text-left transition-all duration-150 ${
                        isActive
                          ? 'bg-[#603347] text-white shadow-md shadow-[#603347]/20 dark:bg-[#E8D4C8] dark:text-[#28131F]'
                          : 'hover:bg-black/5 dark:hover:bg-white/10 text-on-surface'
                      }`}
                    >
                      {/* Icon container */}
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
                          isActive
                            ? 'bg-white/20 dark:bg-[#28131F]/15 text-white dark:text-[#28131F]'
                            : 'bg-primary/10 dark:bg-white/10 text-primary dark:text-white'
                        }`}
                      >
                        <Icon size={18} strokeWidth={isActive ? 2.4 : 2} />
                      </div>

                      {/* Text details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs sm:text-sm font-headline font-bold truncate">
                            {item.label}
                          </span>
                          {isActive && (
                            <span className="text-[9px] font-label-md font-bold px-1.5 py-0.5 rounded-full bg-white/20 dark:bg-[#28131F]/20 uppercase tracking-wider">
                              Active
                            </span>
                          )}
                        </div>
                        <p
                          className={`text-[11px] font-body truncate ${
                            isActive
                              ? 'text-white/80 dark:text-[#28131F]/80'
                              : 'text-on-surface-variant/70'
                          }`}
                        >
                          {item.description}
                        </p>
                      </div>

                      {/* Arrow indicator on hover */}
                      {!isActive && isHovered && (
                        <motion.div
                          initial={{ opacity: 0, x: -4 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="text-primary pr-1"
                        >
                          <ArrowRight size={14} />
                        </motion.div>
                      )}
                    </motion.button>
                  )
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
