'use client'

import React from 'react'
import { motion, Variants } from 'framer-motion'

export type AuraState = 'idle' | 'listening' | 'processing' | 'speaking' | 'error' | 'success'

interface MythriAuraProps {
  state?: AuraState
  className?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

export default function MythriAura({ state = 'idle', className = '', size = 'md' }: MythriAuraProps) {
  // Map sizes to pixel values
  const sizeMap = {
    sm: 48,
    md: 80,
    lg: 120,
    xl: 180
  }
  const baseSize = sizeMap[size]

  // Define animation variants based on state
  const centerVariants: Variants = {
    idle: { scale: [1, 1.05, 1], opacity: [0.8, 1, 0.8], transition: { duration: 4, repeat: Infinity, ease: 'easeInOut' } },
    listening: { scale: [1.05, 1.15, 1.05], opacity: [0.9, 1, 0.9], transition: { duration: 1.5, repeat: Infinity, ease: 'easeInOut' } },
    processing: { scale: [0.95, 1.1, 0.95], opacity: [0.6, 1, 0.6], transition: { duration: 1, repeat: Infinity, ease: 'easeInOut' } },
    speaking: { scale: [1, 1.2, 0.9, 1.1, 1], opacity: [0.8, 1, 0.7, 1, 0.8], transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' } },
    error: { scale: [1, 0.95, 1], opacity: [0.8, 0.5, 0.8], transition: { duration: 3, repeat: Infinity, ease: 'easeInOut' } },
    success: { scale: [1, 1.2, 1], opacity: [0.8, 1, 0.8], transition: { duration: 2, ease: 'easeOut' } }
  }

  const ring1Variants: Variants = {
    idle: { scale: [1.1, 1.2, 1.1], opacity: [0.3, 0.5, 0.3], transition: { duration: 5, repeat: Infinity, ease: 'easeInOut' } },
    listening: { scale: [1.2, 1.4, 1.2], opacity: [0.4, 0.7, 0.4], transition: { duration: 1.5, repeat: Infinity, ease: 'easeInOut' } },
    processing: { scale: [1.1, 1.3, 1.1], opacity: [0.2, 0.6, 0.2], transition: { duration: 1.2, repeat: Infinity, ease: 'easeInOut' } },
    speaking: { scale: [1.2, 1.5, 1.1, 1.4, 1.2], opacity: [0.4, 0.8, 0.3, 0.7, 0.4], transition: { duration: 2.2, repeat: Infinity, ease: 'easeInOut' } },
    error: { scale: [1.05, 1.1, 1.05], opacity: [0.2, 0.4, 0.2], transition: { duration: 3, repeat: Infinity, ease: 'easeInOut' } },
    success: { scale: [1.1, 1.5, 1.2], opacity: [0.4, 0, 0.4], transition: { duration: 2, ease: 'easeOut' } }
  }

  const ring2Variants: Variants = {
    idle: { scale: [1.3, 1.4, 1.3], opacity: [0.1, 0.2, 0.1], transition: { duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 0.5 } },
    listening: { scale: [1.4, 1.7, 1.4], opacity: [0.2, 0.4, 0.2], transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' } },
    processing: { scale: [1.3, 1.6, 1.3], opacity: [0.1, 0.3, 0.1], transition: { duration: 1.5, repeat: Infinity, ease: 'easeInOut', delay: 0.2 } },
    speaking: { scale: [1.4, 1.8, 1.3, 1.7, 1.4], opacity: [0.2, 0.5, 0.1, 0.4, 0.2], transition: { duration: 2.5, repeat: Infinity, ease: 'easeInOut' } },
    error: { scale: [1.1, 1.2, 1.1], opacity: [0.1, 0.2, 0.1], transition: { duration: 3, repeat: Infinity, ease: 'easeInOut' } },
    success: { scale: [1.3, 1.8, 1.4], opacity: [0.2, 0, 0.2], transition: { duration: 2.5, ease: 'easeOut' } }
  }

  // Color mappings
  const getCenterColor = () => {
    switch (state) {
      case 'error': return 'bg-error/80'
      case 'success': return 'bg-teal-500/80'
      default: return 'bg-primary-container/90'
    }
  }

  const getRingColor = () => {
    switch (state) {
      case 'error': return 'bg-error/30'
      case 'success': return 'bg-teal-500/30'
      default: return 'bg-primary-fixed-dim/40'
    }
  }

  return (
    <div 
      className={`relative flex items-center justify-center ${className}`} 
      style={{ width: baseSize, height: baseSize }}
    >
      {/* Outer Ring 2 */}
      <motion.div
        className={`absolute rounded-full blur-[8px] ${getRingColor()}`}
        style={{ width: baseSize, height: baseSize }}
        variants={ring2Variants}
        animate={state}
        initial="idle"
      />
      
      {/* Middle Ring 1 */}
      <motion.div
        className={`absolute rounded-full blur-[4px] ${getRingColor()}`}
        style={{ width: baseSize * 0.75, height: baseSize * 0.75 }}
        variants={ring1Variants}
        animate={state}
        initial="idle"
      />
      
      {/* Center Core */}
      <motion.div
        className={`absolute rounded-full shadow-lg shadow-primary-container/50 ${getCenterColor()}`}
        style={{ width: baseSize * 0.5, height: baseSize * 0.5 }}
        variants={centerVariants}
        animate={state}
        initial="idle"
      />
    </div>
  )
}
