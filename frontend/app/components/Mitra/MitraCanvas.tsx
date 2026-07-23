'use client';

import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { PerspectiveCamera, Environment } from '@react-three/drei';
import { MitraCharacter } from './MitraCharacter';
import { useMitraPresence } from '@/hooks/useMitraPresence';
import { NavigationController } from './navigation/NavigationController';

export function MitraCanvas() {
  // Initialize route-aware context switching
  useMitraPresence();

  return (
    <div 
      className="fixed inset-0 z-50 pointer-events-none"
      style={{ width: '100vw', height: '100vh' }}
    >
      <Canvas
        camera={{ position: [0, 1, 5], fov: 45 }}
        gl={{ alpha: true, antialias: true }}
      >
        {/* Lights */}
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
        
        {/* Environment for reflections */}
        <Environment preset="city" />
        
        <NavigationController />

        {/* The Character */}
        <Suspense fallback={null}>
          <MitraCharacter position={[0, -1, 0]} scale={1} />
        </Suspense>
      </Canvas>
    </div>
  );
}
