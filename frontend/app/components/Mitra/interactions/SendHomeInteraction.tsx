import React, { useState, useEffect } from 'react';
import { useMitraStore } from '@/stores/mitraStore';

export function SendHomeInteraction({ children }: { children: React.ReactNode }) {
  const { sleep } = useMitraStore();
  const [menuPos, setMenuPos] = useState<{ x: number, y: number } | null>(null);

  const handleContextMenu = (e: any) => {
    e.stopPropagation(); // Only works if we have pointer events on Mitra
    
    // Convert 3D event to 2D screen coords if needed, or use native DOM event if wrapped in Html
    // For simplicity, assuming e is a standard react-three-fiber event with screen coords
    setMenuPos({ x: e.clientX, y: e.clientY });
  };

  useEffect(() => {
    const closeMenu = () => setMenuPos(null);
    window.addEventListener('click', closeMenu);
    return () => window.removeEventListener('click', closeMenu);
  }, []);

  return (
    <group onContextMenu={handleContextMenu}>
      {children}
      
      {/* If menuPos is set, render an HTML overlay via ReactDOM or a portal outside the canvas.
          For this component, we can dispatch to a global UI store or just use R3F Html. */}
      {/* Note: This is an abstraction. The actual rendering of the context menu 
          would be better placed in a standard DOM overlay listening to the global state. */}
    </group>
  );
}
