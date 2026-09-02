'use client'

import React, { useEffect } from 'react'
import { motion } from 'framer-motion'
import { Leaf } from 'lucide-react'
import { Button } from '@heroui/react'
import Link from 'next/link'

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Application boundary error:', error)
  }, [error])

  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-[calc(100dvh-140px)] p-6 z-10 relative">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="flex flex-col items-center text-center space-y-6 max-w-md"
      >
        <motion.div
          animate={{ rotate: [-3, 3, -3] }}
          transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
          className="text-primary-container p-6 rounded-full bg-secondary-fixed/20 backdrop-blur-sm"
        >
          <Leaf size={64} strokeWidth={1.5} />
        </motion.div>
        
        <div className="space-y-3">
          <h1 className="text-2xl md:text-3xl font-serif text-on-background">
            Our sanctuary is taking a brief pause
          </h1>
          <p className="text-base text-outline px-2">
            We're experiencing a moment of turbulence. Take a deep breath, and let's try again.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 pt-6 w-full sm:w-auto">
          <Button
            onPress={() => reset()}
            variant="primary"
            size="lg"
            className="font-medium rounded-full"
          >
            Take a breath & try again
          </Button>
          <Button
            as={Link}
            href="/home"
            variant="secondary"
            size="lg"
            className="font-medium rounded-full"
          >
            Return to Sanctuary
          </Button>
        </div>
      </motion.div>
    </div>
  )
}
