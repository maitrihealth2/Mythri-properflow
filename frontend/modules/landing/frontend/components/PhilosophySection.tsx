'use client'

import { useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'

// Ink brushstroke SVG
function InkBrush({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 12" className={className} aria-hidden="true" fill="none">
      <path
        d="M2 6 Q15 2 30 6 Q50 10 70 5 Q90 1 105 6 Q112 8 118 5"
        stroke="#8C7355"
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.35"
      />
      <path
        d="M8 7 Q25 4 45 7 Q65 10 85 6 Q100 3 116 7"
        stroke="#603347"
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity="0.18"
      />
    </svg>
  )
}

const quotes = [
  {
    text: 'AI shouldn\'t just strive to be "smart". It should strive to be kind.',
    attr: 'On our design principles',
  },
  {
    text: 'Productivity is measurable, but peace of mind is invaluable.',
    attr: 'On what we optimize for',
  },
  {
    text: 'We didn\'t build Mythri to do your work. We built it to listen to your day.',
    attr: 'On our purpose',
  },
]

export function PhilosophySection() {
  const containerRef = useRef<HTMLElement>(null)

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start 90%', 'end start'],
  })

  const opacity = useTransform(scrollYProgress, [0, 0.4], [0, 1])
  const y = useTransform(scrollYProgress, [0, 0.4], [30, 0])

  return (
    <section
      id="philosophy"
      ref={containerRef}
      className="relative py-24 md:py-32 px-6 overflow-hidden"
      style={{ background: '#fffdf8' }}
    >
      {/* Journal ruled lines in background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, transparent, transparent 30px, rgba(140,115,85,0.05) 30px, rgba(140,115,85,0.05) 31px)',
          backgroundPositionY: '4rem',
        }}
      />

      {/* Left margin line — like a journal */}
      <div
        className="absolute left-[3.5rem] md:left-[8rem] top-0 bottom-0 pointer-events-none"
        style={{ borderLeft: '1px solid rgba(140,115,85,0.10)' }}
      />

      <motion.div style={{ opacity, y }} className="max-w-4xl mx-auto relative z-10">
        {/* Chapter label */}
        <div className="mb-8">
          <span className="chapter-label">Chapter 08 — Our Philosophy</span>
        </div>

        {/* Journal page heading */}
        <div className="mb-2">
          <h2
            className="font-headline-md text-[#4A2B38]"
            style={{ fontSize: 'clamp(1.4rem, 3.5vw, 2rem)', fontWeight: 600, lineHeight: 1.3 }}
          >
            What we believe.
          </h2>
        </div>

        {/* Ink brushstroke under heading */}
        <InkBrush className="w-28 mb-10" />

        {/* Quotes as journal entries */}
        <div className="space-y-10">
          {quotes.map((q, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.6, delay: i * 0.18 }}
              className="relative pl-8"
            >
              {/* Ink quote mark */}
              <div
                className="absolute left-0 top-0 font-headline-md"
                style={{
                  fontSize: '3rem',
                  lineHeight: 0.8,
                  color: '#8C7355',
                  opacity: 0.2,
                  fontFamily: 'Georgia, serif',
                  userSelect: 'none',
                }}
              >
                &ldquo;
              </div>

              <p
                className="font-body-lg text-[#4A2B38]/80 italic leading-relaxed mb-2"
                style={{ fontSize: '1rem', lineHeight: 1.8 }}
              >
                &ldquo;{q.text}&rdquo;
              </p>
              <p
                className="text-[#8C7355] not-italic"
                style={{
                  fontSize: '0.6875rem',
                  fontFamily: 'var(--font-label-md)',
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                }}
              >
                — {q.attr}
              </p>

              {/* Ruled line below each quote */}
              {i < quotes.length - 1 && (
                <div
                  className="mt-8 h-px"
                  style={{ background: 'linear-gradient(90deg, rgba(140,115,85,0.12), transparent)' }}
                />
              )}
            </motion.div>
          ))}
        </div>

        {/* End mark — journal colophon style */}
        <div className="mt-16 flex items-center gap-4">
          <InkBrush className="w-20" />
          <span
            style={{
              fontSize: '0.6875rem',
              fontFamily: 'var(--font-label-md)',
              letterSpacing: '0.16em',
              color: 'rgba(140,115,85,0.5)',
              textTransform: 'uppercase',
            }}
          >
            Mythri · Est. 2024
          </span>
          <InkBrush className="w-20" />
        </div>
      </motion.div>
    </section>
  )
}
