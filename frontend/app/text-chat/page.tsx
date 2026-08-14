import Page from '@/modules/consultation/frontend/page';

interface Message {
  role: 'user' | 'assistant'
  content: string
  segments?: string[]
  visibleSegments?: number
  is_crisis?: boolean
  helplines?: string[]
  emotion?: string
  emotion_emoji?: string
  rag_used?: boolean
  via?: 'text' | 'voice'
  is_new?: boolean
  exercise_trigger?: string
}

export default Page;
