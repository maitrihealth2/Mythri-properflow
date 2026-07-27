import { useEffect } from 'react';
import { useCompanionEngine } from './CompanionEngine';
import { CompanionState } from './StateMachine';

// The BehaviourSystem runs as a hook that continuously evaluates conditions
// and makes autonomous decisions for Mitra based on energy/curiosity.
export const useBehaviourSystem = () => {
  const { 
    currentState, setState, 
    energy, curiosity, attention,
    isVoiceActive, isUserTyping,
    uiElements, setTarget, updateEmotion
  } = useCompanionEngine();

  useEffect(() => {
    const tick = setInterval(() => {
      // High priority overrides
      if (isVoiceActive && currentState !== CompanionState.LISTENING) {
        setState(CompanionState.LISTENING);
        return;
      }
      
      if (isUserTyping && currentState !== CompanionState.CURIOUS && currentState !== CompanionState.WALKING) {
        setState(CompanionState.CURIOUS);
        return;
      }

      // Autonomous Needs-based behavior
      if (currentState === CompanionState.IDLE) {
        if (energy < 20) {
          setState(CompanionState.SITTING);
        } else if (curiosity > 80 && Math.random() > 0.95) {
          // Find a random UI element to inspect
          const elements = Object.values(uiElements);
          if (elements.length > 0) {
            const targetEl = elements[Math.floor(Math.random() * elements.length)];
            // Map DOM rect to 3D space roughly
            const x = (targetEl.rect.x / window.innerWidth) * 20 - 10;
            const y = -(targetEl.rect.y / window.innerHeight) * 20 + 10;
            setTarget([x, y, -5]);
            setState(CompanionState.WALKING);
            updateEmotion('curiosity', -50);
          }
        }
      } else if (currentState === CompanionState.SITTING) {
        if (energy < 5) {
          setState(CompanionState.SLEEPING);
        } else if (energy > 50 && attention > 50) {
          setState(CompanionState.IDLE);
        }
      } else if (currentState === CompanionState.SLEEPING) {
        if (energy > 80 || isVoiceActive || isUserTyping) {
          setState(CompanionState.IDLE);
        }
      }
    }, 2000); // Evaluate every 2 seconds

    return () => clearInterval(tick);
  }, [currentState, energy, curiosity, attention, isVoiceActive, isUserTyping, uiElements, setState, setTarget]);
};
