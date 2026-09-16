'use client'

import React, { createContext, useContext } from 'react'
import { usePWA } from '@/shared/hooks/usePWA'
import IOSInstallGuideModal from './IOSInstallGuideModal'

interface PWAContextType {
  isInstallable: boolean
  isInstalled: boolean
  isIOS: boolean
  isStandalone: boolean
  showIOSGuide: boolean
  setShowIOSGuide: (show: boolean) => void
  promptInstall: () => Promise<boolean>
}

const PWAContext = createContext<PWAContextType | null>(null)

export function PWAProvider({ children }: { children: React.ReactNode }) {
  const pwa = usePWA()

  return (
    <PWAContext.Provider value={pwa}>
      {children}
      <IOSInstallGuideModal
        isOpen={pwa.showIOSGuide}
        onClose={() => pwa.setShowIOSGuide(false)}
      />
    </PWAContext.Provider>
  )
}

export function usePWAContext() {
  const context = useContext(PWAContext)
  if (!context) {
    // Return safe default fallback if accessed outside provider
    return {
      isInstallable: false,
      isInstalled: false,
      isIOS: false,
      isStandalone: false,
      showIOSGuide: false,
      setShowIOSGuide: () => {},
      promptInstall: async () => false
    }
  }
  return context
}
