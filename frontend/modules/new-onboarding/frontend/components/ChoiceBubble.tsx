'use client'

import React from 'react'

interface ChoiceBubbleProps {
  label: string
  onClick: () => void
  disabled?: boolean
  selected?: boolean
}

export default function ChoiceBubble({ label, onClick, disabled, selected }: ChoiceBubbleProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        px-6 py-3 rounded-full text-label-md font-label-md transition-all duration-300 backdrop-blur-md border shadow-sm
        ${selected 
          ? 'bg-primary text-white border-primary shadow-primary/20 scale-105' 
          : 'bg-white/60 dark:bg-black/40 text-on-surface-variant border-outline-variant/30 hover:bg-white/90 dark:hover:bg-white/10 hover:border-outline/50 hover:text-primary hover:shadow-md'
        }
        ${disabled && !selected ? 'opacity-50 cursor-not-allowed hover:bg-white/60 hover:scale-100 hover:shadow-sm' : ''}
        active:scale-95
      `}
    >
      {label}
    </button>
  )
}
