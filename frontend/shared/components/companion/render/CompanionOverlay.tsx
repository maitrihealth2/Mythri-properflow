'use client';

import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Environment, ContactShadows, OrthographicCamera } from '@react-three/drei';

// Core
import { useBehaviourSystem } from '../core/BehaviourSystem';

// Systems
import { useEmotionSystem } from '../systems/EmotionSystem';
import { useFriendshipSystem } from '../systems/FriendshipSystem';
import { useNavigationSystem } from '../systems/NavigationSystem';
import { useWorldTracker } from '../systems/WorldTracker';
import { useCursorTracker } from '../systems/CursorTracker';

// Handlers
import { useVoiceInteractionHandler } from '../handlers/VoiceInteractionHandler';
import { useChatInteractionHandler } from '../handlers/ChatInteractionHandler';

// Render
import { MitraCharacter } from './MitraCharacter';
import { ParticleController } from './ParticleController';
import { VineSystem } from './VineSystem';

const SystemsRunner = () => {
  // Initialize all modular hooks
  useBehaviourSystem();
  useEmotionSystem();
  useFriendshipSystem();
  useWorldTracker();
  useCursorTracker();
  useVoiceInteractionHandler();
  useChatInteractionHandler();

  return null; // This component just runs logic, no rendering
};

const NavigationRunner = () => {
  useNavigationSystem();
  return null;
};

export default function CompanionOverlay() {
  return (
    <div 
      className="fixed inset-0 pointer-events-none z-50"
      style={{ overflow: 'hidden', pointerEvents: 'none' }}
    >
      <SystemsRunner />
      
      <Canvas 
        shadows 
        dpr={[1, 2]} 
        gl={{ alpha: true, antialias: true }}
        style={{ pointerEvents: 'none' }}
      >
        <OrthographicCamera makeDefault position={[0, 0, 10]} zoom={40} />
        <ambientLight intensity={0.5} />
        <directionalLight 
          position={[10, 10, 5]} 
          intensity={1.5} 
          castShadow 
          shadow-mapSize-width={1024} 
          shadow-mapSize-height={1024} 
        />
        
        <Suspense fallback={null}>
          <NavigationRunner />
          <MitraCharacter />
          <VineSystem />
          <ParticleController />
          
          <ContactShadows 
            position={[0, -3.5, 0]} 
            opacity={0.4} 
            scale={20} 
            blur={2} 
            far={10} 
          />
          <Environment preset="city" />
        </Suspense>
      </Canvas>
    </div>
  );
}
