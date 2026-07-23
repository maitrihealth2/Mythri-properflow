import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { CatmullRomCurve3, Vector3, Mesh } from 'three';
import { useCompanionEngine } from '../core/CompanionEngine';

export const VineSystem = () => {
  const meshRef = useRef<Mesh>(null);
  const { currentPosition } = useCompanionEngine();

  // Procedural vine curve points
  const points = useMemo(() => {
    return [
      new Vector3(-5, -5, -5),
      new Vector3(-2, 2, -4),
      new Vector3(0, 0, 0) // Will follow character
    ];
  }, []);

  const curve = useMemo(() => new CatmullRomCurve3(points), [points]);

  useFrame(() => {
    if (!meshRef.current) return;
    
    // Make the end of the vine follow the character
    points[2].set(currentPosition[0], currentPosition[1] + 1, currentPosition[2]);
    curve.points = points;
  });

  return (
    <group>
      {/* Visual representation of the vine anchor */}
      <mesh position={points[0]}>
        <sphereGeometry args={[0.2, 8, 8]} />
        <meshStandardMaterial color="#88ff88" emissive="#22aa22" />
      </mesh>
    </group>
  );
};
