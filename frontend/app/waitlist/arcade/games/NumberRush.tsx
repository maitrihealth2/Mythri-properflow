'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { CommonGameProps } from '../types'
import { sounds } from '../sound'
import { Timer, Zap, Trophy, Flame, RotateCcw } from 'lucide-react'

interface Question {
  text: string
  answer: number
  choices: number[]
}

export function NumberRush({ onGameOver, onScoreUpdate, isPaused, soundEnabled }: CommonGameProps) {
  const [timeLeft, setTimeLeft] = useState<number>(30)
  const [score, setScore] = useState<number>(0)
  const [streak, setStreak] = useState<number>(0)
  const [maxStreak, setMaxStreak] = useState<number>(0)
  const [totalAnswered, setTotalAnswered] = useState<number>(0)
  const [correctCount, setCorrectCount] = useState<number>(0)
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null)
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null)
  const [isRunning, setIsRunning] = useState<boolean>(true)

  const isPausedRef = useRef(isPaused)
  isPausedRef.current = isPaused

  const generateQuestion = useCallback((currentScore: number): Question => {
    // Dynamic difficulty
    const ops = currentScore > 600 ? ['+', '-', '×', '÷'] : currentScore > 250 ? ['+', '-', '×'] : ['+', '-']
    const op = ops[Math.floor(Math.random() * ops.length)]

    let a = 0
    let b = 0
    let answer = 0
    let text = ''

    if (op === '+') {
      const max = currentScore > 400 ? 50 : 25
      a = Math.floor(Math.random() * max) + 2
      b = Math.floor(Math.random() * max) + 2
      answer = a + b
      text = `${a} + ${b}`
    } else if (op === '-') {
      const max = currentScore > 400 ? 60 : 30
      a = Math.floor(Math.random() * max) + 10
      b = Math.floor(Math.random() * (a - 1)) + 1
      answer = a - b
      text = `${a} − ${b}`
    } else if (op === '×') {
      a = Math.floor(Math.random() * 9) + 2
      b = Math.floor(Math.random() * 9) + 2
      answer = a * b
      text = `${a} × ${b}`
    } else {
      // Clean integer division
      b = Math.floor(Math.random() * 8) + 2
      answer = Math.floor(Math.random() * 8) + 2
      a = b * answer
      text = `${a} ÷ ${b}`
    }

    // Generate 3 believable distinct distractors
    const choices = new Set<number>([answer])
    while (choices.size < 4) {
      const offset = (Math.random() < 0.5 ? -1 : 1) * (Math.floor(Math.random() * 6) + 1)
      const cand = answer + offset
      if (cand >= 0) choices.add(cand)
    }

    return {
      text,
      answer,
      choices: Array.from(choices).sort(() => Math.random() - 0.5),
    }
  }, [])

  const startNewGame = useCallback(() => {
    setTimeLeft(30)
    setScore(0)
    setStreak(0)
    setMaxStreak(0)
    setTotalAnswered(0)
    setCorrectCount(0)
    setIsRunning(true)
    setFeedback(null)
    onScoreUpdate?.(0)
    setCurrentQuestion(generateQuestion(0))
  }, [generateQuestion, onScoreUpdate])

  useEffect(() => {
    startNewGame()
  }, [startNewGame])

  // Countdown timer
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

  // Trigger game over when time hits 0
  useEffect(() => {
    if (timeLeft === 0 && !isRunning) {
      const accuracy = totalAnswered > 0 ? Math.round((correctCount / totalAnswered) * 100) : 0
      sounds.playSuccess()
      onGameOver({
        gameId: 'number-rush',
        score,
        summary: `Scored ${score} pts with ${accuracy}% accuracy in 30 seconds!`,
        isWin: score >= 300,
        metrics: {
          'Final Score': score,
          'Questions Solved': `${correctCount} / ${totalAnswered}`,
          'Accuracy': `${accuracy}%`,
          'Max Streak': maxStreak,
        },
      })
    }
  }, [timeLeft, isRunning, totalAnswered, correctCount, score, maxStreak, onGameOver])

  const handleSelectChoice = (choice: number) => {
    if (!isRunning || isPaused || !currentQuestion) return

    setTotalAnswered((t) => t + 1)

    if (choice === currentQuestion.answer) {
      // Correct!
      const multiplier = streak >= 5 ? 3 : streak >= 2 ? 2 : 1
      const points = 50 * multiplier
      const newScore = score + points
      const newStreak = streak + 1

      setScore(newScore)
      setStreak(newStreak)
      setMaxStreak((m) => Math.max(m, newStreak))
      setCorrectCount((c) => c + 1)
      setFeedback('correct')
      onScoreUpdate?.(newScore)

      if (soundEnabled) {
        sounds.playPop(600 + Math.min(newStreak * 40, 400))
      }
    } else {
      // Wrong!
      setStreak(0)
      setFeedback('wrong')
      if (soundEnabled) sounds.playFail()
    }

    // Quick feedback animation then next question
    setTimeout(() => {
      setFeedback(null)
      setCurrentQuestion(generateQuestion(score))
    }, 200)
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

      {/* Progress Bar of Time */}
      <div className="w-full h-1.5 rounded-full bg-[#DFD3C4] dark:bg-[#382820] overflow-hidden">
        <div
          className={`h-full transition-all duration-1000 ${
            timeLeft <= 5 ? 'bg-rose-500' : 'bg-[#80523B]'
          }`}
          style={{ width: `${(timeLeft / 30) * 100}%` }}
        />
      </div>

      {/* Main Question Card */}
      <div
        className={`w-full py-10 px-6 rounded-3xl border-2 flex flex-col items-center justify-center transition-all shadow-md ${
          feedback === 'correct'
            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-400 scale-[1.02]'
            : feedback === 'wrong'
            ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-400 shake'
            : 'bg-[#FFFCF7] dark:bg-[#29211B] border-[#DFD3C4] dark:border-[#493A30]'
        }`}
      >
        <span className="text-[11px] uppercase tracking-widest text-[#8C7355] dark:text-[#D1A184] font-medium mb-2">
          Solve Fast
        </span>
        <div className="font-serif text-5xl sm:text-6xl font-bold text-[#382820] dark:text-[#F3EDE3] tracking-tight">
          {currentQuestion?.text || '—'}
        </div>
      </div>

      {/* 4 Choices Grid */}
      <div className="grid grid-cols-2 gap-3 w-full">
        {currentQuestion?.choices.map((choice, i) => (
          <button
            key={i}
            onClick={() => handleSelectChoice(choice)}
            disabled={!isRunning || isPaused}
            className="py-4 px-3 rounded-2xl bg-[#F3EDE3] dark:bg-[#1D1713] hover:bg-[#80523B] hover:text-white dark:hover:bg-[#80523B] dark:hover:text-white border-2 border-[#DFD3C4] dark:border-[#493A30] text-2xl font-bold text-[#382820] dark:text-[#F3EDE3] font-mono shadow-sm hover:scale-[1.03] active:scale-95 transition-all cursor-pointer flex items-center justify-center select-none"
          >
            {choice}
          </button>
        ))}
      </div>

      {/* Bottom control */}
      <div className="flex items-center justify-between w-full pt-2">
        <span className="text-xs text-[#726056] dark:text-[#C2B1A0]">
          Total Solved: {correctCount} / {totalAnswered}
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
