import React, { useState } from 'react';
import { useMitraStore } from '@/stores/mitraStore';
import { ParticleSystem } from './ParticleSystem';
import * as THREE from 'three';

export function PetInteraction({ children }: { children: React.ReactNode }) {
  const { addFriendship, setState } = useMitraStore();
  const [showHearts, setShowHearts] = useState(false);

  const handlePointerDown = (e: any) => {
    e.stopPropagation();
    
    // Pet response
    setState('excited');
    addFriendship(1); // Small boost
    
    setShowHearts(true);
    setTimeout(() => setShowHearts(false), 2000);
  };

  return (
    <group onPointerDown={handlePointerDown}>
      {children}
      {showHearts && <ParticleSystem type="hearts" position={new THREE.Vector3(0, 1.5, 0)} />}
    </group>
  );
}
