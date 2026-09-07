'use client'

import { useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'

// Origami fold SVG decoration
function FoldDecoration() {
  return (
    <svg viewBox="0 0 120 120" className="absolute opacity-[0.07] pointer-events-none" aria-hidden="true">
      <polygon points="0,0 120,0 0,120" fill="#603347" />
      <line x1="0" y1="0" x2="120" y2="120" stroke="#8C7355" strokeWidth="0.8" />
      <line x1="60" y1="0" x2="0" y2="60" stroke="#8C7355" strokeWidth="0.6" strokeDasharray="4 6" />
    </svg>
  )
}

export function IntroSection() {
  const containerRef = useRef<HTMLElement>(null)

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start 90%', 'end start'],
  })

  const leftX = useTransform(scrollYProgress, [0, 0.4], [-60, 0])
  const leftOpacity = useTransform(scrollYProgress, [0, 0.4], [0, 1])
  const rightX = useTransform(scrollYProgress, [0, 0.4], [60, 0])
  const rightOpacity = useTransform(scrollYProgress, [0, 0.4], [0, 1])

  return (
    <section
      id="experience"
      ref={containerRef}
      className="relative py-24 md:py-32 px-6 overflow-hidden"
      style={{ background: '#fff8f5' }}
    >
      {/* Fold decoration — top right corner */}
      <div className="absolute top-0 right-0 w-36 h-36">
        <FoldDecoration />
      </div>
      {/* Fold decoration — bottom left */}
      <div className="absolute bottom-0 left-0 w-24 h-24 rotate-180">
        <FoldDecoration />
      </div>

      <div className="max-w-7xl mx-auto">
        {/* Chapter header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5 }}
          className="mb-16"
        >
          <span className="chapter-label">Chapter 01 — Our Reason</span>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-start">

          {/* Left: Pull quote */}
          <motion.div style={{ x: leftX, opacity: leftOpacity }}>
            <h2
              className="font-headline-md text-[#4A2B38] leading-[1.25] mb-6"
              style={{ fontSize: 'clamp(1.6rem, 4vw, 2.25rem)', fontWeight: 600 }}
            >
              Technology has become faster.
              <br />
              Life has become louder.
              <br />
              <span
                style={{
                  background: 'linear-gradient(135deg, #603347, #8C7355)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                Meaningful conversations have become harder to find.
              </span>
            </h2>

            <span className="ink-stroke mb-6" />

            <p
              className="text-[#4A2B38]/65 font-body-lg leading-relaxed mb-8 max-w-md"
              style={{ fontSize: '0.9375rem' }}
            >
              We built Mythri because everyone deserves a place where they can pause, reflect, and feel understood — without judgment, without agenda.
            </p>

            {/* Crease-line accent */}
            <div
              className="flex items-center gap-3 text-xs text-[#8C7355]/70"
              style={{ fontFamily: 'var(--font-label-md)', letterSpacing: '0.08em' }}
            >
              <span className="paper-pin" />
              <span>Est. 2024 · Built with empathy-first principles</span>
            </div>
          </motion.div>

          {/* Right: Stacked paper cards */}
          <motion.div style={{ x: rightX, opacity: rightOpacity }} className="space-y-3 relative">

            {/* Card 1 — Not another chatbot */}
            <div
              className="paper-card rounded-xl p-5 relative"
              style={{ transform: 'rotate(-0.8deg)', marginLeft: '0' }}
            >
              <div
                className="absolute top-0 right-0 w-8 h-8 pointer-events-none"
                style={{ background: 'linear-gradient(225deg, #eedcd8 50%, transparent 50%)', borderBottomLeftRadius: '0.375rem' }}
              />
              <p className="text-[0.6875rem] text-[#8C7355] uppercase tracking-widest mb-1.5 font-label-md">Not another</p>
              <p className="font-headline-md text-[#4A2B38] text-lg" style={{ fontWeight: 600 }}>Chatbot</p>
              <p className="text-xs text-[#4A2B38]/50 mt-1 leading-relaxed" style={{ fontFamily: 'var(--font-body-sm)' }}>
                Transactional responses that forget you the moment you close the tab.
              </p>
            </div>

            {/* Card 2 — Not another assistant */}
            <div
              className="paper-card rounded-xl p-5 relative"
              style={{ transform: 'rotate(0.5deg)', marginLeft: '1.5rem' }}
            >
              <div
                className="absolute top-0 right-0 w-8 h-8 pointer-events-none"
                style={{ background: 'linear-gradient(225deg, #eedcd8 50%, transparent 50%)', borderBottomLeftRadius: '0.375rem' }}
              />
              <p className="text-[0.6875rem] text-[#8C7355] uppercase tracking-widest mb-1.5 font-label-md">Not another</p>
              <p className="font-headline-md text-[#4A2B38] text-lg" style={{ fontWeight: 600 }}>Assistant</p>
              <p className="text-xs text-[#4A2B38]/50 mt-1 leading-relaxed" style={{ fontFamily: 'var(--font-body-sm)' }}>
                Productivity tools optimized for tasks, not for the human behind the screen.
              </p>
            </div>

            {/* Card 3 — Mythri is */}
            <div
              className="rounded-xl p-5 relative"
              style={{
                marginLeft: '3rem',
                transform: 'rotate(-0.4deg)',
                background: 'linear-gradient(135deg, rgba(238,220,216,0.6), rgba(255,248,245,0.95))',
                border: '1px solid rgba(140,115,85,0.2)',
                boxShadow: '2px 4px 16px rgba(96,51,71,0.09)',
              }}
            >
              <div
                className="absolute top-0 right-0 w-8 h-8 pointer-events-none"
                style={{ background: 'linear-gradient(225deg, #d4a8b4 50%, transparent 50%)', borderBottomLeftRadius: '0.375rem' }}
              />
              <p className="text-[0.6875rem] text-[#603347] uppercase tracking-widest mb-1.5 font-label-md">Mythri is</p>
              <p className="font-headline-md text-[#4A2B38] text-lg" style={{ fontWeight: 600 }}>A Calm Sanctuary ✦</p>
              <p className="text-xs text-[#4A2B38]/65 mt-1 leading-relaxed" style={{ fontFamily: 'var(--font-body-sm)' }}>
                A space where your thoughts are held, remembered, and honored across every conversation.
              </p>
            </div>

            {/* Pull-quote note */}
            <p
              className="pt-4 text-[0.8125rem] text-[#4A2B38]/55 italic leading-relaxed pr-4 border-r-2 border-[#8C7355]/20 text-right"
              style={{ fontFamily: 'var(--font-body-lg)', marginLeft: '4rem' }}
            >
              &ldquo;A space where conversations continue, memories matter, and every interaction becomes part of your journey.&rdquo;
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
