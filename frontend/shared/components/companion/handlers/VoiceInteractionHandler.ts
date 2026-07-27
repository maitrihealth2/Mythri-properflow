import { useEffect } from 'react';
import { useCompanionEngine } from '../core/CompanionEngine';

export const useVoiceInteractionHandler = () => {
  const { setVoiceActive, updateEmotion } = useCompanionEngine();

  useEffect(() => {
    // Listen for custom voice events emitted from the Voice component
    const handleVoiceStart = () => {
      setVoiceActive(true);
      updateEmotion('attention', 20);
    };

    const handleVoiceEnd = () => {
      setVoiceActive(false);
      updateEmotion('comfort', 10);
    };

    window.addEventListener('maitri-voice-start', handleVoiceStart);
    window.addEventListener('maitri-voice-end', handleVoiceEnd);

    return () => {
      window.removeEventListener('maitri-voice-start', handleVoiceStart);
      window.removeEventListener('maitri-voice-end', handleVoiceEnd);
    };
  }, [setVoiceActive, updateEmotion]);
};
