'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getProfile, logout } from '@/core/api'
import { useAuth } from '@/shared/components/contexts/AuthContext'
import SanctuaryNavRail from '@/shared/components/SanctuaryNavRail'

export default function DashboardPage() {
  const router = useRouter()
  const { token, user, loading: authLoading, clearAuth } = useAuth()
  const [username, setUsername] = useState('Friend')
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const [greeting, setGreeting] = useState('Good evening')

  useEffect(() => {
    if (authLoading) return
    if (!token) {
      router.replace('/login')
      return
    }

    // Set custom username from auth user, local storage or profile
    if (user?.preferred_name) {
      setUsername(user.preferred_name)
      localStorage.setItem('mb_username', user.preferred_name)
    } else if (user?.username) {
      setUsername(user.username)
      localStorage.setItem('mb_username', user.username)
    } else {
      const storedName = localStorage.getItem('mb_username')
      if (storedName) setUsername(storedName)
    }

    // Fallback profile check for preferred_name
    getProfile()
      .then((p) => {
        if (p?.preferred_name) {
          setUsername(p.preferred_name)
          localStorage.setItem('mb_username', p.preferred_name)
        } else if (p?.username && !user?.preferred_name) {
          setUsername(p.username)
        }
      })
      .catch(() => {})

    // Determine greeting from current hour
    const hour = new Date().getHours()
    if (hour < 12) setGreeting('Good morning')
    else if (hour < 18) setGreeting('Good afternoon')
    else setGreeting('Good evening')
  }, [router, authLoading, token, user])

  return (
    <>
      <style suppressHydrationWarning dangerouslySetInnerHTML={{ __html: `
        .sanctuary-glass-card {
          background: rgba(251, 248, 242, 0.32);
          backdrop-filter: blur(18px) saturate(140%);
          -webkit-backdrop-filter: blur(18px);
          border: 1px solid rgba(255, 255, 255, 0.48);
          box-shadow: 0 20px 35px -10px rgba(40, 25, 18, 0.25), inset 0 1px 1px 0 rgba(255, 255, 255, 0.55);
        }
        
        /* Mobile greeting text shadow for sunset sky legibility */
        .sanctuary-mobile-glow {
          text-shadow: 0 2px 14px rgba(0, 0, 0, 0.55), 0 4px 24px rgba(0, 0, 0, 0.35);
        }

        .sanctuary-subtle-glow {
          text-shadow: 0 1px 6px rgba(0, 0, 0, 0.4);
        }

        /* Natural, dignified wall typography for desktop - embedded in plaster */
        .sanctuary-wall-typography {
          text-shadow: 0 2px 10px rgba(35, 20, 10, 0.45), 0 6px 22px rgba(25, 12, 6, 0.28);
          letter-spacing: -0.015em;
        }

        .sanctuary-wall-subtitle {
          text-shadow: 0 1px 6px rgba(35, 20, 10, 0.4);
        }
      `}} />

      {/* Main Full-Bleed Sanctuary Container */}
      <div className="relative w-full h-[100dvh] overflow-hidden select-none flex flex-col justify-between font-sans antialiased bg-[#2A1D18]">
        
        {/* Background Image: Responsive Switch */}
        {/* Mobile: sanctuary-mobile.png | Desktop (md+): sanctuary-desktop.png */}
        <div 
          className="absolute inset-0 bg-cover bg-no-repeat pointer-events-none z-0 bg-center bg-[url('/assets/sanctuary/sanctuary-mobile.png')] md:bg-[url('/assets/sanctuary/sanctuary-desktop.png')] md:bg-[center_55%]"
          aria-hidden="true"
        />

        {/* Ambient Warmth & Contrast Overlay */}
        <div 
          className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-b from-black/35 via-transparent to-black/40 md:bg-gradient-to-r md:from-black/30 md:via-transparent md:to-transparent"
          aria-hidden="true" 
        />

        {/* ========================================================================= */}
        {/* TOP BAR                                                                   */}
        {/* ========================================================================= */}
        <header className="relative z-30 flex items-center justify-between w-full px-5 pt-6 sm:px-8 sm:pt-7">
          {/* Brand Logo & Name */}
          <Link href="/home" className="flex items-center space-x-3 group">
            {/* Brand Sparkle Icon */}
            <div className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center text-[#f0e8de]/95 group-hover:scale-105 transition-transform duration-200">
              <svg className="w-7 h-7 sm:w-8 sm:h-8 drop-shadow-md" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0L14.2 9.8L24 12L14.2 14.2L12 24L9.8 14.2L0 12L9.8 9.8L12 0Z" />
              </svg>
            </div>
            <span className="font-serif text-[1.6rem] sm:text-[1.75rem] tracking-wide text-[#f4eee6] font-normal drop-shadow-md">
              Mythri
            </span>
          </Link>

          {/* User Profile Avatar Top Right */}
          <div className="relative flex items-center gap-3">
            <button
              onClick={() => setProfileMenuOpen(!profileMenuOpen)}
              aria-label="User profile settings"
              className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-full ring-2 ring-white/70 hover:ring-white transition-all shadow-lg overflow-hidden focus:outline-none focus:ring-amber-200 active:scale-95 flex items-center justify-center bg-[#baa696]"
              type="button"
            >
              <span className="font-serif text-white font-semibold text-base sm:text-lg uppercase">
                {username ? username.charAt(0) : 'M'}
              </span>
            </button>

            {/* Profile Dropdown Menu */}
            {profileMenuOpen && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setProfileMenuOpen(false)} 
                />
                <nav 
                  className="absolute right-0 top-14 z-50 w-64 rounded-3xl p-3 flex flex-col gap-1 sanctuary-glass-card border border-white/60 shadow-2xl backdrop-blur-2xl animate-fade-in-up origin-top-right text-[#2C2724]"
                >
                  <div className="px-3.5 py-2.5 border-b border-white/20 mb-1">
                    <p className="text-xs uppercase tracking-wider text-stone-600 font-medium">Logged in as</p>
                    <p className="font-serif text-base font-semibold text-stone-900 truncate">{username}</p>
                  </div>

                  <Link
                    href="/home"
                    onClick={() => setProfileMenuOpen(false)}
                    className="flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-sm font-medium text-stone-900 bg-white/40 hover:bg-white/60 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[20px]">home</span>
                    Sanctuary Home
                  </Link>

                  <Link
                    href="/profile"
                    onClick={() => setProfileMenuOpen(false)}
                    className="flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-sm font-medium text-stone-800 hover:bg-white/40 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[20px]">person</span>
                    Profile & Settings
                  </Link>

                  <Link
                    href="/history"
                    onClick={() => setProfileMenuOpen(false)}
                    className="flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-sm font-medium text-stone-800 hover:bg-white/40 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[20px]">history</span>
                    Your Sessions
                  </Link>

                  <Link
                    href="/feedback"
                    onClick={() => setProfileMenuOpen(false)}
                    className="flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-sm font-medium text-stone-800 hover:bg-white/40 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[20px]">feedback</span>
                    Feedback
                  </Link>

                  <div className="h-px bg-white/20 my-1"></div>

                  <button
                    onClick={async () => {
                      setProfileMenuOpen(false)
                      try {
                        await logout()
                      } catch {
                        // ignore API logout failure
                      }
                      clearAuth()
                      localStorage.clear()
                      sessionStorage.removeItem('mb_session_id')
                      router.replace('/login')
                    }}
                    className="flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-sm font-medium text-red-700 hover:bg-red-500/10 transition-colors text-left w-full"
                  >
                    <span className="material-symbols-outlined text-[20px]">logout</span>
                    Sign Out
                  </button>
                </nav>
              </>
            )}
          </div>
        </header>

        {/* ========================================================================= */}
        {/* LEFT FLOATING NAVIGATION RAIL                                             */}
        {/* ========================================================================= */}
        <SanctuaryNavRail variant="overlay" />

        {/* ========================================================================= */}
        {/* CENTER / GREETING SECTION                                                 */}
        {/* Desktop: EXACTLY INSIDE THE USER'S CIRCLE ON THE LEFT WALL (19% to 50%)   */}
        {/* Mobile: Centered headline in the sky above the sphere                     */}
        {/* ========================================================================= */}
        <main className="relative z-20 flex-1 flex flex-col justify-center px-6 select-text">
          
          {/* Mobile Layout: Placed in the upper sky above the sphere */}
          <div className="md:hidden w-full max-w-lg text-center mx-auto -translate-y-4">
            <h1 
              className="font-serif text-3xl xs:text-4xl sm:text-5xl font-medium leading-[1.18] tracking-tight text-[#FAF6F0] sanctuary-mobile-glow"
              suppressHydrationWarning
            >
              {greeting}, {username}.
            </h1>
            <p 
              className="mt-3 font-serif text-base sm:text-lg font-normal leading-relaxed text-[#F4ECE1] sanctuary-subtle-glow"
              suppressHydrationWarning
            >
              You're not alone here.
            </p>
          </div>

          {/* Desktop Layout: EXACTLY positioned inside the marked wall circle */}
          {/* Confined strictly between the left column (x >= 20%) and the archway (x <= 49%) */}
          <div className="hidden md:block absolute left-[21%] lg:left-[22%] xl:left-[23%] top-[25%] lg:top-[28%] xl:top-[30%] w-[27vw] max-w-[430px] xl:max-w-[460px] text-left">
            <h1 
              className="font-serif text-3xl md:text-[2.25rem] lg:text-[2.65rem] xl:text-[3rem] font-medium leading-[1.18] text-[#FAF6F0] sanctuary-wall-typography"
              suppressHydrationWarning
            >
              {greeting}, {username}.
            </h1>
            <p 
              className="mt-3.5 font-serif text-sm md:text-base lg:text-[1.05rem] font-normal leading-relaxed text-[#F2EAE0] sanctuary-wall-subtitle max-w-[360px]"
              suppressHydrationWarning
            >
              Step into a calmer space. Take your time here.
            </p>
          </div>
        </main>

        {/* ========================================================================= */}
        {/* BOTTOM COMPANION CARD (Floating Glass Sanctuary Card)                     */}
        {/* ========================================================================= */}
        <footer className="relative z-30 px-5 pb-7 sm:px-10 sm:pb-11 flex justify-center sm:justify-start">
          <section 
            aria-label="Conversational Prompt Card"
            className="sanctuary-glass-card rounded-[26px] p-5 sm:p-6 w-full max-w-[360px] text-[#3b271e] transition-all duration-300 hover:shadow-2xl"
          >
            {/* Companion Identifier Header */}
            <div className="flex items-center space-x-2.5 mb-2.5">
              {/* Sparkle Emblem badge with liquid glass touch */}
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/35 backdrop-blur-md border border-white/60 flex items-center justify-center text-white shadow-sm">
                <svg className="w-4 h-4 sm:w-4.5 sm:h-4.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0L14.2 9.8L24 12L14.2 14.2L12 24L9.8 14.2L0 12L9.8 9.8L12 0Z" />
                </svg>
              </div>
              <span className="font-sans font-semibold text-[1rem] tracking-tight text-white sanctuary-subtle-glow">
                Mythri
              </span>
            </div>

            {/* Empathetic invitation copy */}
            <p className="font-sans text-[0.885rem] leading-[1.48] text-white/95 font-normal mb-5 pl-0.5 sanctuary-subtle-glow">
              I'm here with you. Whenever you're ready, we can talk about what's on your mind.
            </p>

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              {/* Primary Action Button: Text Conversation */}
              <button
                onClick={() => router.push('/text-chat')}
                className="flex-1 flex items-center justify-center space-x-2 py-3 px-5 rounded-full bg-[#271a13] hover:bg-[#1a110c] text-[#fbf8f2] text-[0.86rem] font-medium tracking-wide shadow-md active:scale-[0.98] transition-all duration-200 border border-white/10 group focus:outline-none focus:ring-2 focus:ring-amber-200"
                type="button"
              >
                <span>Start a conversation</span>
                <svg 
                  className="w-4 h-4 stroke-[2.2] transition-transform duration-200 group-hover:translate-x-1" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>

              {/* Voice Chat Quick Action */}
              <button
                onClick={() => router.push('/voice-chat')}
                title="Speak with Mythri (Voice)"
                aria-label="Voice conversation"
                className="w-12 h-12 sm:w-13 sm:h-13 flex-shrink-0 flex items-center justify-center rounded-full bg-white/25 hover:bg-white/35 backdrop-blur-md border border-white/50 text-white transition-all duration-200 active:scale-95 shadow-md focus:outline-none focus:ring-2 focus:ring-amber-200"
                type="button"
              >
                <span className="material-symbols-outlined text-[24px]">mic</span>
              </button>
            </div>
          </section>
        </footer>

      </div>
    </>
  )
}
