'use client'

import { useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'

// Origami shield/lock SVG illustration
function ShieldIllustration() {
  return (
    <svg viewBox="0 0 280 260" fill="none" className="w-full h-full" aria-hidden="true">
      {/* Dark paper background */}
      <rect width="280" height="260" rx="16" fill="#3d2330" />

      {/* Fold line grid — very subtle on dark */}
      <defs>
        <pattern id="dark-grid" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
          <path d="M 60 0 L 0 60" stroke="#eedcd8" strokeWidth="0.3" opacity="0.06" />
        </pattern>
      </defs>
      <rect width="280" height="260" fill="url(#dark-grid)" />

      {/* Corner fold accents */}
      <polygon points="0,0 60,0 0,60" fill="#eedcd8" opacity="0.05" />
      <polygon points="280,260 220,260 280,200" fill="#eedcd8" opacity="0.05" />

      {/* Main origami shield — constructed from fold polygons */}
      {/* Shield body */}
      <polygon points="140,42 196,66 196,128 140,170 84,128 84,66" fill="#603347" opacity="0.9" />
      {/* Shield highlight fold */}
      <polygon points="140,42 196,66 140,106" fill="#8C7355" opacity="0.3" />
      <polygon points="84,66 140,106 140,42" fill="#eedcd8" opacity="0.08" />

      {/* Shield crease lines */}
      <line x1="140" y1="42" x2="140" y2="170" stroke="#eedcd8" strokeWidth="0.8" opacity="0.2" />
      <line x1="84" y1="66" x2="196" y2="128" stroke="#eedcd8" strokeWidth="0.6" opacity="0.12" strokeDasharray="4 6" />
      <line x1="196" y1="66" x2="84" y2="128" stroke="#eedcd8" strokeWidth="0.6" opacity="0.12" strokeDasharray="4 6" />

      {/* Lock body */}
      <rect x="126" y="102" width="28" height="22" rx="4" fill="#eedcd8" opacity="0.85" />
      {/* Lock shackle */}
      <path d="M133 102 Q133 90 140 90 Q147 90 147 102" stroke="#eedcd8" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.75" />
      {/* Lock keyhole */}
      <circle cx="140" cy="112" r="3" fill="#603347" opacity="0.8" />
      <rect x="138.5" y="113" width="3" height="4" rx="1" fill="#603347" opacity="0.8" />

      {/* Decorative dots ring */}
      {[0, 60, 120, 180, 240, 300].map((angle, i) => (
        <circle
          key={i}
          cx={140 + 85 * Math.cos((angle * Math.PI) / 180)}
          cy={106 + 85 * Math.sin((angle * Math.PI) / 180)}
          r="2"
          fill="#eedcd8"
          opacity="0.12"
        />
      ))}

      {/* Labels */}
      <text x="100" y="200" fontFamily="serif" fontSize="7" fill="#eedcd8" opacity="0.4" letterSpacing="3">END-TO-END ENCRYPTED</text>
      <text x="115" y="215" fontFamily="serif" fontSize="7" fill="#eedcd8" opacity="0.3" letterSpacing="3">ZERO KNOWLEDGE</text>

      {/* Small crane watermark top right */}
      <g transform="translate(240, 20) scale(0.8)" opacity="0.12">
        <path d="M16 4 L26 14 L22 16 L28 22 L16 18 L4 22 L10 16 L6 14 Z" fill="#eedcd8" />
        <path d="M16 18 L16 28 L13 24 M16 28 L19 24" stroke="#eedcd8" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      </g>
    </svg>
  )
}

const privacyFeatures = [
  {
    title: 'End-to-End Encryption',
    desc: 'Your data is encrypted at rest and in transit. Only you hold the keys — always.',
  },
  {
    title: 'Zero Knowledge Architecture',
    desc: 'We cannot read, train on, or monetize your personal conversations. Ever.',
  },
  {
    title: 'Total Control',
    desc: 'Export, edit, or delete your entire memory graph with a single tap.',
  },
]

export function PrivacySection() {
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
      id="privacy"
      ref={containerRef}
      className="relative py-24 md:py-32 px-6 overflow-hidden"
      style={{ background: '#4A2B38' }}
    >
      {/* Torn paper top edge — parchment color */}
      <div className="torn-edge-top" />

      {/* Background origami diagonal — very subtle */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'repeating-linear-gradient(135deg, transparent, transparent 50px, rgba(238,220,216,0.03) 50px, rgba(238,220,216,0.03) 51px)',
        }}
      />

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Chapter label — light on dark */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5 }}
          className="mb-16"
        >
          <span
            className="chapter-label"
            style={{ color: 'rgba(238,220,216,0.6)' }}
          >
            Chapter 05 — Privacy
          </span>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">

          {/* Left: Text on dark paper */}
          <motion.div style={{ x: leftX, opacity: leftOpacity }} className="order-2 lg:order-1">
            <h2
              className="font-headline-md leading-[1.2] mb-5"
              style={{
                fontSize: 'clamp(1.6rem, 4vw, 2.25rem)',
                fontWeight: 600,
                color: '#fffdf8',
              }}
            >
              A safe space must{' '}
              <br />
              actually be{' '}
              <span
                style={{
                  background: 'linear-gradient(135deg, #EEDCD8, #f3b5ce)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                safe.
              </span>
            </h2>

            {/* Light ink stroke on dark bg */}
            <span
              className="ink-stroke mb-5"
              style={{
                background: 'linear-gradient(90deg, transparent, rgba(238,220,216,0.4) 30%, rgba(238,220,216,0.6) 70%, transparent)',
              }}
            />

            <p
              className="leading-relaxed mb-10 max-w-md"
              style={{
                fontSize: '0.9375rem',
                fontFamily: 'var(--font-body-lg)',
                color: 'rgba(255,253,248,0.6)',
              }}
            >
              Trust is the foundation of any real relationship. That&apos;s why Mythri is built with a zero-compromise approach to your data privacy.
            </p>

            {/* Feature list — light on dark */}
            <div className="space-y-6">
              {privacyFeatures.map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: '-60px' }}
                  transition={{ duration: 0.5, delay: i * 0.12 }}
                  className="flex gap-3 items-start group"
                >
                  {/* Paper pin — rose-toned on dark */}
                  <div className="mt-0.5 flex-shrink-0">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{
                        background: 'radial-gradient(circle at 38% 35%, #f3d5dc, #EEDCD8 70%)',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
                      }}
                    />
                  </div>
                  <div>
                    <h3
                      className="font-label-md mb-1"
                      style={{ fontSize: '0.875rem', fontWeight: 600, color: '#fffdf8' }}
                    >
                      {item.title}
                    </h3>
                    <p
                      style={{
                        fontSize: '0.8125rem',
                        fontFamily: 'var(--font-body-sm)',
                        color: 'rgba(255,253,248,0.5)',
                        lineHeight: '1.65',
                        maxWidth: '22rem',
                      }}
                    >
                      {item.desc}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Right: Shield illustration */}
          <motion.div style={{ x: rightX, opacity: rightOpacity }} className="order-1 lg:order-2">
            <div
              className="rounded-2xl overflow-hidden relative"
              style={{
                aspectRatio: '4/3',
                border: '1px solid rgba(238,220,216,0.10)',
                boxShadow: '0 8px 40px rgba(0,0,0,0.25)',
              }}
            >
              <ShieldIllustration />
            </div>
          </motion.div>
        </div>
      </div>

      {/* Torn paper bottom edge — parchment */}
      <div className="torn-edge-bottom" />
    </section>
  )
}
