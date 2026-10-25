'use client'

import React, { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/shared/components/contexts/AuthContext'

export function WaitlistGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, token, loading } = useAuth()

  const isAdminRoute = pathname?.startsWith('/admin')
  const isLoginRoute = pathname === '/login' || pathname === '/'
  const isWaitlistRoute = pathname === '/waitlist'

  const isWaitlisted = token && user && user.waitlist_status === 'waitlisted'
  const isApproved = token && user && (user.waitlist_status === 'approved' || !user.waitlist_status)

  useEffect(() => {
    if (loading || !token || !user) return

    // If waitlisted and on a protected application route, route to /waitlist
    if (isWaitlisted && !isWaitlistRoute && !isAdminRoute && !isLoginRoute) {
      router.replace('/waitlist')
    }

    // If already approved but still on /waitlist, forward to /home
    if (isApproved && isWaitlistRoute) {
      router.replace('/home')
    }
  }, [isWaitlisted, isApproved, isWaitlistRoute, isAdminRoute, isLoginRoute, loading, token, user, router])

  // Admin routes and public login routes always bypass waitlist guard
  if (isAdminRoute || isLoginRoute) {
    return <>{children}</>
  }

  // If waitlisted and attempting to access an inner route, prevent flash of private content
  if (isWaitlisted && !isWaitlistRoute) {
    return (
      <div className="min-h-screen w-full bg-[#fcf8f6] dark:bg-[#141218] flex items-center justify-center p-6 text-center font-body-md select-none">
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
