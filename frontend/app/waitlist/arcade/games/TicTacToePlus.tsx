'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { CommonGameProps } from '../types'
import { sounds } from '../sound'
import { Trophy, Users, Bot, RotateCcw } from 'lucide-react'

type Player = 'X' | 'O'
type BoardState = (Player | null)[]

const WINNING_COMBOS = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
]

function checkWinner(board: BoardState): { winner: Player | null; line: number[] | null } {
  for (const combo of WINNING_COMBOS) {
    const [a, b, c] = combo
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], line: combo }
    }
  }
  return { winner: null, line: null }
}

// Minimax algorithm for Hard AI
function minimax(
  board: BoardState,
  depth: number,
  isMaximizing: boolean
): { score: number; move?: number } {
  const { winner } = checkWinner(board)
  if (winner === 'O') return { score: 10 - depth }
  if (winner === 'X') return { score: depth - 10 }
  if (board.every((cell) => cell !== null)) return { score: 0 }

  if (isMaximizing) {
    let bestScore = -Infinity
    let bestMove = -1
    for (let i = 0; i < 9; i++) {
      if (board[i] === null) {
        board[i] = 'O'
        const result = minimax(board, depth + 1, false)
        board[i] = null
        if (result.score > bestScore) {
          bestScore = result.score
          bestMove = i
        }
      }
    }
    return { score: bestScore, move: bestMove }
  } else {
    let bestScore = Infinity
    let bestMove = -1
    for (let i = 0; i < 9; i++) {
      if (board[i] === null) {
        board[i] = 'X'
        const result = minimax(board, depth + 1, true)
        board[i] = null
        if (result.score < bestScore) {
          bestScore = result.score
          bestMove = i
        }
      }
    }
    return { score: bestScore, move: bestMove }
  }
}

export function TicTacToePlus({ onGameOver, onScoreUpdate, isPaused, soundEnabled }: CommonGameProps) {
  const [mode, setMode] = useState<'ai' | 'pvp'>('ai')
  const [difficulty, setDifficulty] = useState<'Easy' | 'Medium' | 'Hard'>('Hard')
  const [board, setBoard] = useState<BoardState>(Array(9).fill(null))
  const [turn, setTurn] = useState<Player>('X')
  const [winningLine, setWinningLine] = useState<number[] | null>(null)
  const [winner, setWinner] = useState<Player | 'draw' | null>(null)

  // Scoreboard
  const [xWins, setXWins] = useState<number>(0)
  const [oWins, setOWins] = useState<number>(0)
  const [draws, setDraws] = useState<number>(0)

  const resetRound = useCallback(() => {
    setBoard(Array(9).fill(null))
    setTurn('X')
    setWinningLine(null)
    setWinner(null)
  }, [])

  // AI Move calculation
  useEffect(() => {
    if (mode !== 'ai' || turn !== 'O' || winner || isPaused) return

    const timer = setTimeout(() => {
      let chosenMove: number = -1
      const availableMoves = board
        .map((val, idx) => (val === null ? idx : null))
        .filter((v): v is number => v !== null)

      if (availableMoves.length === 0) return

      if (difficulty === 'Easy') {
        // Pure random
        chosenMove = availableMoves[Math.floor(Math.random() * availableMoves.length)]
      } else if (difficulty === 'Medium') {
        // 50% minimax, 50% random
        if (Math.random() < 0.6) {
          const res = minimax([...board], 0, true)
          chosenMove = res.move !== undefined && res.move !== -1 ? res.move : availableMoves[0]
        } else {
          chosenMove = availableMoves[Math.floor(Math.random() * availableMoves.length)]
        }
      } else {
        // Hard: Unbeatable Minimax
        const res = minimax([...board], 0, true)
        chosenMove = res.move !== undefined && res.move !== -1 ? res.move : availableMoves[0]
      }

      if (chosenMove !== -1) {
        makeMove(chosenMove, 'O')
      }
    }, 400)

    return () => clearTimeout(timer)
  }, [turn, mode, winner, isPaused, difficulty, board])

  const makeMove = (index: number, player: Player) => {
    if (board[index] !== null || winner) return

    const newBoard = [...board]
    newBoard[index] = player
    setBoard(newBoard)

    if (soundEnabled) sounds.playPop(player === 'X' ? 600 : 440)

    // Check outcome
    const outcome = checkWinner(newBoard)
    if (outcome.winner) {
      setWinner(outcome.winner)
      setWinningLine(outcome.line)
      if (soundEnabled) sounds.playSuccess()

      if (outcome.winner === 'X') {
        setXWins((x) => x + 1)
        onScoreUpdate?.((xWins + 1) * 100)
        if (mode === 'ai') {
          onGameOver({
            gameId: 'tic-tac-toe-plus',
            score: (xWins + 1) * 150,
            summary: `Defeated the ${difficulty} AI opponent!`,
            isWin: true,
            metrics: {
              'Difficulty': difficulty,
              'Player Wins': xWins + 1,
              'AI Wins': oWins,
              'Draws': draws,
            },
          })
        }
      } else {
        setOWins((o) => o + 1)
      }
    } else if (newBoard.every((cell) => cell !== null)) {
      setWinner('draw')
      setDraws((d) => d + 1)
      if (soundEnabled) sounds.playNote(400, 0.2)
    } else {
      setTurn(player === 'X' ? 'O' : 'X')
    }
  }

  const handleCellClick = (index: number) => {
    if (isPaused || winner || board[index] !== null) return
    if (mode === 'ai' && turn === 'O') return // Wait for AI
    makeMove(index, turn)
  }

  return (
    <div className="flex flex-col items-center w-full max-w-md mx-auto p-4 gap-4">
      {/* Mode & Difficulty Switcher */}
      <div className="flex items-center justify-between w-full px-3 py-2 rounded-2xl bg-[#F3EDE3] dark:bg-[#1D1713] border border-[#DFD3C4] dark:border-[#493A30] text-xs">
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              setMode('ai')
              resetRound()
            }}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold cursor-pointer ${
              mode === 'ai'
                ? 'bg-[#80523B] text-white shadow-xs'
                : 'text-[#726056] dark:text-[#C2B1A0]'
            }`}
          >
            <Bot className="w-3.5 h-3.5" />
            <span>vs AI</span>
          </button>
          <button
            onClick={() => {
              setMode('pvp')
              resetRound()
            }}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold cursor-pointer ${
              mode === 'pvp'
                ? 'bg-[#80523B] text-white shadow-xs'
                : 'text-[#726056] dark:text-[#C2B1A0]'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>2-Player</span>
          </button>
        </div>

        {mode === 'ai' && (
          <div className="flex items-center gap-1 text-[11px]">
            {(['Easy', 'Medium', 'Hard'] as const).map((diff) => (
              <button
                key={diff}
                onClick={() => {
                  setDifficulty(diff)
                  resetRound()
                }}
                className={`px-1.5 py-0.5 rounded-md font-medium ${
                  difficulty === diff
                    ? 'bg-[#EAE0D2] dark:bg-[#382820] text-[#80523B] dark:text-[#D1A184] font-bold'
                    : 'text-[#726056] opacity-70'
                }`}
              >
                {diff}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Scoreboard */}
      <div className="grid grid-cols-3 gap-2 w-full text-center text-xs">
        <div className={`p-2.5 rounded-2xl border ${turn === 'X' && !winner ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-400 font-bold' : 'bg-[#FFFCF7] dark:bg-[#29211B] border-[#DFD3C4] dark:border-[#493A30]'}`}>
          <span className="text-[#80523B] dark:text-[#D1A184]">Player X</span>
          <div className="font-mono text-xl font-bold">{xWins}</div>
        </div>
        <div className="p-2.5 rounded-2xl bg-[#FFFCF7] dark:bg-[#29211B] border border-[#DFD3C4] dark:border-[#493A30]">
          <span className="text-[#726056] dark:text-[#C2B1A0]">Ties</span>
          <div className="font-mono text-xl font-bold">{draws}</div>
        </div>
        <div className={`p-2.5 rounded-2xl border ${turn === 'O' && !winner ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-400 font-bold' : 'bg-[#FFFCF7] dark:bg-[#29211B] border-[#DFD3C4] dark:border-[#493A30]'}`}>
          <span className="text-[#80523B] dark:text-[#D1A184]">{mode === 'ai' ? `AI (${difficulty})` : 'Player O'}</span>
          <div className="font-mono text-xl font-bold">{oWins}</div>
        </div>
      </div>

      {/* 3x3 Board */}
      <div className="p-4 rounded-3xl bg-[#FFFCF7] dark:bg-[#29211B] border-2 border-[#DFD3C4] dark:border-[#493A30] shadow-sm select-none">
        <div className="grid grid-cols-3 gap-2.5 w-[260px] h-[260px] sm:w-[280px] sm:h-[280px]">
          {board.map((cell, idx) => {
            const isWinningCell = winningLine?.includes(idx)

            return (
              <button
                key={idx}
                onClick={() => handleCellClick(idx)}
                disabled={cell !== null || !!winner || isPaused}
                className={`rounded-2xl border-2 flex items-center justify-center font-serif text-4xl sm:text-5xl font-bold transition-all cursor-pointer shadow-xs ${
                  isWinningCell
                    ? 'bg-emerald-100 dark:bg-emerald-950/60 border-emerald-500 text-emerald-700 animate-pulse'
                    : cell === 'X'
                    ? 'bg-[#F3EDE3] dark:bg-[#1D1713] border-[#80523B] text-[#80523B] dark:text-[#D1A184]'
                    : cell === 'O'
                    ? 'bg-[#F3EDE3] dark:bg-[#1D1713] border-[#5B7065] text-[#5B7065] dark:text-[#7A9887]'
                    : 'bg-[#F3EDE3] dark:bg-[#1D1713] border-[#DFD3C4] dark:border-[#493A30] hover:bg-[#EAE0D2] dark:hover:bg-[#382820]'
                }`}
              >
                {cell}
              </button>
            )
          })}
        </div>
      </div>

      {/* Status & Rematch */}
      <div className="flex items-center justify-between w-full pt-1">
        <div className="text-xs font-semibold text-[#382820] dark:text-[#F3EDE3]">
          {winner === 'draw'
            ? '🤝 The duel ended in a draw!'
            : winner
            ? `🎉 Player ${winner} claims victory!`
            : `Turn: Player ${turn}`}
        </div>

        <button
          onClick={resetRound}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#80523B] text-white text-xs font-medium hover:bg-[#6A422F] shadow-sm active:scale-95 transition-all cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Rematch</span>
        </button>
      </div>
    </div>
  )
}
