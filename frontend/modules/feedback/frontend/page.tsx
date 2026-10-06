'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { submitFeedback, logout } from '@/core/api'
import { useAuth } from '@/shared/components/contexts/AuthContext'
import ThemeToggle from '@/shared/components/ThemeToggle'
import RadialNav from '@/shared/components/RadialNav'

interface QuestionItem {
  id: string
  number: number
  title: string
  subtitle?: string
  icon: string
  tag?: string
}

const CORE_QUESTIONS: QuestionItem[] = [
  {
    id: 'q1_comfort',
    number: 1,
    title: 'How comfortable did you feel talking openly with Mythri?',
    icon: 'sentiment_satisfied',
  },
  {
    id: 'q2_understanding',
    number: 2,
    title: 'How well did Mythri understand what you were trying to express?',
    icon: 'psychology',
  },
  {
    id: 'q3_relevance',
    number: 3,
    title: 'How relevant were Mythri’s responses to your situation?',
    icon: 'check_circle',
  },
  {
    id: 'q4_empathy',
    number: 4,
    title: 'How empathetic and emotionally appropriate did Mythri’s responses feel?',
    icon: 'favorite',
  },
  {
    id: 'q5_naturalness',
    number: 5,
    title: 'How natural did the conversation with Mythri feel?',
    icon: 'forum',
  },
  {
    id: 'q6_context_memory',
    number: 6,
    title: 'How well did Mythri remember and use context from your conversation?',
    icon: 'history_edu',
  },
  {
    id: 'q7_reflection_help',
    number: 7,
    title: 'How useful was Mythri in helping you reflect on what you were feeling or experiencing?',
    icon: 'self_improvement',
  },
  {
    id: 'q8_individuality',
    number: 8,
    title: 'How much did you feel that Mythri understood you as an individual rather than giving generic responses?',
    icon: 'person_pin',
  },
  {
    id: 'q9_overall_satisfaction',
    number: 9,
    title: 'How satisfied were you with the overall conversation experience?',
    icon: 'mood',
  },
  {
    id: 'q10_use_again',
    number: 10,
    title: 'How likely would you be to use Mythri again?',
    icon: 'repeat',
  },
]

const VALIDATION_QUESTION: QuestionItem = {
  id: 'q11_wellbeing_value',
  number: 11,
  title: 'How valuable would Mythri be as a regular part of your emotional wellbeing?',
  subtitle: 'Crucial validation question on long-term emotional support and daily wellness value',
  icon: 'verified',
  tag: 'Crucial Validation',
}

const OVERALL_QUESTION: QuestionItem = {
  id: 'overall_experience',
  number: 12,
  title: 'Overall, how would you rate your experience with Mythri?',
  subtitle: 'Comprehensive rating of your entire interaction and sanctuary experience',
  icon: 'star',
  tag: 'Overall Rating',
}

const RATING_LABELS: Record<number, string> = {
  1: '1 ★ Very Poor / Strongly Disagree',
  2: '2 ★ Poor / Disagree',
  3: '3 ★ Neutral / Moderate',
  4: '4 ★ Good / Agree',
  5: '5 ★ Excellent / Strongly Agree',
}

function StarRating({
  value,
  onChange,
}: {
  value: number
  onChange: (val: number) => void
}) {
  const [hoverVal, setHoverVal] = useState<number | null>(null)
  const activeVal = hoverVal !== null ? hoverVal : value

  return (
    <div className="flex flex-col items-start gap-1">
      <div className="flex items-center gap-1.5 sm:gap-2">
        {[1, 2, 3, 4, 5].map((star) => {
          const filled = star <= activeVal
          return (
            <button
              key={star}
              type="button"
              onMouseEnter={() => setHoverVal(star)}
              onMouseLeave={() => setHoverVal(null)}
              onClick={() => onChange(star)}
              className="p-1 rounded-xl transition-all duration-150 hover:scale-110 active:scale-95 focus:outline-none"
              title={`${star} Star${star > 1 ? 's' : ''}`}
            >
              <span
                className={`material-symbols-outlined text-[26px] sm:text-[30px] transition-colors ${
                  filled
                    ? 'text-amber-500 fill-current drop-shadow-sm'
                    : 'text-outline/30 dark:text-white/20'
                }`}
                style={{ fontVariationSettings: filled ? "'FILL' 1" : "'FILL' 0" }}
              >
                star
              </span>
            </button>
          )
        })}
      </div>
      <span className="text-[11px] sm:text-xs font-label-md text-primary/80 dark:text-white/70 h-4">
        {RATING_LABELS[activeVal] || ''}
      </span>
    </div>
  )
}

function FeedbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isExitFlow = searchParams.get('from') === 'exit'
  const sessionIdParam = searchParams.get('session_id')

  const { token, loading: authLoading } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const [ratings, setRatings] = useState<Record<string, number>>({
    q1_comfort: 5,
    q2_understanding: 5,
    q3_relevance: 5,
    q4_empathy: 5,
    q5_naturalness: 5,
    q6_context_memory: 5,
    q7_reflection_help: 5,
    q8_individuality: 5,
    q9_overall_satisfaction: 5,
    q10_use_again: 5,
    q11_wellbeing_value: 5,
    overall_experience: 5,
  })
  const [comments, setComments] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle')

  const targetHref = searchParams.get('target') || '/home'

  useEffect(() => {
    if (authLoading) return
    if (!token) {
      router.replace('/login')
    }
  }, [token, authLoading, router])

  const handleRatingChange = (id: string, val: number) => {
    setRatings((prev) => ({ ...prev, [id]: val }))
  }

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setIsSubmitting(true)
    setSubmitStatus('idle')

    try {
      const overallScore = ratings.overall_experience || ratings.q9_overall_satisfaction || 5
      await submitFeedback({
        content: comments.trim(),
        rating: overallScore,
        ratings,
        session_id: sessionIdParam ? parseInt(sessionIdParam, 10) || null : null,
        feedback_type: isExitFlow ? 'post_session_exit' : 'general',
      })

      setSubmitStatus('success')

      setTimeout(() => {
        router.replace(targetHref)
      }, 1600)
    } catch (error) {
      console.error('Feedback submission error:', error)
      setSubmitStatus('error')
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes float-slow {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-15px) scale(1.03); }
        }
        .animate-float-slow { animation: float-slow 12s ease-in-out infinite; }
      `,
        }}
        suppressHydrationWarning
      />

      {/* Ambient Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0 bg-[#fff8f5] dark:bg-black">
        <div className="absolute inset-0 bg-cover bg-center opacity-50 bg-[url('/assets/background.png')] dark:bg-[url('/assets/Gemini_Generated_Image_psevl6psevl6psev-clean.png')]"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-[#fff8f5]/60 via-transparent to-[#fff8f5]/80 dark:from-black/60 dark:to-black/80"></div>
      </div>

      {/* Floating Navigation */}
      <header className="fixed top-0 z-40 w-full px-4 sm:px-6 md:px-8 py-3.5 sm:py-4 flex justify-between items-center pointer-events-none transition-all">
        <div className="flex items-center gap-3 pointer-events-auto">
          <RadialNav />
          <Link href="/home" className="flex items-center gap-2 text-headline-md font-headline-md font-medium text-primary dark:text-white/90 tracking-wide">
            Mythri
          </Link>
        </div>
        <div className="relative flex items-center gap-2 pointer-events-auto">
          <ThemeToggle />
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center rounded-full glass-panel text-primary dark:text-white/90 transition-all active:scale-95 z-50"
          >
            <span className="material-symbols-outlined text-[22px] sm:text-[24px]">grid_view</span>
          </button>

          <nav
            className={`absolute right-0 top-[110%] w-56 glass-menu rounded-3xl flex flex-col p-2 gap-1 origin-top-right transition-all duration-300 ${
              menuOpen ? 'scale-100 opacity-100 pointer-events-auto shadow-2xl' : 'scale-95 opacity-0 pointer-events-none'
            }`}
          >
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
              <span className="material-symbols-outlined text-[20px]">rate_review</span> Feedback
            </Link>
            <div className="h-px bg-outline-variant/30 my-1 mx-2"></div>
            <button
              onClick={async () => {
                await logout()
                localStorage.clear()
                sessionStorage.removeItem('mb_session_id')
                window.location.href = '/login'
              }}
              className="text-error hover:bg-error/10 dark:hover:bg-error/20 transition-colors px-4 py-3 rounded-2xl flex items-center gap-3 font-label-md text-left w-full"
            >
              <span className="material-symbols-outlined text-[20px]">logout</span> Logout
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 w-full max-w-[760px] mx-auto px-4 sm:px-6 pt-24 sm:pt-28 pb-20 flex flex-col gap-6 min-h-[100dvh]">
        
        {/* Header Badge */}
        <div className="text-center space-y-2 animate-fade-in-up">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-primary/10 dark:bg-primary/20 text-primary dark:text-[#d0bcff] text-xs font-label-md font-semibold mb-1">
            <span className="material-symbols-outlined text-[16px]">
              {isExitFlow ? 'spa' : 'star'}
            </span>
            {isExitFlow ? 'Post-Session Reflection' : 'Community Experience'}
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-headline-md text-primary dark:text-white tracking-tight">
            {isExitFlow ? 'How was your session with Mythri?' : 'Help us nurture your sanctuary'}
          </h1>
          <p className="text-sm sm:text-base text-on-surface-variant dark:text-white/70 max-w-lg mx-auto leading-relaxed">
            {isExitFlow
              ? 'Your ratings guide Mythri to become even more attuned, comforting, and helpful for your journey.'
              : 'Every reflection helps refine our conversational empathy, therapeutic depth, and privacy.'}
          </p>
        </div>

        {/* Feedback Card */}
        <div className="glass-panel rounded-3xl p-5 sm:p-8 flex flex-col gap-6 shadow-xl border border-white/60 dark:border-white/10 animate-fade-in-up" style={{ animationDelay: '0.15s' }}>
          
          {submitStatus === 'success' ? (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-4 animate-fade-in">
              <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center shadow-inner">
                <span className="material-symbols-outlined text-[36px]">check</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-headline-md text-primary dark:text-white">
                Thank you for your voice
              </h3>
              <p className="text-sm text-on-surface-variant dark:text-white/70 max-w-sm">
                Your thoughts have been safely recorded. Returning you to the sanctuary...
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
              
              {/* Rating Scale Legend */}
              <div className="p-3.5 sm:p-4 rounded-2xl bg-primary/5 dark:bg-primary/10 border border-primary/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 text-primary font-bold">
                  <span className="material-symbols-outlined text-[18px]">straighten</span>
                  <span>User Feedback Survey — 1–5 Stars</span>
                </div>
                <div className="text-on-surface-variant dark:text-white/80 font-medium text-[11px] sm:text-xs bg-white/60 dark:bg-black/20 px-3 py-1 rounded-xl border border-black/5 dark:border-white/10">
                  ⭐ <strong>1</strong> = Very Poor / Strongly Disagree &nbsp;→&nbsp; ⭐ <strong>5</strong> = Excellent / Strongly Agree
                </div>
              </div>

              {/* 10 Core Questions Grid */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant dark:text-white/60 flex items-center gap-1.5 px-1">
                  <span className="material-symbols-outlined text-[16px] text-primary">chat</span>
                  Conversation &amp; Interaction Experience (Questions 1–10)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {CORE_QUESTIONS.map((q) => (
                    <div
                      key={q.id}
                      className="p-4 sm:p-5 rounded-2xl bg-white/60 dark:bg-white/[0.03] border border-black/5 dark:border-white/10 flex flex-col justify-between gap-3 hover:border-primary/30 transition-all shadow-sm"
                    >
                      <div className="space-y-1">
                        <div className="flex items-start gap-2 text-on-surface dark:text-white">
                          <span className="text-primary font-bold text-xs px-2 py-0.5 rounded-md bg-primary/10 shrink-0 mt-0.5">
                            Q{q.number}
                          </span>
                          <h4 className="text-xs sm:text-sm font-semibold tracking-tight leading-snug">
                            {q.title}
                          </h4>
                        </div>
                      </div>

                      <StarRating
                        value={ratings[q.id] || 5}
                        onChange={(val) => handleRatingChange(q.id, val)}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Crucial Validation Question (Q11) */}
              <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-primary/10 via-white/50 to-primary/5 dark:from-primary/20 dark:via-black/40 dark:to-primary/10 border-2 border-primary/30 shadow-md space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-[10px] sm:text-xs font-bold uppercase px-3 py-1 rounded-full bg-primary text-on-primary shadow-sm flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">verified</span>
                    Crucial Validation Question
                  </span>
                  <span className="text-xs font-semibold text-primary">Q11 of 12</span>
                </div>

                <div className="space-y-1">
                  <h4 className="text-sm sm:text-base font-bold text-on-surface dark:text-white">
                    {VALIDATION_QUESTION.title}
                  </h4>
                  {VALIDATION_QUESTION.subtitle && (
                    <p className="text-xs text-on-surface-variant dark:text-white/70">
                      {VALIDATION_QUESTION.subtitle}
                    </p>
                  )}
                </div>

                <StarRating
                  value={ratings[VALIDATION_QUESTION.id] || 5}
                  onChange={(val) => handleRatingChange(VALIDATION_QUESTION.id, val)}
                />
              </div>

              {/* Overall Experience Rating Question (Q12) */}
              <div className="p-5 sm:p-6 rounded-2xl bg-white/70 dark:bg-white/[0.04] border border-amber-500/30 dark:border-amber-500/20 shadow-sm space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-[10px] sm:text-xs font-bold uppercase px-3 py-1 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">star</span>
                    Overall Rating
                  </span>
                  <span className="text-xs font-semibold text-on-surface-variant">Overall Summary</span>
                </div>

                <div className="space-y-1">
                  <h4 className="text-sm sm:text-base font-bold text-on-surface dark:text-white">
                    {OVERALL_QUESTION.title}
                  </h4>
                  {OVERALL_QUESTION.subtitle && (
                    <p className="text-xs text-on-surface-variant dark:text-white/70">
                      {OVERALL_QUESTION.subtitle}
                    </p>
                  )}
                </div>

                <StarRating
                  value={ratings[OVERALL_QUESTION.id] || 5}
                  onChange={(val) => handleRatingChange(OVERALL_QUESTION.id, val)}
                />
              </div>

              {/* Text Feedback */}
              <div className="space-y-2">
                <label htmlFor="comments" className="text-xs sm:text-sm font-label-md font-semibold text-primary dark:text-white flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px]">edit_note</span>
                  Detailed Thoughts &amp; Suggestions (Optional)
                </label>
                <textarea
                  id="comments"
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="Share anything specific that resonated, what could be softer, or what you'd love to see next..."
                  rows={4}
                  className="w-full bg-white/50 dark:bg-black/20 border border-black/10 dark:border-white/10 rounded-2xl p-4 text-sm text-on-surface dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all resize-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                {isExitFlow ? (
                  <button
                    type="button"
                    onClick={() => router.replace(targetHref)}
                    className="w-full sm:w-auto px-6 py-3.5 rounded-2xl border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 text-on-surface-variant dark:text-white/70 font-label-md text-sm transition-all"
                  >
                    Skip &amp; Continue
                  </button>
                ) : (
                  <div />
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full sm:w-auto min-w-[200px] bg-primary hover:bg-primary/90 text-on-primary font-bold py-3.5 px-8 rounded-2xl transition-all active:scale-95 disabled:opacity-50 flex justify-center items-center gap-2 shadow-[0_4px_16px_rgba(122,74,95,0.35)]"
                >
                  {isSubmitting ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-[18px]">sync</span>
                      Submitting...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[18px]">send</span>
                      Submit Reflection
                    </>
                  )}
                </button>
              </div>

              {submitStatus === 'error' && (
                <p className="text-error text-center text-xs sm:text-sm">
                  Failed to submit feedback. Please check your connection and try again.
                </p>
              )}
            </form>
          )}

        </div>
      </main>
    </>
  )
}

export default function FeedbackPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-primary">Loading...</div>}>
      <FeedbackContent />
    </Suspense>
  )
}

