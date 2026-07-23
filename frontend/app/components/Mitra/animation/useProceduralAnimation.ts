import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useMitraStore } from '@/stores/mitraStore';

import { applyBreathing } from './breathing';
import { applyWalking } from './walking';
import { applySleeping } from './sleeping';
import { applyHeadTracking } from './headTracking';
import { applyBlinking } from './blinking';
import { applyEmissivePulse } from './emissivePulse';

export function useProceduralAnimation(
  scene: THREE.Object3D, 
  bonesMap: Record<string, THREE.Bone>
) {
  const currentState = useMitraStore((state) => state.currentState);
  const attentionTarget = useMitraStore((state) => state.attentionTarget);
  const targetElement = useMitraStore((state) => state.targetElement);

  // We need to map targetElement (DOMRect) to 3D space, but for now we'll just track cursor if attention is cursor
  // A proper DOM to 3D mapping will provide a Vector3 target.
  // We'll mock a Vector3 for now.
  const lookTarget = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => {
    // If attention target changes to cursor, we might attach a mouse move listener to update lookTarget
    const handleMouseMove = (e: MouseEvent) => {
      if (attentionTarget === 'cursor') {
        // Simple 2D to 3D projection mock
        lookTarget.x = (e.clientX / window.innerWidth) * 2 - 1;
        lookTarget.y = -(e.clientY / window.innerHeight) * 2 + 1;
        lookTarget.z = 5; // Look out towards camera
      }
    };

    if (attentionTarget === 'cursor') {
      window.addEventListener('mousemove', handleMouseMove);
    }
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [attentionTarget, lookTarget]);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();

    // Reset base posture slightly towards neutral each frame before applying procedural layers
    // (In a full implementation, you'd crossFade actions or blend quaternions carefully)
    
    // Apply layers
    applyBlinking(bonesMap, time);
    
    if (currentState === 'sleeping' || currentState === 'comforting') {
      applySleeping(bonesMap, time, true);
    } else {
      applyBreathing(bonesMap, time, currentState === 'excited' ? 1.5 : 1.0, currentState === 'excited' ? 1.5 : 1.0);
    }

    if (currentState === 'wandering') {
      applyWalking(bonesMap, time, true);
    }

    applyHeadTracking(bonesMap, attentionTarget === 'cursor' ? lookTarget : null, !!attentionTarget);
    applyEmissivePulse(scene, time, currentState === 'listening');
  });
}
