'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { GameId, GameMetadata, Achievement, RecentGameRecord } from './types'
import { GAME_REGISTRY } from './registry'
import { sounds } from './sound'
import {
  getHighScore,
  getRecentGames,
  getAchievements,
} from './storage'
import { GameContainer } from './GameContainer'
import {
  Gamepad2,
  X,
  Volume2,
  VolumeX,
  Sparkles,
  Trophy,
  Award,
  ChevronRight,
  Play,
  CheckCircle2,
  Grid3X3,
  Calculator,
  SpellCheck,
  Hash,
  Compass,
  Palette,
  CalendarCheck,
  Layers,
  Zap,
  Users,
  Feather,
} from 'lucide-react'

interface ArcadeModalProps {
  isOpen: boolean
  onClose: () => void
}

export function ArcadeModal({ isOpen, onClose }: ArcadeModalProps) {
  const [activeGameId, setActiveGameId] = useState<GameId | null>(null)
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true)
  const [showAchievements, setShowAchievements] = useState<boolean>(false)
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [hoveredGameId, setHoveredGameId] = useState<GameId | null>(null)

  // Load high scores and achievements
  const refreshUserData = () => {
    setAchievements(getAchievements())
  }

  useEffect(() => {
    if (isOpen) {
      refreshUserData()
      sounds.setEnabled(soundEnabled)
    }
  }, [isOpen, soundEnabled])

  const toggleSound = () => {
    const next = !soundEnabled
    setSoundEnabled(next)
    sounds.setEnabled(next)
  }

  const handleAchievementUnlocked = (title: string) => {
    setToastMessage(`🏆 Achievement Unlocked: ${title}!`)
    setTimeout(() => setToastMessage(null), 3500)
    refreshUserData()
  }

  // Active game metadata
  const activeGameMetadata = useMemo(() => {
    if (!activeGameId) return null
    return GAME_REGISTRY.find((g) => g.id === activeGameId) || null
  }, [activeGameId])

  if (!isOpen) return null

  // Helper icon renderer matching sanctuary design
  const renderGameIcon = (iconName: string) => {
    switch (iconName) {
      case 'Sparkles':
        return <Sparkles className="w-5 h-5 text-[#80523B] dark:text-[#D1A184]" />
      case 'Zap':
        return <Zap className="w-5 h-5 text-[#80523B] dark:text-[#D1A184]" />
      case 'Layers':
        return <Layers className="w-5 h-5 text-[#80523B] dark:text-[#D1A184]" />
      case 'Hash':
        return <Hash className="w-5 h-5 text-[#80523B] dark:text-[#D1A184]" />
      case 'Compass':
        return <Compass className="w-5 h-5 text-[#80523B] dark:text-[#D1A184]" />
      case 'Palette':
        return <Palette className="w-5 h-5 text-[#80523B] dark:text-[#D1A184]" />
      case 'Users':
        return <Users className="w-5 h-5 text-[#80523B] dark:text-[#D1A184]" />
      case 'Feather':
        return <Feather className="w-5 h-5 text-[#80523B] dark:text-[#D1A184]" />
      case 'CalendarCheck':
        return <CalendarCheck className="w-5 h-5 text-[#80523B] dark:text-[#D1A184]" />
      case 'Grid3X3':
        return <Grid3X3 className="w-5 h-5 text-[#80523B] dark:text-[#D1A184]" />
      case 'Calculator':
        return <Calculator className="w-5 h-5 text-[#80523B] dark:text-[#D1A184]" />
      case 'SpellCheck':
        return <SpellCheck className="w-5 h-5 text-[#80523B] dark:text-[#D1A184]" />
      default:
        return <Gamepad2 className="w-5 h-5 text-[#80523B] dark:text-[#D1A184]" />
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-5xl max-h-[92vh] bg-[#FFFCF8] dark:bg-[#201814] rounded-3xl sm:rounded-4xl border-2 border-[#E5DACE] dark:border-[#3D2E24] shadow-[0_24px_64px_rgba(56,40,32,0.18)] flex flex-col overflow-hidden text-left transition-all duration-300">

        {/* ── Toast Notification ──────────────────────────────── */}
        {toastMessage && (
          <div className="absolute top-4 inset-x-4 z-60 mx-auto max-w-sm py-2 px-4 rounded-2xl bg-[#784429] text-white text-xs font-bold shadow-xl flex items-center justify-center gap-2 animate-bounce">
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* ── Modal Top Header (Matches Reference Design) ────────── */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#EBE3D7] dark:border-[#3E2F26] bg-[#FFFCF8] dark:bg-[#201814] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#5C3826] text-white flex items-center justify-center shadow-md shadow-[#5C3826]/20">
              <Gamepad2 className="w-6 h-6 text-[#EAE0D2]" />
            </div>
            <div>
              <h2
                className="font-serif text-xl sm:text-2xl font-bold text-[#382820] dark:text-[#F3EDE3] tracking-tight leading-none"
                style={{ fontFamily: 'var(--font-literata), Georgia, serif' }}
              >
                Mythri Arcade Lounge
              </h2>
              <span className="text-xs text-[#8C7355] dark:text-[#C5A88F] font-medium mt-1 inline-block">
                12 Mindful Mini-Games for Waitlist Aspirants
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Badges Drawer Button */}
            <button
              onClick={() => setShowAchievements(true)}
              title="View Badges"
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#F0E6D8] dark:bg-[#342922] text-[#8C5338] dark:text-[#D19B75] text-xs font-semibold hover:bg-[#E5D7C5] dark:hover:bg-[#42342A] transition-all cursor-pointer border border-[#E3D7C9] dark:border-[#42342A] shadow-xs active:scale-95"
            >
              <Award className="w-3.5 h-3.5 text-[#8C5338] dark:text-[#D19B75]" />
              <span>Badges</span>
            </button>

            {/* Sound Toggle */}
            <button
              onClick={toggleSound}
              title={soundEnabled ? 'Mute Audio' : 'Unmute Audio'}
              className="w-9 h-9 rounded-full bg-[#F0E6D8] dark:bg-[#342922] border border-[#E3D7C9] dark:border-[#42342A] flex items-center justify-center text-[#726056] dark:text-[#C2B1A0] hover:text-[#382820] dark:hover:text-white hover:scale-105 active:scale-95 transition-all cursor-pointer shadow-xs"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              title="Close Arcade Lounge"
              className="w-9 h-9 rounded-full bg-[#F0E6D8] dark:bg-[#342922] border border-[#E3D7C9] dark:border-[#42342A] flex items-center justify-center text-[#726056] dark:text-[#C2B1A0] hover:text-[#382820] dark:hover:text-white hover:scale-105 active:scale-95 transition-all cursor-pointer shadow-xs"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── Modal Body Content ───────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-7">
          {activeGameMetadata ? (
            /* ── Active Game Runner Screen ── */
            <div className="w-full animate-fadeIn">
              <GameContainer
                metadata={activeGameMetadata}
                onBackToArcade={() => {
                  setActiveGameId(null)
                  refreshUserData()
                }}
                soundEnabled={soundEnabled}
                onToggleSound={toggleSound}
                onAchievementEarned={handleAchievementUnlocked}
              />
            </div>
          ) : (
            /* ── Clean 12-Card Grid (Exact Reference Design) ── */
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4.5">
              {GAME_REGISTRY.map((game) => {
                const best = getHighScore(game.id)
                const isHovered = hoveredGameId === game.id

                return (
                  <div
                    key={game.id}
                    onMouseEnter={() => setHoveredGameId(game.id)}
                    onMouseLeave={() => setHoveredGameId(null)}
                    onClick={() => {
                      sounds.playClick()
                      setActiveGameId(game.id)
                    }}
                    className={`group relative rounded-3xl p-5 bg-[#FFFCF8] dark:bg-[#261E1A] border-2 transition-all duration-200 cursor-pointer flex flex-col justify-between gap-3.5 text-left select-none active:scale-[0.98] ${
                      isHovered
                        ? 'border-[#784429] dark:border-[#C58B65] shadow-[0_8px_24px_rgba(120,68,41,0.14)] -translate-y-0.5'
                        : 'border-[#E5DACE] dark:border-[#3D2E24] shadow-xs hover:border-[#784429]'
                    }`}
                  >
                    {/* Top Card Bar: Icon on Left, Duration/Badge on Right */}
                    <div className="flex items-start justify-between">
                      <div className="w-10 h-10 rounded-2xl bg-[#F4EFEA] dark:bg-[#342922] flex items-center justify-center group-hover:scale-105 transition-transform shadow-xs">
                        {renderGameIcon(game.iconName)}
                      </div>

                      <div className="flex flex-col items-end gap-1">
                        <span className="text-xs font-semibold text-[#8C7355] dark:text-[#B5A192]">
                          {game.duration}
                        </span>
                        {game.badge && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#80523B]/10 dark:bg-[#80523B]/25 text-[#80523B] dark:text-[#D1A184]">
                            {game.badge}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Middle: Title & Mindful Description */}
                    <div className="space-y-1">
                      <h3
                        className="font-serif text-lg font-bold text-[#382820] dark:text-[#F3EDE3] group-hover:text-[#784429] dark:group-hover:text-[#D1A184] transition-colors leading-snug"
                        style={{ fontFamily: 'var(--font-literata), Georgia, serif' }}
                      >
                        {game.title}
                      </h3>
                      <p className="text-xs text-[#726056] dark:text-[#B5A192] line-clamp-2 leading-relaxed">
                        {game.description}
                      </p>
                    </div>

                    {/* Bottom Footer: High Score & Play Prompt */}
                    <div className="flex items-center justify-between pt-2 border-t border-[#EBE3D7]/70 dark:border-[#3E2F26]/70 text-xs">
                      <span className="text-[#8C7355] dark:text-[#B5A192] font-medium">
                        Best: <strong className="text-[#382820] dark:text-[#F3EDE3] font-mono">{best}</strong>
                      </span>

                      <span className="inline-flex items-center gap-0.5 font-bold text-[#80523B] dark:text-[#D1A184] group-hover:translate-x-1 transition-transform">
                        <span>Play</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ── Badges Modal Drawer ────────────────────────── */}
        {showAchievements && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
            <div className="relative w-full max-w-md bg-[#FFFCF8] dark:bg-[#261E1A] rounded-3xl p-6 border-2 border-[#E5DACE] dark:border-[#3D2E24] shadow-2xl flex flex-col gap-4 text-left">
              <div className="flex items-center justify-between pb-2 border-b border-[#EBE3D7] dark:border-[#3E2F26]">
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-amber-500" />
                  <h4
                    className="font-serif text-lg font-semibold text-[#382820] dark:text-[#F3EDE3]"
                    style={{ fontFamily: 'var(--font-literata), Georgia, serif' }}
                  >
                    Sanctuary Badges ({achievements.filter((a) => a.unlockedAt).length} / {achievements.length})
                  </h4>
                </div>
                <button
                  onClick={() => setShowAchievements(false)}
                  className="w-8 h-8 rounded-full bg-[#F0E6D8] dark:bg-[#342922] flex items-center justify-center text-[#726056] hover:text-[#382820] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex flex-col gap-2.5 max-h-[60vh] overflow-y-auto pr-1">
                {achievements.map((ach) => {
                  const isUnlocked = Boolean(ach.unlockedAt)

                  return (
                    <div
                      key={ach.id}
                      className={`p-3 rounded-2xl border flex items-center gap-3 transition-all ${
                        isUnlocked
                          ? 'bg-amber-50/80 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800'
                          : 'bg-[#F8F4EE] dark:bg-[#1D1714] border-[#E5DACE] dark:border-[#3D2E24] opacity-50'
                      }`}
                    >
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          isUnlocked
                            ? 'bg-amber-500 text-white shadow-sm'
                            : 'bg-[#DFD3C4] dark:bg-[#382820] text-[#726056]'
                        }`}
                      >
                        <Trophy className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h5 className="text-xs font-bold text-[#382820] dark:text-[#F3EDE3]">
                            {ach.title}
                          </h5>
                          {isUnlocked && (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          )}
                        </div>
                        <p className="text-[11px] text-[#726056] dark:text-[#C2B1A0]">
                          {ach.description}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>

              <button
                onClick={() => setShowAchievements(false)}
                className="w-full py-2.5 rounded-full bg-[#784429] text-white text-xs font-semibold shadow-sm active:scale-98 transition-all cursor-pointer hover:bg-[#5C3826]"
              >
                Close Badges
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
