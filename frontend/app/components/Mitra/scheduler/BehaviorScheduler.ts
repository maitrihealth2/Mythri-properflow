import { useEffect } from 'react';
import { useMitraStore } from '@/stores/mitraStore';

export function useBehaviorScheduler() {
  const { 
    currentState, 
    energy, 
    curiosity, 
    comfort, 
    attentionTarget, 
    setState, 
    isComfortMode,
    setEnergy,
    setCuriosity
  } = useMitraStore();

  useEffect(() => {
    // Disable scheduler if we're focused on something or in comfort mode
    if (attentionTarget !== 'nothing' || isComfortMode) return;

    // Run every 5 to 15 seconds randomly
    let timeoutId: NodeJS.Timeout;

    const scheduleNext = () => {
      const delay = Math.random() * 10000 + 5000;
      timeoutId = setTimeout(decideNextAction, delay);
    };

    const decideNextAction = () => {
      // Very simple weighted random choice
      const roll = Math.random() * 100;

      // Adjust weights based on state
      // High energy -> less rest
      // High curiosity -> more explore
      
      let exploreWeight = curiosity;
      let restWeight = 100 - energy;
      let observeWeight = 50;

      // Normalize weights roughly
      const total = exploreWeight + restWeight + observeWeight;
      const r = Math.random() * total;

      if (r < exploreWeight) {
        setState('wandering');
        // It will wander for a bit, then energy decreases
        setEnergy((prev) => prev - 5);
        // Reset curiosity since it explored
        setCuriosity(20);
      } else if (r < exploreWeight + restWeight) {
        setState(energy < 20 ? 'sleeping' : 'sitting');
        // Restores energy
        setEnergy((prev) => prev + 10);
      } else {
        setState('idle'); // observe
        // Curiosity builds up while idle
        setCuriosity((prev) => prev + 10);
      }

      scheduleNext();
    };

    scheduleNext();

    return () => clearTimeout(timeoutId);
  }, [attentionTarget, isComfortMode, energy, curiosity, setState, setEnergy, setCuriosity]);
}
