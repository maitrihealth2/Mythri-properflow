'use client'

import React, { useEffect } from 'react'
import { motion } from 'framer-motion'
import { CloudRain } from 'lucide-react'
import { Button } from '@heroui/react'
import { Literata } from 'next/font/google'
import './globals.css'

const literata = Literata({
  subsets: ['latin'],
  variable: '--font-literata',
  display: 'swap',
})

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Global application error:', error)
  }, [error])

  return (
    <html lang="en" className="light bg-immersive" suppressHydrationWarning>
      <head>
        <title>Moment of Turbulence | Mythri</title>
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
      </head>
      <body className={`${literata.variable} font-body-md antialiased bg-immersive min-h-[100dvh] flex flex-col text-on-background relative overflow-hidden`}>
        {/* Background Grain and Ambient Blobs */}
        <div className="bg-grain"></div>
        {/* Desktop Blobs */}
        <div className="hidden md:block fixed top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-tertiary-fixed/10 opacity-30 pointer-events-none z-0"></div>
        <div className="hidden md:block fixed bottom-[-10%] right-[-10%] w-[60vw] h-[60vw] rounded-full bg-secondary-fixed/20 opacity-30 pointer-events-none z-0"></div>
        {/* Mobile Blobs */}
        <div className="block md:hidden fixed top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-slate-300/20 opacity-30 pointer-events-none z-0"></div>
        <div className="block md:hidden fixed bottom-[-10%] right-[-10%] w-[60vw] h-[60vw] rounded-full bg-stone-200/20 opacity-30 pointer-events-none z-0"></div>

        <div className="flex-1 flex flex-col items-center justify-center min-h-[100dvh] p-6 z-10 relative">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="flex flex-col items-center text-center space-y-6 max-w-md"
          >
            <motion.div
              animate={{ y: [0, -5, 0] }}
              transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
              className="text-primary-container p-6 rounded-full bg-secondary-fixed/20 backdrop-blur-sm"
            >
              <CloudRain size={64} strokeWidth={1.5} />
            </motion.div>
            
            <div className="space-y-3">
              <h1 className="text-2xl md:text-3xl font-serif text-on-background">
                We're experiencing a moment of turbulence
              </h1>
              <p className="text-base text-outline px-4">
                Something unexpected happened in the sanctuary's core. Please try reloading the application.
              </p>
            </div>

            <Button
              onPress={() => reset()}
              color="primary"
              variant="solid"
              size="lg"
              className="mt-6 font-medium"
              radius="full"
            >
              Reload Sanctuary
            </Button>
          </motion.div>
        </div>
      </body>
    </html>
  )
}
