import { useEffect } from 'react';
import { useCompanionEngine } from '../core/CompanionEngine';

export const useEmotionSystem = () => {
  const { updateEmotion } = useCompanionEngine();

  useEffect(() => {
    // Decay energy slowly, increase curiosity slightly
    const tick = setInterval(() => {
      updateEmotion('energy', -1);
      updateEmotion('curiosity', 2);
    }, 5000); // Every 5 seconds

    return () => clearInterval(tick);
  }, [updateEmotion]);
};
