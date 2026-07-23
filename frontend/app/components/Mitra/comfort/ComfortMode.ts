import { useEffect } from 'react';
import { useMitraStore } from '@/stores/mitraStore';

export function useComfortMode() {
  const { comfort, isComfortMode, triggerComfort, exitComfort } = useMitraStore();

  useEffect(() => {
    // Comfort is a scale 0-100 from backend sentiment.
    // E.g., < 30 means sad, stressed, overwhelmed.
    if (comfort < 30 && !isComfortMode) {
      triggerComfort();
      
      // In a full implementation, you'd find a safe spot via NavigationSystem
      // and walk there slowly, but triggerComfort handles state & mood changes.
    } else if (comfort >= 30 && isComfortMode) {
      // Exit comfort mode when sentiment improves
      // or this could be driven by a user interaction like petting
      exitComfort();
    }
  }, [comfort, isComfortMode, triggerComfort, exitComfort]);
}
