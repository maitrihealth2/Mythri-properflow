import { useEffect } from 'react';
import { useCompanionEngine } from '../core/CompanionEngine';

export const useChatInteractionHandler = () => {
  const { setUserTyping, updateEmotion } = useCompanionEngine();

  useEffect(() => {
    let typingTimer: NodeJS.Timeout;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if typing in an input or textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        setUserTyping(true);
        updateEmotion('curiosity', 5);
        
        // Clear typing status after a delay
        clearTimeout(typingTimer);
        typingTimer = setTimeout(() => {
          setUserTyping(false);
        }, 3000);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearTimeout(typingTimer);
    };
  }, [setUserTyping, updateEmotion]);
};
