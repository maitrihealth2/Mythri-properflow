'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Info, Sparkles, Mic, Book, Shield, Menu, X } from 'lucide-react'

function polarToCartesian(centerX: number, centerY: number, radius: number, angleInDegrees: number) {
  const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians)
  }
}

function describeSegment(x: number, y: number, r1: number, r2: number, startAngle: number, endAngle: number) {
  const p1 = polarToCartesian(x, y, r2, startAngle)
  const p2 = polarToCartesian(x, y, r2, endAngle)
  const p3 = polarToCartesian(x, y, r1, endAngle)
  const p4 = polarToCartesian(x, y, r1, startAngle)

  // 1 = large arc flag, 0 = sweep flag (1 for clockwise arc, 0 for counter-clockwise)
  return [
    "M", p1.x, p1.y,
    "A", r2, r2, 0, 0, 1, p2.x, p2.y,
    "L", p3.x, p3.y,
    "A", r1, r1, 0, 0, 0, p4.x, p4.y,
    "Z"
  ].join(" ")
}

// Angles from 90 (right) to 270 (left) so the semi-circle opens downwards.
const MENU_ITEMS = [
  { id: 'privacy', icon: Shield, label: 'Privacy', start: 90, end: 124 },
  { id: 'memory', icon: Book, label: 'Memory', start: 126.5, end: 160.5 },
  { id: 'voice', icon: Mic, label: 'Voice', start: 163, end: 197 },
  { id: 'experience', icon: Sparkles, label: 'Experience', start: 199.5, end: 233.5 },
  { id: 'philosophy', icon: Info, label: 'About', start: 236, end: 270 },
]

export function RadialMenu() {
  const [isOpen, setIsOpen] = useState(false)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  
  // Center of our SVG viewBox (Top Center)
  const cx = 160
  const cy = 0
  const innerRadius = 50
  const outerRadius = 150

  const handleScroll = (id: string) => {
    setIsOpen(false)
    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' })
    }
  }

  // Effect to close menu on scroll
  useEffect(() => {
    const onScroll = () => {
      if (isOpen) setIsOpen(false)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [isOpen])

  return (
    <div className="relative z-50 flex flex-col items-center pointer-events-auto">
      
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-10 h-10 md:w-11 md:h-11 rounded-full flex items-center justify-center transition-all duration-300 shadow-sm border z-10 ${
          isOpen 
            ? 'bg-[#8C7355] border-[#8C7355] text-white scale-90' 
            : 'bg-white border-[#4A2B38]/10 text-[#4A2B38] hover:bg-[#603347] hover:border-[#603347] hover:text-white'
        }`}
      >
        <motion.div
          animate={{ rotate: isOpen ? 90 : 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        >
          {isOpen ? <X size={20} /> : <Menu size={20} />}
        </motion.div>
      </button>

      {/* Label Tooltip */}
      <AnimatePresence>
        {isOpen && hoveredId && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="absolute top-44 text-[#603347] font-label-md text-sm bg-white/90 backdrop-blur px-4 py-1.5 rounded-full shadow-lg border border-[#8C7355]/20 z-20 pointer-events-none whitespace-nowrap"
          >
            {MENU_ITEMS.find(i => i.id === hoveredId)?.label}
          </motion.div>
        )}
      </AnimatePresence>

      {/* The Arc Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ scale: 0.3, opacity: 0, rotate: 20, y: -80 }}
            animate={{ scale: 1, opacity: 1, rotate: 0, y: 0 }}
            exit={{ scale: 0.3, opacity: 0, rotate: -20, y: -80 }}
            transition={{ type: "spring", damping: 20, stiffness: 200 }}
            className="absolute top-6 left-1/2 -translate-x-1/2 origin-top pointer-events-auto"
            style={{ width: '320px', height: '160px' }}
          >
            <svg viewBox="0 0 320 160" className="w-full h-full drop-shadow-2xl overflow-visible">
              {MENU_ITEMS.map((item, index) => {
                const pathData = describeSegment(cx, cy, innerRadius, outerRadius, item.start, item.end)
                const centerAngle = (item.start + item.end) / 2
                const iconPos = polarToCartesian(cx, cy, (innerRadius + outerRadius) / 2, centerAngle)
                const Icon = item.icon
                const isHovered = hoveredId === item.id

                return (
                  <g 
                    key={item.id} 
                    onClick={() => handleScroll(item.id)}
                    onMouseEnter={() => setHoveredId(item.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    className="cursor-pointer"
                  >
                    <motion.path
                      d={pathData}
                      fill={isHovered ? "#8C7355" : "#603347"}
                      className="transition-colors duration-300"
                      initial={{ opacity: 0, pathLength: 0 }}
                      animate={{ opacity: 1, pathLength: 1 }}
                      transition={{ duration: 0.5, delay: index * 0.05 }}
                    />
                    <foreignObject 
                      x={iconPos.x - 12} 
                      y={iconPos.y - 12} 
                      width="24" 
                      height="24"
                      className="pointer-events-none"
                    >
                      <motion.div 
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: isHovered ? 1.2 : 1, opacity: 1 }}
                        transition={{ duration: 0.2, delay: 0.2 + (index * 0.05) }}
                        className="w-full h-full text-white flex items-center justify-center"
                      >
                        <Icon size={18} strokeWidth={2} />
                      </motion.div>
                    </foreignObject>
                  </g>
                )
              })}
            </svg>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  )
}
