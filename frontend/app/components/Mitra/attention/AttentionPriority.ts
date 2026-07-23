import { AttentionTarget } from '@/stores/mitraStore';

// Priority hierarchy (lowest index = highest priority)
export const ATTENTION_PRIORITY: Record<string, number> = {
  'voice': 1,
  'notification': 2,
  'message': 3,
  'input': 4,
  'cursor': 5,
  'nothing': 6
};

export function getPriority(target: AttentionTarget): number {
  if (!target) return ATTENTION_PRIORITY['nothing'];
  return ATTENTION_PRIORITY[target] || ATTENTION_PRIORITY['nothing'];
}
