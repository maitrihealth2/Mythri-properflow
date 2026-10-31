'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { CommonGameProps } from '../types'
import { sounds } from '../sound'
import { Trophy, Clock, RotateCcw, Sparkles, Check } from 'lucide-react'

interface Card {
  id: number
  symbol: string
  matched: boolean
}

const SYMBOLS_POOL = ['🌸', '🌙', '🍃', '☀️', '🕊️', '🌿', '💧', '✨', '🪐', '💎', '🔥', '🌊']

export function MemoryMatch({ onGameOver, onScoreUpdate, isPaused, soundEnabled }: CommonGameProps) {
  const [boardSize, setBoardSize] = useState<'4x3' | '4x4'>('4x3')
  const pairCount = boardSize === '4x3' ? 6 : 8

  const [cards, setCards] = useState<Card[]>([])
  const [flippedIndices, setFlippedIndices] = useState<number[]>([])
  const [moves, setMoves] = useState<number>(0)
  const [elapsedSec, setElapsedSec] = useState<number>(0)
  const [isWon, setIsWon] = useState<boolean>(false)

  const startNewGame = useCallback((size: '4x3' | '4x4' = boardSize) => {
    setBoardSize(size)
    const pairsNeeded = size === '4x3' ? 6 : 8
    const selectedSymbols = SYMBOLS_POOL.slice(0, pairsNeeded)
    const deckSymbols = [...selectedSymbols, ...selectedSymbols].sort(() => Math.random() - 0.5)

    const deck: Card[] = deckSymbols.map((symbol, id) => ({
      id,
      symbol,
      matched: false,
    }))

    setCards(deck)
    setFlippedIndices([])
    setMoves(0)
    setElapsedSec(0)
    setIsWon(false)
    onScoreUpdate?.(0)
  }, [boardSize, onScoreUpdate])

  useEffect(() => {
    startNewGame()
  }, [startNewGame])

  // Timer
  useEffect(() => {
    if (isWon || isPaused) return
    const timer = setInterval(() => {
      setElapsedSec((prev) => prev + 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [isWon, isPaused])

  const handleCardClick = (index: number) => {
    if (isPaused || isWon) return
    if (flippedIndices.length === 2) return
    if (flippedIndices.includes(index) || cards[index].matched) return

    if (soundEnabled) sounds.playCardFlip()
    const newFlipped = [...flippedIndices, index]
    setFlippedIndices(newFlipped)

    if (newFlipped.length === 2) {
      setMoves((m) => m + 1)
      const [idx1, idx2] = newFlipped
      if (cards[idx1].symbol === cards[idx2].symbol) {
        // Match!
        setTimeout(() => {
          if (soundEnabled) sounds.playSuccess()
          setCards((prev) =>
            prev.map((c, i) => (i === idx1 || i === idx2 ? { ...c, matched: true } : c))
          )
          setFlippedIndices([])
        }, 400)
      } else {
        // No match
        setTimeout(() => {
          if (soundEnabled) sounds.playFail()
          setFlippedIndices([])
        }, 850)
      }
    }
  }

  // Check victory
  useEffect(() => {
    if (cards.length === 0 || isWon) return
    const allMatched = cards.every((c) => c.matched)

    if (allMatched) {
      setIsWon(true)
      sounds.playSuccess()

      const baseScore = boardSize === '4x3' ? 500 : 750
      const movePenalty = moves * 15
      const timePenalty = elapsedSec * 3
      const calculatedScore = Math.max(100, baseScore - movePenalty - timePenalty)
      onScoreUpdate?.(calculatedScore)

      onGameOver({
        gameId: 'memory-match',
        score: calculatedScore,
        summary: `Completed in ${moves} moves (${elapsedSec}s)!`,
        isWin: true,
        metrics: {
          'Total Moves': moves,
          'Time Taken': `${elapsedSec}s`,
          'Board Size': boardSize,
          'Score': calculatedScore,
        },
      })
    }
  }, [cards, isWon, moves, elapsedSec, pairCount, boardSize, onGameOver, onScoreUpdate])

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${m}:${s < 10 ? '0' : ''}${s}`
  }

  const matchedCount = cards.filter((c) => c.matched).length / 2

  return (
    <div className="flex flex-col items-center w-full max-w-sm sm:max-w-md mx-auto p-2 sm:p-4 gap-4 animate-fadeIn">
      {/* Top HUD */}
      <div className="flex items-center justify-between w-full px-4 py-2.5 rounded-2xl bg-[#FFFCF8] dark:bg-[#261E1A] border border-[#E5DACE] dark:border-[#3D2E24] shadow-xs text-xs">
        <div className="flex items-center gap-1.5 font-semibold text-[#80523B] dark:text-[#D1A184]">
          <Trophy className="w-4 h-4 text-amber-500" />
          <span>Moves: <strong className="font-mono">{moves}</strong></span>
        </div>

        <div className="flex items-center gap-1 font-mono text-[#382820] dark:text-[#F3EDE3] font-semibold">
          <Clock className="w-3.5 h-3.5 text-[#8C7355]" />
          <span>{formatTime(elapsedSec)}</span>
        </div>

        <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
          Pairs: {matchedCount} / {pairCount}
        </div>
      </div>

      {/* Cards Board Stage */}
      <div
        className="grid grid-cols-4 gap-2.5 p-4 rounded-3xl bg-[#FFFCF8] dark:bg-[#261E1A] border-2 border-[#E5DACE] dark:border-[#3D2E24] shadow-md select-none touch-none w-full max-w-[340px]"
      >
        {cards.map((card, index) => {
          const isFlipped = flippedIndices.includes(index) || card.matched

          return (
            <button
              key={card.id}
              onClick={() => handleCardClick(index)}
              disabled={isFlipped || isPaused}
              className={`aspect-square rounded-2xl border-2 flex items-center justify-center text-3xl transition-all duration-300 cursor-pointer shadow-xs ${
                isFlipped
                  ? card.matched
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-400 dark:border-emerald-700 text-emerald-800 shadow-sm scale-95'
                    : 'bg-[#FFFCF8] dark:bg-[#201814] border-[#784429] shadow-md scale-100'
                  : 'bg-gradient-to-tr from-[#784429] to-[#9E6547] border-[#DFD3C4] dark:border-[#5C3826] hover:scale-105 active:scale-95 text-transparent'
              }`}
            >
              {isFlipped ? (
                <span className="animate-scaleIn">{card.symbol}</span>
              ) : (
                <Sparkles className="w-4 h-4 text-white/40" />
              )}
            </button>
          )
        })}
      </div>

      {/* Board Size Toggle & Reset */}
      <div className="flex items-center justify-between w-full pt-1 px-1">
        <div className="flex items-center gap-1.5 text-xs text-[#726056] dark:text-[#C2B1A0]">
          <span className="font-medium">Size:</span>
          <button
            onClick={() => startNewGame('4x3')}
            className={`px-3 py-1 rounded-full text-xs font-semibold cursor-pointer transition-all ${
              boardSize === '4x3'
                ? 'bg-[#784429] text-white shadow-xs'
                : 'bg-[#F0E6D8] dark:bg-[#342922] text-[#726056] dark:text-[#C2B1A0]'
            }`}
          >
            4×3 (6 Pairs)
          </button>
          <button
            onClick={() => startNewGame('4x4')}
            className={`px-3 py-1 rounded-full text-xs font-semibold cursor-pointer transition-all ${
              boardSize === '4x4'
                ? 'bg-[#784429] text-white shadow-xs'
                : 'bg-[#F0E6D8] dark:bg-[#342922] text-[#726056] dark:text-[#C2B1A0]'
            }`}
          >
            4×4 (8 Pairs)
          </button>
        </div>

        <button
          onClick={() => startNewGame(boardSize)}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#F0E6D8] dark:bg-[#342922] text-[#8C5338] dark:text-[#D19B75] text-xs font-semibold hover:bg-[#E5D7C5] transition-all cursor-pointer shadow-xs active:scale-95"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Shuffle</span>
        </button>
      </div>
    </div>
  )
}
