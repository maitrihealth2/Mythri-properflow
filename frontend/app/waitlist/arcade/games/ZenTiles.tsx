'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { CommonGameProps } from '../types'
import { sounds } from '../sound'
import { Trophy, RotateCcw, Undo2, Shuffle, Sparkles } from 'lucide-react'

interface ZenTile {
  id: number
  type: string
  emoji: string
  layer: number
  x: number
  y: number
  cleared: boolean
}

const TILE_TYPES = [
  { type: 'bamboo', emoji: '🎍' },
  { type: 'lotus', emoji: '🪷' },
  { type: 'stone', emoji: '🪨' },
  { type: 'leaf', emoji: '🍃' },
  { type: 'sun', emoji: '☀️' },
  { type: 'cloud', emoji: '☁️' },
]

export function ZenTiles({ onGameOver, onScoreUpdate, isPaused, soundEnabled }: CommonGameProps) {
  const [tiles, setTiles] = useState<ZenTile[]>([])
  const [shelf, setShelf] = useState<ZenTile[]>([])
  const [history, setHistory] = useState<{ tiles: ZenTile[]; shelf: ZenTile[] }[]>([])
  const [score, setScore] = useState<number>(0)
  const [matchesMade, setMatchesMade] = useState<number>(0)
  const [isGameOver, setIsGameOver] = useState<boolean>(false)

  // Generate board of tiles (guaranteed multiples of 3)
  const initBoard = useCallback(() => {
    const sets = 4 // 4 sets of 3 for 6 types = 24 tiles total
    const pool: { type: string; emoji: string }[] = []

    for (let i = 0; i < sets; i++) {
      const typeObj = TILE_TYPES[i % TILE_TYPES.length]
      pool.push(typeObj, typeObj, typeObj)
    }

    // Shuffle pool
    pool.sort(() => Math.random() - 0.5)

    // Assign calm grid positions
    const newTiles: ZenTile[] = pool.map((item, idx) => {
      const col = idx % 4
      const row = Math.floor(idx / 4)
      return {
        id: idx,
        type: item.type,
        emoji: item.emoji,
        layer: 0,
        x: col * 64 + 20,
        y: row * 64 + 10,
        cleared: false,
      }
    })

    setTiles(newTiles)
    setShelf([])
    setHistory([])
    setScore(0)
    setMatchesMade(0)
    setIsGameOver(false)
    onScoreUpdate?.(0)
  }, [onScoreUpdate])

  useEffect(() => {
    initBoard()
  }, [initBoard])

  // Move tile to shelf
  const handleSelectTile = (tile: ZenTile) => {
    if (isPaused || isGameOver || tile.cleared || shelf.length >= 7) return

    // Save history for Undo
    setHistory((prev) => [...prev, { tiles: [...tiles], shelf: [...shelf] }])

    // Mark tile cleared from board
    const updatedTiles = tiles.map((t) => (t.id === tile.id ? { ...t, cleared: true } : t))
    setTiles(updatedTiles)

    // Add to shelf sorted by type to make matches obvious
    const newShelf = [...shelf, tile].sort((a, b) => a.type.localeCompare(b.type))
    setShelf(newShelf)

    if (soundEnabled) sounds.playPop(520)

    // Check for 3 matching tiles in shelf
    const counts: Record<string, number> = {}
    newShelf.forEach((t) => {
      counts[t.type] = (counts[t.type] || 0) + 1
    })

    let matchedType: string | null = null
    for (const [type, count] of Object.entries(counts)) {
      if (count >= 3) {
        matchedType = type
        break
      }
    }

    if (matchedType) {
      setTimeout(() => {
        setShelf((prev) => prev.filter((t) => t.type !== matchedType))
        const newScore = score + 150
        const newMatches = matchesMade + 1
        setScore(newScore)
        setMatchesMade(newMatches)
        onScoreUpdate?.(newScore)
        if (soundEnabled) sounds.playSuccess()

        // Check if all tiles cleared
        const remainingTiles = updatedTiles.filter((t) => !t.cleared)
        if (remainingTiles.length === 0) {
          onGameOver({
            gameId: 'zen-tiles',
            score: newScore + 300,
            summary: `All zen tiles dissolved in tranquility! Score: ${newScore + 300}`,
            isWin: true,
            metrics: {
              'Matches Formed': newMatches,
              'Final Score': newScore + 300,
              'Harmony': 'Perfect Balance',
            },
          })
        }
      }, 350)
    } else {
      // If shelf hits 7 without match -> Game Over
      if (newShelf.length >= 7) {
        setTimeout(() => {
          setIsGameOver(true)
          if (soundEnabled) sounds.playFail()
          onGameOver({
            gameId: 'zen-tiles',
            score,
            summary: `Holding tray filled. Reached ${matchesMade} tile matches!`,
            isWin: false,
            metrics: {
              'Matches Made': matchesMade,
              'Final Score': score,
            },
          })
        }, 300)
      }
    }
  }

  // Undo move
  const handleUndo = () => {
    if (history.length === 0 || isPaused) return
    const last = history[history.length - 1]
    setTiles(last.tiles)
    setShelf(last.shelf)
    setHistory((prev) => prev.slice(0, -1))
    setIsGameOver(false)
    if (soundEnabled) sounds.playClick()
  }

  // Shuffle remaining tiles
  const handleShuffle = () => {
    if (isPaused) return
    const remaining = tiles.filter((t) => !t.cleared)
    const shuffledTypes = remaining.map((t) => ({ type: t.type, emoji: t.emoji })).sort(() => Math.random() - 0.5)

    let idx = 0
    setTiles((prev) =>
      prev.map((t) => {
        if (!t.cleared) {
          const replacement = shuffledTypes[idx++]
          return { ...t, type: replacement.type, emoji: replacement.emoji }
        }
        return t
      })
    )
    if (soundEnabled) sounds.playClick()
  }

  const remainingCount = tiles.filter((t) => !t.cleared).length

  return (
    <div className="flex flex-col items-center w-full max-w-md mx-auto p-4 gap-4">
      {/* Top HUD */}
      <div className="flex items-center justify-between w-full px-4 py-2.5 rounded-2xl bg-[#F3EDE3] dark:bg-[#1D1713] border border-[#DFD3C4] dark:border-[#493A30] text-xs">
        <div className="flex items-center gap-1.5 font-semibold text-[#80523B] dark:text-[#D1A184]">
          <Trophy className="w-4 h-4" />
          <span>Score: {score}</span>
        </div>

        <div className="text-[#382820] dark:text-[#F3EDE3] font-medium">
          Remaining: {remainingCount}
        </div>

        <div className="text-emerald-600 dark:text-emerald-400 font-semibold">
          Matches: {matchesMade}
        </div>
      </div>

      {/* Main Board Arena */}
      <div className="relative w-full max-w-[300px] h-[250px] p-2 rounded-3xl bg-[#FFFCF7] dark:bg-[#29211B] border-2 border-[#DFD3C4] dark:border-[#493A30] shadow-sm overflow-hidden select-none">
        {tiles.map((tile) => {
          if (tile.cleared) return null
          return (
            <button
              key={tile.id}
              onClick={() => handleSelectTile(tile)}
              disabled={isPaused || isGameOver}
              style={{
                position: 'absolute',
                left: `${tile.x}px`,
                top: `${tile.y}px`,
              }}
              className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-[#F3EDE3] to-[#FFFCF7] dark:from-[#1D1713] dark:to-[#29211B] border-2 border-[#DFD3C4] dark:border-[#493A30] shadow-md hover:scale-105 active:scale-95 flex items-center justify-center text-2xl transition-all cursor-pointer"
            >
              <span>{tile.emoji}</span>
            </button>
          )
        })}
      </div>

      {/* 7-Slot Holding Tray */}
      <div className="flex flex-col items-center gap-1.5 w-full">
        <span className="text-[10px] uppercase tracking-wider text-[#8C7355] dark:text-[#D1A184] font-semibold">
          Holding Tray ({shelf.length} / 7)
        </span>
        <div className="flex items-center justify-center gap-1.5 p-2 rounded-2xl bg-[#EAE0D2] dark:bg-[#1D1713] border-2 border-[#DFD3C4] dark:border-[#493A30] w-full max-w-[340px] min-h-[56px]">
          {Array.from({ length: 7 }).map((_, idx) => {
            const tile = shelf[idx]
            return (
              <div
                key={idx}
                className={`w-10 h-11 rounded-xl border flex items-center justify-center text-xl transition-all ${
                  tile
                    ? 'bg-[#FFFCF7] dark:bg-[#29211B] border-[#80523B] shadow-sm animate-scaleIn'
                    : 'bg-white/30 dark:bg-black/20 border-dashed border-[#DFD3C4] dark:border-[#493A30]'
                }`}
              >
                {tile ? tile.emoji : ''}
              </div>
            )
          })}
        </div>
      </div>

      {/* Action Controls */}
      <div className="flex items-center justify-between w-full pt-1">
        <button
          onClick={handleUndo}
          disabled={history.length === 0}
          className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#EAE0D2] dark:bg-[#382820] text-[#726056] dark:text-[#C2B1A0] text-xs font-medium hover:text-[#382820] dark:hover:text-white transition-colors cursor-pointer disabled:opacity-40"
        >
          <Undo2 className="w-3.5 h-3.5" />
          <span>Undo</span>
        </button>

        <button
          onClick={handleShuffle}
          disabled={remainingCount === 0}
          className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#EAE0D2] dark:bg-[#382820] text-[#726056] dark:text-[#C2B1A0] text-xs font-medium hover:text-[#382820] dark:hover:text-white transition-colors cursor-pointer disabled:opacity-40"
        >
          <Shuffle className="w-3.5 h-3.5" />
          <span>Shuffle</span>
        </button>

        <button
          onClick={initBoard}
          className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#EAE0D2] dark:bg-[#382820] text-[#726056] dark:text-[#C2B1A0] text-xs font-medium hover:text-[#382820] dark:hover:text-white transition-colors cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset</span>
        </button>
      </div>
    </div>
  )
}
