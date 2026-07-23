import { useEffect } from 'react';
import { useMitraStore } from '@/stores/mitraStore';

export function useCallOverInteraction() {
  const { setState } = useMitraStore();

  useEffect(() => {
    const handleDoubleClick = (e: MouseEvent) => {
      // Basic check if clicked on empty space (e.g. body/html or a specific wrapper)
      // Since canvas is pointer-events-none, clicks pass through to the DOM
      // We can interpret any double click as "call over"
      
      setState('wandering');
      
      // In a full implementation, we'd take e.clientX/Y, convert via domTo3D, 
      // and set that as a specific target for NavigationSystem to walk to.
    };

    window.addEventListener('dblclick', handleDoubleClick);
    return () => window.removeEventListener('dblclick', handleDoubleClick);
  }, [setState]);
}
