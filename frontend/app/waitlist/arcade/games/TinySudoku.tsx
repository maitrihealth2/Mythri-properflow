'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { CommonGameProps } from '../types'
import { sounds } from '../sound'
import { Clock, Lightbulb, RotateCcw, CheckCircle2, Eraser, Sparkles } from 'lucide-react'

// Curated verified 4x4 and 6x6 puzzles
// 4x4: 2x2 blocks, digits 1-4
// 6x6: 2x3 blocks (2 rows, 3 cols), digits 1-6

interface SudokuPuzzle {
  size: 4 | 6
  initial: number[][]
  solution: number[][]
}

const PUZZLES: SudokuPuzzle[] = [
  {
    size: 4,
    initial: [
      [1, 0, 0, 4],
      [0, 0, 1, 0],
      [0, 1, 0, 0],
      [3, 0, 0, 2],
    ],
    solution: [
      [1, 2, 3, 4],
      [4, 3, 1, 2],
      [2, 1, 4, 3],
      [3, 4, 2, 1],
    ],
  },
  {
    size: 4,
    initial: [
      [0, 2, 4, 0],
      [1, 0, 0, 3],
      [4, 0, 0, 2],
      [0, 1, 3, 0],
    ],
    solution: [
      [3, 2, 4, 1],
      [1, 4, 2, 3],
      [4, 3, 1, 2],
      [2, 1, 3, 4],
    ],
  },
  {
    size: 6,
    initial: [
      [0, 0, 3, 0, 1, 0],
      [5, 6, 0, 3, 2, 0],
      [0, 5, 4, 2, 0, 3],
      [2, 0, 6, 4, 5, 0],
      [0, 1, 2, 0, 4, 5],
      [0, 4, 0, 1, 0, 0],
    ],
    solution: [
      [4, 2, 3, 5, 1, 6],
      [5, 6, 1, 3, 2, 4],
      [1, 5, 4, 2, 6, 3],
      [2, 3, 6, 4, 5, 1],
      [3, 1, 2, 6, 4, 5],
      [6, 4, 5, 1, 3, 2],
    ],
  },
]

export function TinySudoku({ onGameOver, onScoreUpdate, isPaused, soundEnabled }: CommonGameProps) {
  const [activeSize, setActiveSize] = useState<4 | 6>(4)
  const [board, setBoard] = useState<number[][]>([])
  const [initialMask, setInitialMask] = useState<boolean[][]>([])
  const [solution, setSolution] = useState<number[][]>([])
  const [selectedCell, setSelectedCell] = useState<[number, number] | null>(null)
  const [conflicts, setConflicts] = useState<[number, number][]>([])
  const [elapsedSec, setElapsedSec] = useState<number>(0)
  const [hintsLeft, setHintsLeft] = useState<number>(3)
  const [isWon, setIsWon] = useState<boolean>(false)

  const loadPuzzle = useCallback((size: 4 | 6) => {
    setActiveSize(size)
    const matching = PUZZLES.filter((p) => p.size === size)
    const chosen = matching[Math.floor(Math.random() * matching.length)]

    const newBoard = chosen.initial.map((row) => [...row])
    const newMask = chosen.initial.map((row) => row.map((val) => val !== 0))

    setBoard(newBoard)
    setInitialMask(newMask)
    setSolution(chosen.solution)
    setSelectedCell(null)
    setConflicts([])
    setElapsedSec(0)
    setHintsLeft(3)
    setIsWon(false)
    onScoreUpdate?.(0)
  }, [onScoreUpdate])

  useEffect(() => {
    loadPuzzle(4)
  }, [loadPuzzle])

  // Timer
  useEffect(() => {
    if (isWon || isPaused) return
    const timer = setInterval(() => {
      setElapsedSec((prev) => prev + 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [isWon, isPaused])

  // Conflict validation
  const checkConflicts = useCallback((currentBoard: number[][], size: 4 | 6): [number, number][] => {
    const conflictCells: [number, number][] = []
    const blockRows = 2
    const blockCols = size === 4 ? 2 : 3

    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const val = currentBoard[r][c]
        if (val === 0) continue

        // Check Row
        for (let otherC = 0; otherC < size; otherC++) {
          if (otherC !== c && currentBoard[r][otherC] === val) {
            conflictCells.push([r, c])
          }
        }

        // Check Col
        for (let otherR = 0; otherR < size; otherR++) {
          if (otherR !== r && currentBoard[otherR][c] === val) {
            conflictCells.push([r, c])
          }
        }

        // Check Block
        const bStartR = Math.floor(r / blockRows) * blockRows
        const bStartC = Math.floor(c / blockCols) * blockCols
        for (let br = bStartR; br < bStartR + blockRows; br++) {
          for (let bc = bStartC; bc < bStartC + blockCols; bc++) {
            if ((br !== r || bc !== c) && currentBoard[br][bc] === val) {
              conflictCells.push([r, c])
            }
          }
        }
      }
    }
    return conflictCells
  }, [])

  const handleCellClick = (r: number, c: number) => {
    if (isPaused || isWon) return
    if (initialMask[r]?.[c]) return // Cannot modify pre-filled
    setSelectedCell([r, c])
    if (soundEnabled) sounds.playClick()
  }

  const handleNumberInput = (num: number) => {
    if (isPaused || isWon || !selectedCell) return
    const [r, c] = selectedCell
    if (initialMask[r]?.[c]) return

    const newBoard = board.map((row) => [...row])
    newBoard[r][c] = num
    setBoard(newBoard)

    const foundConflicts = checkConflicts(newBoard, activeSize)
    setConflicts(foundConflicts)

    if (soundEnabled) {
      if (foundConflicts.length > 0) sounds.playFail()
      else sounds.playPop(520 + num * 40)
    }

    // Check complete victory
    let isFull = true
    let isCorrect = true
    for (let row = 0; row < activeSize; row++) {
      for (let col = 0; col < activeSize; col++) {
        if (newBoard[row][col] === 0) isFull = false
        if (newBoard[row][col] !== solution[row][col]) isCorrect = false
      }
    }

    if (isFull && isCorrect) {
      setIsWon(true)
      sounds.playSuccess()
      const timeBonus = Math.max(50, 400 - elapsedSec * 2)
      const finalScore = (activeSize === 6 ? 600 : 350) + timeBonus + hintsLeft * 50
      onScoreUpdate?.(finalScore)

      onGameOver({
        gameId: 'tiny-sudoku',
        score: finalScore,
        summary: `Solved ${activeSize}×${activeSize} Sudoku in ${elapsedSec}s with ${hintsLeft} hints remaining!`,
        isWin: true,
        metrics: {
          'Grid Size': `${activeSize}×${activeSize}`,
          'Time Taken': `${elapsedSec}s`,
          'Hints Left': hintsLeft,
          'Score': finalScore,
        },
      })
    }
  }

  const handleClearCell = () => {
    if (isPaused || isWon || !selectedCell) return
    const [r, c] = selectedCell
    if (initialMask[r]?.[c]) return

    const newBoard = board.map((row) => [...row])
    newBoard[r][c] = 0
    setBoard(newBoard)
    setConflicts(checkConflicts(newBoard, activeSize))
    if (soundEnabled) sounds.playClick()
  }

  const handleHint = () => {
    if (isPaused || isWon || hintsLeft <= 0) return

    // Find first empty or wrong cell
    for (let r = 0; r < activeSize; r++) {
      for (let c = 0; c < activeSize; c++) {
        if (!initialMask[r][c] && board[r][c] !== solution[r][c]) {
          const newBoard = board.map((row) => [...row])
          newBoard[r][c] = solution[r][c]
          setBoard(newBoard)
          setHintsLeft((h) => h - 1)
          setSelectedCell([r, c])
          setConflicts(checkConflicts(newBoard, activeSize))
          if (soundEnabled) sounds.playSuccess()
          return
        }
      }
    }
  }

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${m}:${s < 10 ? '0' : ''}${s}`
  }

  return (
    <div className="flex flex-col items-center w-full max-w-sm sm:max-w-md mx-auto p-2 sm:p-4 gap-4 animate-fadeIn">
      {/* Top HUD */}
      <div className="flex items-center justify-between w-full px-4 py-2.5 rounded-2xl bg-[#FFFCF8] dark:bg-[#261E1A] border border-[#E5DACE] dark:border-[#3D2E24] shadow-xs text-xs">
        <div className="flex items-center gap-1.5 font-mono text-[#382820] dark:text-[#F3EDE3] font-semibold">
          <Clock className="w-3.5 h-3.5 text-[#8C7355]" />
          <span>{formatTime(elapsedSec)}</span>
        </div>

        <div className="flex items-center gap-1 text-[#80523B] dark:text-[#D1A184] font-semibold font-serif">
          <span>{activeSize}×{activeSize} Board</span>
        </div>

        <button
          onClick={handleHint}
          disabled={hintsLeft <= 0 || isWon}
          className="flex items-center gap-1 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 font-semibold text-xs disabled:opacity-40 hover:bg-amber-100 transition-all cursor-pointer shadow-xs"
        >
          <Lightbulb className="w-3 h-3 text-amber-500" />
          <span>Hint ({hintsLeft})</span>
        </button>
      </div>

      {/* Sudoku Grid Cabinet */}
      <div className="p-3 sm:p-4 rounded-3xl bg-[#FFFCF8] dark:bg-[#261E1A] border-2 border-[#E5DACE] dark:border-[#3D2E24] shadow-md select-none">
        <div
          className="grid gap-1.5 sm:gap-2"
          style={{
            gridTemplateColumns: `repeat(${activeSize}, minmax(0, 1fr))`,
            width: activeSize === 4 ? '270px' : '315px',
          }}
        >
          {board.map((row, r) =>
            row.map((val, c) => {
              const isInitial = initialMask[r]?.[c]
              const isSelected = selectedCell?.[0] === r && selectedCell?.[1] === c
              const hasConflict = conflicts.some(([cr, cc]) => cr === r && cc === c)

              // Block dividers
              const isBlockRightBorder = activeSize === 4 ? c === 1 : c === 2
              const isBlockBottomBorder = activeSize === 4 ? r === 1 : r === 1 || r === 3

              return (
                <button
                  key={`${r}-${c}`}
                  onClick={() => handleCellClick(r, c)}
                  disabled={isWon || isPaused}
                  className={`aspect-square rounded-2xl text-xl sm:text-2xl font-mono font-bold flex items-center justify-center transition-all cursor-pointer border-2 ${
                    isBlockRightBorder ? 'mr-1 sm:mr-2' : ''
                  } ${isBlockBottomBorder ? 'mb-1 sm:mb-2' : ''} ${
                    hasConflict
                      ? 'bg-rose-100 dark:bg-rose-950/60 border-rose-500 text-rose-700 animate-pulse'
                      : isSelected
                      ? 'bg-[#784429] border-[#784429] text-white shadow-md scale-105 z-10'
                      : isInitial
                      ? 'bg-[#EAE0D2] dark:bg-[#342922] border-[#DFD3C4] dark:border-[#42342A] text-[#382820] dark:text-[#F3EDE3]'
                      : 'bg-[#F9F5EF] dark:bg-[#1D1714] border-[#E5DACE] dark:border-[#3D2E24] text-[#784429] dark:text-[#D1A184] hover:border-[#784429]'
                  }`}
                >
                  {val !== 0 ? val : ''}
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* Number Pad Input (Ceramic rounded buttons) */}
      <div className="flex items-center justify-center gap-2 w-full pt-1">
        {Array.from({ length: activeSize }).map((_, i) => {
          const num = i + 1
          return (
            <button
              key={num}
              onClick={() => handleNumberInput(num)}
              disabled={isWon || !selectedCell}
              className="w-11 h-12 sm:w-12 sm:h-12 rounded-2xl bg-[#FFFCF8] dark:bg-[#261E1A] hover:bg-[#784429] hover:text-white dark:hover:bg-[#784429] dark:hover:text-white border-2 border-[#E5DACE] dark:border-[#3D2E24] hover:border-[#784429] font-mono text-xl font-bold text-[#382820] dark:text-[#F3EDE3] shadow-xs hover:shadow-md transition-all cursor-pointer active:scale-95 disabled:opacity-40"
            >
              {num}
            </button>
          )
        })}

        <button
          onClick={handleClearCell}
          disabled={isWon || !selectedCell}
          title="Erase cell"
          className="w-11 h-12 sm:w-12 sm:h-12 rounded-2xl bg-[#F0E6D8] dark:bg-[#342922] border-2 border-[#E3D7C9] dark:border-[#42342A] flex items-center justify-center text-[#726056] dark:text-[#C2B1A0] hover:text-rose-600 dark:hover:text-rose-400 hover:border-rose-400 transition-all cursor-pointer disabled:opacity-40 active:scale-95 shadow-xs"
        >
          <Eraser className="w-5 h-5" />
        </button>
      </div>

      {/* Bottom controls: Size Toggle & Reset */}
      <div className="flex items-center justify-between w-full pt-1 px-1">
        <div className="flex items-center gap-1.5 text-xs text-[#726056] dark:text-[#C2B1A0]">
          <span className="font-medium">Size:</span>
          <button
            onClick={() => loadPuzzle(4)}
            className={`px-3 py-1 rounded-full text-xs font-semibold cursor-pointer transition-all ${
              activeSize === 4
                ? 'bg-[#784429] text-white shadow-xs'
                : 'bg-[#F0E6D8] dark:bg-[#342922] text-[#726056] dark:text-[#C2B1A0]'
            }`}
          >
            4×4
          </button>
          <button
            onClick={() => loadPuzzle(6)}
            className={`px-3 py-1 rounded-full text-xs font-semibold cursor-pointer transition-all ${
              activeSize === 6
                ? 'bg-[#784429] text-white shadow-xs'
                : 'bg-[#F0E6D8] dark:bg-[#342922] text-[#726056] dark:text-[#C2B1A0]'
            }`}
          >
            6×6
          </button>
        </div>

        <button
          onClick={() => loadPuzzle(activeSize)}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#F0E6D8] dark:bg-[#342922] text-[#8C5338] dark:text-[#D19B75] text-xs font-semibold hover:bg-[#E5D7C5] transition-all cursor-pointer shadow-xs active:scale-95"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>New Puzzle</span>
        </button>
      </div>
    </div>
  )
}
