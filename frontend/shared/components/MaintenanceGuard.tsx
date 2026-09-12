'use client'

import React, { useEffect, useState, useMemo } from 'react'
import { usePathname } from 'next/navigation'
import { getMaintenanceStatus, MaintenanceStatus } from '@/core/api'

interface TimeLeft {
  days: number
  hours: number
  minutes: number
  seconds: number
  totalSeconds: number
}

export function MaintenanceGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [maintenance, setMaintenance] = useState<MaintenanceStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [now, setNow] = useState<number>(Date.now())

  // Always allow admin route to manage settings
  const isAdminRoute = pathname?.startsWith('/admin')

  const fetchStatus = async () => {
    try {
      const status = await getMaintenanceStatus()
      setMaintenance(status)
    } catch (err) {
      console.warn('[MaintenanceGuard] Could not fetch maintenance status', err)
    } finally {
      setLoading(false)
    }
  }

  // Initial fetch and periodic polling
  useEffect(() => {
    fetchStatus()
    const interval = setInterval(fetchStatus, 15000) // Poll every 15s
    return () => clearInterval(interval)
  }, [])

  // 1-second interval for smooth countdown calculation
  useEffect(() => {
    if (!maintenance?.enabled) return
    const timer = setInterval(() => {
      setNow(Date.now())
    }, 1000)
    return () => clearInterval(timer)
  }, [maintenance?.enabled])

  // Calculate remaining time
  const timeLeft: TimeLeft = useMemo(() => {
    if (!maintenance?.enabled || !maintenance.ends_at) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0, totalSeconds: 0 }
    }

    const endTime = new Date(maintenance.ends_at).getTime()
    const diff = Math.max(0, Math.floor((endTime - now) / 1000))

    const days = Math.floor(diff / (24 * 3600))
    const hours = Math.floor((diff % (24 * 3600)) / 3600)
    const minutes = Math.floor((diff % 3600) / 60)
    const seconds = diff % 60

    return { days, hours, minutes, seconds, totalSeconds: diff }
  }, [maintenance, now])

  // If timer ended while viewing, refresh status immediately
  useEffect(() => {
    if (maintenance?.enabled && maintenance.ends_at && timeLeft.totalSeconds <= 0 && !loading) {
      fetchStatus()
    }
  }, [timeLeft.totalSeconds, maintenance?.enabled, maintenance?.ends_at, loading])

  // If on admin route, allow access to admin panel
  if (isAdminRoute) {
    return <>{children}</>
  }

  // If maintenance is enabled and active, lock EVERY non-admin route completely
  if (maintenance?.enabled && (!maintenance.ends_at || timeLeft.totalSeconds > 0)) {
    return (
      <div className="min-h-screen w-full bg-[#fbf9f8] text-[#1e1a20] flex flex-col justify-between items-center px-4 py-8 relative overflow-hidden selection:bg-[#7d5260] selection:text-white font-body-md select-none">
        {/* Background ambient lighting */}
        <div className="fixed top-[-15%] left-[-10%] w-[60vw] h-[60vw] rounded-full bg-[#ffd8e4]/30 blur-3xl pointer-events-none -z-10 animate-pulse" style={{ animationDuration: '6s' }} />
        <div className="fixed bottom-[-15%] right-[-10%] w-[65vw] h-[65vw] rounded-full bg-[#e8def8]/40 blur-3xl pointer-events-none -z-10 animate-pulse" style={{ animationDuration: '8s' }} />

        {/* Top Header / Brand */}
        <header className="w-full max-w-4xl flex items-center justify-between z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#7d5260] to-[#986878] flex items-center justify-center text-white font-bold shadow-md shadow-[#7d5260]/20">
              M
            </div>
            <span className="font-headline-lg text-xl tracking-tight text-[#31111d] font-serif">
              Mythri
            </span>
          </div>

          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-700 text-xs font-semibold tracking-wide">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping inline-block" />
            <span>Scheduled Maintenance</span>
          </div>
        </header>

        {/* Main Content Area - Pure Clock */}
        <main className="w-full max-w-2xl my-auto py-12 flex flex-col items-center text-center z-10">
          {/* Animated Lock Badge */}
          <div className="relative mb-8">
            <div className="absolute inset-0 rounded-3xl bg-[#7d5260]/15 blur-xl pointer-events-none" />
            <div className="relative w-24 h-24 rounded-3xl bg-white/80 backdrop-blur-md border border-[#eaddff] shadow-xl flex items-center justify-center text-[#7d5260]">
              <span className="material-symbols-outlined text-4xl" style={{ fontVariationSettings: "'FILL' 1, 'wght' 300" }}>
                lock_clock
              </span>
            </div>
          </div>

          <h1 className="font-headline-lg text-3xl sm:text-4xl md:text-5xl font-serif text-[#31111d] tracking-tight mb-4 leading-tight">
            We are tending to the sanctuary
          </h1>

          <p className="text-base sm:text-lg text-[#514347] max-w-lg mb-10 leading-relaxed font-normal">
            {maintenance.message || "We're making updates to ensure your space for reflection and healing is the best it can be. We'll be back shortly."}
          </p>

          {/* Pure Countdown Display */}
          {maintenance.ends_at && timeLeft.totalSeconds > 0 ? (
            <div className="w-full max-w-md bg-white/70 backdrop-blur-md rounded-3xl p-6 border border-[#eaddff] shadow-lg shadow-[#7d5260]/5 mb-4">
              <p className="text-xs uppercase tracking-widest text-[#7d5260] font-bold mb-4">
                Estimated Time Remaining
              </p>
              
              <div className="grid grid-cols-4 gap-2 sm:gap-3">
                {/* Days */}
                <div className="flex flex-col items-center p-3 bg-[#f7f2fa] rounded-2xl border border-[#ece6f0]">
                  <span className="font-serif text-2xl sm:text-3xl font-bold text-[#31111d]">
                    {String(timeLeft.days).padStart(2, '0')}
                  </span>
                  <span className="text-[11px] font-medium text-[#7d5260] uppercase mt-1">
                    Days
                  </span>
                </div>

                {/* Hours */}
                <div className="flex flex-col items-center p-3 bg-[#f7f2fa] rounded-2xl border border-[#ece6f0]">
                  <span className="font-serif text-2xl sm:text-3xl font-bold text-[#31111d]">
                    {String(timeLeft.hours).padStart(2, '0')}
                  </span>
                  <span className="text-[11px] font-medium text-[#7d5260] uppercase mt-1">
                    Hours
                  </span>
                </div>

                {/* Minutes */}
                <div className="flex flex-col items-center p-3 bg-[#f7f2fa] rounded-2xl border border-[#ece6f0]">
                  <span className="font-serif text-2xl sm:text-3xl font-bold text-[#31111d]">
                    {String(timeLeft.minutes).padStart(2, '0')}
                  </span>
                  <span className="text-[11px] font-medium text-[#7d5260] uppercase mt-1">
                    Mins
                  </span>
                </div>

                {/* Seconds */}
                <div className="flex flex-col items-center p-3 bg-[#7d5260] text-white rounded-2xl shadow-sm">
                  <span className="font-serif text-2xl sm:text-3xl font-bold">
                    {String(timeLeft.seconds).padStart(2, '0')}
                  </span>
                  <span className="text-[11px] font-medium text-[#ffd8e4] uppercase mt-1">
                    Secs
                  </span>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-center gap-2 text-xs text-[#79747e]">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                <span>The website will automatically reopen when the timer completes</span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-[#7d5260] bg-white/60 px-5 py-2.5 rounded-full border border-[#eaddff] shadow-sm mb-4">
              <span className="material-symbols-outlined text-base animate-spin">refresh</span>
              <span>Maintenance in progress. We will be back shortly.</span>
            </div>
          )}
        </main>

        {/* Footer (Clean copyright only, no links) */}
        <footer className="w-full max-w-4xl flex items-center justify-center text-xs text-[#79747e] border-t border-[#cac4d0]/30 pt-6 z-10">
          <p>© {new Date().getFullYear()} Affyne Labs. All rights reserved.</p>
        </footer>
      </div>
    )
  }

  return <>{children}</>
}
