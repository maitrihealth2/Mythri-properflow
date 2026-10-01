'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { RadialMenu } from './RadialMenu'

export function Navbar() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <motion.header
      initial={{ y: -60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className="fixed top-0 inset-x-0 z-50 pointer-events-none"
    >
      <div
        className="mx-auto max-w-7xl px-5 md:px-8 flex items-center justify-between"
        style={{ paddingTop: scrolled ? '0.5rem' : '1rem', transition: 'padding 0.4s ease' }}
      >
        {/* Left: Radial nav menu */}
        <RadialMenu />

        {/* Right: CTA */}
        <Link
          href="/home"
          className="pointer-events-auto inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full text-xs font-label-md text-white transition-all duration-300 group shadow-lg hover:scale-105"
          style={{
            background: 'linear-gradient(135deg, #603347, #8C7355)',
            letterSpacing: '0.04em',
          }}
        >
          Begin Journey
          <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>
    </motion.header>
  )
}
