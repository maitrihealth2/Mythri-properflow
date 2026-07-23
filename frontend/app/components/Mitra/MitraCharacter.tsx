import React, { useRef, useEffect } from 'react';
import { useGLTF, useAnimations } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMitraStore } from '@/stores/mitraStore';
import * as THREE from 'three';

import { useProceduralAnimation } from './animation/useProceduralAnimation';

export function MitraCharacter(props: any) {
  const group = useRef<THREE.Group>(null);
  const { nodes, materials, animations, scene } = useGLTF('/models/Meshy_AI_Character_output.glb') as any;
  const { actions } = useAnimations(animations, group);
  
  const currentState = useMitraStore((state) => state.currentState);
  const mood = useMitraStore((state) => state.mood);

  // Animate towards target world position
  useFrame((state, delta) => {
    if (!group.current) return;
    const targetPos = useMitraStore.getState().targetWorldPos;
    
    if (targetPos) {
      const target = new THREE.Vector3(targetPos.x, targetPos.y, targetPos.z);
      // Determine speed based on state
      const isComforting = currentState === 'comforting';
      const speed = isComforting ? 0.5 : 2.0; 
      
      group.current.position.lerp(target, delta * speed);
      
      // Face the direction of movement (optional, basic lookAt)
      if (group.current.position.distanceToSquared(target) > 0.01) {
        // Simple lookAt
        const dummy = new THREE.Object3D();
        dummy.position.copy(group.current.position);
        dummy.lookAt(target);
        group.current.quaternion.slerp(dummy.quaternion, delta * speed * 2);
      }
    }
  });

  // Extract bones for procedural animation
  const bonesMap = React.useMemo(() => {
    const map: Record<string, THREE.Bone> = {};
    scene.traverse((child: any) => {
      if (child.isBone) {
        map[child.name] = child as THREE.Bone;
      }
    });
    return map;
  }, [scene]);

  useProceduralAnimation(scene, bonesMap);

  // Basic animation handling if baked animations exist
  useEffect(() => {
    if (actions && Object.keys(actions).length > 0) {
      const actionNames = Object.keys(actions);
      // For now play the first animation. Phase 2 will add procedural animations.
      const targetActionName = actionNames[0];
      
      const action = actions[targetActionName];
      if (action) {
        action.reset().fadeIn(0.5).play();
        return () => {
          action.fadeOut(0.5);
        };
      }
    }
  }, [currentState, actions]);

  // Adjust material emissive color based on mood
  useEffect(() => {
    scene.traverse((child: any) => {
      if (child.isMesh) {
        const mesh = child as THREE.Mesh;
        if (mesh.material) {
          const mat = mesh.material as THREE.MeshStandardMaterial;
          if (mat.emissive) {
            // Apply subtle mood lighting
            switch(mood) {
              case 'warm': mat.emissive.setHex(0xffaa00); mat.emissiveIntensity = 0.5; break;
              case 'cool': mat.emissive.setHex(0x4488ff); mat.emissiveIntensity = 0.5; break;
              case 'dim': mat.emissive.setHex(0x332211); mat.emissiveIntensity = 0.2; break;
              case 'bright': mat.emissive.setHex(0xffffff); mat.emissiveIntensity = 1.0; break;
            }
          }
        }
      }
    });
  }, [mood, scene]);

  return (
    <group ref={group as any} {...props} dispose={null}>
      <primitive object={scene} />
    </group>
  );
}

useGLTF.preload('/models/Meshy_AI_Character_output.glb');
