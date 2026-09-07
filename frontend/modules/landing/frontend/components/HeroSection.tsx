'use client'

import { useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

// Full SVG origami background — crane flock + fold-line grid
function OrigamiBackground() {
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none select-none"
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* Fold-line grid pattern */}
        <pattern id="fold-grid" x="0" y="0" width="80" height="80" patternUnits="userSpaceOnUse">
          <path d="M 80 0 L 0 80" stroke="#8C7355" strokeWidth="0.4" opacity="0.12" />
          <path d="M 0 0 L 80 80" stroke="#8C7355" strokeWidth="0.4" opacity="0.06" />
        </pattern>
        {/* Crease lines */}
        <pattern id="crease" x="0" y="0" width="160" height="160" patternUnits="userSpaceOnUse">
          <line x1="0" y1="80" x2="160" y2="80" stroke="#603347" strokeWidth="0.3" opacity="0.08" />
          <line x1="80" y1="0" x2="80" y2="160" stroke="#603347" strokeWidth="0.3" opacity="0.08" />
        </pattern>
      </defs>

      {/* Background grid */}
      <rect width="100%" height="100%" fill="url(#fold-grid)" />
      <rect width="100%" height="100%" fill="url(#crease)" />

      {/* Large ambient paper fold shapes */}
      <polygon points="0,0 420,0 0,380" fill="#8C7355" opacity="0.03" />
      <polygon points="100%,0 100%,280 60%,0" fill="#603347" opacity="0.04" />
      <polygon points="0,100% 320,100% 0,60%" fill="#EEDCD8" opacity="0.25" />

      {/* Scattered origami crane silhouettes — various sizes, positions */}
      {/* Crane 1 — large, top-right */}
      <g transform="translate(72%, 8%) scale(2.2) rotate(-12)" opacity="0.09">
        <path d="M16 4 L26 14 L22 16 L28 22 L16 18 L4 22 L10 16 L6 14 Z" fill="#603347" />
        <path d="M16 18 L16 28 L13 24 M16 28 L19 24" stroke="#603347" strokeWidth="1.2" fill="none" strokeLinecap="round" />
      </g>
      {/* Crane 2 — mid-right */}
      <g transform="translate(82%, 35%) scale(1.4) rotate(8)" opacity="0.07">
        <path d="M16 4 L26 14 L22 16 L28 22 L16 18 L4 22 L10 16 L6 14 Z" fill="#8C7355" />
        <path d="M16 18 L16 28 L13 24 M16 28 L19 24" stroke="#8C7355" strokeWidth="1.2" fill="none" strokeLinecap="round" />
      </g>
      {/* Crane 3 — small, top-left */}
      <g transform="translate(8%, 12%) scale(0.9) rotate(-5)" opacity="0.06">
        <path d="M16 4 L26 14 L22 16 L28 22 L16 18 L4 22 L10 16 L6 14 Z" fill="#603347" />
        <path d="M16 18 L16 28 L13 24 M16 28 L19 24" stroke="#603347" strokeWidth="1.2" fill="none" strokeLinecap="round" />
      </g>
      {/* Crane 4 — tiny, scattered */}
      <g transform="translate(55%, 72%) scale(0.7) rotate(20)" opacity="0.05">
        <path d="M16 4 L26 14 L22 16 L28 22 L16 18 L4 22 L10 16 L6 14 Z" fill="#8C7355" />
        <path d="M16 18 L16 28 L13 24 M16 28 L19 24" stroke="#8C7355" strokeWidth="1.2" fill="none" strokeLinecap="round" />
      </g>
      {/* Crane 5 — medium, left-bottom */}
      <g transform="translate(15%, 68%) scale(1.6) rotate(-18)" opacity="0.06">
        <path d="M16 4 L26 14 L22 16 L28 22 L16 18 L4 22 L10 16 L6 14 Z" fill="#603347" />
        <path d="M16 18 L16 28 L13 24 M16 28 L19 24" stroke="#603347" strokeWidth="1.2" fill="none" strokeLinecap="round" />
      </g>

      {/* Decorative origami fold lines emanating from top-right corner */}
      <line x1="100%" y1="0" x2="60%" y2="40%" stroke="#8C7355" strokeWidth="0.6" opacity="0.10" strokeDasharray="6 8" />
      <line x1="100%" y1="0" x2="45%" y2="55%" stroke="#603347" strokeWidth="0.5" opacity="0.07" strokeDasharray="4 10" />
      <line x1="100%" y1="0" x2="75%" y2="60%" stroke="#8C7355" strokeWidth="0.4" opacity="0.08" strokeDasharray="3 12" />

      {/* Decorative fold from bottom-left */}
      <line x1="0" y1="100%" x2="35%" y2="50%" stroke="#8C7355" strokeWidth="0.5" opacity="0.08" strokeDasharray="5 9" />

      {/* Small geometric diamond accents */}
      <polygon points="88%,18% 90%,15% 92%,18% 90%,21%" fill="#8C7355" opacity="0.12" />
      <polygon points="12%,45% 14%,42% 16%,45% 14%,48%" fill="#603347" opacity="0.10" />
      <polygon points="65%,82% 67%,79% 69%,82% 67%,85%" fill="#8C7355" opacity="0.09" />
    </svg>
  )
}

export function HeroSection() {
  const containerRef = useRef<HTMLElement>(null)

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end start'],
  })

  const textY = useTransform(scrollYProgress, [0, 1], [0, 80])
  const opacity = useTransform(scrollYProgress, [0, 0.75], [1, 0])

  return (
    <section
      ref={containerRef}
      className="relative min-h-screen overflow-hidden bg-parchment flex flex-col"
    >
      {/* SVG origami background */}
      <OrigamiBackground />

      {/* Content */}
      <div className="relative z-10 flex-1 flex items-center">
        <div className="w-full max-w-7xl mx-auto px-6 md:px-10 pt-28 pb-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">

            {/* Left: Editorial text block */}
            <motion.div style={{ y: textY, opacity }}>

              {/* Chapter label */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="mb-6"
              >
                <span className="chapter-label">Prologue</span>
              </motion.div>

              {/* Main headline — editorial, not billboard */}
              <motion.h1
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.25 }}
                className="font-headline-md text-[#4A2B38] leading-[1.18] mb-6"
                style={{ fontSize: 'clamp(2rem, 5vw, 2.75rem)', fontWeight: 600 }}
              >
                Everyone deserves one place
                <br />
                where they{' '}
                <em
                  className="not-italic"
                  style={{
                    background: 'linear-gradient(135deg, #603347 20%, #8C7355 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  don&apos;t have to pretend.
                </em>
              </motion.h1>

              {/* Ink stroke divider */}
              <motion.span
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.7, delay: 0.5, ease: 'easeOut' }}
                className="ink-stroke mb-6"
                style={{ transformOrigin: 'left' }}
              />

              {/* Lead paragraph — properly sized */}
              <motion.p
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.55 }}
                className="text-[#4A2B38]/70 font-body-lg leading-relaxed mb-8 max-w-md"
                style={{ fontSize: '1rem', lineHeight: '1.75' }}
              >
                An emotionally intelligent AI companion that listens, remembers, and grows with you — through every conversation, in every language.
              </motion.p>

              {/* Action row */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.7 }}
                className="flex flex-col sm:flex-row items-start gap-3"
              >
                <Link
                  href="/home"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-label-md text-white transition-all duration-300 hover:opacity-90 hover:-translate-y-0.5 group"
                  style={{
                    background: 'linear-gradient(135deg, #603347, #8C7355)',
                    boxShadow: '0 4px 16px rgba(96,51,71,0.28)',
                    letterSpacing: '0.04em',
                  }}
                >
                  Begin Your Journey
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </Link>

                <a
                  href="#experience"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-label-md text-[#4A2B38]/70 hover:text-[#4A2B38] transition-colors"
                  style={{ border: '1px solid rgba(140,115,85,0.25)', letterSpacing: '0.04em' }}
                >
                  Discover More
                </a>
              </motion.div>

              {/* Trust marks */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 1.0 }}
                className="mt-8 flex flex-wrap items-center gap-5 text-[0.7rem] text-[#4A2B38]/50 font-label-md tracking-wide"
              >
                <span className="flex items-center gap-1.5">
                  <span className="paper-pin" />
                  Empathy-First Architecture
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="paper-pin" style={{ background: 'radial-gradient(circle at 38% 35%, #c4e8d4, #355a47 70%)' }} />
                  End-to-End Encrypted
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="paper-pin" style={{ background: 'radial-gradient(circle at 38% 35%, #c4cce8, #354a87 70%)' }} />
                  Multilingual Native Support
                </span>
              </motion.div>
            </motion.div>

            {/* Right: Composed SVG paper art panel */}
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 1, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
              style={{ y: useTransform(scrollYProgress, [0, 1], [0, 40]) }}
              className="hidden lg:flex justify-center items-center"
            >
              <div className="relative w-full max-w-sm">

                {/* Main paper card — conversation simulation */}
                <div
                  className="paper-card rounded-2xl p-6 relative"
                  style={{ transform: 'rotate(-1deg)', boxShadow: '3px 6px 24px rgba(96,51,71,0.10)' }}
                >
                  {/* Folded corner */}
                  <div
                    className="absolute top-0 right-0 w-9 h-9 pointer-events-none"
                    style={{
                      background: 'linear-gradient(225deg, #eedcd8 50%, transparent 50%)',
                      borderBottomLeftRadius: '0.5rem',
                    }}
                  />
                  <p className="chapter-label mb-4">Today&apos;s Conversation</p>
                  
                  {/* Simulated chat messages */}
                  <div className="space-y-3">
                    <div className="flex gap-2.5 items-start">
                      <div
                        className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-white text-[0.55rem]"
                        style={{ background: 'linear-gradient(135deg, #603347, #8C7355)' }}
                      >
                        M
                      </div>
                      <div
                        className="rounded-xl rounded-tl-none px-3 py-2 text-xs text-[#4A2B38]/80 leading-relaxed max-w-[200px]"
                        style={{ background: 'rgba(238,220,216,0.45)', border: '1px solid rgba(140,115,85,0.12)' }}
                      >
                        I noticed something different in your voice today. What&apos;s on your mind?
                      </div>
                    </div>

                    <div className="flex gap-2.5 items-start flex-row-reverse">
                      <div
                        className="w-6 h-6 rounded-full flex-shrink-0"
                        style={{ background: 'linear-gradient(135deg, #8C7355, #c4a882)' }}
                      />
                      <div
                        className="rounded-xl rounded-tr-none px-3 py-2 text-xs text-[#4A2B38]/80 leading-relaxed max-w-[190px]"
                        style={{ background: 'rgba(255,253,248,0.95)', border: '1px solid rgba(140,115,85,0.14)' }}
                      >
                        It&apos;s been a heavy week. I just needed somewhere to say that.
                      </div>
                    </div>

                    <div className="flex gap-2.5 items-start">
                      <div
                        className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-white text-[0.55rem]"
                        style={{ background: 'linear-gradient(135deg, #603347, #8C7355)' }}
                      >
                        M
                      </div>
                      <div
                        className="rounded-xl rounded-tl-none px-3 py-2 text-xs text-[#4A2B38]/80 leading-relaxed max-w-[200px]"
                        style={{ background: 'rgba(238,220,216,0.45)', border: '1px solid rgba(140,115,85,0.12)' }}
                      >
                        I&apos;m here. And I remember last Tuesday too — you were carrying a lot then as well.
                      </div>
                    </div>
                  </div>

                  {/* Input area simulation */}
                  <div
                    className="mt-4 flex items-center gap-2 rounded-xl px-3 py-2.5"
                    style={{ border: '1px solid rgba(140,115,85,0.2)', background: 'rgba(255,253,248,0.7)' }}
                  >
                    <span className="text-xs text-[#4A2B38]/35 flex-1">Say anything...</span>
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center"
                      style={{ background: 'linear-gradient(135deg, #603347, #8C7355)' }}
                    >
                      <ArrowRight className="w-2.5 h-2.5 text-white" />
                    </div>
                  </div>
                </div>

                {/* Secondary paper card — memory recall */}
                <div
                  className="paper-card rounded-xl p-4 absolute -bottom-8 -right-6 w-44"
                  style={{ transform: 'rotate(2.5deg)', boxShadow: '2px 4px 16px rgba(96,51,71,0.09)' }}
                >
                  <p className="chapter-label text-[0.6rem] mb-2" style={{ fontSize: '0.6rem' }}>Memory Recall</p>
                  <p className="text-[0.7rem] text-[#4A2B38]/70 leading-relaxed italic">
                    &ldquo;Prefers evening calls, sister&apos;s name is Priya...&rdquo;
                  </p>
                </div>

                {/* Tertiary card — mood */}
                <div
                  className="paper-card rounded-xl p-3 absolute -top-6 -left-5 w-36"
                  style={{ transform: 'rotate(-3deg)', boxShadow: '2px 4px 12px rgba(96,51,71,0.08)' }}
                >
                  <p className="text-[0.6rem] text-[#8C7355] uppercase tracking-widest mb-1.5">Today&apos;s Mood</p>
                  <div className="flex gap-1 flex-wrap">
                    {['Pensive', 'Reflective'].map(m => (
                      <span
                        key={m}
                        className="text-[0.6rem] px-1.5 py-0.5 rounded-full text-[#4A2B38]/70"
                        style={{ background: 'rgba(238,220,216,0.5)', border: '1px solid rgba(140,115,85,0.15)' }}
                      >
                        {m}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Torn paper bottom edge */}
      <div className="torn-edge-bottom" style={{ height: '28px' }} />
    </section>
  )
}
