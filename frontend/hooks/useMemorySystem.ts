import { useEffect } from 'react';
import { useMitraStore } from '@/stores/mitraStore';

export function useMemorySystem() {
  const { currentState, targetElementId, updateMemory, daysTogether } = useMitraStore();

  useEffect(() => {
    // A real implementation would track frequencies in a local object or DB,
    // then periodically update `favoritePlace` and `favoriteActivity` based on highest frequency.
    
    // Simplification for the architecture layout:
    const interval = setInterval(() => {
      const state = useMitraStore.getState();
      
      // Update days together based on lastVisit if spanning a calendar day
      const now = new Date();
      const last = state.lastVisit ? new Date(state.lastVisit) : new Date();
      
      if (now.getDate() !== last.getDate() || now.getMonth() !== last.getMonth()) {
        updateMemory({ daysTogether: state.daysTogether + 1 });
      }

      // Record activity
      if (state.currentState === 'sitting' && state.targetElementId) {
        updateMemory({ favoritePlace: state.targetElementId, favoriteActivity: 'sitting' });
      }
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [currentState, targetElementId, updateMemory, daysTogether]);
}
