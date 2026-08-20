'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { submitFeedback, logout } from '@/core/api'
import ThemeToggle from '@/shared/components/ThemeToggle'
import { useTheme } from 'next-themes'

export default function FeedbackPage() {
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const { theme } = useTheme()

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('mb_token') : null
    if (!token) {
      router.replace('/login')
    }
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!feedback.trim()) return

    setIsSubmitting(true)
    setSubmitStatus('idle')
    try {
      await submitFeedback(feedback)
      setSubmitStatus('success')
      setFeedback('')
      setTimeout(() => setSubmitStatus('idle'), 3000)
    } catch (error) {
      console.error(error)
      setSubmitStatus('error')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes float-slow {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-20px) scale(1.05); }
        }
        .animate-float-slow { animation: float-slow 12s ease-in-out infinite; }
        
        .glass-panel {
          background: rgba(255, 255, 255, 0.4);
          backdrop-filter: blur(24px) saturate(140%);
          -webkit-backdrop-filter: blur(24px) saturate(140%);
          border: 1px solid rgba(255, 255, 255, 0.7);
          box-shadow: 0 8px 32px rgba(60, 31, 51, 0.05);
        }
        .glass-panel:hover {
          background: rgba(255, 255, 255, 0.6);
          box-shadow: 0 12px 40px rgba(60, 31, 51, 0.08);
        }
        .dark .glass-panel {
          background: rgba(18, 18, 18, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.15);
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
        }
        .dark .glass-panel:hover {
          background: rgba(30, 30, 30, 0.7);
          border: 1px solid rgba(255, 255, 255, 0.25);
          box-shadow: 0 15px 50px rgba(0, 0, 0, 0.5);
        }
      `}} />

      {/* Ambient Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0 bg-[#fff8f5] dark:bg-black">
        <div className={`absolute inset-0 bg-cover bg-center opacity-50 ${theme === 'dark' ? "bg-[url('/assets/Gemini_Generated_Image_psevl6psevl6psev-clean.png')]" : "bg-[url('/assets/background.png')]"}`}></div>
        <div className="absolute inset-0 bg-gradient-to-b from-[#fff8f5]/60 via-transparent to-[#fff8f5]/80 dark:from-black/60 dark:to-black/80"></div>
      </div>

      {/* Navigation */}
      <header className="fixed top-0 z-40 w-full px-5 md:px-8 py-4 lg:py-5 flex justify-between items-center transition-all animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
        <div className="flex items-center gap-4">
          <span className="text-headline-md font-headline-md font-medium text-primary dark:text-white/90 tracking-wide">Mythri</span>
        </div>
        <div className="relative flex items-center gap-2">
          <ThemeToggle />
          <button onClick={() => setMenuOpen(!menuOpen)} className="w-12 h-12 flex items-center justify-center rounded-full glass-panel text-primary dark:text-white/90 transition-all active:scale-95 z-50">
            <span className="material-symbols-outlined text-[24px]">grid_view</span>
          </button>
          
          <nav className={`absolute right-0 top-[110%] w-56 bg-white/70 dark:bg-[#121212]/90 backdrop-blur-3xl border border-white/60 dark:border-white/10 shadow-2xl rounded-3xl flex flex-col p-2 gap-1 origin-top-right transition-all duration-300 ${menuOpen ? 'scale-100 opacity-100 pointer-events-auto' : 'scale-95 opacity-0 pointer-events-none'}`}>
            <Link href="/home" className="text-on-surface-variant hover:bg-white/60 dark:hover:bg-white/10 transition-colors px-4 py-3 rounded-2xl flex items-center gap-3 font-label-md">
              <span className="material-symbols-outlined text-[20px]">home</span> Sanctuary
            </Link>
            <Link href="/text-chat" className="text-on-surface-variant hover:bg-white/60 dark:hover:bg-white/10 transition-colors px-4 py-3 rounded-2xl flex items-center gap-3 font-label-md">
              <span className="material-symbols-outlined text-[20px]">health_and_safety</span> Consultation
            </Link>
            <Link href="/history" className="text-on-surface-variant hover:bg-white/60 dark:hover:bg-white/10 transition-colors px-4 py-3 rounded-2xl flex items-center gap-3 font-label-md">
              <span className="material-symbols-outlined text-[20px]">history</span> Your Sessions
            </Link>
            <Link href="/feedback" className="text-primary font-bold bg-white/80 dark:bg-white/20 px-4 py-3 rounded-2xl flex items-center gap-3 font-label-md transition-colors">
              <span className="material-symbols-outlined text-[20px]">feedback</span> Feedback
            </Link>
            <div className="h-px bg-outline-variant/30 my-1 mx-2"></div>
            <button onClick={async () => { await logout(); localStorage.clear(); sessionStorage.removeItem('mb_session_id'); router.replace('/login'); }} className="text-error hover:bg-error/10 dark:hover:bg-error/20 transition-colors px-4 py-3 rounded-2xl flex items-center gap-3 font-label-md text-left w-full">
              <span className="material-symbols-outlined text-[20px]">logout</span> Logout
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 w-full max-w-[800px] mx-auto px-4 lg:px-8 pt-32 pb-24 md:pb-6 flex flex-col gap-6 md:h-[100dvh] overflow-y-auto hide-scrollbar">
        
        <div className="text-center animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          <h1 className="text-display-sm font-headline-md text-primary mb-2 tracking-tight">Your Feedback</h1>
          <p className="text-body-md text-on-surface-variant opacity-80">Help us improve the Mythri experience.</p>
        </div>

        <div className="glass-panel rounded-3xl p-6 md:p-8 flex flex-col gap-4 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <label htmlFor="feedback" className="text-label-lg font-medium text-primary">What's on your mind?</label>
              <textarea
                id="feedback"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Let us know what features you want, what's broken, or how we can improve..."
                className="w-full h-48 bg-white/50 dark:bg-black/20 border border-white/60 dark:border-white/10 rounded-2xl p-4 text-body-md text-on-surface dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/30 dark:focus:ring-white/30 transition-all resize-none"
                required
              ></textarea>
            </div>
            
            <button 
              type="submit" 
              disabled={isSubmitting || !feedback.trim()}
              className="w-full bg-primary hover:bg-primary/90 text-on-primary font-bold py-4 rounded-2xl transition-all active:scale-95 disabled:opacity-50 flex justify-center items-center gap-2 shadow-[0_4px_14px_rgba(122,74,95,0.4)]"
            >
              {isSubmitting ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-[20px]">sync</span> Submitting...
                </>
              ) : submitStatus === 'success' ? (
                <>
                  <span className="material-symbols-outlined text-[20px]">check_circle</span> Thank You!
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[20px]">send</span> Send Feedback
                </>
              )}
            </button>
            {submitStatus === 'error' && (
              <p className="text-error text-center text-body-sm mt-2">Failed to submit feedback. Please try again.</p>
            )}
          </form>
        </div>

      </main>
    </>
  )
}
