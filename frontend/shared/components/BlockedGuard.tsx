'use client'

import React, { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { getMe, logout } from '@/core/api'

export function BlockedGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [isBlocked, setIsBlocked] = useState<boolean>(false)
  const [blockedMessage, setBlockedMessage] = useState<string>('You are not allowed to access right now')
  const [isLoggingOut, setIsLoggingOut] = useState<boolean>(false)

  // Allow admin routes always
  const isAdminRoute = pathname?.startsWith('/admin')

  useEffect(() => {
    // Check local flag
    if (typeof window !== 'undefined') {
      if (localStorage.getItem('mb_user_blocked') === 'true') {
        setIsBlocked(true)
      }
    }

    // Listen for custom block event from API interceptors
    const handleBlockedEvent = (e: any) => {
      const msg = e?.detail || 'You are not allowed to access right now'
      setBlockedMessage(msg)
      setIsBlocked(true)
    }

    window.addEventListener('mythri:user_blocked', handleBlockedEvent)

    // Check backend status if user is logged in
    const token = typeof window !== 'undefined' ? localStorage.getItem('mb_token') : null
    if (token && !isAdminRoute) {
      getMe()
        .then((user) => {
          if (user && user.is_active === false) {
            setIsBlocked(true)
            localStorage.setItem('mb_user_blocked', 'true')
          } else {
            // User is active, ensure block flag is removed
            localStorage.removeItem('mb_user_blocked')
            setIsBlocked(false)
          }
        })
        .catch((err) => {
          if (err?.response?.status === 403) {
            const detail = err.response.data?.detail
            if (typeof detail === 'string' && detail.toLowerCase().includes('not allowed to access')) {
              setBlockedMessage(detail)
              setIsBlocked(true)
              localStorage.setItem('mb_user_blocked', 'true')
            }
          }
        })
    }

    return () => {
      window.removeEventListener('mythri:user_blocked', handleBlockedEvent)
    }
  }, [pathname, isAdminRoute])

  const handleSignOut = async () => {
    setIsLoggingOut(true)
    try {
      localStorage.removeItem('mb_user_blocked')
      await logout()
    } catch {
      localStorage.clear()
      sessionStorage.clear()
      window.location.href = '/login'
    }
  }

  if (isAdminRoute) {
    return <>{children}</>
  }

  if (isBlocked) {
    return (
      <div className="min-h-screen w-full bg-[#fcf8f6] dark:bg-[#141218] text-[#1e1a20] dark:text-[#e6e1e5] flex flex-col justify-between items-center px-4 py-8 relative overflow-hidden font-body-md select-none">
        {/* Background ambient glow */}
        <div
          className="fixed top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-rose-200/40 dark:bg-rose-950/20 blur-3xl pointer-events-none -z-10 animate-pulse"
          style={{ animationDuration: '7s' }}
        />
        <div
          className="fixed bottom-[-10%] right-[-10%] w-[55vw] h-[55vw] rounded-full bg-amber-200/30 dark:bg-amber-950/20 blur-3xl pointer-events-none -z-10 animate-pulse"
          style={{ animationDuration: '9s' }}
        />

        {/* Top Header */}
        <header className="w-full max-w-3xl flex items-center justify-between z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#7d5260] to-[#986878] flex items-center justify-center text-white font-bold shadow-md shadow-[#7d5260]/20">
              M
            </div>
            <span className="font-headline-lg text-xl tracking-tight text-[#31111d] dark:text-[#f2dae2] font-serif">
              Mythri
            </span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
            <span>Access Blocked</span>
          </div>
        </header>

        {/* Center Card */}
        <main className="w-full max-w-lg my-auto py-8 flex flex-col items-center text-center z-10">
          {/* Icon Badge */}
          <div className="relative mb-6">
            <div className="absolute inset-0 rounded-3xl bg-rose-500/20 blur-xl pointer-events-none" />
            <div className="relative w-20 h-20 rounded-3xl bg-white/90 dark:bg-[#201a24] border border-rose-200 dark:border-rose-900/50 shadow-xl flex items-center justify-center text-rose-600 dark:text-rose-400">
              <span className="material-symbols-outlined text-4xl" style={{ fontVariationSettings: "'FILL' 1, 'wght' 400" }}>
                lock_person
              </span>
            </div>
          </div>

          {/* Heading */}
          <h1 className="font-headline-lg text-2xl sm:text-3xl font-serif text-[#31111d] dark:text-[#ffd8e4] tracking-tight mb-3">
            Access Restricted
          </h1>

          {/* Prominent Warning Pill */}
          <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-800 dark:text-rose-200 px-5 py-2.5 rounded-2xl font-medium text-sm sm:text-base mb-4 shadow-sm">
            {blockedMessage}
          </div>

          <p className="text-on-surface-variant dark:text-stone-400 font-body-md text-sm sm:text-base leading-relaxed max-w-md mb-8">
            Your account has been restricted by an administrator. You will not be able to interact with the sanctuary while this restriction is active.
          </p>

          <button
            onClick={handleSignOut}
            disabled={isLoggingOut}
            className="px-6 py-3 rounded-full bg-[#7d5260] hover:bg-[#653f4c] active:scale-95 text-white font-medium text-sm shadow-md transition-all flex items-center gap-2 cursor-pointer"
          >
            {isLoggingOut ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Signing out...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-base">logout</span>
                <span>Log Out</span>
              </>
            )}
          </button>
        </main>

        {/* Footer */}
        <footer className="w-full max-w-3xl flex justify-center text-xs text-on-surface-variant/60 dark:text-stone-500 py-2 z-10">
          Mythri Sanctuary &bull; Affyne Labs
        </footer>
      </div>
    )
  }

  return <>{children}</>
}
