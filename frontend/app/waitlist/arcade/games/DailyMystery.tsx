'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { CommonGameProps } from '../types'
import { sounds } from '../sound'
import { getDailyProgress, saveDailyProgress } from '../storage'
import { Calendar, KeyRound, Share2, CheckCircle2, RotateCcw, Sparkles } from 'lucide-react'

interface DailyPuzzleData {
  code: string // 4 digits e.g. "0425"
  riddle: string
  clues: string[]
}

// Generate deterministic puzzle based on date string "YYYY-MM-DD"
function getDailyPuzzle(dateStr: string): DailyPuzzleData {
  let hash = 0
  for (let i = 0; i < dateStr.length; i++) {
    hash = (hash << 5) - hash + dateStr.charCodeAt(i)
    hash |= 0
  }
  const absHash = Math.abs(hash)

  const d1 = (absHash % 9) + 1
  const d2 = ((absHash >> 3) % 9) + 1
  const d3 = ((absHash >> 6) % 9) + 1
  const d4 = ((absHash >> 9) % 9) + 1

  // Ensure digits are interesting
  const code = `${d1}${d2 !== d1 ? d2 : (d1 + 2) % 9}${d3}${d4 !== d3 ? d4 : (d3 + 1) % 9}`

  return {
    code,
    riddle: 'Turn the dials to decrypt today’s sanctuary frequency.',
    clues: [
      `Digit sum: The four sacred digits sum to ${parseInt(code[0]) + parseInt(code[1]) + parseInt(code[2]) + parseInt(code[3])}.`,
      `Even balance: First digit (${code[0]}) is ${parseInt(code[0]) % 2 === 0 ? 'even' : 'odd'}, final digit (${code[3]}) is ${parseInt(code[3]) % 2 === 0 ? 'even' : 'odd'}.`,
      `Magnitude: The middle two digits (${code[1]}${code[2]}) form a number between ${Math.max(10, parseInt(code[1] + code[2]) - 10)} and ${parseInt(code[1] + code[2]) + 10}.`,
      `Comparison: The second digit is ${parseInt(code[1]) > parseInt(code[2]) ? 'greater than' : 'less than or equal to'} the third digit.`,
    ],
  }
}

export function DailyMystery({ onGameOver, onScoreUpdate, isPaused, soundEnabled }: CommonGameProps) {
  const todayStr = new Date().toISOString().split('T')[0]

  const [isPractice, setIsPractice] = useState<boolean>(false)
  const [activeDate, setActiveDate] = useState<string>(todayStr)
  const [puzzle, setPuzzle] = useState<DailyPuzzleData>(getDailyPuzzle(todayStr))
  const [dials, setDials] = useState<number[]>([0, 0, 0, 0])
  const [attempts, setAttempts] = useState<string[]>([])
  const [isSolved, setIsSolved] = useState<boolean>(false)
  const [copied, setCopied] = useState<boolean>(false)

  // Load daily progress
  useEffect(() => {
    if (!isPractice) {
      const prog = getDailyProgress(todayStr)
      if (prog.solved) {
        setIsSolved(true)
      }
    }
  }, [todayStr, isPractice])

  const handleDialChange = (index: number, delta: number) => {
    if (isPaused || isSolved) return
    const newDials = [...dials]
    newDials[index] = (newDials[index] + delta + 10) % 10
    setDials(newDials)
    if (soundEnabled) sounds.playPop(500 + index * 50)
  }

  const handleTestCode = () => {
    if (isPaused || isSolved) return
    const guess = dials.join('')
    const newAttempts = [...attempts, guess]
    setAttempts(newAttempts)

    if (guess === puzzle.code) {
      // Victory!
      setIsSolved(true)
      if (soundEnabled) sounds.playSuccess()

      if (!isPractice) {
        saveDailyProgress(todayStr, true, newAttempts.length)
      }

      const score = Math.max(100, 500 - (newAttempts.length - 1) * 60)
      onScoreUpdate?.(score)

      onGameOver({
        gameId: 'daily-mystery',
        score,
        summary: `Decrypted today's Daily Mystery code in ${newAttempts.length} attempt(s)!`,
        isWin: true,
        metrics: {
          'Attempts': newAttempts.length,
          'Date': activeDate,
          'Mode': isPractice ? 'Practice' : 'Official Daily',
        },
      })
    } else {
      // Wrong guess
      if (soundEnabled) sounds.playFail()
    }
  }

  const handleShare = () => {
    const text = `Mythri Daily Mystery • ${activeDate}\n🧩 Solved in ${attempts.length} attempts!\nhttps://mythri.health/waitlist`
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const handleTogglePractice = () => {
    const nextPractice = !isPractice
    setIsPractice(nextPractice)
    if (nextPractice) {
      // Generate random practice puzzle
      const randomDate = `PRACTICE-${Math.floor(Math.random() * 99999)}`
      setActiveDate(randomDate)
      setPuzzle(getDailyPuzzle(randomDate))
    } else {
      setActiveDate(todayStr)
      setPuzzle(getDailyPuzzle(todayStr))
    }
    setDials([0, 0, 0, 0])
    setAttempts([])
    setIsSolved(false)
  }

  return (
    <div className="flex flex-col items-center w-full max-w-md mx-auto p-4 gap-4">
      {/* Top HUD */}
      <div className="flex items-center justify-between w-full px-4 py-2.5 rounded-2xl bg-[#F3EDE3] dark:bg-[#1D1713] border border-[#DFD3C4] dark:border-[#493A30] text-xs">
        <div className="flex items-center gap-1.5 font-semibold text-[#80523B] dark:text-[#D1A184]">
          <Calendar className="w-4 h-4" />
          <span>{isPractice ? 'Practice Mode' : todayStr}</span>
        </div>

        <div className="text-[#382820] dark:text-[#F3EDE3] font-medium">
          Tries: {attempts.length}
        </div>

        <button
          onClick={handleTogglePractice}
          className="text-xs text-[#80523B] dark:text-[#D1A184] hover:underline cursor-pointer"
        >
          {isPractice ? 'Back to Daily' : 'Practice Mode'}
        </button>
      </div>

      {/* Clues Card */}
      <div className="w-full p-5 rounded-3xl bg-[#FFFCF7] dark:bg-[#29211B] border-2 border-[#DFD3C4] dark:border-[#493A30] shadow-sm flex flex-col gap-3 text-left">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-[#80523B] dark:text-[#D1A184]">
          <KeyRound className="w-4 h-4" />
          <span>Cryptic Clues</span>
        </div>

        <ul className="flex flex-col gap-2 text-xs text-[#382820] dark:text-[#F3EDE3]">
          {puzzle.clues.map((clue, idx) => (
            <li key={idx} className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#80523B] mt-1.5 shrink-0" />
              <span>{clue}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* 4 Dials Combination Lock */}
      <div className="flex items-center justify-center gap-3 py-2">
        {dials.map((digit, idx) => (
          <div key={idx} className="flex flex-col items-center gap-1">
            <button
              onClick={() => handleDialChange(idx, 1)}
              disabled={isSolved || isPaused}
              className="w-10 h-8 rounded-xl bg-[#EAE0D2] dark:bg-[#382820] text-[#726056] dark:text-[#C2B1A0] font-bold text-xs flex items-center justify-center hover:bg-[#80523B] hover:text-white transition-all cursor-pointer"
            >
              ▲
            </button>

            <div className="w-14 h-16 rounded-2xl bg-[#FFFCF7] dark:bg-[#29211B] border-2 border-[#80523B] flex items-center justify-center font-mono text-3xl font-bold text-[#382820] dark:text-[#F3EDE3] shadow-md">
              {digit}
            </div>

            <button
              onClick={() => handleDialChange(idx, -1)}
              disabled={isSolved || isPaused}
              className="w-10 h-8 rounded-xl bg-[#EAE0D2] dark:bg-[#382820] text-[#726056] dark:text-[#C2B1A0] font-bold text-xs flex items-center justify-center hover:bg-[#80523B] hover:text-white transition-all cursor-pointer"
            >
              ▼
            </button>
          </div>
        ))}
      </div>

      {/* Test / Unlock Button */}
      {!isSolved ? (
        <button
          onClick={handleTestCode}
          disabled={isPaused}
          className="w-full py-3 rounded-2xl bg-[#80523B] hover:bg-[#6A422F] text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-md active:scale-98 transition-all cursor-pointer"
        >
          <KeyRound className="w-4 h-4" />
          <span>Unlock Sanctuary Vault</span>
        </button>
      ) : (
        <div className="w-full p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-400 flex flex-col items-center text-center gap-2 animate-fadeIn">
          <div className="flex items-center gap-1.5 text-emerald-800 dark:text-emerald-200 font-serif font-bold text-base">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span>Daily Mystery Solved!</span>
          </div>
          <p className="text-xs text-emerald-700 dark:text-emerald-300">
            You deciphered today’s frequency in {attempts.length} attempts.
          </p>
          <button
            onClick={handleShare}
            className="mt-1 px-4 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>{copied ? 'Copied to Clipboard!' : 'Share Result'}</span>
          </button>
        </div>
      )}

      {/* Attempts log */}
      {attempts.length > 0 && !isSolved && (
        <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
          <span className="text-[11px] text-[#726056] dark:text-[#C2B1A0]">Past Guesses:</span>
          {attempts.map((att, i) => (
            <span
              key={i}
              className="px-2 py-0.5 rounded-md font-mono text-xs bg-[#EAE0D2] dark:bg-[#382820] text-[#382820] dark:text-[#F3EDE3]"
            >
              {att}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
