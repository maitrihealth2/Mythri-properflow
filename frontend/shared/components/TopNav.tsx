'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import RadialNav from './RadialNav'

const LANGUAGES = [
  { code: 'en-IN', native: 'English' },
  { code: 'hi-IN', native: 'हिन्दी' },
  { code: 'ta-IN', native: 'தமிழ்' },
  { code: 'te-IN', native: 'తెలుగు' },
]

export default function TopNav() {
  const [mounted, setMounted] = useState(false)
  const [language, setLanguage] = useState('en-IN')
  const { theme, setTheme } = useTheme()
  const router = useRouter()

  useEffect(() => {
    setMounted(true)
    const lang = localStorage.getItem('mb_language') || 'en-IN'
    setLanguage(lang)
  }, [])

  const handleLanguageChange = (lang: string) => {
    setLanguage(lang)
    localStorage.setItem('mb_language', lang)
    window.dispatchEvent(new Event('mb_language_changed'))
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-outline-variant/30 shadow-sm transition-colors duration-300">
      <div className="px-4 sm:px-6 py-3.5 flex justify-between items-center max-w-[1200px] mx-auto pointer-events-none">
        
        {/* Left Area: Radial Menu & Brand Logo */}
        <div className="pointer-events-auto flex items-center gap-3">
          <RadialNav />
          <div 
            className="flex items-center gap-2 cursor-pointer" 
            onClick={() => router.push('/home')}
          >
            <span className="material-symbols-outlined text-primary text-2xl sm:text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>spa</span>
            <span className="font-headline text-xl sm:text-2xl font-bold tracking-tight text-on-background">Mythri</span>
          </div>
        </div>

        {/* Right Actions */}
        <div className="pointer-events-auto flex items-center gap-2 sm:gap-3 relative">
          
          {/* Language Selector */}
          <select 
            value={language}
            onChange={e => handleLanguageChange(e.target.value)}
            className="bg-surface-container border border-outline-variant/50 rounded-full px-2.5 sm:px-3 py-1 text-xs sm:text-sm font-label-md text-on-surface focus:outline-none cursor-pointer"
          >
            {LANGUAGES.map(l => (
              <option key={l.code} value={l.code}>{l.native}</option>
            ))}
          </select>

          {/* Theme Toggle */}
          {mounted && (
            <button 
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center bg-surface-container border border-outline-variant/50 hover:bg-surface-container-highest transition-all duration-150 hover:scale-[1.02] active:scale-[0.98]"
              title="Toggle Theme"
            >
              <span className="material-symbols-outlined text-[18px] sm:text-[20px]">
                {theme === 'dark' ? 'light_mode' : 'dark_mode'}
              </span>
            </button>
          )}

          {/* New Chat Button */}
          <button 
            onClick={() => { 
               sessionStorage.removeItem('mb_session_id'); 
               router.push('/text-chat');
               window.dispatchEvent(new Event('mb_new_chat'));
            }}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center bg-primary text-on-primary hover:bg-primary/90 shadow-sm transition-all duration-150 hover:scale-[1.02] active:scale-[0.98]"
            title="New Chat"
          >
            <span className="material-symbols-outlined text-[18px] sm:text-[20px]">add</span>
          </button>
        </div>
      </div>
    </header>
  )
}
