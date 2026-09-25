'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getOnboardingStatus, submitOnboarding } from '@/core/api'
import ThemeToggle from '@/shared/components/ThemeToggle'

interface ConsentState {
  eligibility: boolean
  disclaimer: boolean
  privacy: boolean
}

const LANGUAGES = [
  { code: 'en-IN', name: 'English (India)', native: 'English', region: 'Pan-India' },
  { code: 'hi-IN', name: 'Hindi', native: 'हिन्दी', region: 'North / Central India' },
  { code: 'te-IN', name: 'Telugu', native: 'తెలుగు', region: 'Andhra & Telangana' },
  { code: 'ta-IN', name: 'Tamil', native: 'தமிழ்', region: 'Tamil Nadu' },
  { code: 'kn-IN', name: 'Kannada', native: 'ಕನ್ನಡ', region: 'Karnataka' },
  { code: 'mr-IN', name: 'Marathi', native: 'मराठी', region: 'Maharashtra' },
  { code: 'bn-IN', name: 'Bengali', native: 'বাংলা', region: 'West Bengal' },
  { code: 'gu-IN', name: 'Gujarati', native: 'ગુજરાતી', region: 'Gujarat' },
  { code: 'ml-IN', name: 'Malayalam', native: 'മലയാളം', region: 'Kerala' },
  { code: 'pa-IN', name: 'Punjabi', native: 'ਪੰਜਾਬੀ', region: 'Punjab' },
  { code: 'od-IN', name: 'Odia', native: 'ଓଡ଼ିଆ', region: 'Odisha' },
]

const QUICK_AGE_BRACKETS = [
  { label: '18–24', min: 18, max: 24, defaultAge: 21 },
  { label: '25–34', min: 25, max: 34, defaultAge: 28 },
  { label: '35–49', min: 35, max: 49, defaultAge: 40 },
  { label: '50+', min: 50, max: 99, defaultAge: 55 },
]

export default function OnboardingPage() {
  const router = useRouter()

  // Steps: 0 = Consent, 1 = Name, 2 = Age, 3 = Language, 4 = Finalizing
  const [currentStep, setCurrentStep] = useState<number>(0)
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [errorMessage, setErrorMessage] = useState<string>('')

  // Form State
  const [consent, setConsent] = useState<ConsentState>({
    eligibility: false,
    disclaimer: false,
    privacy: false,
  })
  const [preferredName, setPreferredName] = useState<string>('')
  const [age, setAge] = useState<string>('')
  const [selectedLanguage, setSelectedLanguage] = useState<string>('en-IN')

  // Check auth and existing onboarding status
  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('mb_token') : null
    if (!token) {
      router.replace('/login')
      return
    }

    const storedUsername = localStorage.getItem('mb_username')
    if (storedUsername && !preferredName) {
      setPreferredName(storedUsername)
    }

    getOnboardingStatus()
      .then((status) => {
        if (status && status.completed) {
          router.replace('/home')
        }
      })
      .catch((err) => {
        console.error('[ONBOARDING_STATUS_ERR]', err)
      })
  }, [router])

  // Consent validation
  const isConsentValid = consent.eligibility && consent.disclaimer && consent.privacy

  const handleNextStep = () => {
    setErrorMessage('')
    if (currentStep === 0) {
      if (!isConsentValid) {
        setErrorMessage('Please accept all required agreements to continue.')
        return
      }
      setCurrentStep(1)
    } else if (currentStep === 1) {
      if (!preferredName.trim()) {
        setErrorMessage('Please enter what Mythri should call you.')
        return
      }
      setCurrentStep(2)
    } else if (currentStep === 2) {
      const parsedAge = parseInt(age, 10)
      if (!age || isNaN(parsedAge) || parsedAge < 13 || parsedAge > 120) {
        setErrorMessage('Please enter a valid age (13 or older).')
        return
      }
      setCurrentStep(3)
    } else if (currentStep === 3) {
      handleSubmit()
    }
  }

  const handlePrevStep = () => {
    setErrorMessage('')
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1)
    }
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    setErrorMessage('')

    try {
      const payload = {
        preferred_name: preferredName.trim(),
        age: parseInt(age, 10),
        language: selectedLanguage,
        conversation_style: 'auto_adaptive',
        consent: {
          ...consent,
          timestamp: new Date().toISOString(),
          version: '2.0',
        },
      }

      await submitOnboarding(payload)

      if (typeof window !== 'undefined') {
        localStorage.setItem('mb_username', preferredName.trim())
        localStorage.setItem('mb_language', selectedLanguage)
      }

      // Transition animation step
      setCurrentStep(4)
      setTimeout(() => {
        router.replace('/home')
      }, 1600)
    } catch (err: any) {
      console.error('[SUBMIT_ONBOARDING_ERR]', err)
      setErrorMessage(err?.response?.data?.detail || 'Failed to save preferences. Please try again.')
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-[100dvh] w-full flex items-center justify-center p-3 sm:p-6 md:p-8 bg-[#fff8f5] dark:bg-black text-on-surface dark:text-white relative overflow-x-hidden select-none">
      {/* Dynamic Background Elements */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-primary/10 dark:bg-primary/20 blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-secondary/10 dark:bg-secondary/20 blur-[120px]" />
      </div>

      {/* Top Controls */}
      <header className="fixed top-0 left-0 right-0 p-4 sm:p-6 flex justify-between items-center z-40 max-w-5xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
            M
          </div>
          <span className="font-headline-md font-bold tracking-wide text-primary">Mythri</span>
        </div>
        <ThemeToggle />
      </header>

      {/* Main Container */}
      <main className="relative z-10 w-full max-w-[620px] my-auto pt-14 pb-6">
        <div className="bg-white/80 dark:bg-[#141414]/90 backdrop-blur-xl border border-black/5 dark:border-white/10 rounded-3xl p-6 sm:p-8 md:p-10 shadow-2xl transition-all duration-300">
          
          {/* Progress Indicator (Steps 1 to 3) */}
          {currentStep >= 1 && currentStep <= 3 && (
            <div className="mb-8">
              <div className="flex justify-between items-center text-xs font-semibold text-on-surface-variant dark:text-white/60 mb-2">
                <span>Step {currentStep} of 3</span>
                <span>{currentStep === 1 ? 'Your Name' : currentStep === 2 ? 'Your Age' : 'Language'}</span>
              </div>
              <div className="w-full h-1.5 bg-black/5 dark:bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-500 ease-out rounded-full"
                  style={{ width: `${(currentStep / 3) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* STEP 0: Consent & Terms Gate */}
          {currentStep === 0 && (
            <div className="space-y-6 animate-fade-in">
              <div className="text-center space-y-1.5 pb-2">
                <span className="text-xs font-bold tracking-widest text-primary uppercase">Affyne Labs</span>
                <h1 className="text-2xl sm:text-3xl font-headline-md font-bold text-primary dark:text-white">
                  Welcome to Mythri
                </h1>
                <p className="text-sm text-on-surface-variant dark:text-white/70 max-w-md mx-auto">
                  A compassionate, culturally attuned space for your mental wellness.
                </p>
              </div>

              <div className="space-y-3.5 text-xs sm:text-sm">
                {/* 1. Age Eligibility */}
                <div
                  onClick={() => setConsent((prev) => ({ ...prev, eligibility: !prev.eligibility }))}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-3.5 ${
                    consent.eligibility
                      ? 'bg-primary/5 border-primary/40 dark:bg-primary/10'
                      : 'bg-black/[0.02] dark:bg-white/[0.03] border-black/10 dark:border-white/10 hover:border-black/20'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={consent.eligibility}
                    onChange={() => {}}
                    className="mt-0.5 w-4 h-4 rounded text-primary focus:ring-primary accent-primary shrink-0"
                  />
                  <div className="space-y-0.5">
                    <p className="font-semibold text-on-surface dark:text-white">1. Age Eligibility</p>
                    <p className="text-on-surface-variant dark:text-white/60 leading-relaxed text-xs">
                      I confirm that I am 18 years of age or older (or of legal digital consent age).
                    </p>
                  </div>
                </div>

                {/* 2. AI Companion & Medical Disclaimer */}
                <div
                  onClick={() => setConsent((prev) => ({ ...prev, disclaimer: !prev.disclaimer }))}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-3.5 ${
                    consent.disclaimer
                      ? 'bg-primary/5 border-primary/40 dark:bg-primary/10'
                      : 'bg-black/[0.02] dark:bg-white/[0.03] border-black/10 dark:border-white/10 hover:border-black/20'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={consent.disclaimer}
                    onChange={() => {}}
                    className="mt-0.5 w-4 h-4 rounded text-primary focus:ring-primary accent-primary shrink-0"
                  />
                  <div className="space-y-0.5">
                    <p className="font-semibold text-on-surface dark:text-white">2. Medical &amp; Emergency Disclaimer</p>
                    <p className="text-on-surface-variant dark:text-white/60 leading-relaxed text-xs">
                      I understand Mythri is an AI companion for emotional reflection and wellness support — not a licensed medical professional or replacement for emergency crisis care.
                    </p>
                  </div>
                </div>

                {/* 3. Privacy & Data Use */}
                <div
                  onClick={() => setConsent((prev) => ({ ...prev, privacy: !prev.privacy }))}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-3.5 ${
                    consent.privacy
                      ? 'bg-primary/5 border-primary/40 dark:bg-primary/10'
                      : 'bg-black/[0.02] dark:bg-white/[0.03] border-black/10 dark:border-white/10 hover:border-black/20'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={consent.privacy}
                    onChange={() => {}}
                    className="mt-0.5 w-4 h-4 rounded text-primary focus:ring-primary accent-primary shrink-0"
                  />
                  <div className="space-y-0.5">
                    <p className="font-semibold text-on-surface dark:text-white">3. Privacy &amp; Data Security</p>
                    <p className="text-on-surface-variant dark:text-white/60 leading-relaxed text-xs">
                      I consent to my conversation and audio data being processed securely to deliver tailored responses. My data is strictly protected and will never be sold.
                    </p>
                  </div>
                </div>
              </div>

              {errorMessage && (
                <p className="text-xs text-red-500 dark:text-red-400 text-center font-medium">{errorMessage}</p>
              )}

              <button
                onClick={handleNextStep}
                disabled={!isConsentValid}
                className={`w-full py-4 rounded-2xl font-headline-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
                  isConsentValid
                    ? 'bg-primary text-on-primary shadow-lg shadow-primary/25 hover:brightness-105 active:scale-[0.99]'
                    : 'bg-black/10 dark:bg-white/10 text-on-surface-variant/40 dark:text-white/30 cursor-not-allowed'
                }`}
              >
                <span>I Agree &amp; Continue</span>
                <span className="material-symbols-outlined text-lg">arrow_forward</span>
              </button>
            </div>
          )}

          {/* STEP 1: Name / Nickname */}
          {currentStep === 1 && (
            <div className="space-y-6 animate-fade-in">
              <div className="space-y-2 text-center">
                <span className="inline-block p-3 rounded-2xl bg-primary/10 text-primary mb-1">
                  <span className="material-symbols-outlined text-2xl">badge</span>
                </span>
                <h2 className="text-2xl sm:text-3xl font-headline-md font-bold text-on-surface dark:text-white">
                  What should Mythri call you?
                </h2>
                <p className="text-sm text-on-surface-variant dark:text-white/70">
                  Pick a first name, nickname, or whatever feels comfortable.
                </p>
              </div>

              <div className="space-y-2">
                <input
                  type="text"
                  value={preferredName}
                  onChange={(e) => setPreferredName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleNextStep()}
                  placeholder="e.g., Fareed, Alex, Sunshine..."
                  autoFocus
                  maxLength={40}
                  className="w-full text-center text-xl sm:text-2xl font-semibold py-4 px-6 rounded-2xl bg-black/[0.03] dark:bg-white/[0.05] border border-black/10 dark:border-white/15 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
                />
              </div>

              {errorMessage && (
                <p className="text-xs text-red-500 dark:text-red-400 text-center font-medium">{errorMessage}</p>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handlePrevStep}
                  className="px-5 py-3.5 rounded-2xl font-semibold text-sm border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 transition-all"
                >
                  Back
                </button>
                <button
                  onClick={handleNextStep}
                  disabled={!preferredName.trim()}
                  className="flex-1 py-3.5 rounded-2xl bg-primary text-on-primary font-semibold text-sm shadow-lg shadow-primary/25 hover:brightness-105 active:scale-[0.99] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <span>Continue</span>
                  <span className="material-symbols-outlined text-base">arrow_forward</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Age */}
          {currentStep === 2 && (
            <div className="space-y-6 animate-fade-in">
              <div className="space-y-2 text-center">
                <span className="inline-block p-3 rounded-2xl bg-primary/10 text-primary mb-1">
                  <span className="material-symbols-outlined text-2xl">calendar_today</span>
                </span>
                <h2 className="text-2xl sm:text-3xl font-headline-md font-bold text-on-surface dark:text-white">
                  How old are you, {preferredName}?
                </h2>
                <p className="text-sm text-on-surface-variant dark:text-white/70">
                  This helps Mythri tune reflections and context to your life stage.
                </p>
              </div>

              {/* Direct Number Input */}
              <div className="max-w-[200px] mx-auto">
                <input
                  type="number"
                  min={13}
                  max={120}
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleNextStep()}
                  placeholder="Age (e.g. 24)"
                  autoFocus
                  className="w-full text-center text-3xl font-bold py-3.5 px-4 rounded-2xl bg-black/[0.03] dark:bg-white/[0.05] border border-black/10 dark:border-white/15 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
                />
              </div>

              {/* Quick Age Selectors */}
              <div className="space-y-2">
                <p className="text-xs text-center font-medium text-on-surface-variant dark:text-white/50">
                  Or select your age bracket:
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {QUICK_AGE_BRACKETS.map((bracket) => (
                    <button
                      key={bracket.label}
                      type="button"
                      onClick={() => setAge(String(bracket.defaultAge))}
                      className={`py-2.5 px-3 rounded-xl text-xs font-semibold border transition-all ${
                        parseInt(age, 10) >= bracket.min && parseInt(age, 10) <= bracket.max
                          ? 'bg-primary text-on-primary border-primary shadow-sm'
                          : 'bg-black/[0.02] dark:bg-white/[0.03] border-black/10 dark:border-white/10 hover:border-primary/40'
                      }`}
                    >
                      {bracket.label}
                    </button>
                  ))}
                </div>
              </div>

              {errorMessage && (
                <p className="text-xs text-red-500 dark:text-red-400 text-center font-medium">{errorMessage}</p>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handlePrevStep}
                  className="px-5 py-3.5 rounded-2xl font-semibold text-sm border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 transition-all"
                >
                  Back
                </button>
                <button
                  onClick={handleNextStep}
                  disabled={!age || parseInt(age, 10) < 13}
                  className="flex-1 py-3.5 rounded-2xl bg-primary text-on-primary font-semibold text-sm shadow-lg shadow-primary/25 hover:brightness-105 active:scale-[0.99] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <span>Continue</span>
                  <span className="material-symbols-outlined text-base">arrow_forward</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Preferred Language (Final Step) */}
          {currentStep === 3 && (
            <div className="space-y-6 animate-fade-in">
              <div className="space-y-2 text-center">
                <span className="inline-block p-3 rounded-2xl bg-primary/10 text-primary mb-1">
                  <span className="material-symbols-outlined text-2xl">translate</span>
                </span>
                <h2 className="text-2xl sm:text-3xl font-headline-md font-bold text-on-surface dark:text-white">
                  Which language feels most natural?
                </h2>
                <p className="text-sm text-on-surface-variant dark:text-white/70">
                  Mythri adapts voice and text conversations to your primary tongue.
                </p>
              </div>

              {/* Language Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[280px] overflow-y-auto pr-1">
                {LANGUAGES.map((lang) => {
                  const isSelected = selectedLanguage === lang.code
                  return (
                    <button
                      key={lang.code}
                      type="button"
                      onClick={() => setSelectedLanguage(lang.code)}
                      className={`p-3 rounded-2xl border text-left transition-all relative flex flex-col justify-between ${
                        isSelected
                          ? 'bg-primary/10 border-primary text-primary shadow-sm dark:bg-primary/20 dark:text-white'
                          : 'bg-black/[0.02] dark:bg-white/[0.03] border-black/10 dark:border-white/10 hover:border-black/20 dark:hover:border-white/20'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <span className="text-xs font-bold">{lang.name}</span>
                        {isSelected && (
                          <span className="material-symbols-outlined text-primary text-base">check_circle</span>
                        )}
                      </div>
                      <span className="text-base font-semibold mt-1 opacity-90">{lang.native}</span>
                    </button>
                  )
                })}
              </div>

              {errorMessage && (
                <p className="text-xs text-red-500 dark:text-red-400 text-center font-medium">{errorMessage}</p>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handlePrevStep}
                  disabled={isSubmitting}
                  className="px-5 py-3.5 rounded-2xl font-semibold text-sm border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 transition-all disabled:opacity-40"
                >
                  Back
                </button>
                <button
                  onClick={handleNextStep}
                  disabled={isSubmitting}
                  className="flex-1 py-3.5 rounded-2xl bg-primary text-on-primary font-semibold text-sm shadow-lg shadow-primary/25 hover:brightness-105 active:scale-[0.99] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Saving your preferences...</span>
                    </>
                  ) : (
                    <>
                      <span>Complete Setup</span>
                      <span className="material-symbols-outlined text-base">sparkles</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: Calming Completion Transition */}
          {currentStep === 4 && (
            <div className="py-10 text-center space-y-5 animate-fade-in">
              <div className="w-20 h-20 mx-auto rounded-full bg-primary/20 flex items-center justify-center text-primary shadow-xl shadow-primary/20 animate-pulse">
                <span className="material-symbols-outlined text-4xl">spa</span>
              </div>
              <div className="space-y-1.5">
                <h2 className="text-2xl font-headline-md font-bold text-primary dark:text-white">
                  Welcome home, {preferredName}
                </h2>
                <p className="text-sm text-on-surface-variant dark:text-white/70">
                  Mythri is personalizing your quiet sanctuary...
                </p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
