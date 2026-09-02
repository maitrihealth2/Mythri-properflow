'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getOnboardingStatus } from '@/core/api'

type ConsentData = {
  eligibility: boolean
  collect_text: boolean
  collect_usage: boolean
  collect_feedback: boolean
  model_training: boolean
  data_retention: boolean
  nda_agreement: boolean
}

export default function OnboardingPage() {
  const router = useRouter()
  const [consent, setConsent] = useState<ConsentData>({
    eligibility: false,
    collect_text: false,
    collect_usage: false,
    collect_feedback: false,
    model_training: false,
    data_retention: false,
    nda_agreement: false,
  })

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('mb_token') : null
    if (!token) {
      router.replace('/login')
      return
    }

    getOnboardingStatus().then(status => {
      if (status && status.completed) {
        router.replace('/home')
      }
    }).catch(err => {
      console.error('[ONBOARDING_ERROR] Failed to check onboarding status on mount:', err)
    })
  }, [router])

  const canProceed = consent.eligibility && consent.nda_agreement && consent.collect_text

  const handleAgree = () => {
    if (!canProceed) return
    router.push('/onboarding/chat')
  }

  return (
    <div className="min-h-[100dvh] w-full flex items-center justify-center p-3 sm:p-6 md:p-8 bg-surface dark:bg-background relative overflow-y-auto">
      {/* Background Ambience */}
      <div className="fixed inset-0 bg-gradient-to-br from-primary/5 via-surface to-surface-variant/20 pointer-events-none z-0"></div>

      <main className="relative z-10 w-full max-w-[560px] my-auto">
        <div className="w-full bg-surface/95 dark:bg-surface-container/95 backdrop-blur-md rounded-2xl sm:rounded-3xl border border-outline-variant/30 shadow-xl p-4 sm:p-6 md:p-8 flex flex-col max-h-[92dvh] overflow-hidden">
          
          {/* Header */}
          <div className="text-center pb-3 border-b border-outline-variant/20 shrink-0">
            <h1 className="text-primary font-headline-md text-xl sm:text-2xl tracking-wider uppercase font-bold">AFFYNE LABS</h1>
            <h2 className="text-on-surface font-headline-sm text-base sm:text-lg mt-0.5">Consent, Terms &amp; NDA</h2>
            <p className="text-on-surface-variant font-body-sm text-xs italic mt-0.5">Mythri — AI Psychological Companion</p>
          </div>

          {/* Scrollable Terms Body */}
          <div className="overflow-y-auto flex-1 py-3.5 space-y-3 pr-1 text-on-surface font-body-sm text-xs sm:text-sm">
            <p className="text-on-surface-variant leading-relaxed">
              This screen governs your access to Mythri, built by <strong>Affyne Labs</strong>. You must read and explicitly agree to the required sections below before proceeding.
            </p>

            {/* Section 1: Eligibility */}
            <div className="p-3 bg-surface-variant/20 rounded-xl border border-outline-variant/20 space-y-1.5">
              <h3 className="font-label-md font-bold text-primary text-xs sm:text-sm">1. Eligibility &amp; Age (Mandatory)</h3>
              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  className="mt-0.5 w-4 h-4 rounded border-outline accent-primary text-primary shrink-0"
                  checked={consent.eligibility}
                  onChange={(e) => setConsent({ ...consent, eligibility: e.target.checked })}
                />
                <span className="leading-snug">
                  I confirm that I am 18 years of age or older.
                  <span className="block text-[11px] text-on-surface-variant mt-0.5">
                    (Participation is limited to adults. If under 18, you may not proceed.)
                  </span>
                </span>
              </label>
            </div>

            {/* Section 2: NDA */}
            <div className="p-3 bg-primary/5 rounded-xl border border-primary/20 space-y-1.5">
              <h3 className="font-label-md font-bold text-primary text-xs sm:text-sm">2. Non-Disclosure Agreement (Mandatory)</h3>
              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  className="mt-0.5 w-4 h-4 rounded border-outline accent-primary text-primary shrink-0"
                  checked={consent.nda_agreement}
                  onChange={(e) => setConsent({ ...consent, nda_agreement: e.target.checked })}
                />
                <span className="leading-snug font-medium text-on-surface">
                  I agree to keep all system architecture, prompt engineering techniques, and internal workings of Mythri / Affyne Labs strictly confidential. I will NOT disclose, publish, reverse-engineer, or share them with any third party.
                </span>
              </label>
            </div>

            {/* Section 3: Nature of Product */}
            <div className="p-3 bg-surface-variant/20 rounded-xl border border-outline-variant/20 space-y-1">
              <h3 className="font-label-md font-bold text-primary text-xs sm:text-sm">3. Nature of the Product</h3>
              <p className="text-on-surface-variant leading-snug">
                Mythri is an AI companion created by Affyne Labs, not a licensed therapist or doctor. It does not diagnose or treat medical conditions and does not replace professional clinical healthcare.
              </p>
            </div>

            {/* Section 4: Data Processing */}
            <div className="p-3 bg-surface-variant/20 rounded-xl border border-outline-variant/20 space-y-2">
              <h3 className="font-label-md font-bold text-primary text-xs sm:text-sm">4. Data Processing (Mandatory)</h3>
              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  className="mt-0.5 w-4 h-4 rounded border-outline accent-primary text-primary shrink-0"
                  checked={consent.collect_text}
                  onChange={(e) => setConsent({ ...consent, collect_text: e.target.checked })}
                />
                <span className="leading-snug">
                  I agree that Affyne Labs may collect and securely process conversation text and voice to provide empathetic responses.
                </span>
              </label>
              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  className="mt-0.5 w-4 h-4 rounded border-outline accent-primary text-primary shrink-0"
                  checked={consent.collect_usage}
                  onChange={(e) => setConsent({ ...consent, collect_usage: e.target.checked })}
                />
                <span className="leading-snug">
                  I agree to basic usage metrics (session duration, feature interactions).
                </span>
              </label>
              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  className="mt-0.5 w-4 h-4 rounded border-outline accent-primary text-primary shrink-0"
                  checked={consent.collect_feedback}
                  onChange={(e) => setConsent({ ...consent, collect_feedback: e.target.checked })}
                />
                <span className="leading-snug">
                  I agree to feedback and rating collection to improve quality.
                </span>
              </label>
            </div>

            {/* Section 5: Model Improvement */}
            <div className="p-3 bg-surface-variant/20 rounded-xl border border-outline-variant/20 space-y-1.5">
              <h3 className="font-label-md font-bold text-primary text-xs sm:text-sm">5. Anonymized Improvement</h3>
              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  className="mt-0.5 w-4 h-4 rounded border-outline accent-primary text-primary shrink-0"
                  checked={consent.model_training}
                  onChange={(e) => setConsent({ ...consent, model_training: e.target.checked })}
                />
                <span className="leading-snug">
                  I agree that fully anonymized data (stripped of all personal identifiers) may be used to refine AI accuracy.
                </span>
              </label>
            </div>

            {/* Section 6: Data Retention */}
            <div className="p-3 bg-surface-variant/20 rounded-xl border border-outline-variant/20 space-y-1.5">
              <h3 className="font-label-md font-bold text-primary text-xs sm:text-sm">6. Privacy Rights &amp; Retention</h3>
              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  className="mt-0.5 w-4 h-4 rounded border-outline accent-primary text-primary shrink-0"
                  checked={consent.data_retention}
                  onChange={(e) => setConsent({ ...consent, data_retention: e.target.checked })}
                />
                <span className="leading-snug">
                  I understand Affyne Labs will not sell my personal data. I can request account deletion at any time via hello@affynelabs.com.
                </span>
              </label>
            </div>

            {/* Section 7: Crisis Notice */}
            <div className="p-3 bg-error-container/20 rounded-xl border border-error/20 space-y-1">
              <h3 className="font-label-md font-bold text-error text-xs sm:text-sm">7. Crisis Notice</h3>
              <p className="text-[11px] sm:text-xs text-on-surface-variant leading-snug">
                If in an acute crisis or experiencing self-harm thoughts, please call emergency services (112 in India) or a national crisis line immediately.
              </p>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-outline-variant/20 shrink-0 flex flex-col sm:flex-row gap-2.5">
            <button
              type="button"
              onClick={() => router.push('/login')}
              className="w-full sm:w-1/3 py-2.5 sm:py-3 bg-surface hover:bg-surface-variant text-on-surface border border-outline-variant/50 rounded-xl font-label-md text-xs sm:text-sm transition-colors text-center"
            >
              Decline
            </button>
            <button
              type="button"
              onClick={handleAgree}
              disabled={!canProceed}
              className="w-full sm:w-2/3 py-2.5 sm:py-3 bg-primary text-white rounded-xl font-label-md text-xs sm:text-sm transition-all hover:opacity-90 disabled:opacity-40 shadow-md flex items-center justify-center gap-1.5"
            >
              <span>I Agree &amp; Proceed</span>
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </button>
          </div>

        </div>
      </main>
    </div>
  )
}
