'use client'

import { useEffect } from 'react'
import { ThemeProvider } from 'next-themes'
import { AuthProvider } from '@/shared/components/contexts/AuthContext'
import { FeatureFlagProvider } from '@/shared/components/contexts/FeatureFlagContext'
import { MaintenanceGuard } from '@/shared/components/MaintenanceGuard'
import { BlockedGuard } from '@/shared/components/BlockedGuard'

import { PWAProvider } from '@/shared/components/PWAProvider'

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000').replace(/\/$/, '')

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Silently wake up the Render backend on app load to avoid cold-start
    // timeouts when the user hits login. Fire-and-forget — errors are ignored.
    fetch(`${API_URL}/health`).catch(() => {})


  }, [])

  return (
    <ThemeProvider attribute="class" defaultTheme="light">
      {/* CRIT-03: AuthProvider must be outermost — all children depend on token */}
      <AuthProvider>
        <PWAProvider>
          <FeatureFlagProvider>
            <MaintenanceGuard>
              <BlockedGuard>
                {children}
              </BlockedGuard>
            </MaintenanceGuard>
          </FeatureFlagProvider>
        </PWAProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}

