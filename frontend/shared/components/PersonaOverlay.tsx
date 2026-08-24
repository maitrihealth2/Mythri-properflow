import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface Profile {
  preferred_name?: string
  full_name?: string
  profession?: string
  onboarding_summary?: string
  onboarding_goals?: string[]
  onboarding_reasons?: string[]
}

interface PersonaOverlayProps {
  isOpen: boolean
  onClose: () => void
  profile: Profile | null
}

export default function PersonaOverlay({ isOpen, onClose, profile }: PersonaOverlayProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%', opacity: 0.5 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0.5 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 bottom-0 w-full max-w-md bg-white/90 dark:bg-black/90 backdrop-blur-xl border-l border-white/20 dark:border-white/10 shadow-2xl z-[101] overflow-y-auto"
          >
            <div className="p-6 pb-24 relative min-h-full">
              {/* Close Button */}
              <button 
                onClick={onClose}
                className="absolute top-6 right-6 w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20 transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>

              {/* Header */}
              <div className="mb-8 pt-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined text-[32px]">psychology</span>
                </div>
                <h2 className="text-display-xs font-headline-md text-primary">Mythri's Context</h2>
                <p className="text-body-md text-on-surface-variant mt-1">
                  What Mythri remembers about you to personalize your sanctuary.
                </p>
              </div>

              {profile ? (
                <div className="space-y-6">
                  {/* Basic Info */}
                  <div className="p-5 rounded-2xl bg-white/50 dark:bg-white/5 border border-primary/10">
                    <h3 className="text-sm font-label-md uppercase tracking-widest text-primary/70 mb-3">Identity</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-on-surface-variant">Known as</span>
                        <span className="text-sm font-medium text-primary">{profile.preferred_name || profile.full_name || 'Traveler'}</span>
                      </div>
                      {profile.profession && (
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-on-surface-variant">Profession</span>
                          <span className="text-sm font-medium text-primary">{profile.profession}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Summary */}
                  {profile.onboarding_summary && (
                    <div className="p-5 rounded-2xl bg-primary/5 border border-primary/10">
                      <h3 className="text-sm font-label-md uppercase tracking-widest text-primary/70 mb-3">Sanctuary Blueprint</h3>
                      <p className="text-sm leading-relaxed text-on-surface-variant">
                        {profile.onboarding_summary}
                      </p>
                    </div>
                  )}

                  {/* Goals */}
                  {profile.onboarding_goals && profile.onboarding_goals.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-sm font-label-md uppercase tracking-widest text-primary/70 pl-1">Current Focus</h3>
                      <div className="flex flex-wrap gap-2">
                        {profile.onboarding_goals.map((goal, i) => (
                          <span key={i} className="px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium border border-primary/20">
                            {goal}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Reasons */}
                  {profile.onboarding_reasons && profile.onboarding_reasons.length > 0 && (
                    <div className="space-y-2 mt-4">
                      <h3 className="text-sm font-label-md uppercase tracking-widest text-secondary-dark/70 pl-1">Motivations</h3>
                      <div className="flex flex-wrap gap-2">
                        {profile.onboarding_reasons.map((reason, i) => (
                          <span key={i} className="px-3 py-1.5 rounded-full bg-secondary/10 text-secondary-dark text-xs font-medium border border-secondary/20">
                            {reason}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 opacity-50">
                  <span className="material-symbols-outlined text-4xl mb-2 animate-spin">refresh</span>
                  <p className="text-sm">Retrieving memories...</p>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
