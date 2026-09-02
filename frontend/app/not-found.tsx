'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Compass } from 'lucide-react'
import { Button } from '@heroui/react'
import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-[calc(100dvh-140px)] p-6 z-10 relative">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="flex flex-col items-center text-center space-y-6 max-w-md"
      >
        <motion.div
          animate={{ y: [0, -10, 0] }}
          transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
          className="text-primary-container p-6 rounded-full bg-secondary-fixed/20 backdrop-blur-sm"
        >
          <Compass size={64} strokeWidth={1.5} />
        </motion.div>
        
        <div className="space-y-3">
          <h1 className="text-4xl md:text-5xl font-serif text-primary tracking-tight">404</h1>
          <h2 className="text-xl md:text-2xl font-serif text-on-background opacity-90">
            Looks like you've wandered into a quiet corner...
          </h2>
          <p className="text-base text-outline">
            Let's gently guide you back to the sanctuary.
          </p>
        </div>

        <Button
          as={Link}
          href="/home"
          variant="secondary"
          size="lg"
          className="mt-6 font-medium rounded-full"
        >
          Return to Sanctuary
        </Button>
      </motion.div>
    </div>
  )
}
