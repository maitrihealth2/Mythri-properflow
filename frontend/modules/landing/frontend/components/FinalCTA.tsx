'use client'

import { useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

// Envelope flap SVG
function EnvelopeDecoration() {
  return (
    <svg
      viewBox="0 0 480 200"
      fill="none"
      className="absolute inset-0 w-full h-full pointer-events-none"
      aria-hidden="true"
      preserveAspectRatio="xMidYMid slice"
    >
      {/* Envelope body */}
      <rect x="40" y="60" width="400" height="120" rx="8" fill="#eedcd8" opacity="0.18" />
      {/* Envelope fold lines */}
      <line x1="40" y1="60" x2="240" y2="140" stroke="#8C7355" strokeWidth="0.6" opacity="0.15" />
      <line x1="440" y1="60" x2="240" y2="140" stroke="#8C7355" strokeWidth="0.6" opacity="0.15" />
      <line x1="40" y1="180" x2="240" y2="140" stroke="#8C7355" strokeWidth="0.4" opacity="0.10" strokeDasharray="4 6" />
      <line x1="440" y1="180" x2="240" y2="140" stroke="#8C7355" strokeWidth="0.4" opacity="0.10" strokeDasharray="4 6" />

      {/* Origami fold grid */}
      <defs>
        <pattern id="env-grid" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 40" stroke="#8C7355" strokeWidth="0.3" opacity="0.08" />
        </pattern>
      </defs>
      <rect width="480" height="200" fill="url(#env-grid)" />

      {/* Wax seal position marker */}
      <circle cx="240" cy="140" r="18" fill="#603347" opacity="0.12" />
      <circle cx="240" cy="140" r="12" stroke="#603347" strokeWidth="0.8" opacity="0.18" fill="none" />
    </svg>
  )
}

// Wax seal SVG component
function WaxSeal() {
  return (
    <svg viewBox="0 0 48 48" className="w-12 h-12" aria-hidden="true">
      <circle cx="24" cy="24" r="22" fill="#603347" opacity="0.9" />
      <circle cx="24" cy="24" r="18" stroke="#eedcd8" strokeWidth="0.8" fill="none" opacity="0.5" />
      {/* Crane silhouette in seal */}
      <g transform="translate(24,24) scale(0.45)" opacity="0.7">
        <path d="M0 -14 L10 -4 L6 -2 L12 4 L0 0 L-12 4 L-6 -2 L-10 -4 Z" fill="#eedcd8" />
        <line x1="0" y1="0" x2="0" y2="10" stroke="#eedcd8" strokeWidth="1.5" strokeLinecap="round" />
      </g>
    </svg>
  )
}

export function FinalCTA() {
  const containerRef = useRef<HTMLElement>(null)

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start end', 'end start'],
  })

  const y = useTransform(scrollYProgress, [0, 1], [40, -40])

  return (
    <section
      ref={containerRef}
      className="relative py-24 md:py-32 px-6 overflow-hidden"
      style={{ background: '#fff8f5' }}
    >
      {/* Dot grid */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(140,115,85,0.10) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
          opacity: 0.7,
        }}
      />

      <div className="max-w-5xl mx-auto relative z-10">
        {/* Chapter label */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5 }}
          className="mb-10 text-center"
        >
          <span className="chapter-label justify-center">Epilogue</span>
        </motion.div>

        {/* Envelope CTA card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.8 }}
          style={{ y }}
          className="relative"
        >
          <div
            className="rounded-2xl relative overflow-hidden text-center"
            style={{
              background: 'linear-gradient(160deg, #fffdf8 0%, #f5ece6 60%, #eedcd8 100%)',
              border: '1px solid rgba(140,115,85,0.18)',
              boxShadow: '3px 8px 40px rgba(96,51,71,0.12)',
            }}
          >
            {/* Envelope decoration SVG */}
            <EnvelopeDecoration />

            {/* Content */}
            <div className="relative z-10 px-8 py-14 md:px-16 md:py-20">

              {/* Wax seal */}
              <div className="flex justify-center mb-8">
                <WaxSeal />
              </div>

              {/* Headline */}
              <h2
                className="font-headline-md text-[#4A2B38] leading-[1.2] mb-5"
                style={{ fontSize: 'clamp(1.7rem, 4.5vw, 2.5rem)', fontWeight: 600 }}
              >
                Ready to meet
                <br />
                <span
                  style={{
                    background: 'linear-gradient(135deg, #603347, #8C7355)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  your sanctuary?
                </span>
              </h2>

              {/* Ink stroke */}
              <div className="flex justify-center mb-6">
                <span className="ink-stroke" />
              </div>

              {/* Body */}
              <p
                className="text-[#4A2B38]/60 leading-relaxed mb-10 max-w-sm mx-auto"
                style={{ fontSize: '0.9375rem', fontFamily: 'var(--font-body-lg)' }}
              >
                Join the individuals who have already found a calmer, clearer headspace with Mythri.
              </p>

              {/* CTA button — stamp / seal style */}
              <Link
                href="/home"
                className="inline-flex items-center gap-3 px-8 py-4 rounded-full text-sm font-label-md text-white transition-all duration-300 hover:opacity-90 hover:-translate-y-0.5 group mx-auto"
                style={{
                  background: 'linear-gradient(135deg, #603347, #8C7355)',
                  boxShadow: '0 6px 24px rgba(96,51,71,0.28)',
                  letterSpacing: '0.05em',
                }}
              >
                Start Your Conversation
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>

              <p
                className="mt-5 text-[#4A2B38]/35 font-label-md"
                style={{ fontSize: '0.7rem', letterSpacing: '0.08em' }}
              >
                Free to begin · No credit card required
              </p>

              {/* Corner folds */}
              <div
                className="absolute top-0 left-0 w-10 h-10 pointer-events-none"
                style={{ background: 'linear-gradient(135deg, rgba(238,220,216,0.7) 50%, transparent 50%)' }}
              />
              <div
                className="absolute top-0 right-0 w-10 h-10 pointer-events-none"
                style={{ background: 'linear-gradient(225deg, rgba(238,220,216,0.7) 50%, transparent 50%)' }}
              />
              <div
                className="absolute bottom-0 left-0 w-8 h-8 pointer-events-none"
                style={{ background: 'linear-gradient(315deg, rgba(238,220,216,0.5) 50%, transparent 50%)' }}
              />
              <div
                className="absolute bottom-0 right-0 w-8 h-8 pointer-events-none"
                style={{ background: 'linear-gradient(45deg, rgba(238,220,216,0.5) 50%, transparent 50%)' }}
              />
            </div>
          </div>
        </motion.div>

        {/* Footer colophon */}
        <footer className="mt-20 text-center relative z-10">
          <div className="flex items-center justify-center gap-4 mb-3">
            <div className="h-px w-16" style={{ background: 'rgba(140,115,85,0.2)' }} />
            <span
              style={{
                fontSize: '0.6875rem',
                fontFamily: 'var(--font-label-md)',
                letterSpacing: '0.2em',
                color: 'rgba(74,43,56,0.35)',
                textTransform: 'uppercase',
              }}
            >
              Mythri
            </span>
            <div className="h-px w-16" style={{ background: 'rgba(140,115,85,0.2)' }} />
          </div>
          <p
            style={{
              fontSize: '0.6875rem',
              fontFamily: 'var(--font-body-sm)',
              color: 'rgba(74,43,56,0.3)',
              letterSpacing: '0.06em',
            }}
          >
            © {new Date().getFullYear()} Mythri. All rights reserved.
          </p>
        </footer>
      </div>
    </section>
  )
}
