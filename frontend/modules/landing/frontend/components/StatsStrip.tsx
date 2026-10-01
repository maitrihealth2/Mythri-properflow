'use client'

import { motion } from 'framer-motion'

const stats = [
  {
    value: '10',
    label: 'Parameters analyzed\nper message',
    unit: '',
  },
  {
    value: '4',
    label: 'Native Indian\nlanguages',
    unit: '',
  },
  {
    value: '0',
    label: 'Ads.\nEver.',
    unit: '',
  },
  {
    value: '∞',
    label: 'Conversations.\nNo daily limit.',
    unit: '',
  },
]

export function StatsStrip() {
  return (
    <section
      className="relative overflow-hidden py-14 px-6"
      style={{
        background: 'linear-gradient(135deg, #3a1a28 0%, #603347 50%, #4a2035 100%)',
      }}
    >
      {/* Subtle diagonal grid overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden="true"
        style={{
          backgroundImage: 'repeating-linear-gradient(135deg, transparent, transparent 40px, rgba(255,255,255,0.015) 40px, rgba(255,255,255,0.015) 41px)',
        }}
      />

      {/* Soft radial glow center */}
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden="true"
        style={{
          background: 'radial-gradient(ellipse 70% 120% at 50% 50%, rgba(140,115,85,0.12) 0%, transparent 70%)',
        }}
      />

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-0 divide-x divide-white/10">
          {stats.map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.6, delay: i * 0.1 }}
              className="flex flex-col items-center text-center px-6 py-4 lg:py-0 group"
            >
              {/* Big number */}
              <div
                className="font-headline-md mb-2 group-hover:scale-105 transition-transform duration-300"
                style={{
                  fontSize: 'clamp(2.8rem, 6vw, 4.5rem)',
                  fontWeight: 700,
                  lineHeight: 1,
                  background: 'linear-gradient(135deg, #eedcd8 20%, #d4a574 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  letterSpacing: '-0.02em',
                }}
              >
                {stat.value}
              </div>

              {/* Thin divider */}
              <div
                className="w-8 h-px mb-3"
                style={{ background: 'rgba(238,220,216,0.2)' }}
              />

              {/* Label */}
              <p
                style={{
                  fontSize: '0.7rem',
                  fontFamily: 'var(--font-label-md)',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: 'rgba(238,220,216,0.55)',
                  lineHeight: 1.6,
                  whiteSpace: 'pre-line',
                  fontWeight: 500,
                }}
              >
                {stat.label}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
