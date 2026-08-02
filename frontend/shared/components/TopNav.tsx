'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'

const LANGUAGES = [
  { code: 'en-IN', native: 'English' },
  { code: 'hi-IN', native: 'हिन्दी' },
  { code: 'ta-IN', native: 'தமிழ்' },
  { code: 'te-IN', native: 'తెలుగు' },
]

export default function TopNav() {
  const [isOpen, setIsOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [language, setLanguage] = useState('en-IN')
  const { theme, setTheme } = useTheme()
  const router = useRouter()
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMounted(true)
    const lang = localStorage.getItem('mb_language') || 'en-IN'
    setLanguage(lang)
  }, [])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLanguageChange = (lang: string) => {
    setLanguage(lang)
    localStorage.setItem('mb_language', lang)
    window.dispatchEvent(new Event('mb_language_changed'))
  }

  const handleLogout = () => {
    localStorage.removeItem('mb_token')
    document.cookie = "mb_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"
    router.replace('/login')
  }

  const navItemClass = "w-full text-left px-4 py-3 text-sm font-label-md hover:bg-surface-container-highest transition-colors flex items-center gap-3"

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background border-b border-outline-variant/30 shadow-sm transition-colors duration-300">
      <div className="px-margin-desktop py-4 flex justify-between items-center max-w-[1200px] mx-auto pointer-events-none">
        
        {/* Logo Area */}
        <div 
          className="pointer-events-auto flex items-center gap-2 cursor-pointer" 
          onClick={() => router.push('/text-chat')}
        >
          <span className="material-symbols-outlined text-primary text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>spa</span>
          <span className="font-headline text-2xl font-bold tracking-tight text-on-background">Maitri</span>
        </div>

        {/* Right Actions */}
      <div className="pointer-events-auto flex items-center gap-4 relative" ref={menuRef}>
        
        {/* Language Selector */}
        <select 
          value={language}
          onChange={e => handleLanguageChange(e.target.value)}
          className="bg-surface-container border border-outline-variant rounded-full px-3 py-1.5 text-sm font-label-md text-on-surface focus:outline-none cursor-pointer"
        >
          {LANGUAGES.map(l => (
            <option key={l.code} value={l.code}>{l.native}</option>
          ))}
        </select>

        {/* Theme Toggle */}
        {mounted && (
          <button 
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="w-10 h-10 rounded-full flex items-center justify-center bg-surface-container border border-outline-variant hover:bg-surface-container-highest transition-colors"
            title="Toggle Theme"
          >
            <span className="material-symbols-outlined text-[20px]">
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
          className="w-10 h-10 rounded-full flex items-center justify-center bg-primary text-on-primary hover:bg-primary/90 transition-colors shadow-sm ml-1"
          title="New Chat"
        >
          <span className="material-symbols-outlined text-[20px]">add</span>
        </button>

        {/* Main Circular Menu Button */}
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="nav-circle-btn"
          title="Menu"
        >
          <span className="material-symbols-outlined text-[24px]">
            {isOpen ? 'close' : 'apps'}
          </span>
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="absolute top-14 right-0 w-56 bg-surface-container-lowest border border-outline-variant rounded-xl shadow-lg overflow-hidden py-2 animate-fade-up">
            <button onClick={() => { router.push('/home'); setIsOpen(false) }} className={navItemClass}>
              <span className="material-symbols-outlined">home</span>
              Home
            </button>
            <button onClick={() => { router.push('/text-chat'); setIsOpen(false) }} className={navItemClass}>
              <span className="material-symbols-outlined">chat_bubble</span>
              Text Chat
            </button>
            <button onClick={() => { router.push('/voice-chat'); setIsOpen(false) }} className={navItemClass}>
              <span className="material-symbols-outlined">graphic_eq</span>
              Voice Chat
            </button>
            <button onClick={() => { router.push('/history'); setIsOpen(false) }} className={navItemClass}>
              <span className="material-symbols-outlined">history</span>
              History
            </button>
            <div className="h-px bg-outline-variant/30 my-1"></div>
            <button onClick={handleLogout} className={`${navItemClass} text-error hover:text-error`}>
              <span className="material-symbols-outlined text-error">logout</span>
              Logout
            </button>
          </div>
        )}
      </div>
      </div>
    </header>
  )
}
