import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { InstancedMesh, Object3D } from 'three';
import { useCompanionEngine } from '../core/CompanionEngine';
import { CompanionState } from '../core/StateMachine';

const COUNT = 20;

export const ParticleController = () => {
  const meshRef = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);
  const { currentState, currentPosition } = useCompanionEngine();
  
  // Particle state: position, velocity, life
  const particles = useMemo(() => {
    return Array.from({ length: COUNT }, () => ({
      pos: [0, -100, 0], // Hidden initially
      vel: [0, 0, 0],
      life: 0,
      active: false
    }));
  }, []);

  useFrame((state, delta) => {
    if (!meshRef.current) return;
    
    // Emit new particles based on state
    if (currentState === CompanionState.WALKING || currentState === CompanionState.SLEEPING) {
      // Find an inactive particle
      const p = particles.find(p => !p.active);
      if (p && Math.random() > 0.8) {
        p.active = true;
        p.life = 1.0;
        
        if (currentState === CompanionState.WALKING) {
          // Footstep dust
          p.pos = [
            currentPosition[0] + (Math.random() - 0.5) * 0.5,
            currentPosition[1] - 0.5,
            currentPosition[2] + (Math.random() - 0.5) * 0.5
          ];
          p.vel = [0, Math.random() * 0.5, 0];
        } else if (currentState === CompanionState.SLEEPING) {
          // Zzzs
          p.pos = [
            currentPosition[0] + 0.5,
            currentPosition[1] + 1.0,
            currentPosition[2]
          ];
          p.vel = [Math.random() * 0.2, 0.5 + Math.random() * 0.5, 0];
        }
      }
    }

    // Update and render particles
    particles.forEach((p, i) => {
      if (p.active) {
        p.pos[0] += p.vel[0] * delta;
        p.pos[1] += p.vel[1] * delta;
        p.pos[2] += p.vel[2] * delta;
        p.life -= delta * 0.5;
        
        if (p.life <= 0) {
          p.active = false;
          p.pos = [0, -100, 0]; // Hide
        }
      }
      
      dummy.position.set(p.pos[0], p.pos[1], p.pos[2]);
      dummy.scale.setScalar(Math.max(0, p.life * 0.2));
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, COUNT]}>
      <sphereGeometry args={[0.1, 8, 8]} />
      <meshBasicMaterial color={currentState === CompanionState.SLEEPING ? "#aaddff" : "#dddddd"} transparent opacity={0.6} />
    </instancedMesh>
  );
};
