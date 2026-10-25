'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/shared/components/contexts/AuthContext'
import { logout } from '@/core/api'
import ThemeToggle from '@/shared/components/ThemeToggle'

export default function WaitlistPage() {
  const router = useRouter()
  const { user, refreshUser } = useAuth()
  const [checking, setChecking] = useState(false)
  const [checkStatusMessage, setCheckStatusMessage] = useState<string | null>(null)
  const [isApprovedNow, setIsApprovedNow] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  const ticketNumber = user?.waitlist_number || 1
  const displayName = user?.preferred_name || user?.username || 'Friend'

  const handleCheckStatus = async () => {
    setChecking(true)
    setCheckStatusMessage(null)

    try {
      const updatedUser = await refreshUser()
      if (updatedUser && (updatedUser.waitlist_status === 'approved' || !updatedUser.waitlist_status)) {
        setIsApprovedNow(true)
        setCheckStatusMessage('Your sanctuary access has been approved! Redirecting you now…')
        setTimeout(() => {
          router.replace('/home')
        }, 1200)
      } else {
        setCheckStatusMessage(`Your spot (#${updatedUser?.waitlist_number || ticketNumber}) is active in queue. Thank you for your patience!`)
      }
    } catch {
      setCheckStatusMessage('Unable to verify right now. Please check your internet connection.')
    } finally {
      setChecking(false)
    }
  }

  const handleLogout = async () => {
    setLoggingOut(true)
    try {
      await logout()
    } catch {
      window.location.href = '/login'
    }
  }

  return (
    <div className="min-h-screen w-full bg-[#fcf8f6] dark:bg-[#141218] text-[#1e1a20] dark:text-[#e6e1e5] flex flex-col justify-between px-4 sm:px-6 py-6 sm:py-8 relative overflow-hidden font-body-md select-none transition-colors duration-300">
      {/* Background ambient orbs */}
      <div
        className="fixed top-[-10%] left-[-10%] w-[55vw] h-[55vw] rounded-full bg-rose-200/40 dark:bg-rose-950/20 blur-3xl pointer-events-none -z-10 animate-pulse"
        style={{ animationDuration: '8s' }}
      />
      <div
        className="fixed bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-amber-200/30 dark:bg-amber-950/20 blur-3xl pointer-events-none -z-10 animate-pulse"
        style={{ animationDuration: '10s' }}
      />

      {/* ── Top Header ──────────────────────────────────────────────────────── */}
      <header className="w-full max-w-5xl mx-auto flex items-center justify-between z-10 py-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#7d5260] to-[#986878] flex items-center justify-center text-white font-bold text-lg shadow-md shadow-[#7d5260]/20">
            M
          </div>
          <div>
            <span className="font-headline-lg text-xl sm:text-2xl tracking-tight text-[#31111d] dark:text-[#f2dae2] font-serif">
              Mythri
            </span>
            <span className="hidden sm:inline-block ml-2 text-xs font-medium text-on-surface-variant/70 uppercase tracking-widest">
              Sanctuary
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-amber-500 inline-block animate-ping" />
            <span>Waiting List Cohort</span>
          </div>

          <ThemeToggle />

          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="px-3.5 py-1.5 rounded-full border border-outline-variant/40 hover:bg-surface-variant text-on-surface-variant hover:text-on-surface text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer"
            title="Sign out from this account"
          >
            {loggingOut ? (
              <span className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            ) : (
              <span className="material-symbols-outlined text-sm">logout</span>
            )}
            <span className="hidden sm:inline">Log Out</span>
          </button>
        </div>
      </header>

      {/* ── Main Content Container ─────────────────────────────────────────── */}
      <main className="w-full max-w-4xl mx-auto my-auto py-8 sm:py-12 flex flex-col items-center z-10 gap-10">
        
        {/* Ticket & Greeting Card */}
        <div className="w-full max-w-2xl bg-white/80 dark:bg-[#1f1b24]/90 backdrop-blur-xl border border-rose-200/60 dark:border-rose-900/40 rounded-3xl p-6 sm:p-10 shadow-2xl shadow-rose-950/5 flex flex-col items-center text-center relative overflow-hidden">
          {/* Decorative aura ribbon */}
          <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-amber-400 via-rose-400 to-[#7d5260]" />

          {/* Golden Queue Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-500/10 to-rose-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-200 text-xs font-bold uppercase tracking-wider mb-6">
            <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
              confirmation_number
            </span>
            <span>Early Access Ticket</span>
          </div>

          {/* Big Number Badge */}
          <div className="relative mb-6">
            <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl bg-gradient-to-tr from-[#7d5260] via-[#8f5d6f] to-[#b17d8f] text-white flex flex-col items-center justify-center shadow-xl shadow-[#7d5260]/25 border-4 border-white dark:border-[#2b2432]">
              <span className="text-xs uppercase tracking-widest opacity-80 font-mono font-medium">Queue</span>
              <span className="font-serif text-4xl sm:text-5xl font-bold tracking-tight">#{ticketNumber}</span>
              <span className="text-[10px] uppercase tracking-wider opacity-70">In Line</span>
            </div>
          </div>

          {/* Warm Empathic Greeting */}
          <h1 className="font-serif text-2xl sm:text-3xl text-[#31111d] dark:text-[#ffd8e4] tracking-tight font-bold mb-3">
            Welcome, {displayName}. Your sanctuary is reserved.
          </h1>

          <p className="text-on-surface-variant dark:text-stone-300 text-sm sm:text-base leading-relaxed max-w-lg mb-6">
            To ensure every member experiences compassionate, unhurried, and deeply private AI companion support, we are onboarding members in small intimate cohorts.
          </p>

          {/* Live Status Pill */}
          <div className="flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 text-xs sm:text-sm font-medium mb-6">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
            <span>Cohort Status: <strong>Under Clinical & Administrator Review</strong></span>
          </div>

          {/* Check Status Action */}
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            <button
              onClick={handleCheckStatus}
              disabled={checking || isApprovedNow}
              className={`w-full sm:w-auto px-7 py-3.5 rounded-full font-semibold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer ${
                isApprovedNow
                  ? 'bg-emerald-600 text-white'
                  : 'bg-[#7d5260] hover:bg-[#653f4c] active:scale-95 text-white shadow-[#7d5260]/20'
              }`}
            >
              {checking ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Checking Status…</span>
                </>
              ) : isApprovedNow ? (
                <>
                  <span className="material-symbols-outlined text-base">check_circle</span>
                  <span>Approved! Entering Sanctuary…</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-base">refresh</span>
                  <span>Check Approval Status</span>
                </>
              )}
            </button>
          </div>

          {/* Live Status Message Feedback */}
          {checkStatusMessage && (
            <div className={`mt-4 px-4 py-2.5 rounded-xl text-xs sm:text-sm max-w-md transition-all ${
              isApprovedNow
                ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 border border-emerald-300'
                : 'bg-stone-100 dark:bg-stone-800/60 text-on-surface-variant border border-outline-variant/30'
            }`}>
              {checkStatusMessage}
            </div>
          )}

          {/* Steps Progress */}
          <div className="w-full max-w-md mt-8 pt-6 border-t border-outline-variant/30 grid grid-cols-3 gap-2 text-center text-xs">
            <div className="flex flex-col items-center gap-1.5">
              <div className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-bold">
                ✓
              </div>
              <span className="font-semibold text-on-surface">Account Created</span>
            </div>

            <div className="flex flex-col items-center gap-1.5">
              <div className="w-7 h-7 rounded-full bg-amber-500 text-white flex items-center justify-center text-xs font-bold animate-pulse">
                2
              </div>
              <span className="font-semibold text-amber-700 dark:text-amber-300">Queue Ticket #{ticketNumber}</span>
            </div>

            <div className="flex flex-col items-center gap-1.5 opacity-60">
              <div className="w-7 h-7 rounded-full bg-stone-300 dark:bg-stone-700 text-stone-600 dark:text-stone-300 flex items-center justify-center text-xs font-bold">
                3
              </div>
              <span className="font-medium text-on-surface-variant">Sanctuary Access</span>
            </div>
          </div>
        </div>

        {/* ── Feature Showcase Section ───────────────────────────────────────── */}
        <section className="w-full">
          <div className="text-center mb-6">
            <p className="text-xs uppercase tracking-widest text-[#7d5260] dark:text-rose-300 font-semibold mb-1">
              Preview What Awaits You
            </p>
            <h2 className="font-serif text-xl sm:text-2xl text-[#31111d] dark:text-[#ffd8e4] font-semibold">
              Inside the Mythri Sanctuary
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1 */}
            <div className="p-5 rounded-2xl bg-white/70 dark:bg-[#1d1922]/70 border border-outline-variant/30 backdrop-blur-md shadow-sm hover:shadow-md transition-shadow">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center text-xl mb-3">
                🎙️
              </div>
              <h3 className="font-serif font-bold text-base text-on-surface mb-1.5">
                Empathetic Voice Companion
              </h3>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Adaptive spoken dialogue with deep emotional resonance, natural Indian prosody, and supportive pacing.
              </p>
            </div>

            {/* Card 2 */}
            <div className="p-5 rounded-2xl bg-white/70 dark:bg-[#1d1922]/70 border border-outline-variant/30 backdrop-blur-md shadow-sm hover:shadow-md transition-shadow">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xl mb-3">
                🌿
              </div>
              <h3 className="font-serif font-bold text-base text-on-surface mb-1.5">
                Private Mind Sanctuary
              </h3>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                A judgment-free space to reflect, untangle feelings, and track emotional patterns over time.
              </p>
            </div>

            {/* Card 3 */}
            <div className="p-5 rounded-2xl bg-white/70 dark:bg-[#1d1922]/70 border border-outline-variant/30 backdrop-blur-md shadow-sm hover:shadow-md transition-shadow">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center text-xl mb-3">
                🧘
              </div>
              <h3 className="font-serif font-bold text-base text-on-surface mb-1.5">
                Somatic Grounding Tools
              </h3>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Instant physiological sighs, vagus nerve calmers, and body-scan breathing for high-stress moments.
              </p>
            </div>

            {/* Card 4 */}
            <div className="p-5 rounded-2xl bg-white/70 dark:bg-[#1d1922]/70 border border-outline-variant/30 backdrop-blur-md shadow-sm hover:shadow-md transition-shadow">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center text-xl mb-3">
                🔒
              </div>
              <h3 className="font-serif font-bold text-base text-on-surface mb-1.5">
                Zero-Knowledge Privacy
              </h3>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                End-to-end confidential sessions. No advertising profiling, no selling data, and strict therapeutic ethics.
              </p>
            </div>
          </div>
        </section>

        {/* ── Urgent Help Note ──────────────────────────────────────────────── */}
        <div className="w-full max-w-xl p-4 rounded-2xl bg-stone-100/70 dark:bg-stone-900/40 border border-outline-variant/20 text-center">
          <p className="text-xs text-on-surface-variant leading-relaxed">
            If you are going through an immediate emotional crisis, please connect directly with the national 24/7 helpline at <strong>Tele-MANAS (14416)</strong> or <strong>KIRAN (1800-599-0019)</strong>.
          </p>
        </div>

      </main>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer className="w-full max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between text-xs text-on-surface-variant/60 py-4 border-t border-outline-variant/20 z-10 gap-2">
        <span>Mythri Sanctuary &bull; Built with compassion by Affyne Labs</span>
        <span>Account #{user?.id || '—'} &bull; Registered as {user?.email || 'Guest'}</span>
      </footer>
    </div>
  )
}
