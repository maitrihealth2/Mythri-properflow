'use client'

import { useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'

const audiences = [
  {
    stamp: '✦',
    title: 'The Overwhelmed Professional',
    desc: 'Find a quiet space to decompress after back-to-back meetings — without judgment, without performance.',
    tag: 'For the busy',
    rotation: '-1.2deg',
  },
  {
    stamp: '◈',
    title: 'The Reflective Thinker',
    desc: 'Talk through complex decisions and have your thoughts reflected back to you clearly, patiently.',
    tag: 'For the curious',
    rotation: '0.8deg',
  },
  {
    stamp: '✿',
    title: 'The Late Night Wanderer',
    desc: 'When the world is asleep but your mind is awake, someone is there. Always. In your language.',
    tag: 'For the restless',
    rotation: '-0.5deg',
  },
]

export function WhoIsSection() {
  const containerRef = useRef<HTMLElement>(null)

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start 90%', 'end start'],
  })

  const opacity = useTransform(scrollYProgress, [0, 0.3], [0, 1])
  const y = useTransform(scrollYProgress, [0, 0.3], [40, 0])

  return (
    <section
      ref={containerRef}
      className="relative py-24 md:py-32 px-6 overflow-hidden"
      style={{ background: 'linear-gradient(180deg, #fff8f5 0%, #f5ece6 100%)' }}
    >
      {/* Diagonal crease lines */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'repeating-linear-gradient(45deg, transparent, transparent 80px, rgba(140,115,85,0.025) 80px, rgba(140,115,85,0.025) 81px)',
        }}
      />

      <motion.div style={{ opacity, y }} className="max-w-7xl mx-auto relative z-10">
        {/* Chapter label */}
        <div className="mb-4">
          <span className="chapter-label">Chapter 07 — For You</span>
        </div>

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-16">
          <h2
            className="font-headline-md text-[#4A2B38] leading-[1.2]"
            style={{ fontSize: 'clamp(1.6rem, 4vw, 2.25rem)', fontWeight: 600 }}
          >
            Designed for the
            <br />
            <span
              style={{
                background: 'linear-gradient(135deg, #603347, #8C7355)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              human experience.
            </span>
          </h2>
          <p
            className="text-[#4A2B38]/60 leading-relaxed max-w-xs"
            style={{ fontSize: '0.875rem', fontFamily: 'var(--font-body-lg)' }}
          >
            Mythri meets you wherever you are — at your desk, in your thoughts, in the middle of the night.
          </p>
        </div>

        {/* ID-card style paper cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {audiences.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.6, delay: i * 0.15 }}
              className="group"
            >
              <div
                className="paper-card rounded-xl relative overflow-hidden h-full"
                style={{
                  transform: `rotate(${item.rotation})`,
                  transition: 'transform 0.4s ease, box-shadow 0.4s ease',
                }}
                onMouseEnter={(e) => {
                  ;(e.currentTarget as HTMLElement).style.transform = 'rotate(0deg) translateY(-4px)'
                }}
                onMouseLeave={(e) => {
                  ;(e.currentTarget as HTMLElement).style.transform = `rotate(${item.rotation})`
                }}
              >
                {/* Card header strip — ink-dark */}
                <div
                  className="h-2"
                  style={{ background: 'linear-gradient(90deg, #603347, #8C7355)' }}
                />

                <div className="p-6 pt-5">
                  {/* Folded corner */}
                  <div
                    className="absolute top-2 right-0 w-9 h-9 pointer-events-none"
                    style={{
                      background: 'linear-gradient(225deg, #eedcd8 50%, transparent 50%)',
                      borderBottomLeftRadius: '0.5rem',
                    }}
                  />

                  {/* Stamp accent */}
                  <div
                    className="text-2xl mb-4"
                    style={{ color: '#603347', opacity: 0.6, lineHeight: 1 }}
                  >
                    {item.stamp}
                  </div>

                  {/* Tag */}
                  <span
                    className="inline-block text-[0.6rem] px-2 py-0.5 rounded-full mb-3 font-label-md"
                    style={{
                      background: 'rgba(96,51,71,0.07)',
                      border: '1px solid rgba(96,51,71,0.14)',
                      color: '#603347',
                      letterSpacing: '0.08em',
                    }}
                  >
                    {item.tag}
                  </span>

                  <h3
                    className="font-headline-md text-[#4A2B38] mb-3"
                    style={{ fontSize: '1rem', fontWeight: 600, lineHeight: 1.35 }}
                  >
                    {item.title}
                  </h3>

                  <p
                    className="text-[#4A2B38]/60 leading-relaxed"
                    style={{ fontSize: '0.8125rem', fontFamily: 'var(--font-body-sm)' }}
                  >
                    {item.desc}
                  </p>

                  {/* Ruled lines at bottom */}
                  <div className="mt-6 space-y-1.5">
                    {[1, 2, 3].map(n => (
                      <div
                        key={n}
                        className="h-px"
                        style={{ background: 'rgba(140,115,85,0.08)', width: n === 3 ? '50%' : '100%' }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </section>
  )
}
