'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { CommonGameProps } from '../types'
import { sounds } from '../sound'
import { Zap, RotateCcw, AlertTriangle, CheckCircle2, Sparkles } from 'lucide-react'

type TestState = 'idle' | 'waiting' | 'ready' | 'early' | 'recorded'

export function ReactionTest({ onGameOver, onScoreUpdate, isPaused, soundEnabled }: CommonGameProps) {
  const [state, setState] = useState<TestState>('idle')
  const [currentMs, setCurrentMs] = useState<number | null>(null)
  const [attempts, setAttempts] = useState<number[]>([])
  const [falseStarts, setFalseStarts] = useState<number>(0)

  const readyTimeRef = useRef<number>(0)
  const timerTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const cleanupTimer = () => {
    if (timerTimeoutRef.current) {
      clearTimeout(timerTimeoutRef.current)
      timerTimeoutRef.current = null
    }
  }

  useEffect(() => {
    return cleanupTimer
  }, [])

  const startWaitingRound = useCallback(() => {
    cleanupTimer()
    setState('waiting')
    setCurrentMs(null)

    // Random delay between 1.8s and 4.2s
    const delay = Math.floor(Math.random() * 2400) + 1800
    timerTimeoutRef.current = setTimeout(() => {
      readyTimeRef.current = performance.now()
      setState('ready')
      if (soundEnabled) sounds.playLaser()
    }, delay)
  }, [soundEnabled])

  const handleClickStage = () => {
    if (isPaused) return

    if (state === 'idle') {
      startWaitingRound()
    } else if (state === 'waiting') {
      // Early click / false start!
      cleanupTimer()
      setState('early')
      setFalseStarts((f) => f + 1)
      if (soundEnabled) sounds.playFail()
    } else if (state === 'ready') {
      // Valid reaction!
      const elapsed = Math.round(performance.now() - readyTimeRef.current)
      setCurrentMs(elapsed)
      setState('recorded')
      if (soundEnabled) sounds.playSuccess()

      const newAttempts = [...attempts, elapsed]
      setAttempts(newAttempts)

      // Score: 1000 - reactionMs
      const roundScore = Math.max(50, 1000 - elapsed)
      onScoreUpdate?.(roundScore)

      // Check if 5 attempts finished
      if (newAttempts.length >= 5) {
        const sum = newAttempts.reduce((acc, v) => acc + v, 0)
        const avg = Math.round(sum / newAttempts.length)
        const best = Math.min(...newAttempts)
        const finalScore = Math.max(100, Math.round(1200 - avg - falseStarts * 40))

        setTimeout(() => {
          onGameOver({
            gameId: 'reaction-test',
            score: finalScore,
            summary: `Benchmark completed! Average: ${avg}ms (Best: ${best}ms)`,
            isWin: avg < 300,
            metrics: {
              'Average Speed': `${avg}ms`,
              'Best Reaction': `${best}ms`,
              'False Starts': falseStarts,
              'Rank': avg < 230 ? 'Transcendent' : avg < 280 ? 'Swift Mind' : 'Steady Focus',
            },
          })
        }, 800)
      }
    } else if (state === 'recorded' || state === 'early') {
      if (attempts.length < 5) {
        startWaitingRound()
      }
    }
  }

  const handleReset = () => {
    cleanupTimer()
    setState('idle')
    setCurrentMs(null)
    setAttempts([])
    setFalseStarts(0)
    onScoreUpdate?.(0)
  }

  const average =
    attempts.length > 0 ? Math.round(attempts.reduce((a, b) => a + b, 0) / attempts.length) : null

  return (
    <div className="flex flex-col items-center w-full max-w-sm sm:max-w-md mx-auto p-2 sm:p-4 gap-4 animate-fadeIn">
      {/* HUD Stats */}
      <div className="flex items-center justify-between w-full px-4 py-2.5 rounded-2xl bg-[#FFFCF8] dark:bg-[#261E1A] border border-[#E5DACE] dark:border-[#3D2E24] shadow-xs text-xs">
        <div className="flex items-center gap-1.5 font-semibold text-[#80523B] dark:text-[#D1A184]">
          <Zap className="w-4 h-4" />
          <span>Attempt: {attempts.length} / 5</span>
        </div>

        <div className="font-mono text-[#382820] dark:text-[#F3EDE3] font-bold">
          Avg: {average ? `${average}ms` : '—'}
        </div>

        <div className="text-xs text-rose-600 dark:text-rose-400 font-medium">
          Faults: {falseStarts}
        </div>
      </div>

      {/* Main Reactive Stage */}
      <button
        onClick={handleClickStage}
        className={`w-full aspect-[4/3] rounded-3xl p-6 sm:p-8 border-3 flex flex-col items-center justify-center text-center transition-all duration-200 cursor-pointer select-none touch-none shadow-md ${state === 'idle'
            ? 'bg-[#FFFCF8] dark:bg-[#261E1A] border-[#E5DACE] dark:border-[#3D2E24] hover:border-[#784429] hover:scale-[1.01]'
            : state === 'waiting'
              ? 'bg-[#4A2619] border-[#784429] text-white animate-pulse'
              : state === 'ready'
                ? 'bg-emerald-600 border-emerald-400 text-white scale-[1.03] shadow-[0_0_50px_rgba(16,185,129,0.55)]'
                : state === 'early'
                  ? 'bg-amber-100 dark:bg-amber-950/60 border-amber-500 text-amber-900 dark:text-amber-200'
                  : 'bg-[#FFFCF8] dark:bg-[#261E1A] border-[#784429] text-[#382820] dark:text-[#F3EDE3]'
          }`}
      >
        {state === 'idle' && (
          <div className="flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-3xl bg-[#F4EFEA] dark:bg-[#342922] flex items-center justify-center text-[#784429] dark:text-[#D1A184] shadow-xs">
              <Zap className="w-8 h-8" />
            </div>
            <h3
              className="font-serif text-xl sm:text-2xl font-bold text-[#382820] dark:text-[#F3EDE3]"
              style={{ fontFamily: 'var(--font-literata), Georgia, serif' }}
            >
              Tap Anywhere to Begin
            </h3>
            <p className="text-xs text-[#726056] dark:text-[#B5A192] max-w-xs leading-relaxed">
              When this card turns <strong className="text-emerald-600 font-bold">EMERALD GREEN</strong>, tap as swiftly as you can.
            </p>
          </div>
        )}

        {state === 'waiting' && (
          <div className="flex flex-col items-center gap-2 text-white">
            <span
              className="text-xl sm:text-2xl font-serif font-bold tracking-wide"
              style={{ fontFamily: 'var(--font-literata), Georgia, serif' }}
            >
              Wait for green…
            </span>
            <span className="text-xs text-white/80">Quiet your breath. Do not tap yet!</span>
          </div>
        )}

        {state === 'ready' && (
          <div className="flex flex-col items-center gap-2 text-white">
            <span className="text-4xl sm:text-6xl font-black uppercase tracking-wider font-mono drop-shadow-md">
              TAP NOW!
            </span>
          </div>
        )}

        {state === 'early' && (
          <div className="flex flex-col items-center gap-2">
            <AlertTriangle className="w-9 h-9 text-amber-600" />
            <span
              className="font-serif text-xl font-bold"
              style={{ fontFamily: 'var(--font-literata), Georgia, serif' }}
            >
              Too Early!
            </span>
            <span className="text-xs text-[#726056] dark:text-[#B5A192] max-w-xs">
              You tapped before the green light appeared. Tap to try this round again.
            </span>
          </div>
        )}

        {state === 'recorded' && (
          <div className="flex flex-col items-center gap-2">
            <CheckCircle2 className="w-9 h-9 text-emerald-600" />
            <div className="font-mono text-5xl sm:text-6xl font-bold text-[#784429] dark:text-[#D1A184]">
              {currentMs}ms
            </div>
            <span className="text-xs text-[#726056] dark:text-[#B5A192] mt-1 font-medium">
              {attempts.length < 5
                ? 'Tap anywhere to advance to next attempt'
                : 'All 5 rounds finished! Finalizing results…'}
            </span>
          </div>
        )}
      </button>

      {/* Attempt History Pills */}
      <div className="flex items-center justify-center gap-2 w-full">
        {[0, 1, 2, 3, 4].map((idx) => {
          const val = attempts[idx]
          return (
            <div
              key={idx}
              className={`w-9 h-9 rounded-xl flex items-center justify-center text-[11px] font-mono font-bold transition-all border ${val
                  ? 'bg-[#784429] border-[#784429] text-white shadow-xs'
                  : 'bg-[#FFFCF8] dark:bg-[#261E1A] border-[#E5DACE] dark:border-[#3D2E24] text-[#8C7355]'
                }`}
            >
              {val ? `${val}` : `${idx + 1}`}
            </div>
          )
        })}
      </div>

      {/* Reset button */}
      <div className="flex items-center justify-end w-full">
        <button
          onClick={handleReset}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#F0E6D8] dark:bg-[#342922] text-[#8C5338] dark:text-[#D19B75] text-xs font-semibold hover:bg-[#E5D7C5] transition-all cursor-pointer shadow-xs active:scale-95"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Test</span>
        </button>
      </div>
    </div>
  )
}
