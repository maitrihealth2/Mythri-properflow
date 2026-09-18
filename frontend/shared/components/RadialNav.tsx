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
  Compass,
  X,
  Download,
  LucideIcon
} from 'lucide-react'
import { usePWAContext } from '@/shared/components/PWAProvider'

interface NavItem {
  id: string
  href: string
  icon: LucideIcon
  label: string
}

const NAV_ITEMS: NavItem[] = [
  { id: 'home', href: '/home', icon: Home, label: 'Home' },
  { id: 'chat', href: '/text-chat', icon: Sparkles, label: 'Text Chat' },
  { id: 'voice', href: '/voice-chat', icon: Mic, label: 'Voice Chat' },
  { id: 'exercises', href: '/exercises', icon: Activity, label: 'Exercises' },
  { id: 'history', href: '/history', icon: BookOpen, label: 'Reflections' },
  { id: 'profile', href: '/profile', icon: Shield, label: 'Profile' },
  { id: 'feedback', href: '/feedback', icon: HeartHandshake, label: 'Feedback' },
]

export default function RadialNav() {
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const containerRef = useRef<HTMLDivElement>(null)
  const { isInstallable, isStandalone, promptInstall } = usePWAContext()

  // Close on outside click or Escape
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

  // Don't render on landing or auth pages
  if (pathname === '/login' || pathname === '/') return null

  const handleNavigate = (href: string) => {
    setIsOpen(false)
    if (pathname !== href) {
      router.push(href)
    }
  }

  return (
    <div ref={containerRef} className="relative z-50 pointer-events-auto">
      {/* ── Minimalist Trigger Button ── */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.94 }}
        className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center border transition-all duration-200 shadow-sm ${
          isOpen
            ? 'bg-primary text-white border-primary shadow-md'
            : 'bg-surface-container/90 hover:bg-surface-container-highest dark:bg-[#1E1A22]/90 dark:hover:bg-[#28242E] border-outline-variant/30 text-on-surface'
        }`}
        aria-expanded={isOpen}
        aria-label="Navigation menu"
      >
        <motion.div
          animate={{ rotate: isOpen ? 90 : 0 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
        >
          {isOpen ? <X size={17} strokeWidth={2.4} /> : <Compass size={17} strokeWidth={2} className="text-primary" />}
        </motion.div>
      </motion.button>

      {/* ── Clean, Refined Minimal Flyout ── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.96 }}
            transition={{ duration: 0.14, ease: 'easeOut' }}
            className="absolute left-0 top-full mt-2 w-48 sm:w-52 bg-surface/95 dark:bg-[#1C1822]/95 backdrop-blur-xl rounded-2xl p-1.5 shadow-xl border border-outline-variant/25 z-50"
          >
            <div className="flex flex-col gap-0.5">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href || (item.href !== '/home' && pathname?.startsWith(item.href))

                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavigate(item.href)}
                    className={`flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-left text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-primary/12 dark:bg-primary/20 text-primary dark:text-plum-light font-semibold'
                        : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high dark:hover:bg-white/[0.06]'
                    }`}
                  >
                    <Icon size={15} strokeWidth={isActive ? 2.4 : 1.9} className="flex-shrink-0" />
                    <span className="flex-1 truncate">{item.label}</span>
                    {isActive && (
                      <span className="w-1.5 h-1.5 rounded-full bg-primary dark:bg-plum-light flex-shrink-0" />
                    )}
                  </button>
                )
              })}

              {/* Install PWA Option (minimal & subtle) */}
              {isInstallable && !isStandalone && (
                <>
                  <div className="my-1 border-t border-outline-variant/20" />
                  <button
                    onClick={() => {
                      setIsOpen(false)
                      promptInstall()
                    }}
                    className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-left text-xs font-semibold text-primary dark:text-plum-light hover:bg-primary/10 transition-colors"
                  >
                    <Download size={15} strokeWidth={2.2} className="flex-shrink-0" />
                    <span className="flex-1 truncate">Install App</span>
                  </button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
