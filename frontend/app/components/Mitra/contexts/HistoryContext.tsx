'use client';

import { useEffect } from 'react';
import { useMitraStore } from '@/stores/mitraStore';

export function HistoryContext() {
  const { setMood, setState } = useMitraStore();

  useEffect(() => {
    // Reflective observer
    setState('idle');
    setMood('cool');

    // Scheduler logic in BehaviorScheduler naturally handles rest/observe
    // but we could set a flag here or just let the mood influence the scheduler.

    return () => {
      // Revert to warm on unmount, or handled by next context
    };
  }, [setState, setMood]);

  return null;
}
