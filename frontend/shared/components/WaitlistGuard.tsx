'use client'

import React, { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/shared/components/contexts/AuthContext'

export function WaitlistGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, token, loading } = useAuth()

  const isAdminRoute = pathname?.startsWith('/admin')
  const isLoginRoute = pathname === '/login' || pathname === '/' || pathname === '/landing'
  const isWaitlistRoute = pathname === '/waitlist'

  // Only derive status once user is loaded — avoids acting on stale null
  const isWaitlisted = !loading && token && user && user.waitlist_status === 'waitlisted'
  const isApproved = !loading && token && user && (user.waitlist_status === 'approved' || !user.waitlist_status)

  useEffect(() => {
    // Never act until session restore + /me fetch are both complete
    if (loading || !token || !user) return

    // Waitlisted user trying to access app routes → hold them at /waitlist
    if (isWaitlisted && !isWaitlistRoute && !isAdminRoute && !isLoginRoute) {
      router.replace('/waitlist')
      return
    }

    // Approved user somehow landed on /waitlist → forward to /home
    if (isApproved && isWaitlistRoute) {
      router.replace('/home')
    }
  }, [isWaitlisted, isApproved, isWaitlistRoute, isAdminRoute, isLoginRoute, loading, token, user, router])

  // Admin and public routes always render through
  if (isAdminRoute || isLoginRoute) {
    return <>{children}</>
  }

  // /waitlist is always rendered through — it handles its own UI
  if (isWaitlistRoute) {
    return <>{children}</>
  }

  // Waitlisted user on an inner route — block render until redirect fires
  if (isWaitlisted) {
    return (
      <div className="min-h-screen w-full bg-[#F3EDE3] dark:bg-[#1D1713] flex items-center justify-center p-6 text-center font-body-md select-none">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-xs uppercase tracking-widest text-on-surface-variant font-medium">
            Verifying Sanctuary Access…
          </p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
