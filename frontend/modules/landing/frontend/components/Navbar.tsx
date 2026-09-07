'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, Menu, X } from 'lucide-react'
import Link from 'next/link'
import { RadialMenu } from './RadialMenu'

// Origami crane SVG mark
function CraneMark({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
      <path d="M16 4 L26 14 L22 16 L28 22 L16 18 L4 22 L10 16 L6 14 Z" fill="#603347" opacity="0.85" />
      <path d="M16 18 L16 28 L13 24" stroke="#8C7355" strokeWidth="1.2" strokeLinecap="round" fill="none" />
      <path d="M16 18 L16 28 L19 24" stroke="#8C7355" strokeWidth="1.2" strokeLinecap="round" fill="none" />
      <path d="M16 4 L16 10" stroke="#4A2B38" strokeWidth="0.8" strokeLinecap="round" opacity="0.4" />
    </svg>
  )
}

const navLinks = [
  { label: 'Experience', href: '#experience' },
  { label: 'Memory', href: '#memory' },
  { label: 'Voice', href: '#voice' },
  { label: 'Privacy', href: '#privacy' },
  { label: 'About', href: '#philosophy' },
]

export function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <>
      <motion.header
        initial={{ y: -60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="fixed top-0 inset-x-0 z-50 pointer-events-none"
      >
        <div
          className="mx-auto max-w-7xl px-5 md:px-8"
          style={{ paddingTop: scrolled ? '0.5rem' : '1rem', transition: 'padding 0.4s ease' }}
        >
          <div className="flex items-center justify-between">
            {/* Left side: Brand + Radial Menu */}
            <div className="flex items-center gap-3">
              <Link 
                href="/" 
                className="flex items-center gap-2.5 group pointer-events-auto bg-white/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/40 shadow-sm" 
                aria-label="Mythri home"
              >
                <CraneMark className="w-7 h-7 transition-transform duration-300 group-hover:scale-110" />
                <span
                  className="font-headline-md tracking-[0.12em] text-[#4A2B38] text-base font-semibold uppercase"
                  style={{ letterSpacing: '0.16em' }}
                >
                  Mythri
                </span>
              </Link>
              
              <RadialMenu />
            </div>

            {/* CTA */}
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
        </div>
      </motion.header>
    </>
  )
}
