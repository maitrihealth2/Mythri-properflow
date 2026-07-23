import * as THREE from 'three';
import { useMitraStore } from '@/stores/mitraStore';

export function applyEmissivePulse(
  scene: THREE.Object3D, 
  time: number, 
  isListening: boolean
) {
  const { voiceVolume, mood } = useMitraStore.getState();

  scene.traverse((child: any) => {
    if (child.isMesh) {
      const mesh = child as THREE.Mesh;
      if (mesh.material) {
        const mat = mesh.material as THREE.MeshStandardMaterial;
        if (mat.emissive) {
          if (isListening) {
            // Pulse based on voice volume
            // voiceVolume is expected to be 0.0 to 1.0
            const pulse = 0.5 + (voiceVolume * 1.5);
            mat.emissiveIntensity = THREE.MathUtils.lerp(mat.emissiveIntensity, pulse, 0.2);
          } else {
            // Revert to mood default
            let targetIntensity = 0.5;
            switch(mood) {
              case 'dim': targetIntensity = 0.2; break;
              case 'bright': targetIntensity = 1.0; break;
            }
            mat.emissiveIntensity = THREE.MathUtils.lerp(mat.emissiveIntensity, targetIntensity, 0.05);
          }
        }
      }
    }
  });
}
