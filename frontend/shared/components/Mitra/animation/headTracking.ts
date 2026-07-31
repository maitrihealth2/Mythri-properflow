import * as THREE from 'three';

export function applyHeadTracking(
  bones: Record<string, THREE.Bone>, 
  targetPoint: THREE.Vector3 | null,
  isTracking: boolean
) {
  const head = bones.Head;
  const neck = bones.Neck;

  if (!head || !isTracking) return;

  if (targetPoint) {
    // We want the head to look at the target point
    // This is simplified. Proper lookAt with lerp requires quaternion math.
    
    // Create a dummy object to use lookAt
    const dummy = new THREE.Object3D();
    head.getWorldPosition(dummy.position);
    dummy.lookAt(targetPoint);
    
    // Lerp the head quaternion towards the dummy quaternion
    head.quaternion.slerp(dummy.quaternion, 0.1);
    
    // Optional: add a bit of neck rotation as well
    if (neck) {
      neck.quaternion.slerp(dummy.quaternion, 0.05);
    }
  } else {
    // Return to neutral if not tracking a specific point, but we still might want it to face forward
    head.quaternion.slerp(new THREE.Quaternion(), 0.05);
    if (neck) neck.quaternion.slerp(new THREE.Quaternion(), 0.05);
  }
}
