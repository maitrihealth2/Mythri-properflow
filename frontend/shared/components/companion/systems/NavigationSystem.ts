import { useFrame } from '@react-three/fiber';
import { useCompanionEngine } from '../core/CompanionEngine';
import { CompanionState } from '../core/StateMachine';

// Updates the actual 3D position by lerping towards the target
export const useNavigationSystem = () => {
  const { currentPosition, targetPosition, setPosition, currentState, setState } = useCompanionEngine();

  useFrame((state, delta) => {
    if (currentState === CompanionState.WALKING) {
      const speed = 2.0; // units per second
      const dx = targetPosition[0] - currentPosition[0];
      const dy = targetPosition[1] - currentPosition[1];
      const dz = targetPosition[2] - currentPosition[2];
      
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
      
      if (distance > 0.1) {
        // Move towards target
        const step = speed * delta;
        const ratio = Math.min(step / distance, 1.0);
        
        setPosition([
          currentPosition[0] + dx * ratio,
          currentPosition[1] + dy * ratio,
          currentPosition[2] + dz * ratio,
        ]);
      } else {
        // Reached target
        setState(CompanionState.IDLE);
      }
    }
  });
};
