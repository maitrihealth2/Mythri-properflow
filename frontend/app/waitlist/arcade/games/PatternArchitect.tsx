'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { CommonGameProps } from '../types'
import { sounds } from '../sound'
import { Trophy, HelpCircle, Check, X, ArrowRight, RotateCcw } from 'lucide-react'

interface PatternQuestion {
  id: number
  difficulty: 'Easy' | 'Medium' | 'Hard'
  category: string
  sequence: (string | number)[]
  options: (string | number)[]
  correctIndex: number
  explanation: string
}

const PATTERNS_POOL: PatternQuestion[] = [
  {
    id: 1,
    difficulty: 'Easy',
    category: 'Arithmetic Progression',
    sequence: [3, 7, 11, 15, '?'],
    options: [17, 19, 21, 23],
    correctIndex: 1, // 19
    explanation: 'Each term increases by +4 consistently: 3 (+4) 7 (+4) 11 (+4) 15 (+4) = 19.',
  },
  {
    id: 2,
    difficulty: 'Easy',
    category: 'Double Step Series',
    sequence: [2, 4, 8, 16, '?'],
    options: [24, 28, 32, 36],
    correctIndex: 2, // 32
    explanation: 'Each number is multiplied by 2 (geometric doubling): 2 × 2 = 4, 4 × 2 = 8, 8 × 2 = 16, 16 × 2 = 32.',
  },
  {
    id: 3,
    difficulty: 'Easy',
    category: 'Botanical Growth Cycle',
    sequence: ['🌱', '🌿', '🌷', '🌺', '?'],
    options: ['🍂', '🌲', '🌾', '🌸'],
    correctIndex: 0, // 🍂
    explanation: 'The seasonal life cycle of plants: Sprout (🌱) → Leaf (🌿) → Bud (🌷) → Bloom (🌺) → Harvest Autumn Leaf (🍂).',
  },
  {
    id: 4,
    difficulty: 'Medium',
    category: 'Fibonacci Sequence',
    sequence: [1, 1, 2, 3, 5, 8, '?'],
    options: [11, 12, 13, 15],
    correctIndex: 2, // 13
    explanation: 'Each term is the sum of the two preceding numbers: 5 + 8 = 13.',
  },
  {
    id: 5,
    difficulty: 'Medium',
    category: 'Square Numbers',
    sequence: [1, 4, 9, 16, 25, '?'],
    options: [30, 32, 36, 49],
    correctIndex: 2, // 36
    explanation: 'The sequence of perfect squares: 1²=1, 2²=4, 3²=9, 4²=16, 5²=25, 6²=36.',
  },
  {
    id: 6,
    difficulty: 'Medium',
    category: 'Clockwise Compass Cycle',
    sequence: ['⬆️', '↗️', '➡️', '↘️', '?'],
    options: ['⬇️', '↙️', '⬅️', '↖️'],
    correctIndex: 0, // ⬇️
    explanation: 'Each arrow rotates 45 degrees clockwise: North → North-East → East → South-East → South (⬇️).',
  },
  {
    id: 7,
    difficulty: 'Hard',
    category: 'Alternating Interleaved Series',
    sequence: [10, 3, 12, 6, 14, 9, '?'],
    options: [15, 16, 12, 18],
    correctIndex: 1, // 16
    explanation: 'Two interleaved sequences: Odd positions add +2 (10, 12, 14, 16). Even positions add +3 (3, 6, 9). Next is 14 + 2 = 16.',
  },
  {
    id: 8,
    difficulty: 'Hard',
    category: 'Prime Numbers',
    sequence: [11, 13, 17, 19, 23, '?'],
    options: [25, 27, 29, 31],
    correctIndex: 2, // 29
    explanation: 'Successive prime numbers: 11, 13, 17, 19, 23, followed by the next prime 29.',
  },
  {
    id: 9,
    difficulty: 'Hard',
    category: 'Cubic Progression',
    sequence: [1, 8, 27, 64, '?'],
    options: [100, 120, 125, 144],
    correctIndex: 2, // 125
    explanation: 'Cube numbers: 1³=1, 2³=8, 3³=27, 4³=64, 5³=125.',
  },
]

export function PatternArchitect({ onGameOver, onScoreUpdate, isPaused, soundEnabled }: CommonGameProps) {
  const [currentIndex, setCurrentIndex] = useState<number>(0)
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null)
  const [score, setScore] = useState<number>(0)
  const [correctAnswers, setCorrectAnswers] = useState<number>(0)
  const [showExplanation, setShowExplanation] = useState<boolean>(false)

  const currentPattern = PATTERNS_POOL[currentIndex]

  const startNewGame = useCallback(() => {
    setCurrentIndex(0)
    setSelectedChoice(null)
    setScore(0)
    setCorrectAnswers(0)
    setShowExplanation(false)
    onScoreUpdate?.(0)
  }, [onScoreUpdate])

  useEffect(() => {
    startNewGame()
  }, [startNewGame])

  const handleSelect = (idx: number) => {
    if (isPaused || selectedChoice !== null || !currentPattern) return

    setSelectedChoice(idx)
    setShowExplanation(true)

    const isCorrect = idx === currentPattern.correctIndex
    if (isCorrect) {
      const points = currentPattern.difficulty === 'Hard' ? 200 : currentPattern.difficulty === 'Medium' ? 120 : 80
      const newScore = score + points
      setScore(newScore)
      setCorrectAnswers((c) => c + 1)
      onScoreUpdate?.(newScore)
      if (soundEnabled) sounds.playSuccess()
    } else {
      if (soundEnabled) sounds.playFail()
    }
  }

  const handleNext = () => {
    if (currentIndex + 1 < PATTERNS_POOL.length) {
      setCurrentIndex((prev) => prev + 1)
      setSelectedChoice(null)
      setShowExplanation(false)
    } else {
      // Completed all patterns!
      const total = PATTERNS_POOL.length
      onGameOver({
        gameId: 'pattern-architect',
        score,
        summary: `Completed Pattern Architect: ${correctAnswers}/${total} correct with ${score} pts!`,
        isWin: correctAnswers >= Math.ceil(total * 0.6),
        metrics: {
          'Accuracy': `${Math.round((correctAnswers / total) * 100)}%`,
          'Questions Solved': `${correctAnswers} / ${total}`,
          'Total Score': score,
        },
      })
    }
  }

  return (
    <div className="flex flex-col items-center w-full max-w-md mx-auto p-4 gap-5">
      {/* Top HUD */}
      <div className="flex items-center justify-between w-full px-4 py-2.5 rounded-2xl bg-[#F3EDE3] dark:bg-[#1D1713] border border-[#DFD3C4] dark:border-[#493A30] text-xs">
        <div className="flex items-center gap-1.5 font-semibold text-[#80523B] dark:text-[#D1A184]">
          <Trophy className="w-4 h-4" />
          <span>Score: {score}</span>
        </div>

        <div className="text-[#382820] dark:text-[#F3EDE3] font-medium">
          Pattern {currentIndex + 1} / {PATTERNS_POOL.length}
        </div>

        <span
          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
            currentPattern.difficulty === 'Hard'
              ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
              : currentPattern.difficulty === 'Medium'
              ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
              : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
          }`}
        >
          {currentPattern.difficulty}
        </span>
      </div>

      {/* Pattern Sequence Display Card */}
      <div className="w-full p-6 rounded-3xl bg-[#FFFCF7] dark:bg-[#29211B] border-2 border-[#DFD3C4] dark:border-[#493A30] shadow-sm flex flex-col items-center text-center gap-4">
        <span className="text-[11px] uppercase tracking-widest text-[#8C7355] dark:text-[#D1A184] font-medium">
          {currentPattern.category}
        </span>

        {/* Tiles in sequence */}
        <div className="flex flex-wrap items-center justify-center gap-2.5 py-2">
          {currentPattern.sequence.map((item, idx) => (
            <div
              key={idx}
              className={`min-w-12 h-14 px-3 rounded-2xl border-2 flex items-center justify-center font-mono text-xl sm:text-2xl font-bold transition-all shadow-sm ${
                item === '?'
                  ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-400 text-amber-700 dark:text-amber-300 animate-pulse'
                  : 'bg-[#F3EDE3] dark:bg-[#1D1713] border-[#DFD3C4] dark:border-[#493A30] text-[#382820] dark:text-[#F3EDE3]'
              }`}
            >
              {item}
            </div>
          ))}
        </div>
      </div>

      {/* 4 Options Grid */}
      <div className="grid grid-cols-2 gap-3 w-full">
        {currentPattern.options.map((opt, idx) => {
          const isSelected = selectedChoice === idx
          const isCorrect = idx === currentPattern.correctIndex

          let buttonStyle = 'bg-[#F3EDE3] dark:bg-[#1D1713] border-[#DFD3C4] dark:border-[#493A30] text-[#382820] dark:text-[#F3EDE3] hover:scale-[1.02]'

          if (showExplanation) {
            if (isCorrect) {
              buttonStyle = 'bg-emerald-100 dark:bg-emerald-950/60 border-emerald-500 text-emerald-800 dark:text-emerald-200'
            } else if (isSelected) {
              buttonStyle = 'bg-rose-100 dark:bg-rose-950/60 border-rose-500 text-rose-800 dark:text-rose-200'
            } else {
              buttonStyle = 'opacity-40 bg-[#F3EDE3] dark:bg-[#1D1713] border-transparent text-[#726056]'
            }
          }

          return (
            <button
              key={idx}
              onClick={() => handleSelect(idx)}
              disabled={showExplanation || isPaused}
              className={`py-3.5 px-3 rounded-2xl border-2 font-mono text-xl font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm ${buttonStyle}`}
            >
              <span>{opt}</span>
              {showExplanation && isCorrect && <Check className="w-4 h-4 text-emerald-600" />}
              {showExplanation && isSelected && !isCorrect && <X className="w-4 h-4 text-rose-600" />}
            </button>
          )
        })}
      </div>

      {/* Logic Explanation Box */}
      {showExplanation && (
        <div className="w-full p-4 rounded-2xl bg-[#EAE0D2] dark:bg-[#382820] border border-[#DFD3C4] dark:border-[#493A30] flex flex-col gap-2 text-left animate-fadeIn">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[#80523B] dark:text-[#D1A184]">
            <HelpCircle className="w-4 h-4" />
            <span>Logic Explanation</span>
          </div>
          <p className="text-xs text-[#382820] dark:text-[#F3EDE3] leading-relaxed">
            {currentPattern.explanation}
          </p>

          <button
            onClick={handleNext}
            className="mt-2 w-full py-2.5 rounded-xl bg-[#80523B] hover:bg-[#6A422F] text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm active:scale-98 transition-all cursor-pointer"
          >
            <span>{currentIndex + 1 < PATTERNS_POOL.length ? 'Next Pattern' : 'Finish Challenge'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Bottom control */}
      <div className="flex items-center justify-between w-full pt-1">
        <span className="text-xs text-[#726056] dark:text-[#C2B1A0]">
          Identified: {correctAnswers} / {currentIndex + (showExplanation ? 1 : 0)}
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
