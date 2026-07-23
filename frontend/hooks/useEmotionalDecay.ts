import { useEffect } from 'react';
import { useMitraStore } from '@/stores/mitraStore';

export function useEmotionalDecay() {
  const { setEnergy, setCuriosity } = useMitraStore();

  useEffect(() => {
    const interval = setInterval(() => {
      // Energy decays (1 per 10s)
      setEnergy((prev) => Math.max(0, prev - 1));
      
      // Curiosity increases naturally if not interacting (1 per 15s)
      setCuriosity((prev) => Math.min(100, prev + 1));
    }, 10000); // 10 seconds tick

    return () => clearInterval(interval);
  }, [setEnergy, setCuriosity]);
}
