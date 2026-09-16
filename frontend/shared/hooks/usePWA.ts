'use client'

import { useState, useEffect, useCallback } from 'react'

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed'
    platform: string
  }>
  prompt(): Promise<void>
}

export function usePWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstallable, setIsInstallable] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)
  const [showIOSGuide, setShowIOSGuide] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    // 1. Check if running in standalone mode (already installed)
    const isStandaloneMode =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
      document.referrer.includes('android-app://')

    setIsStandalone(isStandaloneMode)
    if (isStandaloneMode) {
      setIsInstalled(true)
    }

    // 2. Check for iOS / Safari
    const userAgent = window.navigator.userAgent.toLowerCase()
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent)
    setIsIOS(isIOSDevice)

    // On iOS Safari, if not already standalone, we can provide the Add to Home Screen guide
    if (isIOSDevice && !isStandaloneMode) {
      setIsInstallable(true)
    }

    // 3. Listen for Chromium beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      const promptEvent = e as BeforeInstallPromptEvent
      setDeferredPrompt(promptEvent)
      setIsInstallable(true)
    }

    // 4. Listen for appinstalled event
    const handleAppInstalled = () => {
      setIsInstalled(true)
      setIsInstallable(false)
      setDeferredPrompt(null)
      setShowIOSGuide(false)
      console.log('[PWA] Mythri App installed successfully')
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    // 5. Register Service Worker in production
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((registration) => {
            console.log('[PWA] Service Worker registered with scope:', registration.scope)

            // Check for service worker updates
            registration.onupdatefound = () => {
              const installingWorker = registration.installing
              if (installingWorker) {
                installingWorker.onstatechange = () => {
                  if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    console.log('[PWA] New version available! Reload on next session.')
                  }
                }
              }
            }
          })
          .catch((error) => {
            console.warn('[PWA] Service Worker registration failed:', error)
          })
      })
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const promptInstall = useCallback(async (): Promise<boolean> => {
    if (isIOS && !isStandalone) {
      setShowIOSGuide(true)
      return false
    }

    if (!deferredPrompt) {
      console.log('[PWA] Installation prompt not available')
      return false
    }

    try {
      await deferredPrompt.prompt()
      const choiceResult = await deferredPrompt.userChoice
      if (choiceResult.outcome === 'accepted') {
        console.log('[PWA] User accepted the installation')
        setDeferredPrompt(null)
        setIsInstallable(false)
        return true
      } else {
        console.log('[PWA] User dismissed the installation')
        return false
      }
    } catch (err) {
      console.error('[PWA] Install prompt error:', err)
      return false
    }
  }, [deferredPrompt, isIOS, isStandalone])

  return {
    isInstallable: isInstallable && !isStandalone,
    isInstalled: isInstalled || isStandalone,
    isIOS,
    isStandalone,
    showIOSGuide,
    setShowIOSGuide,
    promptInstall
  }
}
