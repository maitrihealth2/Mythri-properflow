'use client'

import { useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'

const stats = [
  {
    value: '50ms',
    label: 'Response Latency',
    sub: 'For fluid conversational turn-taking',
  },
  {
    value: '400+',
    label: 'Emotional Nuances',
    sub: 'Detected in voice and text inputs',
  },
  {
    value: '24/7',
    label: 'Always Available',
    sub: 'A sanctuary ready whenever you are',
  },
]

export function EmotionsSection() {
  const containerRef = useRef<HTMLElement>(null)

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start 90%', 'end start'],
  })

  const scale = useTransform(scrollYProgress, [0, 0.5], [0.97, 1])
  const opacity = useTransform(scrollYProgress, [0, 0.35], [0, 1])

  return (
    <section
      ref={containerRef}
      className="relative py-24 md:py-32 px-6 overflow-hidden"
      style={{ background: 'linear-gradient(180deg, #f5ece6 0%, #fff8f5 100%)' }}
    >
      {/* Background crease pattern */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, transparent, transparent 48px, rgba(140,115,85,0.04) 48px, rgba(140,115,85,0.04) 49px)',
        }}
      />

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Chapter label */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5 }}
          className="mb-16"
        >
          <span className="chapter-label">Chapter 04 — Emotional Intelligence</span>
        </motion.div>

        <motion.div style={{ scale, opacity }}>
          {/* Main parchment banner */}
          <div
            className="rounded-2xl relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, #fffdf8 0%, #f5ece6 40%, #eedcd8 100%)',
              border: '1px solid rgba(140,115,85,0.16)',
              boxShadow: '2px 8px 40px rgba(96,51,71,0.09)',
            }}
          >
            {/* Corner fold decorations */}
            <div
              className="absolute top-0 left-0 w-16 h-16 pointer-events-none"
              style={{ background: 'linear-gradient(135deg, rgba(238,220,216,0.6) 50%, transparent 50%)' }}
            />
            <div
              className="absolute top-0 right-0 w-16 h-16 pointer-events-none"
              style={{ background: 'linear-gradient(225deg, rgba(238,220,216,0.6) 50%, transparent 50%)' }}
            />
            <div
              className="absolute bottom-0 left-0 w-12 h-12 pointer-events-none"
              style={{ background: 'linear-gradient(315deg, rgba(238,220,216,0.4) 50%, transparent 50%)' }}
            />

            {/* Background origami crane watermark */}
            <svg
              className="absolute right-8 top-1/2 -translate-y-1/2 pointer-events-none"
              width="140"
              height="140"
              viewBox="0 0 32 32"
              aria-hidden="true"
              opacity="0.05"
            >
              <path d="M16 4 L26 14 L22 16 L28 22 L16 18 L4 22 L10 16 L6 14 Z" fill="#603347" />
              <path d="M16 18 L16 28 L13 24 M16 28 L19 24" stroke="#603347" strokeWidth="1.5" fill="none" strokeLinecap="round" />
            </svg>

            <div className="relative z-10 p-8 md:p-14">
              {/* Headline */}
              <div className="max-w-2xl mb-12">
                <h2
                  className="font-headline-md text-[#4A2B38] leading-[1.2] mb-5"
                  style={{ fontSize: 'clamp(1.6rem, 4vw, 2.25rem)', fontWeight: 600 }}
                >
                  Not just generating words.
                  <br />
                  <span
                    style={{
                      background: 'linear-gradient(135deg, #603347, #8C7355)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                    }}
                  >
                    Sensing the silence.
                  </span>
                </h2>
                <p
                  className="text-[#4A2B38]/60 leading-relaxed"
                  style={{ fontSize: '0.9375rem', fontFamily: 'var(--font-body-lg)', maxWidth: '36rem' }}
                >
                  Mythri detects subtle shifts in your tone, pacing, and vocabulary. It knows when to offer a perspective, when to gently go deeper, and when to simply hold space and listen.
                </p>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {stats.map((stat, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-60px' }}
                    transition={{ duration: 0.6, delay: i * 0.15 }}
                    className="relative"
                  >
                    <div
                      className="rounded-xl p-5"
                      style={{
                        background: 'rgba(255,253,248,0.8)',
                        border: '1px solid rgba(140,115,85,0.12)',
                      }}
                    >
                      {/* Ruled lines in background */}
                      <div className="absolute inset-x-5 bottom-3 space-y-1.5 pointer-events-none">
                        {[1, 2].map(n => (
                          <div key={n} className="h-px" style={{ background: 'rgba(140,115,85,0.06)' }} />
                        ))}
                      </div>

                      <div className="ink-stat mb-1">{stat.value}</div>
                      <div
                        className="font-label-md text-[#4A2B38] mb-1"
                        style={{ fontSize: '0.8125rem', fontWeight: 600 }}
                      >
                        {stat.label}
                      </div>
                      <div className="text-[0.75rem] text-[#4A2B38]/50" style={{ fontFamily: 'var(--font-body-sm)' }}>
                        {stat.sub}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
