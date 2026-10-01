'use client'

import { useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'

// Memo slip paper pin SVG
function PaperPin({ color = '#603347' }: { color?: string }) {
  return (
    <svg viewBox="0 0 16 16" className="w-4 h-4 flex-shrink-0" aria-hidden="true">
      <circle cx="8" cy="8" r="5" fill={color} opacity="0.85" />
      <circle cx="6.5" cy="6.5" r="1.5" fill="white" opacity="0.5" />
    </svg>
  )
}

const memoryTypes = [
  {
    num: '01',
    title: 'Contextual Recall',
    desc: 'Remembers the thread of your conversation — what you said five minutes ago, or five sessions ago — without you having to repeat yourself.',
    tag: 'Within-session',
    rotation: '-1.5deg',
    color: '#603347',
  },
  {
    num: '02',
    title: 'Long-Term Retention',
    desc: 'Retains the key people, events, and feelings you share. Months from now, Mythri still knows your sister\'s name, your hardest week.',
    tag: 'Persistent',
    rotation: '0.5deg',
    color: '#8C7355',
  },
  {
    num: '03',
    title: 'Adaptive Understanding',
    desc: 'Learns how you speak, how you feel, your emotional pace. Every conversation becomes more attuned than the last.',
    tag: 'Evolving',
    rotation: '-0.8deg',
    color: '#4A2B38',
  },
]

export function MemorySection() {
  const containerRef = useRef<HTMLElement>(null)

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start 80%', 'end start'],
  })

  const y1 = useTransform(scrollYProgress, [0, 0.35], [80, 0])
  const y2 = useTransform(scrollYProgress, [0.1, 0.45], [80, 0])
  const y3 = useTransform(scrollYProgress, [0.2, 0.55], [80, 0])
  const opacity1 = useTransform(scrollYProgress, [0, 0.35], [0, 1])
  const opacity2 = useTransform(scrollYProgress, [0.1, 0.45], [0, 1])
  const opacity3 = useTransform(scrollYProgress, [0.2, 0.55], [0, 1])

  const motionProps = [
    { y: y1, opacity: opacity1 },
    { y: y2, opacity: opacity2 },
    { y: y3, opacity: opacity3 },
  ]

  return (
    <section
      id="memory"
      ref={containerRef}
      className="relative py-24 md:py-32 px-6 overflow-hidden"
      style={{ background: '#fff8f5' }}
    >
      {/* Subtle dot grid background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(140,115,85,0.12) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
          opacity: 0.6,
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
          <span className="chapter-label">Chapter 03 — Memory</span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="mb-4"
        >
          <h2
            className="font-headline-md text-[#4A2B38] leading-[1.2]"
            style={{ fontSize: 'clamp(1.6rem, 4vw, 2.25rem)', fontWeight: 600 }}
          >
            Because true understanding
            <br />
            requires{' '}
            <em
              className="not-italic"
              style={{
                background: 'linear-gradient(135deg, #603347, #8C7355)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              context.
            </em>
          </h2>
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="text-[#4A2B38]/60 leading-relaxed mb-16 max-w-xl"
          style={{ fontSize: '0.9375rem', fontFamily: 'var(--font-body-lg)' }}
        >
          You shouldn&apos;t have to explain yourself every time. Mythri builds a secure, personal context — so every new conversation begins exactly where the last one left off.
        </motion.p>

        {/* Memo slip cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-5">
          {memoryTypes.map((item, i) => (
            <motion.div
              key={i}
              style={{ y: motionProps[i].y, opacity: motionProps[i].opacity }}
              className="group"
            >
              <div
                className="paper-card rounded-xl p-6 h-full relative"
                style={{
                  transform: `rotate(${item.rotation})`,
                  transition: 'transform 0.35s ease, box-shadow 0.35s ease',
                }}
                onMouseEnter={(e) => {
                  ;(e.currentTarget as HTMLElement).style.transform = 'rotate(0deg) translateY(-3px)'
                }}
                onMouseLeave={(e) => {
                  ;(e.currentTarget as HTMLElement).style.transform = `rotate(${item.rotation})`
                }}
              >
                {/* Paper pin at top */}
                <div className="absolute -top-2 left-1/2 -translate-x-1/2">
                  <PaperPin color={item.color} />
                </div>

                {/* Folded corner */}
                <div
                  className="absolute top-0 right-0 w-7 h-7 pointer-events-none"
                  style={{
                    background: `linear-gradient(225deg, rgba(238,220,216,0.8) 50%, transparent 50%)`,
                    borderBottomLeftRadius: '0.375rem',
                  }}
                />

                {/* Memo number */}
                <p
                  className="text-[0.6rem] mb-4 mt-3"
                  style={{
                    fontFamily: 'var(--font-label-md)',
                    letterSpacing: '0.2em',
                    color: item.color,
                    opacity: 0.6,
                  }}
                >
                  MEMO {item.num}
                </p>

                {/* Tag */}
                <span
                  className="inline-block text-[0.6rem] px-2 py-0.5 rounded-full mb-3 font-label-md"
                  style={{
                    background: `${item.color}12`,
                    border: `1px solid ${item.color}22`,
                    color: item.color,
                    letterSpacing: '0.08em',
                  }}
                >
                  {item.tag}
                </span>

                <h3
                  className="font-headline-md text-[#4A2B38] mb-2.5"
                  style={{ fontSize: '1rem', fontWeight: 600 }}
                >
                  {item.title}
                </h3>

                <p className="text-xs text-[#4A2B38]/60 leading-relaxed" style={{ fontFamily: 'var(--font-body-sm)' }}>
                  {item.desc}
                </p>

                {/* Ruled lines decoration */}
                <div className="mt-5 space-y-1.5">
                  {[1, 2, 3].map((n) => (
                    <div
                      key={n}
                      className="h-px rounded"
                      style={{ background: 'rgba(140,115,85,0.10)', width: n === 3 ? '60%' : '100%' }}
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
