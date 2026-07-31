import * as THREE from 'three';

export function applyBreathing(
  bones: Record<string, THREE.Bone>, 
  time: number, 
  intensity: number = 1.0, 
  speed: number = 1.0
) {
  if (!bones.Spine && !bones.Chest) return; // Depends on your rig's bone names

  const targetBone = bones.Chest || bones.Spine;
  
  // Sine wave for breathing (scale Y/Z)
  const breath = Math.sin(time * 2.0 * speed) * 0.02 * intensity;
  
  // Base scale is 1.0
  targetBone.scale.set(1.0 + breath * 0.5, 1.0 + breath, 1.0 + breath * 0.5);
}
