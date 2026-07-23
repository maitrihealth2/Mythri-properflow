import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface ParticleSystemProps {
  type: 'hearts' | 'zzz' | 'sparkles' | 'dust';
  position: THREE.Vector3;
  count?: number;
}

export function ParticleSystem({ type, position, count = 10 }: ParticleSystemProps) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  
  const dummy = useMemo(() => new THREE.Object3D(), []);
  
  const particles = useMemo(() => {
    const temp = [];
    for (let i = 0; i < count; i++) {
      const t = Math.random() * 100;
      const factor = 0.5 + Math.random();
      const speed = 0.01 + Math.random() / 200;
      const xFactor = -0.5 + Math.random();
      const yFactor = -0.5 + Math.random();
      const zFactor = -0.5 + Math.random();
      temp.push({ t, factor, speed, xFactor, yFactor, zFactor, mx: 0, my: 0 });
    }
    return temp;
  }, [count]);

  useFrame((state) => {
    if (!mesh.current) return;
    
    particles.forEach((particle, i) => {
      let { t, factor, speed, xFactor, yFactor, zFactor } = particle;
      t = particle.t += speed / 2;
      
      const a = Math.cos(t) + Math.sin(t * 1) / 10;
      const b = Math.sin(t) + Math.cos(t * 2) / 10;
      const s = Math.cos(t);
      
      dummy.position.set(
        position.x + (xFactor + a) * factor,
        position.y + (yFactor + b) * factor,
        position.z + (zFactor + s) * factor
      );
      
      const scale = Math.max(0.1, 1 - (t % 2)); // Simple fade/scale out
      dummy.scale.set(scale, scale, scale);
      
      dummy.updateMatrix();
      mesh.current!.setMatrixAt(i, dummy.matrix);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
  });

  // Choose color/geometry based on type
  let color = '#ffffff';
  if (type === 'hearts') color = '#ff4466';
  else if (type === 'sparkles') color = '#ffd700';
  else if (type === 'zzz') color = '#aaaaaa';

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]}>
      <sphereGeometry args={[0.05, 8, 8]} />
      <meshBasicMaterial color={color} transparent opacity={0.6} />
    </instancedMesh>
  );
}
