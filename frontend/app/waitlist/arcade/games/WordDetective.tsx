'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { CommonGameProps } from '../types'
import { sounds } from '../sound'
import { HelpCircle, Lightbulb, SkipForward, Trophy, RotateCcw, Check } from 'lucide-react'

interface WordEntry {
  word: string
  clue: string
  difficulty: 'Easy' | 'Medium' | 'Hard'
}

const WORD_BANK: WordEntry[] = [
  { word: 'PEACE', clue: 'Freedom from disturbance or anxiety', difficulty: 'Easy' },
  { word: 'CALM', clue: 'Serene state without agitation', difficulty: 'Easy' },
  { word: 'LOTUS', clue: 'Aquatic flower symbolizing purity and rebirth', difficulty: 'Easy' },
  { word: 'BREATH', clue: 'The rhythmic anchor of mindfulness', difficulty: 'Easy' },
  { word: 'OASIS', clue: 'A fertile, sheltered sanctuary in a desert', difficulty: 'Easy' },
  { word: 'HEALING', clue: 'The process of becoming sound or whole again', difficulty: 'Medium' },
  { word: 'SERENE', clue: 'Untroubled, tranquil, and unclouded', difficulty: 'Medium' },
  { word: 'HARMONY', clue: 'Congruent agreement and peaceful balance', difficulty: 'Medium' },
  { word: 'SILENCE', clue: 'Complete absence of sound or inner turmoil', difficulty: 'Medium' },
  { word: 'BALANCE', clue: 'Even distribution of weight and mental stability', difficulty: 'Medium' },
  { word: 'SANCTUARY', clue: 'A safe haven of refuge and quietude', difficulty: 'Hard' },
  { word: 'MEDITATION', clue: 'Deep intentional contemplation and awareness', difficulty: 'Hard' },
  { word: 'RESILIENCE', clue: 'Capacity to recover quickly from life challenges', difficulty: 'Hard' },
  { word: 'COMPASSION', clue: 'Sympathetic consciousness of others with desire to help', difficulty: 'Hard' },
  { word: 'MINDFULNESS', clue: 'Living fully present in this very moment', difficulty: 'Hard' },
]

function shuffleString(str: string): string[] {
  const arr = str.split('')
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const temp = arr[i]
    arr[i] = arr[j]
    arr[j] = temp
  }
  // Ensure it didn't end up identical to original
  if (arr.join('') === str && str.length > 2) {
    const temp = arr[0]
    arr[0] = arr[1]
    arr[1] = temp
  }
  return arr
}

export function WordDetective({ onGameOver, onScoreUpdate, isPaused, soundEnabled }: CommonGameProps) {
  const [usedWords, setUsedWords] = useState<string[]>([])
  const [currentWord, setCurrentWord] = useState<WordEntry | null>(null)
  const [scrambled, setScrambled] = useState<{ id: number; char: string; used: boolean }[]>([])
  const [placedLetters, setPlacedLetters] = useState<{ charId: number; char: string }[]>([])
  const [score, setScore] = useState<number>(0)
  const [hintsUsed, setHintsUsed] = useState<number>(0)
  const [solvedCount, setSolvedCount] = useState<number>(0)
  const [feedback, setFeedback] = useState<'success' | 'error' | null>(null)

  const pickNextWord = useCallback((pastWords: string[]): WordEntry | null => {
    const available = WORD_BANK.filter((w) => !pastWords.includes(w.word))
    if (available.length === 0) return null
    return available[Math.floor(Math.random() * available.length)]
  }, [])

  const loadWord = useCallback((entry: WordEntry) => {
    setCurrentWord(entry)
    const shuffled = shuffleString(entry.word)
    setScrambled(shuffled.map((char, id) => ({ id, char, used: false })))
    setPlacedLetters([])
    setFeedback(null)
  }, [])

  const startNewGame = useCallback(() => {
    setUsedWords([])
    setScore(0)
    setHintsUsed(0)
    setSolvedCount(0)
    onScoreUpdate?.(0)

    const first = pickNextWord([])
    if (first) {
      setUsedWords([first.word])
      loadWord(first)
    }
  }, [pickNextWord, loadWord, onScoreUpdate])

  useEffect(() => {
    startNewGame()
  }, [startNewGame])

  const handleTileClick = (tileId: number) => {
    if (isPaused || !currentWord || feedback) return

    const tile = scrambled.find((t) => t.id === tileId)
    if (!tile || tile.used) return

    // Add to placed
    setPlacedLetters((prev) => [...prev, { charId: tile.id, char: tile.char }])
    setScrambled((prev) => prev.map((t) => (t.id === tileId ? { ...t, used: true } : t)))
    if (soundEnabled) sounds.playPop(500)
  }

  const handleRemovePlaced = (index: number) => {
    if (isPaused || feedback) return
    const letter = placedLetters[index]
    if (!letter) return

    setPlacedLetters((prev) => prev.filter((_, i) => i !== index))
    setScrambled((prev) => prev.map((t) => (t.id === letter.charId ? { ...t, used: false } : t)))
    if (soundEnabled) sounds.playPop(420)
  }

  // Check word when full
  useEffect(() => {
    if (!currentWord || placedLetters.length !== currentWord.word.length || feedback) return

    const guess = placedLetters.map((p) => p.char).join('')
    if (guess === currentWord.word) {
      // Correct!
      setFeedback('success')
      sounds.playSuccess()

      const basePoints = currentWord.difficulty === 'Hard' ? 200 : currentWord.difficulty === 'Medium' ? 120 : 80
      const newScore = score + basePoints
      const newSolved = solvedCount + 1

      setScore(newScore)
      setSolvedCount(newSolved)
      onScoreUpdate?.(newScore)

      setTimeout(() => {
        const next = pickNextWord([...usedWords, currentWord.word])
        if (next && newSolved < 7) {
          setUsedWords((prev) => [...prev, next.word])
          loadWord(next)
        } else {
          // Completed session!
          onGameOver({
            gameId: 'word-detective',
            score: newScore,
            summary: `Solved ${newSolved} sanctuary word puzzles with ${newScore} points!`,
            isWin: true,
            metrics: {
              'Words Solved': newSolved,
              'Final Score': newScore,
              'Hints Used': hintsUsed,
            },
          })
        }
      }, 1000)
    } else {
      // Wrong guess
      setFeedback('error')
      sounds.playFail()
      setTimeout(() => {
        // Return letters to bank
        setPlacedLetters([])
        setScrambled((prev) => prev.map((t) => ({ ...t, used: false })))
        setFeedback(null)
      }, 700)
    }
  }, [placedLetters, currentWord, feedback, score, solvedCount, usedWords, hintsUsed, loadWord, pickNextWord, onGameOver, onScoreUpdate])

  // Hint button
  const handleHint = () => {
    if (isPaused || !currentWord || feedback) return
    const target = currentWord.word
    const currentLength = placedLetters.length

    if (currentLength < target.length) {
      const correctChar = target[currentLength]
      // Find unused tile with this char
      const tile = scrambled.find((t) => !t.used && t.char === correctChar)
      if (tile) {
        setPlacedLetters((prev) => [...prev, { charId: tile.id, char: tile.char }])
        setScrambled((prev) => prev.map((t) => (t.id === tile.id ? { ...t, used: true } : t)))
        setHintsUsed((h) => h + 1)
        sounds.playClick()
      }
    }
  }

  // Skip word
  const handleSkip = () => {
    if (isPaused || !currentWord) return
    const next = pickNextWord([...usedWords, currentWord.word])
    if (next) {
      setUsedWords((prev) => [...prev, next.word])
      loadWord(next)
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
        <div className="text-[#726056] dark:text-[#C2B1A0] font-medium">
          Solved: <strong className="text-[#382820] dark:text-white">{solvedCount}</strong>
        </div>
        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#80523B]/10 text-[#80523B] dark:text-[#D1A184]">
          {currentWord?.difficulty || 'Medium'}
        </span>
      </div>

      {/* Clue Card */}
      <div className="w-full p-5 rounded-3xl bg-[#FFFCF7] dark:bg-[#29211B] border-2 border-[#DFD3C4] dark:border-[#493A30] shadow-sm flex flex-col items-center text-center gap-2">
        <div className="inline-flex items-center gap-1.5 text-xs text-[#80523B] dark:text-[#D1A184] font-semibold">
          <HelpCircle className="w-3.5 h-3.5" />
          <span>Clue</span>
        </div>
        <p className="font-serif text-base sm:text-lg text-[#382820] dark:text-[#F3EDE3] italic">
          &ldquo;{currentWord?.clue}&rdquo;
        </p>
      </div>

      {/* Word Answer Slots */}
      <div className="flex flex-wrap items-center justify-center gap-2 min-h-[56px] py-2">
        {Array.from({ length: currentWord?.word.length || 0 }).map((_, idx) => {
          const letter = placedLetters[idx]
          return (
            <button
              key={idx}
              onClick={() => handleRemovePlaced(idx)}
              disabled={!letter || !!feedback}
              className={`w-11 h-12 rounded-2xl border-2 font-mono text-xl font-bold flex items-center justify-center transition-all ${
                letter
                  ? feedback === 'success'
                    ? 'bg-emerald-100 border-emerald-500 text-emerald-800'
                    : feedback === 'error'
                    ? 'bg-rose-100 border-rose-500 text-rose-800 shake'
                    : 'bg-[#80523B] text-white border-[#80523B] shadow-sm hover:scale-95'
                  : 'bg-[#F3EDE3] dark:bg-[#1D1713] border-dashed border-[#DFD3C4] dark:border-[#493A30] text-transparent'
              }`}
            >
              {letter ? letter.char : ''}
            </button>
          )
        })}
      </div>

      {/* Scrambled Letter Bank */}
      <div className="flex flex-wrap items-center justify-center gap-2 p-3 rounded-2xl bg-[#F3EDE3] dark:bg-[#1D1713] border border-[#DFD3C4] dark:border-[#493A30] w-full">
        {scrambled.map((tile) => (
          <button
            key={tile.id}
            onClick={() => handleTileClick(tile.id)}
            disabled={tile.used || !!feedback}
            className={`w-11 h-11 rounded-xl font-mono text-lg font-bold flex items-center justify-center transition-all shadow-sm select-none cursor-pointer ${
              tile.used
                ? 'opacity-30 border border-transparent bg-transparent text-transparent cursor-not-allowed scale-90'
                : 'bg-[#FFFCF7] dark:bg-[#29211B] text-[#382820] dark:text-[#F3EDE3] border border-[#DFD3C4] dark:border-[#493A30] hover:scale-110 active:scale-95'
            }`}
          >
            {tile.char}
          </button>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between w-full pt-1">
        <button
          onClick={handleHint}
          disabled={!currentWord || placedLetters.length >= currentWord.word.length}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#EAE0D2] dark:bg-[#382820] text-[#726056] dark:text-[#C2B1A0] text-xs font-medium hover:text-[#382820] dark:hover:text-white transition-colors cursor-pointer"
        >
          <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
          <span>Hint</span>
        </button>

        <button
          onClick={handleSkip}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#EAE0D2] dark:bg-[#382820] text-[#726056] dark:text-[#C2B1A0] text-xs font-medium hover:text-[#382820] dark:hover:text-white transition-colors cursor-pointer"
        >
          <SkipForward className="w-3.5 h-3.5" />
          <span>Skip</span>
        </button>

        <button
          onClick={startNewGame}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#EAE0D2] dark:bg-[#382820] text-[#726056] dark:text-[#C2B1A0] text-xs font-medium hover:text-[#382820] dark:hover:text-white transition-colors cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset</span>
        </button>
      </div>
    </div>
  )
}
