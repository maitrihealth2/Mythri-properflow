'use client'

import React, { useState, useEffect, useRef } from 'react'
import { CommonGameProps } from '../types'
import { sounds } from '../sound'
import { RotateCcw, Heart, Trophy, Zap, AlertCircle } from 'lucide-react'

const TILE_FREQUENCIES = [330, 392, 440, 494, 523, 587, 659, 740, 784]

export function FocusGrid({ onGameOver, onScoreUpdate, isPaused, soundEnabled }: CommonGameProps) {
  const [gridSize, setGridSize] = useState<3 | 4>(3)
  const totalTiles = gridSize * gridSize

  const [sequence, setSequence] = useState<number[]>([])
  const [playerStep, setPlayerStep] = useState<number>(0)
  const [activeTile, setActiveTile] = useState<number | null>(null)
  const [isPlayingSequence, setIsPlayingSequence] = useState<boolean>(false)
  const [level, setLevel] = useState<number>(1)
  const [score, setScore] = useState<number>(0)
  const [strikes, setStrikes] = useState<number>(3)
  const [statusMessage, setStatusMessage] = useState<string>('Watch the sequence...')
  const [gameOver, setGameOver] = useState<boolean>(false)
  const [streak, setStreak] = useState<number>(0)

  const isPausedRef = useRef(isPaused)
  isPausedRef.current = isPaused

  // Initialize or restart
  const startNewGame = (size: 3 | 4 = gridSize) => {
    setGridSize(size)
    setLevel(1)
    setScore(0)
    setStrikes(3)
    setStreak(0)
    setGameOver(false)
    setPlayerStep(0)
    setActiveTile(null)
    onScoreUpdate?.(0)

    const initialTiles = size * size
    const firstSeq = [
      Math.floor(Math.random() * initialTiles),
      Math.floor(Math.random() * initialTiles),
      Math.floor(Math.random() * initialTiles),
    ]
    setSequence(firstSeq)
  }

  useEffect(() => {
    startNewGame()
  }, [])

  // Playback sequence to player
  useEffect(() => {
    if (gameOver || sequence.length === 0 || isPaused) return

    let cancelled = false
    setIsPlayingSequence(true)
    setStatusMessage('Memorize the pattern...')

    let idx = 0
    const interval = setInterval(() => {
      if (cancelled || isPausedRef.current) return

      if (idx < sequence.length) {
        const tileIdx = sequence[idx]
        setActiveTile(tileIdx)
        if (soundEnabled) {
          const freq = TILE_FREQUENCIES[tileIdx % TILE_FREQUENCIES.length]
          sounds.playNote(freq, 0.25, 'sine')
        }

        setTimeout(() => {
          if (!cancelled) setActiveTile(null)
        }, 320)

        idx++
      } else {
        clearInterval(interval)
        setIsPlayingSequence(false)
        setStatusMessage('Your turn! Recreate the pattern.')
        setPlayerStep(0)
      }
    }, 550)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [sequence, gameOver, isPaused])

  const handleTileClick = (index: number) => {
    if (isPlayingSequence || gameOver || isPaused) return

    // Visual & audio feedback
    setActiveTile(index)
    if (soundEnabled) {
      const freq = TILE_FREQUENCIES[index % TILE_FREQUENCIES.length]
      sounds.playNote(freq, 0.18, 'sine')
    }
    setTimeout(() => setActiveTile(null), 180)

    // Check correctness
    if (sequence[playerStep] === index) {
      const nextStep = playerStep + 1

      if (nextStep === sequence.length) {
        // Level cleared!
        const points = level * 100 + streak * 25
        const newScore = score + points
        const newStreak = streak + 1
        setScore(newScore)
        setStreak(newStreak)
        onScoreUpdate?.(newScore)
        sounds.playSuccess()

        setStatusMessage(`Level ${level} complete! +${points} pts`)
        const nextLevel = level + 1
        setLevel(nextLevel)

        // Advance sequence
        setTimeout(() => {
          setSequence((prev) => [...prev, Math.floor(Math.random() * totalTiles)])
        }, 800)
      } else {
        setPlayerStep(nextStep)
      }
    } else {
      // Mistake!
      sounds.playFail()
      const remainingStrikes = strikes - 1
      setStrikes(remainingStrikes)
      setStreak(0)

      if (remainingStrikes <= 0) {
        setGameOver(true)
        setStatusMessage('Out of chances! Game Over.')
        onGameOver({
          gameId: 'focus-grid',
          score,
          summary: `Reached Level ${level} with a sequence of ${sequence.length} tiles`,
          isWin: level >= 5,
          metrics: {
            'Final Level': level,
            'Sequence Length': sequence.length,
            'Grid Size': `${gridSize}×${gridSize}`,
          },
        })
      } else {
        setStatusMessage(`Incorrect! ${remainingStrikes} strike${remainingStrikes > 1 ? 's' : ''} left. Watch again!`)
        setTimeout(() => {
          // Replay current sequence
          setSequence([...sequence])
        }, 1000)
      }
    }
  }

  return (
    <div className="flex flex-col items-center w-full max-w-md mx-auto p-4 gap-5">
      {/* HUD Stats */}
      <div className="flex items-center justify-between w-full px-3 py-2.5 rounded-2xl bg-[#F3EDE3] dark:bg-[#1D1713] border border-[#DFD3C4] dark:border-[#493A30] text-xs">
        <div className="flex items-center gap-1.5 font-semibold text-[#80523B] dark:text-[#D1A184]">
          <Trophy className="w-4 h-4" />
          <span>Score: {score}</span>
        </div>

        <div className="flex items-center gap-1 text-[#382820] dark:text-[#F3EDE3] font-bold">
          <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
          <span>Level {level}</span>
        </div>

        <div className="flex items-center gap-1">
          {Array.from({ length: 3 }).map((_, i) => (
            <Heart
              key={i}
              className={`w-3.5 h-3.5 ${
                i < strikes
                  ? 'text-rose-500 fill-rose-500'
                  : 'text-[#DFD3C4] dark:text-[#493A30]'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Status banner */}
      <div
        className={`w-full py-2 px-3 rounded-xl text-center text-xs font-medium transition-all ${
          isPlayingSequence
            ? 'bg-[#EAE0D2] dark:bg-[#29211B] text-[#726056] dark:text-[#C2B1A0]'
            : 'bg-[#80523B]/10 dark:bg-[#80523B]/20 text-[#80523B] dark:text-[#D1A184] font-semibold'
        }`}
      >
        {statusMessage}
      </div>

      {/* Sequence Progress Bar */}
      <div className="w-full flex items-center gap-1 px-1">
        {sequence.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
              i < playerStep
                ? 'bg-emerald-500'
                : i === playerStep && !isPlayingSequence
                ? 'bg-amber-500 animate-pulse'
                : 'bg-[#DFD3C4] dark:bg-[#382820]'
            }`}
          />
        ))}
      </div>

      {/* Grid */}
      <div
        className={`grid gap-3 p-4 rounded-3xl bg-[#FFFCF7] dark:bg-[#29211B] border-2 border-[#DFD3C4] dark:border-[#493A30] shadow-md select-none touch-none ${
          gridSize === 3 ? 'grid-cols-3' : 'grid-cols-4'
        }`}
        style={{ width: gridSize === 3 ? '280px' : '320px', height: gridSize === 3 ? '280px' : '320px' }}
      >
        {Array.from({ length: totalTiles }).map((_, i) => {
          const isActive = activeTile === i
          return (
            <button
              key={i}
              onClick={() => handleTileClick(i)}
              disabled={isPlayingSequence || gameOver}
              className={`rounded-2xl transition-all duration-150 flex items-center justify-center cursor-pointer border ${
                isActive
                  ? 'bg-gradient-to-tr from-amber-400 to-amber-200 border-amber-300 scale-95 shadow-[0_0_20px_rgba(251,191,36,0.7)] text-amber-900'
                  : 'bg-[#F3EDE3] dark:bg-[#1D1713] border-[#DFD3C4] dark:border-[#493A30] hover:scale-105 active:scale-90 text-[#8C7355] dark:text-[#80523B] shadow-sm'
              }`}
            >
              <div
                className={`w-3 h-3 rounded-full transition-all ${
                  isActive ? 'bg-white scale-150' : 'bg-[#DFD3C4] dark:bg-[#382820]'
                }`}
              />
            </button>
          )
        })}
      </div>

      {/* Bottom controls */}
      <div className="flex items-center justify-between w-full pt-2">
        <div className="flex items-center gap-1 text-xs text-[#726056] dark:text-[#C2B1A0]">
          <span>Grid:</span>
          <button
            onClick={() => startNewGame(3)}
            className={`px-2 py-1 rounded-lg text-xs font-semibold ${
              gridSize === 3
                ? 'bg-[#80523B] text-white'
                : 'bg-[#F3EDE3] dark:bg-[#1D1713] text-[#726056]'
            }`}
          >
            3×3
          </button>
          <button
            onClick={() => startNewGame(4)}
            className={`px-2 py-1 rounded-lg text-xs font-semibold ${
              gridSize === 4
                ? 'bg-[#80523B] text-white'
                : 'bg-[#F3EDE3] dark:bg-[#1D1713] text-[#726056]'
            }`}
          >
            4×4
          </button>
        </div>

        <button
          onClick={() => startNewGame()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#EAE0D2] dark:bg-[#382820] text-[#726056] dark:text-[#C2B1A0] text-xs font-medium hover:text-[#382820] dark:hover:text-white transition-colors cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Restart</span>
        </button>
      </div>
    </div>
  )
}
