import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { useMitraStore } from '@/stores/mitraStore';
import { NavigationSystem } from './NavigationSystem';
import { domTo3D } from '@/utils/domTo3D';
import * as THREE from 'three';

export function NavigationController() {
  const { camera } = useThree();
  const { currentState, targetElement, setTargetWorldPos } = useMitraStore();

  useEffect(() => {
    const navSys = new NavigationSystem(camera);

    if (currentState === 'wandering') {
      const randomNode = navSys.getRandomNode();
      if (randomNode) {
        setTargetWorldPos({ x: randomNode.x, y: randomNode.y, z: randomNode.z });
      } else {
        // Fallback to random position near bottom
        setTargetWorldPos({ x: (Math.random() - 0.5) * 4, y: -2, z: 0 });
      }
    } else if (targetElement) {
      // If we have a specific target element to look at/go to
      const pos = domTo3D(targetElement, camera, 0);
      setTargetWorldPos({ x: pos.x, y: pos.y, z: pos.z });
    }
  }, [currentState, targetElement, camera, setTargetWorldPos]);

  return null;
}
