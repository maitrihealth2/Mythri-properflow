'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { logout } from '@/core/api'
import { useAuth } from '@/shared/components/contexts/AuthContext'

interface SanctuaryNavRailProps {
  variant?: 'overlay' | 'adaptive'
  className?: string
}

export default function SanctuaryNavRail({
  variant = 'adaptive',
  className = '',
}: SanctuaryNavRailProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { clearAuth } = useAuth()

  const isHome = pathname === '/home' || pathname === '/'
  const isChat = pathname === '/text-chat'
  const isVoice = pathname === '/voice-chat' || pathname?.startsWith('/voice')
  const isExercises = pathname === '/exercises'
  const isHistory = pathname === '/history'
  const isProfile = pathname === '/profile'

  const handleLogout = async () => {
    try {
      await logout()
    } catch {
      // ignore network errors on logout
    } finally {
      clearAuth()
      if (typeof window !== 'undefined') {
        localStorage.clear()
        sessionStorage.removeItem('mb_session_id')
      }
      router.replace('/login')
    }
  }

  // Visual styling variants
  const isOverlay = variant === 'overlay'

  // Item base classes
  const getButtonClass = (isActive: boolean) => {
    if (isOverlay) {
      return isActive
        ? 'text-white p-2 sm:p-2.5 rounded-full bg-white/20 ring-1 ring-white/40 shadow-md relative focus:outline-none transition-all scale-105'
        : 'text-white/80 hover:text-white p-2 sm:p-2.5 rounded-full hover:bg-white/20 focus:outline-none transition-all active:scale-95'
    }

    // Adaptive theme (works smoothly across light oat / dark espresso modes)
    return isActive
      ? 'text-[#322119] dark:text-[#FAF6F0] p-2 sm:p-2.5 rounded-full bg-[#322119]/12 dark:bg-white/20 ring-1 ring-[#322119]/30 dark:ring-white/40 shadow-sm relative focus:outline-none transition-all scale-105'
      : 'text-[#756A62] dark:text-white/70 hover:text-[#322119] dark:hover:text-[#FAF6F0] p-2 sm:p-2.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 focus:outline-none transition-all active:scale-95'
  }

  const iconClass = isOverlay
    ? 'w-5 h-5 sm:w-6 sm:h-6 drop-shadow-md'
    : 'w-5 h-5 sm:w-6 sm:h-6'

  return (
    <aside
      aria-label="Sanctuary Navigation"
      className={`fixed left-2.5 sm:left-4 md:left-6 top-16 sm:top-20 md:top-24 z-40 flex flex-col items-center space-y-3 sm:space-y-4 select-none ${className}`}
    >
      {/* New Session Button */}
      <button
        onClick={() => router.push('/text-chat?new=true')}
        aria-label="New Session"
        title="Start New Session"
        type="button"
        className={
          isOverlay
            ? 'text-white/85 hover:text-white p-2 sm:p-2.5 rounded-full hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/40 active:scale-95 transition-all'
            : 'text-[#756A62] dark:text-white/75 hover:text-[#322119] dark:hover:text-[#FAF6F0] p-2 sm:p-2.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 focus:outline-none active:scale-95 transition-all'
        }
      >
        <svg
          className={`${iconClass} stroke-[2.2]`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M12 4.5v15m7.5-7.5h-15" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* Main Navigation Stack */}
      <nav className="flex flex-col items-center space-y-2 sm:space-y-3">
        {/* Home */}
        <Link
          href="/home"
          aria-current={isHome ? 'page' : undefined}
          aria-label="Sanctuary Home"
          title="Sanctuary Home"
          className={getButtonClass(isHome)}
        >
          <svg className={`${iconClass} fill-current`} viewBox="0 0 24 24">
            <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
          </svg>
        </Link>

        {/* Chat Consultation */}
        <Link
          href="/text-chat"
          aria-current={isChat ? 'page' : undefined}
          aria-label="Consultation"
          title="Chat Consultation"
          className={getButtonClass(isChat)}
        >
          <svg className={`${iconClass} fill-current`} viewBox="0 0 24 24">
            <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-6 9H8v-2h6v2zm3-4H7V5h10v2z" />
          </svg>
        </Link>

        {/* Voice Consultation */}
        <Link
          href="/voice-chat"
          aria-current={isVoice ? 'page' : undefined}
          aria-label="Voice Session"
          title="Voice Session"
          className={getButtonClass(isVoice)}
        >
          <svg
            className={`${iconClass} stroke-[2]`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Link>

        {/* Meditation / Mind Gym */}
        <Link
          href="/exercises"
          aria-current={isExercises ? 'page' : undefined}
          aria-label="Mind Gym"
          title="Mind Gym & Exercises"
          className={getButtonClass(isExercises)}
        >
          <svg className={`${iconClass} fill-current`} viewBox="0 0 24 24">
            <path d="M12 3c-.5 2-2 4.5-4 6 1.8.3 3.4.1 4-1.5.6 1.6 2.2 1.8 4 1.5-2-1.5-3.5-4-4-6zm-6 8c-2 0-4 1.5-4 4 2.5 0 5-1.5 6-3-0.7-.7-1.3-.9-2-1zm12 0c-.7.1-1.3.3-2 1 1 1.5 3.5 3 6 3 0-2.5-2-4-4-4zm-8.8 3.5C7.5 16 5 17 2 17c1.5 2 4.5 3 7.5 2 1-.5 1.5-1.5 1.7-2.5-.7-.4-1.4-1.2-2-2zm9.6 0c-.6.8-1.3 1.6-2 2 .2 1 .7 2 1.7 2.5 3 1 6 0 7.5-2-3 0-5.5-1-7.2-2.5zM12 11c-1.5 2-2.5 4.5-2 7.5 1.2.3 2.8.3 4 0 .5-3-.5-5.5-2-7.5z" />
          </svg>
        </Link>

        {/* Reflections / History */}
        <Link
          href="/history"
          aria-current={isHistory ? 'page' : undefined}
          aria-label="Past Reflections"
          title="Past Reflections"
          className={getButtonClass(isHistory)}
        >
          <svg
            className={`${iconClass} stroke-[2]`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              d="M16.5 3.75V16.5L12 14.25 7.5 16.5V3.75m9 0H7.5m9 0a2.25 2.25 0 012.25 2.25v14.25a.75.75 0 01-1.196.606L12 16.5l-5.554 4.106A.75.75 0 015.25 20.25V6a2.25 2.25 0 012.25-2.25h9z"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Link>

        {/* Profile */}
        <Link
          href="/profile"
          aria-current={isProfile ? 'page' : undefined}
          aria-label="Profile"
          title="Sanctuary Profile"
          className={getButtonClass(isProfile)}
        >
          <svg className={`${iconClass} fill-current`} viewBox="0 0 24 24">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
          </svg>
        </Link>

        {/* Subtle Divider */}
        <div
          className={
            isOverlay
              ? 'w-4 h-px bg-white/25 my-1'
              : 'w-4 h-px bg-[#E3D8CC]/80 dark:bg-white/15 my-1'
          }
        />

        {/* Sign Out / Logout */}
        <button
          onClick={handleLogout}
          aria-label="Sign Out"
          title="Sign Out"
          type="button"
          className={
            isOverlay
              ? 'text-white/60 hover:text-red-300 p-2 sm:p-2.5 rounded-full hover:bg-white/15 focus:outline-none transition-all active:scale-95'
              : 'text-[#756A62]/70 dark:text-white/50 hover:text-red-600 dark:hover:text-red-400 p-2 sm:p-2.5 rounded-full hover:bg-red-500/10 focus:outline-none transition-all active:scale-95'
          }
        >
          <svg
            className={`${iconClass} stroke-[2]`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </nav>
    </aside>
  )
}

