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
    <div className="flex-1 w-full flex items-center justify-center relative overflow-hidden min-h-[100dvh] bg-surface">
      <div className="fixed inset-0 bg-plum-high-contrast/5 backdrop-blur-[2px] z-0 pointer-events-none"></div>
      
      <main className="relative z-10 w-full max-w-[540px] m-auto px-6 py-12 flex flex-col items-center">
        <div className="frosted-card rounded-3xl p-6 md:p-10 w-full flex flex-col items-center shadow-sm">
          <div className="flex flex-col space-y-4 animate-fade-in-up w-full text-left bg-surface p-6 rounded-2xl shadow-sm border border-outline-variant/30 max-h-[80vh] overflow-y-auto">
            <h1 className="text-plum-high-contrast font-headline-md text-2xl text-center tracking-wider">AFFYNE LABS</h1>
            <h2 className="text-on-surface font-headline-sm text-center">Participant Consent, Terms & Non-Disclosure Agreement</h2>
            <p className="text-on-surface-variant font-body-sm text-center italic">Mythri — AI Psychological Companion</p>
            
            <p className="text-on-surface-variant font-body-sm mt-4">
              This agreement governs your access and use of Mythri, built by <strong>Affyne Labs</strong>. You must read and explicitly agree to each section below to proceed. Access is strictly prohibited without full consent.
            </p>

            <div className="space-y-4 mt-4 text-on-surface font-body-sm">
              <div className="space-y-2 p-3.5 bg-surface-variant/20 rounded-xl border border-outline-variant/20">
                <h3 className="font-label-lg font-bold text-primary">1. Eligibility & Age (Mandatory)</h3>
                <label className="flex items-start space-x-3 cursor-pointer">
                  <input type="checkbox" className="mt-1 w-4 h-4 accent-primary" checked={consent.eligibility} onChange={(e) => setConsent({...consent, eligibility: e.target.checked})} />
                  <span>I confirm that I am 18 years of age or older.<br/><span className="text-xs text-on-surface-variant">(Participation in this application is limited to adults. If you are under 18, you may not proceed.)</span></span>
                </label>
              </div>

              <div className="space-y-2 p-3.5 bg-primary/5 rounded-xl border border-primary/20">
                <h3 className="font-label-lg font-bold text-primary">2. Non-Disclosure Agreement (Mandatory)</h3>
                <label className="flex items-start space-x-3 cursor-pointer">
                  <input type="checkbox" className="mt-1 w-4 h-4 accent-primary" checked={consent.nda_agreement} onChange={(e) => setConsent({...consent, nda_agreement: e.target.checked})} />
                  <span className="font-medium text-on-surface">
                    I agree to keep all system architecture, prompt engineering techniques, and internal workings of Mythri and Affyne Labs strictly confidential. I agree NOT to disclose, publish, reverse-engineer, distribute, or share any internal aspects or confidential information with any third party.
                  </span>
                </label>
                <p className="text-xs text-on-surface-variant italic">This obligation is legally binding and survives termination of your account.</p>
              </div>

              <div className="space-y-2 p-3.5 bg-surface-variant/20 rounded-xl border border-outline-variant/20">
                <h3 className="font-label-lg font-bold text-primary">3. Nature of the Product</h3>
                <p>Mythri is an artificial intelligence system created by Affyne Labs, not a licensed therapist, medical doctor, or mental health professional. It does not diagnose or treat medical conditions and does not replace clinical healthcare.</p>
              </div>

              <div className="space-y-2 p-3.5 bg-surface-variant/20 rounded-xl border border-outline-variant/20">
                <h3 className="font-label-lg font-bold text-primary">4. Data Collection & Processing (Mandatory)</h3>
                <label className="flex items-start space-x-3 cursor-pointer">
                  <input type="checkbox" className="mt-1 w-4 h-4 accent-primary" checked={consent.collect_text} onChange={(e) => setConsent({...consent, collect_text: e.target.checked})} />
                  <span>I agree that Affyne Labs may collect and securely process the text and voice content of my conversations with Mythri to deliver empathetic responses.</span>
                </label>
                <label className="flex items-start space-x-3 cursor-pointer">
                  <input type="checkbox" className="mt-1 w-4 h-4 accent-primary" checked={consent.collect_usage} onChange={(e) => setConsent({...consent, collect_usage: e.target.checked})} />
                  <span>I agree that Affyne Labs may collect basic usage metrics (session length, interaction telemetry, system logs).</span>
                </label>
                <label className="flex items-start space-x-3 cursor-pointer">
                  <input type="checkbox" className="mt-1 w-4 h-4 accent-primary" checked={consent.collect_feedback} onChange={(e) => setConsent({...consent, collect_feedback: e.target.checked})} />
                  <span>I agree that Affyne Labs may collect my feedback and ratings to improve user experience.</span>
                </label>
              </div>

              <div className="space-y-2 p-3.5 bg-surface-variant/20 rounded-xl border border-outline-variant/20">
                <h3 className="font-label-lg font-bold text-primary">5. Use of Data for Model Improvement</h3>
                <label className="flex items-start space-x-3 cursor-pointer">
                  <input type="checkbox" className="mt-1 w-4 h-4 accent-primary" checked={consent.model_training} onChange={(e) => setConsent({...consent, model_training: e.target.checked})} />
                  <span>I agree that my conversation data, after strict and full anonymization (removal of all personal identifiers), may be used to evaluate and refine Affyne Labs AI models.</span>
                </label>
              </div>

              <div className="space-y-2 p-3.5 bg-surface-variant/20 rounded-xl border border-outline-variant/20">
                <h3 className="font-label-lg font-bold text-primary">6. Data Retention & Privacy Rights</h3>
                <label className="flex items-start space-x-3 cursor-pointer">
                  <input type="checkbox" className="mt-1 w-4 h-4 accent-primary" checked={consent.data_retention} onChange={(e) => setConsent({...consent, data_retention: e.target.checked})} />
                  <span>I understand that Affyne Labs will not sell my personal data to any third party. I may request deletion of my account and personal data at any time via hello@affynelabs.com.</span>
                </label>
              </div>

              <div className="space-y-2 p-3.5 bg-error-container/20 rounded-xl border border-error/20">
                <h3 className="font-label-lg font-bold text-error">7. Crisis Notice</h3>
                <p className="text-xs">If you are experiencing thoughts of self-harm, suicide, or an acute emergency, please contact emergency services (112 in India) or a national crisis helpline immediately. Mythri is not an emergency response provider.</p>
              </div>
            </div>

            <p className="text-xs text-on-surface-variant mt-6 border-t pt-4">
              By tapping &quot;I Agree &amp; Proceed,&quot; you confirm that you have read, understood, and accept all terms of this agreement, including the Non-Disclosure Agreement and Privacy Policy by Affyne Labs.
            </p>

            <div className="flex gap-4 mt-6">
              <button 
                onClick={() => router.push('/login')} 
                className="flex-1 py-3 bg-surface text-on-surface border border-outline rounded-full font-label-md hover:bg-surface-dim transition-colors">
                Decline
              </button>
              <button 
                onClick={handleAgree} 
                disabled={!canProceed}
                className="flex-1 py-3 bg-primary text-white rounded-full font-label-md transition-all hover:scale-[1.02] disabled:opacity-40 disabled:hover:scale-100 shadow-md">
                I Agree &amp; Proceed
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
