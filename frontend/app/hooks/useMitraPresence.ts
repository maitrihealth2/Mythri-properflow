import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useMitraStore } from '@/stores/mitraStore';

export function useMitraPresence() {
  const pathname = usePathname();
  const { setState, setMood, clearAttention } = useMitraStore();

  useEffect(() => {
    // Reset attention on route change
    clearAttention();

    // Context switching based on route
    if (pathname === '/') {
      // Dashboard - Welcomer & Passive Anchor
      setState('idle');
      setMood('warm');
    } else if (pathname?.startsWith('/consultation')) {
      // Consultation - Empathetic Listener
      setState('listening');
      setMood('warm');
    } else if (pathname?.startsWith('/history')) {
      // History & Journaling - Reflective Observer
      setState('idle');
      setMood('cool'); // Soft blues/purples
    } else {
      // Fallback
      setState('idle');
      setMood('warm');
    }
    
    // Update last visit whenever path changes
    useMitraStore.getState().updateMemory({ lastVisit: Date.now() });
    
  }, [pathname, setState, setMood, clearAttention]);
}
