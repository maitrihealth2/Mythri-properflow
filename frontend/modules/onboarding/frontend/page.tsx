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
}

export default function OnboardingPage() {
  const router = useRouter()
  const [consent, setConsent] = useState<ConsentData>({
    eligibility: false,
    collect_text: false,
    collect_usage: false,
    collect_feedback: false,
    model_training: false,
    data_retention: false
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

  const handleAgree = () => {
    router.push('/onboarding/chat')
  }

  return (
    <div className="flex-1 w-full flex items-center justify-center relative overflow-hidden min-h-[100dvh] bg-surface">
      <div className="fixed inset-0 bg-plum-high-contrast/5 backdrop-blur-[2px] z-0 pointer-events-none"></div>
      
      <main className="relative z-10 w-full max-w-[480px] m-auto px-6 py-12 flex flex-col items-center">
        <div className="frosted-card rounded-3xl p-6 md:p-10 w-full flex flex-col items-center shadow-sm">
          <div className="flex flex-col space-y-4 animate-fade-in-up w-full text-left bg-surface p-6 rounded-2xl shadow-sm border border-outline-variant/30 max-h-[80vh] overflow-y-auto">
            <h1 className="text-plum-high-contrast font-headline-md text-2xl text-center">MIND BRIDGE</h1>
            <h2 className="text-on-surface font-headline-sm text-center">Participant Consent & Data Use Agreement</h2>
            <p className="text-on-surface-variant font-body-sm text-center italic">Mythri — AI Psychological Companion Pilot</p>
            
            <p className="text-on-surface-variant font-body-sm mt-4">
              This screen governs your participation as a test user of Mythri/Mythri. Please read each section before agreeing.
            </p>

            <div className="space-y-4 mt-4 text-on-surface font-body-sm">
              <div className="space-y-2">
                <h3 className="font-label-lg font-bold">1. Eligibility</h3>
                <label className="flex items-start space-x-3 cursor-pointer">
                  <input type="checkbox" className="mt-1" checked={consent.eligibility} onChange={(e) => setConsent({...consent, eligibility: e.target.checked})} />
                  <span>I confirm that I am 18 years of age or older.<br/><span className="text-xs text-on-surface-variant">(Participation in this pilot is currently limited to adults. If you are under 18, please do not continue.)</span></span>
                </label>
              </div>

              <div className="space-y-2">
                <h3 className="font-label-lg font-bold">2. Nature of the Product</h3>
                <p>Mythri/Mythri is an artificial intelligence system, not a licensed therapist, doctor, or mental health professional. It listens, responds supportively, and helps you reflect — it does not diagnose or treat conditions and does not replace professional mental health care.</p>
              </div>

              <div className="space-y-2">
                <h3 className="font-label-lg font-bold">3. Data We Collect</h3>
                <label className="flex items-start space-x-3 cursor-pointer">
                  <input type="checkbox" className="mt-1" checked={consent.collect_text} onChange={(e) => setConsent({...consent, collect_text: e.target.checked})} />
                  <span>I agree that Mind Bridge may collect the text and/or voice content of my conversations with Mythri/Mythri.</span>
                </label>
                <label className="flex items-start space-x-3 cursor-pointer">
                  <input type="checkbox" className="mt-1" checked={consent.collect_usage} onChange={(e) => setConsent({...consent, collect_usage: e.target.checked})} />
                  <span>I agree that Mind Bridge may collect basic usage data (session length, frequency, feature interactions, technical logs).</span>
                </label>
                <label className="flex items-start space-x-3 cursor-pointer">
                  <input type="checkbox" className="mt-1" checked={consent.collect_feedback} onChange={(e) => setConsent({...consent, collect_feedback: e.target.checked})} />
                  <span>I agree that Mind Bridge may collect my feedback (surveys, ratings, interviews).</span>
                </label>
                <p className="text-xs text-on-surface-variant">You may decline any item individually; this may limit which features you can access.</p>
              </div>

              <div className="space-y-2">
                <h3 className="font-label-lg font-bold">4. Use of Data for Model Training</h3>
                <label className="flex items-start space-x-3 cursor-pointer">
                  <input type="checkbox" className="mt-1" checked={consent.model_training} onChange={(e) => setConsent({...consent, model_training: e.target.checked})} />
                  <span>I agree that my conversation data, after full anonymization (removal of my name, contact details, and other identifying information), may be used to train, fine-tune, and improve the Mythri/Mythri AI model.</span>
                </label>
                <p className="text-xs text-on-surface-variant">Anonymization occurs before training. Anonymized data may be reused across multiple training cycles and cannot be fully withdrawn once incorporated into a trained model.</p>
              </div>

              <div className="space-y-2">
                <h3 className="font-label-lg font-bold">5. Data Retention, Access, and Withdrawal</h3>
                <label className="flex items-start space-x-3 cursor-pointer">
                  <input type="checkbox" className="mt-1" checked={consent.data_retention} onChange={(e) => setConsent({...consent, data_retention: e.target.checked})} />
                  <span>I understand how long my data is retained and who can access it prior to anonymization.</span>
                </label>
                <p className="text-xs text-on-surface-variant">Raw, identifiable data is accessible only to the core Mind Bridge team. You may withdraw and request deletion of your raw data at any time from Settings &gt; Privacy &gt; Delete My Data.</p>
              </div>

              <div className="space-y-2">
                <h3 className="font-label-lg font-bold">6. Crisis Situations and Limits of the AI System</h3>
                <p>Mythri/Mythri includes safety measures intended to recognize signs of crisis or self-harm risk. These safety measures are still under active development and cannot be guaranteed to catch or respond appropriately to every crisis situation.</p>
                <p className="font-bold">If you are experiencing thoughts of self-harm, suicide, or a mental health emergency, please contact a licensed mental health professional, a trusted person, or a crisis helpline immediately. Do not rely on Mythri/Mythri as your sole means of support in a crisis.</p>
              </div>

              <div className="space-y-2">
                <h3 className="font-label-lg font-bold">7. Confidentiality</h3>
                <p>Mind Bridge will not sell your personal data to third parties. Anonymized, aggregated insights may be shared in academic or product-development contexts without identifying you.</p>
              </div>

              <div className="space-y-2">
                <h3 className="font-label-lg font-bold">8. Voluntary Participation</h3>
                <p>Your participation is entirely voluntary. You may stop using Mythri/Mythri and withdraw at any time without penalty.</p>
              </div>
            </div>

            <p className="text-xs text-on-surface-variant mt-6 border-t pt-4">
              By tapping &quot;I Agree,&quot; you confirm that you have read and understood this agreement, that you are 18 years of age or older, and that you consent to the sections checked above. Your agreement will be recorded with a timestamp.
            </p>

            <div className="flex gap-4 mt-6">
              <button 
                onClick={() => router.push('/login')} 
                className="flex-1 py-3 bg-surface text-on-surface border border-outline rounded-full font-label-md hover:bg-surface-dim">
                Decline
              </button>
              <button 
                onClick={handleAgree} 
                disabled={!consent.eligibility}
                className="flex-1 py-3 bg-primary text-white rounded-full font-label-md transition-transform hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100">
                I Agree
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
