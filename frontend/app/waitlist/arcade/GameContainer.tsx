'use client'

import React, { useState } from 'react'
import { GameId, GameResult, GameMetadata } from './types'
import { sounds } from './sound'
import {
  saveHighScore,
  getHighScore,
  recordRecentGame,
  unlockAchievement,
} from './storage'
import {
  ArrowLeft,
  Volume2,
  VolumeX,
  RotateCcw,
  HelpCircle,
  Pause,
  Play,
  Trophy,
  Sparkles,
  X,
  Award,
} from 'lucide-react'

// Game component imports
import { FocusGrid } from './games/FocusGrid'
import { NumberRush } from './games/NumberRush'
import { WordDetective } from './games/WordDetective'
import { MemoryMatch } from './games/MemoryMatch'
import { ReactionTest } from './games/ReactionTest'
import { PatternArchitect } from './games/PatternArchitect'
import { TinySudoku } from './games/TinySudoku'
import { OrbitDefender } from './games/OrbitDefender'
import { ColorClash } from './games/ColorClash'
import { TicTacToePlus } from './games/TicTacToePlus'
import { ZenTiles } from './games/ZenTiles'
import { DailyMystery } from './games/DailyMystery'

interface GameContainerProps {
  metadata: GameMetadata
  onBackToArcade: () => void
  soundEnabled: boolean
  onToggleSound: () => void
  onAchievementEarned?: (title: string) => void
}

export function GameContainer({
  metadata,
  onBackToArcade,
  soundEnabled,
  onToggleSound,
  onAchievementEarned,
}: GameContainerProps) {
  const [isPaused, setIsPaused] = useState<boolean>(false)
  const [showInstructions, setShowInstructions] = useState<boolean>(false)
  const [result, setResult] = useState<GameResult | null>(null)
  const [highScore, setHighScore] = useState<number>(() => getHighScore(metadata.id))
  const [isNewHighScore, setIsNewHighScore] = useState<boolean>(false)
  const [restartKey, setRestartKey] = useState<number>(0)

  // Handle Game Over
  const handleGameOver = (res: GameResult) => {
    setResult(res)

    // Save high score
    const isNew = saveHighScore(metadata.id, res.score)
    if (isNew) {
      setIsNewHighScore(true)
      setHighScore(res.score)
    }

    // Record as recently played
    recordRecentGame(metadata.id, res.summary, res.score)

    // Check Lightweight Achievements
    const firstPlay = unlockAchievement('first_play')
    if (firstPlay && onAchievementEarned) onAchievementEarned(firstPlay.title)

    if (metadata.id === 'reaction-test' && res.score >= 950) {
      const ach = unlockAchievement('reaction_master')
      if (ach && onAchievementEarned) onAchievementEarned(ach.title)
    }

    if (metadata.id === 'memory-match' && res.metrics?.['Total Moves'] && Number(res.metrics['Total Moves']) < 18) {
      const ach = unlockAchievement('perfect_memory')
      if (ach && onAchievementEarned) onAchievementEarned(ach.title)
    }

    if ((metadata.id === 'tiny-sudoku' || metadata.id === 'pattern-architect') && res.isWin) {
      const ach = unlockAchievement('puzzle_solver')
      if (ach && onAchievementEarned) onAchievementEarned(ach.title)
    }

    if (metadata.id === 'daily-mystery' && res.isWin) {
      const ach = unlockAchievement('daily_champion')
      if (ach && onAchievementEarned) onAchievementEarned(ach.title)
    }
  }

  const handleRestart = () => {
    setResult(null)
    setIsPaused(false)
    setIsNewHighScore(false)
    setRestartKey((k) => k + 1)
  }

  // Render the requested mini-game
  const renderGame = () => {
    const commonProps = {
      onGameOver: handleGameOver,
      onScoreUpdate: (score: number) => {
        if (score > highScore) {
          setHighScore(score)
        }
      },
      isPaused,
      soundEnabled,
    }

    switch (metadata.id) {
      case 'focus-grid':
        return <FocusGrid key={restartKey} {...commonProps} />
      case 'number-rush':
        return <NumberRush key={restartKey} {...commonProps} />
      case 'word-detective':
        return <WordDetective key={restartKey} {...commonProps} />
      case 'memory-match':
        return <MemoryMatch key={restartKey} {...commonProps} />
      case 'reaction-test':
        return <ReactionTest key={restartKey} {...commonProps} />
      case 'pattern-architect':
        return <PatternArchitect key={restartKey} {...commonProps} />
      case 'tiny-sudoku':
        return <TinySudoku key={restartKey} {...commonProps} />
      case 'orbit-defender':
        return <OrbitDefender key={restartKey} {...commonProps} />
      case 'color-clash':
        return <ColorClash key={restartKey} {...commonProps} />
      case 'tic-tac-toe-plus':
        return <TicTacToePlus key={restartKey} {...commonProps} />
      case 'zen-tiles':
        return <ZenTiles key={restartKey} {...commonProps} />
      case 'daily-mystery':
        return <DailyMystery key={restartKey} {...commonProps} />
      default:
        return null
    }
  }

  return (
    <div className="relative w-full flex flex-col items-center gap-4 animate-fadeIn">
      {/* ── Top Game Header Bar ───────────────────────────────── */}
      <div className="w-full flex items-center justify-between pb-3.5 border-b border-[#EBE3D7] dark:border-[#3E2F26]">
        
        {/* Left: Back to Lounge button + Title */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              sounds.playClick()
              onBackToArcade()
            }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#F0E6D8] dark:bg-[#342922] text-[#8C5338] dark:text-[#D19B75] text-xs font-semibold hover:bg-[#784429] hover:text-white dark:hover:bg-[#784429] dark:hover:text-white transition-all cursor-pointer border border-[#E3D7C9] dark:border-[#42342A] shadow-xs active:scale-95"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Lounge</span>
          </button>

          <div className="flex flex-col text-left">
            <h3
              className="font-serif text-lg sm:text-xl font-bold text-[#382820] dark:text-[#F3EDE3] leading-tight"
              style={{ fontFamily: 'var(--font-literata), Georgia, serif' }}
            >
              {metadata.title}
            </h3>
            <span className="text-[11px] text-[#8C7355] dark:text-[#C5A88F] font-medium">
              {metadata.typeLabel} &bull; {metadata.duration}
            </span>
          </div>
        </div>

        {/* Right: Best score pill + Controls */}
        <div className="flex items-center gap-2">
          {/* High Score Badge */}
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-300/80 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs font-semibold">
            <Trophy className="w-3.5 h-3.5 text-amber-500" />
            <span>Best: <strong className="font-mono">{highScore}</strong></span>
          </div>

          {/* Pause / Resume for timed games */}
          {['number-rush', 'color-clash', 'orbit-defender'].includes(metadata.id) && (
            <button
              onClick={() => setIsPaused(!isPaused)}
              title={isPaused ? 'Resume Game' : 'Pause Game'}
              className="w-8 h-8 rounded-full bg-[#F0E6D8] dark:bg-[#342922] border border-[#E3D7C9] dark:border-[#42342A] flex items-center justify-center text-[#726056] dark:text-[#C2B1A0] hover:text-[#382820] dark:hover:text-white cursor-pointer transition-all active:scale-95 shadow-xs"
            >
              {isPaused ? <Play className="w-3.5 h-3.5 fill-current" /> : <Pause className="w-3.5 h-3.5 fill-current" />}
            </button>
          )}

          {/* Instructions button */}
          <button
            onClick={() => setShowInstructions(true)}
            title="How to play"
            className="w-8 h-8 rounded-full bg-[#F0E6D8] dark:bg-[#342922] border border-[#E3D7C9] dark:border-[#42342A] flex items-center justify-center text-[#726056] dark:text-[#C2B1A0] hover:text-[#382820] dark:hover:text-white cursor-pointer transition-all active:scale-95 shadow-xs"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          {/* Sound toggle */}
          <button
            onClick={onToggleSound}
            title={soundEnabled ? 'Mute Audio' : 'Unmute Audio'}
            className="w-8 h-8 rounded-full bg-[#F0E6D8] dark:bg-[#342922] border border-[#E3D7C9] dark:border-[#42342A] flex items-center justify-center text-[#726056] dark:text-[#C2B1A0] hover:text-[#382820] dark:hover:text-white cursor-pointer transition-all active:scale-95 shadow-xs"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* ── Active Game Arena Stage ───────────────────────────── */}
      <div className="w-full relative min-h-[440px] flex items-center justify-center p-4 sm:p-6 rounded-3xl bg-[#FBF7F2] dark:bg-[#1C1512] border border-[#E5DACE] dark:border-[#3D2E24] shadow-inner">
        {renderGame()}

        {/* Pause Overlay */}
        {isPaused && (
          <div className="absolute inset-0 z-20 bg-black/55 backdrop-blur-sm flex flex-col items-center justify-center rounded-3xl p-6 text-white text-center gap-3.5 animate-fadeIn">
            <h4
              className="font-serif text-2xl font-bold"
              style={{ fontFamily: 'var(--font-literata), Georgia, serif' }}
            >
              Game Paused
            </h4>
            <p className="text-xs text-[#EAE0D2] max-w-xs leading-relaxed">
              Take a quiet breath. The sanctuary waits for you.
            </p>
            <button
              onClick={() => setIsPaused(false)}
              className="mt-2 px-6 py-2.5 rounded-full bg-[#784429] text-white text-xs font-semibold shadow-md active:scale-95 hover:bg-[#5C3826] transition-all cursor-pointer flex items-center gap-2"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>Resume Game</span>
            </button>
          </div>
        )}
      </div>

      {/* ── Round Results Modal Overlay ───────────────────────── */}
      {result && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="w-full max-w-sm bg-[#FFFCF8] dark:bg-[#261E1A] rounded-3xl p-6 sm:p-7 border-2 border-[#E5DACE] dark:border-[#3D2E24] shadow-2xl flex flex-col items-center text-center gap-4">
            
            {/* Glowing Golden Trophy Header */}
            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-[#784429] to-[#D19B75] text-white flex items-center justify-center shadow-lg shadow-[#784429]/25">
              <Trophy className="w-8 h-8 text-amber-200" />
            </div>

            <div className="space-y-1">
              <h4
                className="font-serif text-xl sm:text-2xl font-bold text-[#382820] dark:text-[#F3EDE3]"
                style={{ fontFamily: 'var(--font-literata), Georgia, serif' }}
              >
                {result.isWin ? 'Round Completed!' : 'Round Finished'}
              </h4>
              <p className="text-xs text-[#726056] dark:text-[#B5A192] leading-relaxed">
                {result.summary}
              </p>
            </div>

            {/* High score badge */}
            {isNewHighScore && (
              <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200 text-xs font-bold border border-amber-300/80 animate-pulse">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>New Personal Record!</span>
              </div>
            )}

            {/* Metrics Breakdown Table */}
            {result.metrics && (
              <div className="w-full bg-[#F4EFEA] dark:bg-[#1D1714] rounded-2xl p-3.5 border border-[#E5DACE] dark:border-[#3D2E24] flex flex-col gap-2 text-xs text-left">
                {Object.entries(result.metrics).map(([key, val]) => (
                  <div key={key} className="flex items-center justify-between">
                    <span className="text-[#726056] dark:text-[#C2B1A0]">{key}</span>
                    <strong className="text-[#382820] dark:text-[#F3EDE3] font-mono font-bold">{val}</strong>
                  </div>
                ))}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2.5 w-full pt-1">
              <button
                onClick={handleRestart}
                className="flex-1 py-2.5 rounded-full bg-[#784429] hover:bg-[#5C3826] text-white text-xs font-semibold shadow-md active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Play Again</span>
              </button>

              <button
                onClick={onBackToArcade}
                className="flex-1 py-2.5 rounded-full border border-[#E3D7C9] dark:border-[#42342A] bg-[#F0E6D8] dark:bg-[#342922] text-[#8C5338] dark:text-[#D19B75] text-xs font-semibold hover:bg-[#E5D7C5] transition-all cursor-pointer"
              >
                All Games
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Instructions Modal ─────────────────────────────────── */}
      {showInstructions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-xs animate-fadeIn">
          <div className="relative w-full max-w-md bg-[#FFFCF8] dark:bg-[#261E1A] rounded-3xl p-6 border-2 border-[#E5DACE] dark:border-[#3D2E24] shadow-2xl flex flex-col gap-4 text-left">
            <div className="flex items-center justify-between pb-2 border-b border-[#EBE3D7] dark:border-[#3E2F26]">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-[#80523B] dark:text-[#D1A184]" />
                <h4
                  className="font-serif text-lg font-semibold text-[#382820] dark:text-[#F3EDE3]"
                  style={{ fontFamily: 'var(--font-literata), Georgia, serif' }}
                >
                  How to Play {metadata.title}
                </h4>
              </div>
              <button
                onClick={() => setShowInstructions(false)}
                className="w-8 h-8 rounded-full bg-[#F0E6D8] dark:bg-[#342922] flex items-center justify-center text-[#726056] hover:text-[#382820] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#726056] dark:text-[#B5A192] leading-relaxed">
              {metadata.description}
            </p>

            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold text-[#382820] dark:text-[#F3EDE3]">
                Rules &amp; Controls:
              </span>
              <ul className="flex flex-col gap-1.5 text-xs text-[#726056] dark:text-[#C2B1A0]">
                {metadata.instructions.map((rule, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#784429] mt-1.5 shrink-0" />
                    <span>{rule}</span>
                  </li>
                ))}
              </ul>
            </div>

            <button
              onClick={() => setShowInstructions(false)}
              className="mt-2 w-full py-2.5 rounded-full bg-[#784429] text-white text-xs font-semibold shadow-sm active:scale-98 transition-all cursor-pointer hover:bg-[#5C3826]"
            >
              Understood
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
