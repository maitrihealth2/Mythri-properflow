import * as THREE from 'three';

export function applySleeping(
  bones: Record<string, THREE.Bone>, 
  time: number, 
  isSleeping: boolean
) {
  if (!isSleeping) return;

  const spine = bones.Spine;
  const head = bones.Head;
  const hips = bones.Hips;

  if (spine) {
    // Curl up slowly
    spine.rotation.x = THREE.MathUtils.lerp(spine.rotation.x, 0.5, 0.05);
  }
  
  if (head) {
    // Rest head
    head.rotation.x = THREE.MathUtils.lerp(head.rotation.x, 0.3, 0.05);
    head.rotation.z = THREE.MathUtils.lerp(head.rotation.z, 0.2, 0.05);
  }

  // Deep breaths when sleeping (override normal breathing somewhat)
  if (spine) {
    const deepBreath = Math.sin(time * 1.0) * 0.03;
    spine.scale.set(1.0 + deepBreath, 1.0 + deepBreath, 1.0 + deepBreath);
  }
}
