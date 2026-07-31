'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'

export default function GlobalShortcuts() {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Ctrl+Shift+O: New Chat
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'o') {
        e.preventDefault()
        window.dispatchEvent(new Event('shortcut:new-chat'))
        if (pathname !== '/text-chat') {
          router.push('/text-chat')
        }
      }

      // 2. Ctrl+H: History
      if (e.ctrlKey && e.key.toLowerCase() === 'h' && !e.shiftKey) {
        e.preventDefault()
        if (pathname !== '/history') {
          router.push('/history')
        }
      }

      // 3. Ctrl+I: Start Voice Chat
      if (e.ctrlKey && e.key.toLowerCase() === 'i' && !e.shiftKey) {
        e.preventDefault()
        if (pathname !== '/voice-chat') {
          router.push('/voice-chat')
        }
      }

      // 4. Ctrl+E: End Voice Chat
      if (e.ctrlKey && e.key.toLowerCase() === 'e' && !e.shiftKey) {
        e.preventDefault()
        if (pathname === '/voice-chat') {
          window.dispatchEvent(new Event('shortcut:end-call'))
        }
      }

      // 5. Ctrl+M: Mute/Unmute
      if (e.ctrlKey && e.key.toLowerCase() === 'm' && !e.shiftKey) {
        e.preventDefault()
        if (pathname === '/voice-chat') {
          window.dispatchEvent(new Event('shortcut:toggle-mute'))
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [router, pathname])

  return null
}
