import { useEffect } from 'react';
import { AttentionTarget, useMitraStore } from '@/stores/mitraStore';
import { getPriority } from './AttentionPriority';

export function useAttentionSystem() {
  const { setAttentionTarget, attentionTarget, isComfortMode } = useMitraStore();

  // Function to request attention, honoring priorities
  const requestAttention = (newTarget: AttentionTarget, rect?: DOMRect | null, id?: string | null) => {
    if (isComfortMode) return; // Comfort mode overrides all external attention

    const currentPriority = getPriority(attentionTarget);
    const newPriority = getPriority(newTarget);

    // Lower number is higher priority
    if (newPriority <= currentPriority) {
      setAttentionTarget(newTarget, rect, id);
    }
  };

  // Automatically downgrade attention if the source disappears? 
  // For now, attention clearing is handled manually by components 
  // (e.g. onBlur for input, onMouseLeave for cursor timeout).
  
  return { requestAttention };
}
