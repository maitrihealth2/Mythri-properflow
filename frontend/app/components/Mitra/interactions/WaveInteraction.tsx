import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useMitraStore } from '@/stores/mitraStore';

export function WaveInteraction({ children }: { children: React.ReactNode }) {
  const { level, setState } = useMitraStore();
  const hoverTime = useRef(0);

  const handlePointerOver = (e: any) => {
    e.stopPropagation();
    if (level >= 2) {
      hoverTime.current = Date.now();
    }
  };

  const handlePointerOut = (e: any) => {
    e.stopPropagation();
    hoverTime.current = 0;
  };

  useFrame(() => {
    if (hoverTime.current > 0 && Date.now() - hoverTime.current > 1000) {
      // Hovered for 1 second, trigger wave
      setState('excited'); // Replace with specific wave trigger if baked animation exists
      hoverTime.current = 0; // reset
    }
  });

  return (
    <group onPointerOver={handlePointerOver} onPointerOut={handlePointerOut}>
      {children}
    </group>
  );
}
