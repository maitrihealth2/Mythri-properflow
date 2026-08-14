'use client'

import { useEffect } from 'react'
import { ThemeProvider } from 'next-themes'
import { FeatureFlagProvider } from '@/shared/components/contexts/FeatureFlagContext'

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000').replace(/\/$/, '')

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Silently wake up the Render backend on app load to avoid cold-start
    // timeouts when the user hits login. Fire-and-forget — errors are ignored.
    fetch(`${API_URL}/health`).catch(() => {})

    // Fetch Global Theme
    fetch(`${API_URL}/api/config/theme`)
      .then(res => res.json())
      .then(data => {
        if (data && data.theme) {
          document.documentElement.setAttribute('data-theme', data.theme)
        }
      })
      .catch(() => {})
  }, [])

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <FeatureFlagProvider>
        {children}
      </FeatureFlagProvider>
    </ThemeProvider>
  )
}

