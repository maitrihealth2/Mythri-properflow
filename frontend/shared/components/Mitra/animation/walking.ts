import * as THREE from 'three';

export function applyWalking(
  bones: Record<string, THREE.Bone>, 
  time: number, 
  isWalking: boolean,
  speed: number = 5.0
) {
  if (!isWalking) return;

  // Assuming basic bone names. Adjust based on GLB structure.
  const leftLeg = bones.LeftUpLeg;
  const rightLeg = bones.RightUpLeg;
  const leftArm = bones.LeftArm;
  const rightArm = bones.RightArm;
  const hips = bones.Hips;

  if (leftLeg && rightLeg) {
    leftLeg.rotation.x = Math.sin(time * speed) * 0.5;
    rightLeg.rotation.x = Math.sin(time * speed + Math.PI) * 0.5;
  }

  if (leftArm && rightArm) {
    leftArm.rotation.x = Math.sin(time * speed + Math.PI) * 0.5;
    rightArm.rotation.x = Math.sin(time * speed) * 0.5;
  }

  if (hips) {
    // Subtle hip bobbing
    const bob = Math.abs(Math.sin(time * speed)) * 0.05;
    hips.position.y += bob;
  }
}
