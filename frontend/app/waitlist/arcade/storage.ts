'use client'

import { Achievement, GameId, RecentGameRecord } from './types'

const SCORES_KEY = 'mythri_arcade_high_scores_v1'
const RECENTS_KEY = 'mythri_arcade_recents_v1'
const ACHIEVEMENTS_KEY = 'mythri_arcade_achievements_v1'
const DAILY_KEY = 'mythri_arcade_daily_v1'

export const INITIAL_ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_play',
    title: 'Sanctuary Voyager',
    description: 'Complete your first arcade mini-game.',
    icon: 'Sparkles',
  },
  {
    id: 'five_games',
    title: 'Arcade Explorer',
    description: 'Play 5 different sanctuary mini-games.',
    icon: 'Gamepad2',
  },
  {
    id: 'perfect_memory',
    title: 'Mind like Crystal',
    description: 'Complete Memory Match with fewer than 18 moves.',
    icon: 'Brain',
  },
  {
    id: 'reaction_master',
    title: 'Lightning Reflex',
    description: 'Score an average reaction time below 250ms.',
    icon: 'Zap',
  },
  {
    id: 'puzzle_solver',
    title: 'Logic Master',
    description: 'Complete Tiny Sudoku or Pattern Architect with 100% accuracy.',
    icon: 'CheckCircle2',
  },
  {
    id: 'daily_champion',
    title: 'Daily Oracle',
    description: 'Solve today’s Daily Mystery challenge.',
    icon: 'Calendar',
  },
]

// Safe LocalStorage helpers with memory fallback
const memoryStorage: Record<string, string> = {}

function getItem(key: string): string | null {
  if (typeof window === 'undefined') return null
  try {
    return localStorage.getItem(key) || memoryStorage[key] || null
  } catch {
    return memoryStorage[key] || null
  }
}

function setItem(key: string, value: string): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(key, value)
  } catch {
    memoryStorage[key] = value
  }
}

// ── HIGH SCORES ──────────────────────────────────────────
export function getHighScore(gameId: GameId): number {
  try {
    const raw = getItem(SCORES_KEY)
    if (!raw) return 0
    const parsed = JSON.parse(raw)
    return typeof parsed[gameId] === 'number' ? parsed[gameId] : 0
  } catch {
    return 0
  }
}

export function saveHighScore(gameId: GameId, score: number): boolean {
  try {
    const raw = getItem(SCORES_KEY)
    const parsed = raw ? JSON.parse(raw) : {}
    const current = parsed[gameId] || 0
    if (score > current) {
      parsed[gameId] = score
      setItem(SCORES_KEY, JSON.stringify(parsed))
      return true // New high score!
    }
    return false
  } catch {
    return false
  }
}

// ── RECENT GAMES ─────────────────────────────────────────
export function getRecentGames(): RecentGameRecord[] {
  try {
    const raw = getItem(RECENTS_KEY)
    if (!raw) return []
    return JSON.parse(raw)
  } catch {
    return []
  }
}

export function recordRecentGame(gameId: GameId, summary?: string, score?: number): void {
  try {
    const list = getRecentGames().filter((item) => item.gameId !== gameId)
    const newEntry: RecentGameRecord = {
      gameId,
      lastPlayed: Date.now(),
      bestScore: score,
      bestSummary: summary,
    }
    const updated = [newEntry, ...list].slice(0, 5)
    setItem(RECENTS_KEY, JSON.stringify(updated))
  } catch {}
}

// ── ACHIEVEMENTS ─────────────────────────────────────────
export function getAchievements(): Achievement[] {
  try {
    const raw = getItem(ACHIEVEMENTS_KEY)
    const unlockedMap: Record<string, string> = raw ? JSON.parse(raw) : {}
    return INITIAL_ACHIEVEMENTS.map((ach) => ({
      ...ach,
      unlockedAt: unlockedMap[ach.id] || undefined,
    }))
  } catch {
    return INITIAL_ACHIEVEMENTS
  }
}

export function unlockAchievement(id: string): Achievement | null {
  try {
    const raw = getItem(ACHIEVEMENTS_KEY)
    const unlockedMap: Record<string, string> = raw ? JSON.parse(raw) : {}
    if (unlockedMap[id]) return null // Already unlocked

    unlockedMap[id] = new Date().toISOString()
    setItem(ACHIEVEMENTS_KEY, JSON.stringify(unlockedMap))
    return INITIAL_ACHIEVEMENTS.find((a) => a.id === id) || null
  } catch {
    return null
  }
}

// ── DAILY MYSTERY PROGRESS ────────────────────────────────
export function getDailyProgress(dateStr: string): { solved: boolean; tries: number } {
  try {
    const raw = getItem(DAILY_KEY)
    if (!raw) return { solved: false, tries: 0 }
    const parsed = JSON.parse(raw)
    if (parsed[dateStr]) {
      return parsed[dateStr]
    }
    return { solved: false, tries: 0 }
  } catch {
    return { solved: false, tries: 0 }
  }
}

export function saveDailyProgress(dateStr: string, solved: boolean, tries: number): void {
  try {
    const raw = getItem(DAILY_KEY)
    const parsed = raw ? JSON.parse(raw) : {}
    parsed[dateStr] = { solved, tries, updatedAt: Date.now() }
    setItem(DAILY_KEY, JSON.stringify(parsed))
  } catch {}
}
