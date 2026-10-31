'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { CommonGameProps } from '../types'
import { sounds } from '../sound'
import { Timer, Trophy, Flame, RotateCcw } from 'lucide-react'

interface ColorOption {
  name: string
  hex: string
}

const COLORS: ColorOption[] = [
  { name: 'ROSE', hex: '#E11D48' },
  { name: 'AZURE', hex: '#2563EB' },
  { name: 'EMERALD', hex: '#16A34A' },
  { name: 'AMBER', hex: '#D97706' },
  { name: 'VIOLET', hex: '#9333EA' },
  { name: 'ESPRESSO', hex: '#4A3429' },
]

export function ColorClash({ onGameOver, onScoreUpdate, isPaused, soundEnabled }: CommonGameProps) {
  const [timeLeft, setTimeLeft] = useState<number>(30)
  const [score, setScore] = useState<number>(0)
  const [streak, setStreak] = useState<number>(0)
  const [maxStreak, setMaxStreak] = useState<number>(0)
  const [totalAttempts, setTotalAttempts] = useState<number>(0)
  const [correctAnswers, setCorrectAnswers] = useState<number>(0)

  // Current round setup
  const [wordText, setWordText] = useState<string>('EMERALD')
  const [inkHex, setInkHex] = useState<string>('#E11D48')
  const [rule, setRule] = useState<'INK_COLOR' | 'WORD_NAME'>('INK_COLOR')
  const [isRunning, setIsRunning] = useState<boolean>(true)

  const isPausedRef = useRef(isPaused)
  isPausedRef.current = isPaused

  const nextRound = useCallback(() => {
    // Pick random word and random ink color
    const wordObj = COLORS[Math.floor(Math.random() * COLORS.length)]
    const inkObj = COLORS[Math.floor(Math.random() * COLORS.length)]

    // Randomize rule
    const newRule = Math.random() < 0.6 ? 'INK_COLOR' : 'WORD_NAME'

    setWordText(wordObj.name)
    setInkHex(inkObj.hex)
    setRule(newRule)
  }, [])

  const startNewGame = useCallback(() => {
    setTimeLeft(30)
    setScore(0)
    setStreak(0)
    setMaxStreak(0)
    setTotalAttempts(0)
    setCorrectAnswers(0)
    setIsRunning(true)
    onScoreUpdate?.(0)
    nextRound()
  }, [nextRound, onScoreUpdate])

  useEffect(() => {
    startNewGame()
  }, [startNewGame])

  // Timer
  useEffect(() => {
    if (!isRunning || isPaused) return
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          setIsRunning(false)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [isRunning, isPaused])

  // Game over check
  useEffect(() => {
    if (timeLeft === 0 && !isRunning) {
      const accuracy = totalAttempts > 0 ? Math.round((correctAnswers / totalAttempts) * 100) : 0
      sounds.playSuccess()
      onGameOver({
        gameId: 'color-clash',
        score,
        summary: `Scored ${score} pts with ${accuracy}% cognitive accuracy!`,
        isWin: score >= 350,
        metrics: {
          'Final Score': score,
          'Correct': `${correctAnswers} / ${totalAttempts}`,
          'Accuracy': `${accuracy}%`,
          'Max Streak': maxStreak,
        },
      })
    }
  }, [timeLeft, isRunning, totalAttempts, correctAnswers, score, maxStreak, onGameOver])

  const handleSelect = (selectedColor: ColorOption) => {
    if (!isRunning || isPaused) return

    setTotalAttempts((t) => t + 1)

    // Determine correct answer
    const isCorrect =
      rule === 'INK_COLOR'
        ? selectedColor.hex === inkHex
        : selectedColor.name === wordText

    if (isCorrect) {
      const multiplier = streak >= 5 ? 3 : streak >= 2 ? 2 : 1
      const points = 50 * multiplier
      const newScore = score + points
      const newStreak = streak + 1

      setScore(newScore)
      setStreak(newStreak)
      setMaxStreak((m) => Math.max(m, newStreak))
      setCorrectAnswers((c) => c + 1)
      onScoreUpdate?.(newScore)

      if (soundEnabled) sounds.playPop(550 + newStreak * 30)
    } else {
      setStreak(0)
      if (soundEnabled) sounds.playFail()
    }

    nextRound()
  }

  const multiplier = streak >= 5 ? 3 : streak >= 2 ? 2 : 1

  return (
    <div className="flex flex-col items-center w-full max-w-md mx-auto p-4 gap-5">
      {/* HUD Stats */}
      <div className="flex items-center justify-between w-full px-4 py-2.5 rounded-2xl bg-[#F3EDE3] dark:bg-[#1D1713] border border-[#DFD3C4] dark:border-[#493A30] text-xs">
        <div className="flex items-center gap-1.5 font-semibold text-[#80523B] dark:text-[#D1A184]">
          <Trophy className="w-4 h-4" />
          <span>Score: {score}</span>
        </div>

        <div className="flex items-center gap-1 font-bold text-amber-600 dark:text-amber-400">
          <Flame className={`w-4 h-4 ${streak >= 3 ? 'animate-bounce' : ''}`} />
          <span>Streak: {streak} ({multiplier}x)</span>
        </div>

        <div className={`flex items-center gap-1 font-mono font-bold text-sm ${timeLeft <= 5 ? 'text-rose-500 animate-pulse' : 'text-[#382820] dark:text-[#F3EDE3]'}`}>
          <Timer className="w-4 h-4" />
          <span>{timeLeft}s</span>
        </div>
      </div>

      {/* Time Progress Bar */}
      <div className="w-full h-1.5 rounded-full bg-[#DFD3C4] dark:bg-[#382820] overflow-hidden">
        <div
          className={`h-full transition-all duration-1000 ${
            timeLeft <= 5 ? 'bg-rose-500' : 'bg-[#80523B]'
          }`}
          style={{ width: `${(timeLeft / 30) * 100}%` }}
        />
      </div>

      {/* Target Word and Rule Banner */}
      <div className="w-full p-6 sm:p-8 rounded-3xl bg-[#FFFCF7] dark:bg-[#29211B] border-2 border-[#DFD3C4] dark:border-[#493A30] shadow-sm flex flex-col items-center text-center gap-3">
        {/* Rule Pill */}
        <div
          className={`px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${
            rule === 'INK_COLOR'
              ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-300'
              : 'bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-300'
          }`}
        >
          {rule === 'INK_COLOR' ? '🎨 TAP THE INK COLOR' : '📖 TAP THE WORD TEXT'}
        </div>

        {/* Word Displayed in Ink Color */}
        <div
          className="font-black text-5xl sm:text-6xl tracking-wider select-none my-2 transition-transform transform active:scale-95"
          style={{ color: inkHex }}
        >
          {wordText}
        </div>

        <p className="text-[11px] text-[#726056] dark:text-[#C2B1A0]">
          {rule === 'INK_COLOR'
            ? 'Ignore what the word says! Look only at the font ink color.'
            : 'Ignore the ink color! Read the word text directly.'}
        </p>
      </div>

      {/* Color Choice Buttons */}
      <div className="grid grid-cols-3 gap-2.5 w-full">
        {COLORS.map((col, idx) => (
          <button
            key={idx}
            onClick={() => handleSelect(col)}
            disabled={!isRunning || isPaused}
            className="py-3 px-2 rounded-2xl bg-[#F3EDE3] dark:bg-[#1D1713] hover:scale-105 active:scale-95 border border-[#DFD3C4] dark:border-[#493A30] flex flex-col items-center gap-1.5 cursor-pointer shadow-sm transition-all"
          >
            <div
              className="w-5 h-5 rounded-full border border-white/60 shadow-xs"
              style={{ backgroundColor: col.hex }}
            />
            <span className="text-[11px] font-bold tracking-tight text-[#382820] dark:text-[#F3EDE3]">
              {col.name}
            </span>
          </button>
        ))}
      </div>

      {/* Bottom control */}
      <div className="flex items-center justify-between w-full pt-1">
        <span className="text-xs text-[#726056] dark:text-[#C2B1A0]">
          Total Solved: {correctAnswers} / {totalAttempts}
        </span>
        <button
          onClick={startNewGame}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#EAE0D2] dark:bg-[#382820] text-[#726056] dark:text-[#C2B1A0] text-xs font-medium hover:text-[#382820] dark:hover:text-white transition-colors cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Restart</span>
        </button>
      </div>
    </div>
  )
}
