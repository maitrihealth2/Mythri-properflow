'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

export default function ThemeToggle() {
  const [mounted, setMounted] = useState(false)
  const { theme, setTheme } = useTheme()

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <button className="material-symbols-outlined text-primary bg-white/60 backdrop-blur-md border border-white/50 p-2 rounded-full shadow-sm w-[42px] h-[42px] dark:bg-white/10 dark:border-white/20">
        light_mode
      </button>
    )
  }

  const isDark = theme === 'dark'

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="material-symbols-outlined text-primary dark:text-white/90 bg-white/60 backdrop-blur-md border border-white/50 shadow-sm hover:bg-white/80 p-2 rounded-full transition-all duration-150 active:scale-[0.98] hover:scale-[1.02] dark:bg-white/10 dark:border-white/20 dark:hover:bg-white/20"
      title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
    >
      {isDark ? 'light_mode' : 'dark_mode'}
    </button>
  )
}
