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
  Menu, 
  X, 
  Compass,
  LucideIcon
} from 'lucide-react'

interface NavItem {
  id: string
  href: string
  icon: LucideIcon
  label: string
}

const NAV_ITEMS: NavItem[] = [
  { id: 'home', href: '/home', icon: Home, label: 'Sanctuary' },
  { id: 'chat', href: '/text-chat', icon: Sparkles, label: 'Chat Consultation' },
  { id: 'voice', href: '/voice-chat', icon: Mic, label: 'Voice Sanctuary' },
  { id: 'exercises', href: '/exercises', icon: Activity, label: 'Mindful Exercises' },
  { id: 'history', href: '/history', icon: BookOpen, label: 'Reflections' },
  { id: 'feedback', href: '/feedback', icon: HeartHandshake, label: 'Feedback' },
  { id: 'profile', href: '/profile', icon: Shield, label: 'Profile & Privacy' },
]

export default function RadialNav() {
  const [isOpen, setIsOpen] = useState(false)
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

  const handleNavigate = (href: string) => {
    setIsOpen(false)
    if (pathname !== href) {
      router.push(href)
    }
  }

  return (
    <div ref={containerRef} className="relative z-50 pointer-events-auto">
      {/* ── Compact Minimal Trigger Button ── */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.94 }}
        className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center border transition-all duration-200 shadow-sm ${
          isOpen
            ? 'bg-primary text-white border-primary shadow-md'
            : 'bg-white/80 dark:bg-[#1E1B22]/90 hover:bg-white dark:hover:bg-[#28242E] border-black/5 dark:border-white/10 text-on-surface'
        }`}
        aria-expanded={isOpen}
        aria-label="Toggle navigation menu"
        title="Navigation Menu"
      >
        <motion.div
          animate={{ rotate: isOpen ? 90 : 0 }}
          transition={{ duration: 0.2 }}
        >
          {isOpen ? <X size={17} strokeWidth={2.2} /> : <Compass size={17} strokeWidth={2} />}
        </motion.div>
      </motion.button>

      {/* ── Compact Floating Menu ── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.95 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute left-0 top-full mt-2 w-52 bg-white/95 dark:bg-[#1C1820]/95 backdrop-blur-xl rounded-2xl p-1.5 shadow-xl border border-black/5 dark:border-white/10 z-50"
          >
            <div className="flex flex-col gap-0.5">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href || (item.href !== '/home' && pathname?.startsWith(item.href))

                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavigate(item.href)}
                    className={`flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-left text-xs font-medium transition-colors ${
                      isActive
                        ? 'bg-primary/10 dark:bg-primary/20 text-primary dark:text-plum-light font-semibold'
                        : 'text-on-surface-variant hover:text-on-surface hover:bg-black/[0.04] dark:hover:bg-white/[0.06]'
                    }`}
                  >
                    <Icon size={16} strokeWidth={isActive ? 2.4 : 2} className="flex-shrink-0" />
                    <span className="flex-1 truncate">{item.label}</span>
                    {isActive && (
                      <span className="w-1.5 h-1.5 rounded-full bg-primary dark:bg-plum-light flex-shrink-0" />
                    )}
                  </button>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

