'use client'

import { useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'

// SVG waveform / mic illustration
function VoiceIllustration() {
  return (
    <svg viewBox="0 0 320 280" fill="none" className="w-full h-full" aria-hidden="true">
      {/* Background paper fold */}
      <rect width="320" height="280" rx="16" fill="#fffdf8" />
      <polygon points="280,0 320,0 320,40" fill="#eedcd8" opacity="0.4" />
      
      {/* Fold lines */}
      <line x1="0" y1="70" x2="320" y2="70" stroke="#8C7355" strokeWidth="0.4" strokeDasharray="4 8" opacity="0.25" />
      <line x1="0" y1="210" x2="320" y2="210" stroke="#8C7355" strokeWidth="0.4" strokeDasharray="4 8" opacity="0.25" />

      {/* Mic body */}
      <rect x="148" y="60" width="24" height="48" rx="12" fill="#603347" opacity="0.85" />
      {/* Mic stand arc */}
      <path d="M128 120 Q128 155 160 155 Q192 155 192 120" stroke="#603347" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.7" />
      {/* Mic stand line */}
      <line x1="160" y1="155" x2="160" y2="172" stroke="#603347" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
      {/* Base */}
      <line x1="144" y1="172" x2="176" y2="172" stroke="#603347" strokeWidth="2" strokeLinecap="round" opacity="0.7" />

      {/* Waveform bars — left side (smaller, listening) */}
      {[
        { x: 48, h: 14, delay: 0 },
        { x: 60, h: 26, delay: 1 },
        { x: 72, h: 20, delay: 2 },
        { x: 84, h: 36, delay: 0.5 },
        { x: 96, h: 22, delay: 1.5 },
        { x: 108, h: 30, delay: 0.8 },
        { x: 120, h: 16, delay: 1.2 },
      ].map((bar) => (
        <rect
          key={bar.x}
          x={bar.x}
          y={140 - bar.h / 2}
          width="7"
          height={bar.h}
          rx="3.5"
          fill="#8C7355"
          opacity="0.35"
        />
      ))}

      {/* Waveform bars — right side (active, expressive) */}
      {[
        { x: 200, h: 30, delay: 0 },
        { x: 212, h: 52, delay: 0.5 },
        { x: 224, h: 38, delay: 1 },
        { x: 236, h: 68, delay: 0.3 },
        { x: 248, h: 44, delay: 0.8 },
        { x: 260, h: 34, delay: 1.3 },
        { x: 272, h: 20, delay: 0.2 },
      ].map((bar) => (
        <rect
          key={bar.x}
          x={bar.x}
          y={140 - bar.h / 2}
          width="7"
          height={bar.h}
          rx="3.5"
          fill="#603347"
          opacity="0.55"
        />
      ))}

      {/* Dot ring around mic */}
      {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
        <circle
          key={i}
          cx={160 + 68 * Math.cos((angle * Math.PI) / 180)}
          cy={84 + 68 * Math.sin((angle * Math.PI) / 180)}
          r="2.5"
          fill="#8C7355"
          opacity={i % 2 === 0 ? 0.18 : 0.10}
        />
      ))}

      {/* Ink labels */}
      <text x="34" y="220" fontFamily="serif" fontSize="8" fill="#8C7355" opacity="0.5" letterSpacing="2">LISTENING</text>
      <text x="196" y="220" fontFamily="serif" fontSize="8" fill="#603347" opacity="0.6" letterSpacing="2">UNDERSTANDING</text>

      {/* Paper crease horizontal */}
      <line x1="40" y1="240" x2="280" y2="240" stroke="#8C7355" strokeWidth="0.5" opacity="0.15" />

      {/* Small origami crane */}
      <g transform="translate(270, 20) scale(0.7)" opacity="0.15">
        <path d="M16 4 L26 14 L22 16 L28 22 L16 18 L4 22 L10 16 L6 14 Z" fill="#603347" />
        <path d="M16 18 L16 28 L13 24 M16 28 L19 24" stroke="#603347" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      </g>
    </svg>
  )
}

export function VoiceSection() {
  const containerRef = useRef<HTMLElement>(null)

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start 90%', 'end start'],
  })

  const leftX = useTransform(scrollYProgress, [0, 0.4], [-60, 0])
  const leftOpacity = useTransform(scrollYProgress, [0, 0.4], [0, 1])
  const rightX = useTransform(scrollYProgress, [0, 0.4], [60, 0])
  const rightOpacity = useTransform(scrollYProgress, [0, 0.4], [0, 1])

  const voiceFeatures = [
    {
      title: 'Natural Speech',
      desc: 'Fluid, humanlike timbre — no robotic cadences, no stilted phrasing.',
    },
    {
      title: 'Thoughtful Pauses',
      desc: 'Allows you to collect yourself without interruption or impatience.',
    },
    {
      title: 'Tonal Awareness',
      desc: 'Recognizes emotion woven into inflection, pace, and hesitation.',
    },
    {
      title: 'Hands-Free Flow',
      desc: 'Speak naturally — walking, resting, or simply thinking out loud.',
    },
  ]

  return (
    <section
      id="voice"
      ref={containerRef}
      className="relative py-24 md:py-32 px-6 overflow-hidden"
      style={{ background: 'linear-gradient(180deg, #fff8f5 0%, #f5ece6 100%)' }}
    >
      {/* Origami fold accent — subtle diagonal */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'repeating-linear-gradient(135deg, transparent, transparent 60px, rgba(140,115,85,0.025) 60px, rgba(140,115,85,0.025) 61px)',
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
          <span className="chapter-label">Chapter 02 — Voice</span>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">

          {/* Left: SVG Illustration */}
          <motion.div style={{ x: leftX, opacity: leftOpacity }} className="order-2 lg:order-1">
            <div
              className="paper-card rounded-2xl overflow-hidden relative"
              style={{ aspectRatio: '4/3', padding: '1.5rem' }}
            >
              <VoiceIllustration />
              {/* Real-time badge */}
              <div
                className="absolute bottom-5 right-5 flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-label-md"
                style={{
                  background: 'rgba(255,253,248,0.9)',
                  border: '1px solid rgba(140,115,85,0.2)',
                  boxShadow: '0 2px 8px rgba(96,51,71,0.08)',
                  letterSpacing: '0.04em',
                  color: '#4A2B38',
                }}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ background: '#603347', animation: 'pulse 2s infinite' }}
                />
                Real-time Synthesis
              </div>
            </div>
          </motion.div>

          {/* Right: Text & Features */}
          <motion.div style={{ x: rightX, opacity: rightOpacity }} className="order-1 lg:order-2">
            <h2
              className="font-headline-md text-[#4A2B38] leading-[1.2] mb-5"
              style={{ fontSize: 'clamp(1.6rem, 4vw, 2.25rem)', fontWeight: 600 }}
            >
              Voice that feels{' '}
              <span
                style={{
                  background: 'linear-gradient(135deg, #603347, #8C7355)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                genuinely natural
              </span>
            </h2>

            <span className="ink-stroke mb-5" />

            <p
              className="text-[#4A2B38]/65 leading-relaxed mb-8 max-w-md"
              style={{ fontSize: '0.9375rem', fontFamily: 'var(--font-body-lg)' }}
            >
              Some moments are easier spoken than typed. Whether walking home, resting, or simply thinking aloud — Mythri is always ready to listen.
            </p>

            {/* Feature list — ink dot style */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
              {voiceFeatures.map((item, i) => (
                <div key={i} className="flex gap-3 items-start group">
                  <span className="paper-pin mt-1 flex-shrink-0 group-hover:scale-110 transition-transform" />
                  <div>
                    <h3 className="font-label-md text-[#4A2B38] text-sm mb-0.5" style={{ fontWeight: 600 }}>
                      {item.title}
                    </h3>
                    <p className="text-xs text-[#4A2B38]/60 leading-relaxed" style={{ fontFamily: 'var(--font-body-sm)' }}>
                      {item.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
