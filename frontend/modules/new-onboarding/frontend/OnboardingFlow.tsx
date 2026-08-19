'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { submitOnboarding } from '@/core/api';
import {
  reasonsOptions,
  emotionOptions,
  goalsOptions,
  supportStyleOptions,
  languageOptions,
  communicationOptions,
  checkInOptions,
  primaryGoalOptions,
  Option
} from './onboardingData';

type ConsentData = {
  eligibility: boolean;
  collect_text: boolean;
  collect_usage: boolean;
  collect_feedback: boolean;
  model_training: boolean;
  data_retention: boolean;
};

type OnboardingAnswers = {
  reasons: string[];
  initial_emotion: string;
  goals: string[];
  conversation_style: string;
  language: string;
  communication_mode: string;
  check_in_preference: string;
  preferred_name: string;
  primary_goal: string;
};

export default function OnboardingFlow() {
  const router = useRouter();
  
  const [step, setStep] = useState(0); // 0 = Consent, 1 = Q1, ... 9 = Q9, 10 = Done
  const [consent, setConsent] = useState<ConsentData>({
    eligibility: false,
    collect_text: false,
    collect_usage: false,
    collect_feedback: false,
    model_training: false,
    data_retention: false,
  });
  const [answers, setAnswers] = useState<OnboardingAnswers>({
    reasons: [],
    initial_emotion: '',
    goals: [],
    conversation_style: '',
    language: '',
    communication_mode: '',
    check_in_preference: '',
    preferred_name: '',
    primary_goal: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleNext = () => setStep(s => s + 1);
  const handleBack = () => setStep(s => s - 1);

  const isCurrentStepValid = () => {
    switch (step) {
      case 0: return consent.eligibility;
      case 1: return answers.reasons.length > 0;
      case 2: return answers.initial_emotion !== '';
      case 3: return answers.goals.length > 0;
      case 4: return answers.conversation_style !== '';
      case 5: return answers.language !== '';
      case 6: return answers.communication_mode !== '';
      case 7: return answers.check_in_preference !== '';
      case 8: return true; // Name is optional
      case 9: return answers.primary_goal !== '';
      default: return true;
    }
  };

  const handleMultiSelect = (key: keyof OnboardingAnswers, value: string) => {
    setAnswers(prev => {
      const arr = prev[key] as string[];
      if (arr.includes(value)) {
        return { ...prev, [key]: arr.filter(v => v !== value) };
      }
      return { ...prev, [key]: [...arr, value] };
    });
  };

  const handleSingleSelect = (key: keyof OnboardingAnswers, value: string) => {
    setAnswers(prev => ({ ...prev, [key]: value }));
  };

  const submitFlow = async () => {
    setIsSubmitting(true);
    try {
      const dataPayload = {
        preferred_name: answers.preferred_name || null,
        language: answers.language,
        conversation_style: answers.conversation_style,
        communication_mode: answers.communication_mode,
        initial_emotion: answers.initial_emotion,
        primary_goal: answers.primary_goal,
        check_in_preference: answers.check_in_preference,
        goals: answers.goals,
        reasons: answers.reasons,
        consent: {
          consented: true,
          consentedAt: new Date().toISOString()
        }
      };

      await submitOnboarding(dataPayload);
      if (dataPayload.preferred_name) {
        localStorage.setItem('mb_username', dataPayload.preferred_name);
      }
      router.push('/text-chat');
    } catch (e) {
      console.error("Failed to submit onboarding data:", e);
      setIsSubmitting(false);
    }
  };

  const renderMultiOptions = (key: keyof OnboardingAnswers, options: Option[]) => (
    <div className="flex flex-wrap gap-3 mt-6">
      {options.map(opt => {
        const isSelected = (answers[key] as string[]).includes(opt.value);
        return (
          <button
            key={opt.value}
            onClick={() => handleMultiSelect(key, opt.value)}
            className={`px-5 py-3 rounded-xl transition-all shadow-sm font-body-md border text-left flex flex-col ${
              isSelected
                ? 'bg-[#603347] text-white border-[#603347]'
                : 'bg-white border-[#603347]/20 text-[#4A2B38] hover:bg-white/80'
            }`}
          >
            <div>{opt.label}</div>
            {opt.subtext && <div className={`text-sm mt-1 ${isSelected ? 'opacity-80' : 'text-[#8C7355]'}`}>{opt.subtext}</div>}
          </button>
        );
      })}
    </div>
  );

  const renderSingleOptions = (key: keyof OnboardingAnswers, options: Option[]) => (
    <div className="flex flex-wrap gap-3 mt-6">
      {options.map(opt => {
        const isSelected = answers[key] === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => handleSingleSelect(key, opt.value)}
            className={`px-5 py-3 rounded-xl transition-all shadow-sm font-body-md border text-left flex flex-col ${
              isSelected
                ? 'bg-[#603347] text-white border-[#603347]'
                : 'bg-white border-[#603347]/20 text-[#4A2B38] hover:bg-white/80'
            }`}
          >
            <div>{opt.label}</div>
            {opt.subtext && <div className={`text-sm mt-1 ${isSelected ? 'opacity-80' : 'text-[#8C7355]'}`}>{opt.subtext}</div>}
          </button>
        );
      })}
    </div>
  );

  if (step === 0) {
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
                This screen governs your participation as a test user of Mythri. Please read each section before agreeing.
              </p>

              <div className="space-y-4 mt-4 text-on-surface font-body-sm">
                <div className="space-y-2">
                  <h3 className="font-label-lg font-bold">1. Eligibility</h3>
                  <label className="flex items-start space-x-3 cursor-pointer">
                    <input type="checkbox" className="mt-1" checked={consent.eligibility} onChange={(e) => setConsent({...consent, eligibility: e.target.checked})} />
                    <span>I confirm that I am 18 years of age or older.<br/><span className="text-xs text-on-surface-variant">(Participation in this pilot is currently limited to adults.)</span></span>
                  </label>
                </div>
              </div>

              <p className="text-xs text-on-surface-variant mt-6 border-t pt-4">
                By tapping "I Agree," you confirm that you have read and understood this agreement, that you are 18 years of age or older, and that you consent.
              </p>

              <div className="flex gap-4 mt-6">
                <button 
                  onClick={() => router.push('/login')} 
                  className="flex-1 py-3 bg-surface text-on-surface border border-outline rounded-full font-label-md hover:bg-surface-dim">
                  Decline
                </button>
                <button 
                  onClick={handleNext} 
                  disabled={!consent.eligibility}
                  className="flex-1 py-3 bg-primary text-white rounded-full font-label-md transition-transform hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100">
                  I Agree
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (step === 10) {
    return (
      <div className="min-h-[100dvh] bg-[#FFFDF9] flex flex-col items-center justify-center p-6 selection:bg-[#603347]/20">
         <div className="max-w-2xl text-center space-y-6">
            <h1 className="text-[#4A2B38] font-display-lg text-3xl md:text-5xl tracking-tight">
              I'm glad you're here.
            </h1>
            <p className="text-[#8C7355] font-body-lg text-xl opacity-90 mb-12">
              Your space is ready.
            </p>
            <button 
              onClick={submitFlow}
              disabled={isSubmitting}
              className="px-12 py-5 rounded-full font-label-md text-white bg-[#603347] shadow-lg transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
            >
              {isSubmitting ? 'Starting...' : 'Start your first conversation'}
            </button>
         </div>
      </div>
    );
  }

  // The Steps
  const renderQuestion = () => {
    switch(step) {
      case 1:
        return (
          <>
            <p className="text-[#8C7355] font-body-lg italic mb-2">"Hey, I'm glad you're here. Before we dive in — what's been sitting on your mind lately? No pressure to pick the 'right' one, just whatever feels closest."</p>
            <h2 className="text-[#4A2B38] font-display-md text-2xl md:text-3xl mb-4">What brings you here today?</h2>
            {renderMultiOptions('reasons', reasonsOptions)}
          </>
        );
      case 2:
        return (
          <>
            <p className="text-[#8C7355] font-body-lg italic mb-2">"Got it. Now, if you had to name the feeling that's been visiting you most often this week — what would you call it?"</p>
            <h2 className="text-[#4A2B38] font-display-md text-2xl md:text-3xl mb-4">How have you been feeling lately?</h2>
            {renderSingleOptions('initial_emotion', emotionOptions)}
          </>
        );
      case 3:
        return (
          <>
            <p className="text-[#8C7355] font-body-lg italic mb-2">"That makes sense. So — if things went well between us, what would actually feel different for you?"</p>
            <h2 className="text-[#4A2B38] font-display-md text-2xl md:text-3xl mb-4">What would you like Mythri to help with?</h2>
            {renderMultiOptions('goals', goalsOptions)}
          </>
        );
      case 4:
        return (
          <>
            <p className="text-[#8C7355] font-body-lg italic mb-2">"Everyone needs something different from a companion. When things get heavy, what do you actually want from me?"</p>
            <h2 className="text-[#4A2B38] font-display-md text-2xl md:text-3xl mb-4">What kind of support would you like from Mythri?</h2>
            {renderSingleOptions('conversation_style', supportStyleOptions)}
          </>
        );
      case 5:
        return (
          <>
            <p className="text-[#8C7355] font-body-lg italic mb-2">"What language feels most like home when you're talking about something real?"</p>
            <h2 className="text-[#4A2B38] font-display-md text-2xl md:text-3xl mb-4">Which language would you prefer?</h2>
            {renderSingleOptions('language', languageOptions)}
          </>
        );
      case 6:
        return (
          <>
            <p className="text-[#8C7355] font-body-lg italic mb-2">"Some people think better out loud, others in writing. What's your rhythm?"</p>
            <h2 className="text-[#4A2B38] font-display-md text-2xl md:text-3xl mb-4">How would you like to talk?</h2>
            {renderSingleOptions('communication_mode', communicationOptions)}
          </>
        );
      case 7:
        return (
          <>
            <p className="text-[#8C7355] font-body-lg italic mb-2">"I don't want to be one more notification you dread. How present should I be?"</p>
            <h2 className="text-[#4A2B38] font-display-md text-2xl md:text-3xl mb-4">How often should I check in on you?</h2>
            {renderSingleOptions('check_in_preference', checkInOptions)}
          </>
        );
      case 8:
        return (
          <>
            <p className="text-[#8C7355] font-body-lg italic mb-2">"Last thing before we begin — what name do you want to hear from me? A nickname is perfectly fine."</p>
            <h2 className="text-[#4A2B38] font-display-md text-2xl md:text-3xl mb-4">What should Mythri call you?</h2>
            <input 
              type="text" 
              placeholder="Your name..."
              className="w-full mt-6 px-6 py-4 rounded-xl border border-[#603347]/20 bg-white font-body-lg text-[#4A2B38] focus:outline-none focus:border-[#603347]"
              value={answers.preferred_name}
              onChange={(e) => setAnswers(prev => ({ ...prev, preferred_name: e.target.value }))}
            />
          </>
        );
      case 9:
        return (
          <>
            <p className="text-[#8C7355] font-body-lg italic mb-2">"One more, and then we're done. If nothing else changes but this one thing — what would make this worth it?"</p>
            <h2 className="text-[#4A2B38] font-display-md text-2xl md:text-3xl mb-4">If we're honest — what's the one thing you're really hoping for?</h2>
            {renderSingleOptions('primary_goal', primaryGoalOptions)}
          </>
        );
      default:
        return null;
    }
  }

  const totalSteps = 9;

  return (
    <div className="min-h-[100dvh] bg-[#FFFDF9] flex flex-col font-literata selection:bg-[#603347]/20">
      <div className="w-full h-2 flex mt-4 max-w-3xl mx-auto px-6 gap-2">
        {Array.from({length: totalSteps}).map((_, i) => (
          <div key={i} className={`flex-1 rounded-full h-1.5 transition-all duration-500 ${step - 1 >= i ? 'bg-[#603347]' : 'bg-[#603347]/10'}`} />
        ))}
      </div>
      
      <main className="flex-1 w-full max-w-3xl mx-auto px-6 py-12 flex flex-col justify-center">
        {renderQuestion()}
      </main>

      <footer className="w-full max-w-3xl mx-auto px-6 py-8 flex justify-between items-center bg-[#FFFDF9]">
        <button 
          onClick={handleBack}
          className="px-6 py-3 rounded-full border border-[#603347]/20 text-[#603347] font-label-md hover:bg-[#603347]/5 transition-colors"
        >
          Back
        </button>
        <button 
          onClick={handleNext}
          disabled={!isCurrentStepValid()}
          className="px-8 py-3 rounded-full bg-[#603347] text-white font-label-md transition-transform hover:scale-105 disabled:opacity-30 disabled:hover:scale-100"
        >
          Next
        </button>
      </footer>
    </div>
  );
}
