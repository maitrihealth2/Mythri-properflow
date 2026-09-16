'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Share, PlusSquare, Smartphone } from 'lucide-react'

interface IOSInstallGuideModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function IOSInstallGuideModal({ isOpen, onClose }: IOSInstallGuideModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 sm:p-6">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />

          {/* Dialog Card */}
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-md bg-white dark:bg-[#1E1B22] rounded-3xl p-6 shadow-2xl border border-black/5 dark:border-white/10 z-10 overflow-hidden"
          >
            {/* Top Close Button & Header */}
            <div className="flex items-center justify-between pb-4 border-b border-outline-variant/30">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-primary/10 dark:bg-primary/25 flex items-center justify-center text-primary dark:text-plum-light">
                  <Smartphone size={20} />
                </div>
                <div>
                  <h3 className="font-headline font-semibold text-base text-on-surface">Install Mythri</h3>
                  <p className="text-xs text-on-surface-variant/70">For iPhone & iPad</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full flex items-center justify-center bg-surface-container hover:bg-surface-container-highest transition-colors text-on-surface-variant"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            {/* Instruction Steps */}
            <div className="mt-5 space-y-4 text-sm text-on-surface">
              <div className="flex items-start gap-3.5 p-3 rounded-2xl bg-surface-container/60 border border-outline-variant/20">
                <div className="w-8 h-8 rounded-xl bg-primary text-white flex items-center justify-center flex-shrink-0 text-xs font-bold">
                  1
                </div>
                <div className="flex-1 pt-0.5">
                  <p className="font-medium text-xs sm:text-sm">
                    Tap the <span className="font-semibold text-primary dark:text-plum-light">Share</span> button in Safari&apos;s toolbar.
                  </p>
                  <div className="flex items-center gap-1.5 mt-1.5 text-xs text-on-surface-variant">
                    <Share size={14} className="text-primary" />
                    <span>Located at the bottom or top of Safari</span>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3.5 p-3 rounded-2xl bg-surface-container/60 border border-outline-variant/20">
                <div className="w-8 h-8 rounded-xl bg-primary text-white flex items-center justify-center flex-shrink-0 text-xs font-bold">
                  2
                </div>
                <div className="flex-1 pt-0.5">
                  <p className="font-medium text-xs sm:text-sm">
                    Scroll down and select <span className="font-semibold text-primary dark:text-plum-light">&quot;Add to Home Screen&quot;</span>.
                  </p>
                  <div className="flex items-center gap-1.5 mt-1.5 text-xs text-on-surface-variant">
                    <PlusSquare size={14} className="text-primary" />
                    <span>Tap Add in the top-right corner</span>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3.5 p-3 rounded-2xl bg-surface-container/60 border border-outline-variant/20">
                <div className="w-8 h-8 rounded-xl bg-primary text-white flex items-center justify-center flex-shrink-0 text-xs font-bold">
                  3
                </div>
                <div className="flex-1 pt-0.5">
                  <p className="font-medium text-xs sm:text-sm">
                    Mythri will appear on your Home Screen as a standalone app.
                  </p>
                </div>
              </div>
            </div>

            {/* Bottom Action */}
            <div className="mt-6 pt-2">
              <button
                onClick={onClose}
                className="w-full py-3 px-4 rounded-2xl bg-primary text-white font-medium text-sm hover:bg-primary/90 active:scale-[0.99] transition-all shadow-md"
              >
                Got It
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
