import { useEffect } from 'react';
import { useMitraStore } from '@/stores/mitraStore';

export function useRareBehaviorSystem() {
  const { currentState, setState, level } = useMitraStore();

  useEffect(() => {
    // 1% chance every few hours when scheduler picks explore or rest
    // We hook into state changes. If state becomes idle/rest/explore,
    // roll the dice for a rare behavior.

    if (currentState === 'idle' || currentState === 'wandering' || currentState === 'sitting') {
      const roll = Math.random();
      
      if (roll < 0.01) { // 1% chance
        const behaviors = [
          'watch-cursor-silently',
          'sudden-stretch',
          'shake-off',
          'perk-up-empty-space'
        ];
        
        if (level >= 20) behaviors.push('sleep-upside-down');

        const chosen = behaviors[Math.floor(Math.random() * behaviors.length)];

        // Handle the chosen rare behavior
        // Since we don't have dedicated rare animation states yet, 
        // we'll just log or trigger a generic excited state as a placeholder.
        console.log(`Mitra performed a rare behavior: ${chosen}`);
        
        if (chosen === 'sudden-stretch' || chosen === 'shake-off') {
          setState('excited'); 
          // Revert after a few seconds
          setTimeout(() => setState('idle'), 3000);
        }
      }
    }
  }, [currentState, setState, level]);
}
