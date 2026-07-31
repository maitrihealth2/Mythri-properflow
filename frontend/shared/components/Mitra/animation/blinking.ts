import * as THREE from 'three';

export function applyBlinking(
  bones: Record<string, THREE.Bone>, 
  time: number
) {
  // If the character has eyelid bones or morph targets for blinking
  const leftEyelid = bones.LeftEyelid;
  const rightEyelid = bones.RightEyelid;

  if (!leftEyelid || !rightEyelid) return;

  // Simple procedural blink: every ~3-5 seconds, close eyes rapidly
  const blinkCycle = time % 4.0; 
  
  if (blinkCycle < 0.1) {
    // Eyes closed
    leftEyelid.scale.y = 0.1;
    rightEyelid.scale.y = 0.1;
  } else {
    // Eyes open
    leftEyelid.scale.y = THREE.MathUtils.lerp(leftEyelid.scale.y, 1.0, 0.2);
    rightEyelid.scale.y = THREE.MathUtils.lerp(rightEyelid.scale.y, 1.0, 0.2);
  }
}
