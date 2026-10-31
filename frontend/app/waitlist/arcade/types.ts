export type GameId =
  | 'focus-grid'
  | 'number-rush'
  | 'word-detective'
  | 'memory-match'
  | 'reaction-test'
  | 'pattern-architect'
  | 'tiny-sudoku'
  | 'orbit-defender'
  | 'color-clash'
  | 'tic-tac-toe-plus'
  | 'zen-tiles'
  | 'daily-mystery'

export type MoodCategory =
  | 'all'
  | 'quick'
  | 'brain'
  | 'reflex'
  | 'relax'
  | 'multiplayer'

export interface GameMetadata {
  id: GameId
  title: string
  shortTag: string
  typeLabel: string
  moods: MoodCategory[]
  duration: string
  difficulty: 'Easy' | 'Medium' | 'Adaptive' | 'Challenging'
  description: string
  instructions: string[]
  iconName: string
  accentColor: string
  badge?: string
}

export interface GameResult {
  gameId: GameId
  score: number
  summary: string
  isWin?: boolean
  metrics?: Record<string, string | number>
}

export interface Achievement {
  id: string
  title: string
  description: string
  icon: string
  unlockedAt?: string
}

export interface RecentGameRecord {
  gameId: GameId
  lastPlayed: number
  bestScore?: number
  bestSummary?: string
}

export interface DailyProgress {
  date: string
  completed: boolean
  tries: number
  timeTakenSec: number
}

export interface CommonGameProps {
  onGameOver: (result: GameResult) => void
  onScoreUpdate?: (score: number) => void
  isPaused?: boolean
  soundEnabled: boolean
  onRestartRequest?: () => void
}
