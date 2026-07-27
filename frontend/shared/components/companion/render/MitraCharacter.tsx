import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';
import { Group, MeshStandardMaterial, Bone, Mesh } from 'three';
import { useCompanionEngine } from '../core/CompanionEngine';
import { applyProceduralAnimation } from './AnimationController';

export function MitraCharacter() {
  const group = useRef<Group>(null);
  const { scene, animations } = useGLTF('/Meshy_AI_Character_output.glb');
  const { actions } = useAnimations(animations, group);
  
  const { currentState, currentPosition, lookAtTarget } = useCompanionEngine();

  // State for blinking
  const blinkTimer = useRef(0);
  const isBlinking = useRef(false);

  // Extract bones and eye meshes for procedural animation
  const { bones, eyeMeshes } = useMemo(() => {
    const boneMap: Record<string, Bone> = {};
    const eyes: Mesh[] = [];
    
    scene.traverse((child: any) => {
      if (child.isBone) {
        boneMap[child.name] = child as Bone;
      }
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        
        if (child.name.toLowerCase().includes('eye')) {
          eyes.push(child);
        }
        
        // Ensure a slightly warmer, glowing material
        if (child.material) {
          const mat = child.material as MeshStandardMaterial;
          mat.roughness = 0.8;
          mat.metalness = 0.1;
          mat.emissive.setHex(0x111111);
        }
      }
    });
    return { bones: boneMap, eyeMeshes: eyes };
  }, [scene]);

  useFrame((state, delta) => {
    // Apply position from engine
    if (group.current) {
      group.current.position.set(currentPosition[0], currentPosition[1], currentPosition[2]);
    }

    // Blink Logic
    blinkTimer.current += delta;
    if (!isBlinking.current && blinkTimer.current > 3 + Math.random() * 4) {
      isBlinking.current = true;
      blinkTimer.current = 0;
    }
    
    if (isBlinking.current) {
      blinkTimer.current += delta;
      const blinkProgress = blinkTimer.current / 0.15; // 150ms blink
      
      const scaleY = blinkProgress < 0.5 
        ? 1 - (blinkProgress * 2 * 0.9) // scale down to 0.1
        : 0.1 + ((blinkProgress - 0.5) * 2 * 0.9); // scale back up to 1
        
      if (eyeMeshes.length > 0) {
        eyeMeshes.forEach(eye => { eye.scale.y = Math.max(0.1, scaleY); });
      } else {
        // Fallback: nod head slightly if no eye mesh found
        if (bones['Bone_002']) {
           bones['Bone_002'].position.y = -Math.sin(blinkProgress * Math.PI) * 0.05;
        }
      }
      
      if (blinkProgress >= 1) {
        isBlinking.current = false;
        blinkTimer.current = 0;
        if (eyeMeshes.length > 0) {
          eyeMeshes.forEach(eye => { eye.scale.y = 1; });
        } else if (bones['Bone_002']) {
          bones['Bone_002'].position.y = 0;
        }
      }
    }

    // Apply procedural animation
    applyProceduralAnimation(bones, currentState, state.clock.elapsedTime, delta, lookAtTarget);
  });

  return (
    <group ref={group} dispose={null}>
      <primitive object={scene} />
    </group>
  );
}

useGLTF.preload('/Meshy_AI_Character_output.glb');
