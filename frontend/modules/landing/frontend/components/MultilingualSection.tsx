'use client'

import { useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'

const languages = [
  {
    script: 'తెలుగు',
    name: 'Telugu',
    romanized: 'Telugu',
    note: 'South India\'s most spoken tongue',
    rotation: '-2deg',
    offset: '0',
  },
  {
    script: 'தமிழ்',
    name: 'Tamil',
    romanized: 'Tamil',
    note: 'One of the world\'s oldest living languages',
    rotation: '1.5deg',
    offset: '0.5rem',
  },
  {
    script: 'हिन्दी',
    name: 'Hindi',
    romanized: 'Hindi',
    note: 'The language of 600 million hearts',
    rotation: '-1deg',
    offset: '0',
  },
]

export function MultilingualSection() {
  const containerRef = useRef<HTMLElement>(null)

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start 90%', 'end start'],
  })

  const y1 = useTransform(scrollYProgress, [0, 0.4], [60, 0])
  const y2 = useTransform(scrollYProgress, [0.1, 0.5], [60, 0])
  const y3 = useTransform(scrollYProgress, [0.2, 0.6], [60, 0])
  const op1 = useTransform(scrollYProgress, [0, 0.4], [0, 1])
  const op2 = useTransform(scrollYProgress, [0.1, 0.5], [0, 1])
  const op3 = useTransform(scrollYProgress, [0.2, 0.6], [0, 1])

  const motionProps = [
    { y: y1, opacity: op1 },
    { y: y2, opacity: op2 },
    { y: y3, opacity: op3 },
  ]

  return (
    <section
      ref={containerRef}
      className="relative py-24 md:py-32 px-6 overflow-hidden"
      style={{ background: '#fff8f5' }}
    >
      {/* Very subtle horizontal ruling lines */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, transparent, transparent 36px, rgba(140,115,85,0.04) 36px, rgba(140,115,85,0.04) 37px)',
        }}
      />

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Chapter label */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5 }}
          className="mb-4"
        >
          <span className="chapter-label">Chapter 06 — Language</span>
        </motion.div>

        {/* Section header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.7, delay: 0.1 }}
          >
            <h2
              className="font-headline-md text-[#4A2B38] leading-[1.2] max-w-sm"
              style={{ fontSize: 'clamp(1.6rem, 4vw, 2.25rem)', fontWeight: 600 }}
            >
              Speak the language
              <br />
              of{' '}
              <span
                style={{
                  background: 'linear-gradient(135deg, #603347, #8C7355)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                your heart.
              </span>
            </h2>
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="text-[#4A2B38]/60 leading-relaxed max-w-sm"
            style={{ fontSize: '0.9375rem', fontFamily: 'var(--font-body-lg)' }}
          >
            True empathy crosses linguistic boundaries. Mythri natively understands and speaks Indian languages — capturing cultural nuances that literal translation misses.
          </motion.p>
        </div>

        {/* Language paper slips — scattered */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-4 max-w-3xl mx-auto">
          {languages.map((lang, i) => (
            <motion.div
              key={i}
              style={{ y: motionProps[i].y, opacity: motionProps[i].opacity, marginTop: lang.offset }}
              className="group"
            >
              <div
                className="paper-card rounded-2xl p-6 relative flex flex-col items-center text-center"
                style={{
                  transform: `rotate(${lang.rotation})`,
                  transition: 'transform 0.4s ease, box-shadow 0.4s ease',
                }}
                onMouseEnter={(e) => {
                  ;(e.currentTarget as HTMLElement).style.transform = 'rotate(0deg) translateY(-4px)'
                }}
                onMouseLeave={(e) => {
                  ;(e.currentTarget as HTMLElement).style.transform = `rotate(${lang.rotation})`
                }}
              >
                {/* Paper pin at top */}
                <div
                  className="absolute -top-2 left-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full"
                  style={{
                    background: 'radial-gradient(circle at 38% 35%, #e8c4c4, #603347 70%)',
                    boxShadow: '0 1px 4px rgba(96,51,71,0.3)',
                  }}
                />

                {/* Folded corner */}
                <div
                  className="absolute top-0 right-0 w-8 h-8 pointer-events-none"
                  style={{
                    background: 'linear-gradient(225deg, #eedcd8 50%, transparent 50%)',
                    borderBottomLeftRadius: '0.375rem',
                  }}
                />

                {/* Horizontal rule at top */}
                <div className="w-8 h-px mb-5 mt-2" style={{ background: 'rgba(140,115,85,0.2)' }} />

                {/* Native script — the star */}
                <div
                  className="font-headline-md mb-2 group-hover:scale-105 transition-transform duration-300"
                  style={{
                    fontSize: '2.75rem',
                    lineHeight: 1.1,
                    background: 'linear-gradient(135deg, #603347, #8C7355)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    fontWeight: 600,
                  }}
                >
                  {lang.script}
                </div>

                {/* English name */}
                <div
                  className="font-label-md text-[#4A2B38] mb-2"
                  style={{ fontSize: '0.75rem', letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 600 }}
                >
                  {lang.name}
                </div>

                {/* Note */}
                <p
                  className="text-[#4A2B38]/50 italic text-center leading-snug"
                  style={{ fontSize: '0.7rem', fontFamily: 'var(--font-body-sm)' }}
                >
                  {lang.note}
                </p>

                {/* Ruled lines */}
                <div className="w-full mt-4 space-y-1.5">
                  {[1, 2].map(n => (
                    <div key={n} className="h-px" style={{ background: 'rgba(140,115,85,0.08)' }} />
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Coming soon note */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-center mt-10 text-xs text-[#4A2B38]/40 font-label-md tracking-widest uppercase"
        >
          + More languages coming · Kannada · Malayalam · Marathi
        </motion.p>
      </div>
    </section>
  )
}
