'use client';

import { useEffect } from 'react';
import { useMitraStore } from '@/stores/mitraStore';

export function DashboardContext() {
  const { friendship, updateMemory } = useMitraStore();

  useEffect(() => {
    const { lastVisit } = useMitraStore.getState();
    const now = Date.now();
    
    // On mount logic
    if (friendship > 0 && lastVisit && (now - lastVisit > 8 * 60 * 60 * 1000)) {
      // It's been over 8 hours
      useMitraStore.getState().setState('sleeping');
      
      // Wake excitedly on first mouse move
      const handleWake = () => {
        useMitraStore.getState().setState('excited');
        useMitraStore.getState().speak('Welcome back!');
        window.removeEventListener('mousemove', handleWake);
      };
      
      window.addEventListener('mousemove', handleWake);
      return () => window.removeEventListener('mousemove', handleWake);
    }
    
    // Update lastVisit
    updateMemory({ lastVisit: now });
  }, [friendship, updateMemory]);

  return null;
}
