import { useEffect } from 'react';
import { useCompanionEngine } from '../core/CompanionEngine';

export const useCursorTracker = () => {
  const { setLookAtTarget } = useCompanionEngine();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleMouseMove = (e: MouseEvent) => {
      // Map screen coordinates to normalized device coordinates (-1 to +1)
      const x = (e.clientX / window.innerWidth) * 2 - 1;
      const y = -(e.clientY / window.innerHeight) * 2 + 1;
      
      // Project roughly into 3D space in front of the character
      setLookAtTarget([x * 10, y * 10, 5]);
    };

    window.addEventListener('mousemove', handleMouseMove);
    
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [setLookAtTarget]);
};
