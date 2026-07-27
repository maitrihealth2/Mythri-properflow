import * as THREE from 'three';

/**
 * Maps a DOM element's bounding rect to a 3D coordinate for the character to navigate to.
 * @param rect DOMRect of the target element
 * @param camera The R3F camera
 * @param zDepth The depth on the Z axis where the character lives (usually 0)
 */
export function domTo3D(
  rect: DOMRect, 
  camera: THREE.Camera, 
  zDepth: number = 0
): THREE.Vector3 {
  // We want to target the top-center or a specific edge.
  // For this example, let's target the top-center of the rect.
  const x = rect.left + (rect.width / 2);
  const y = rect.top;

  // Normalize screen coordinates (-1 to +1)
  const ndcX = (x / window.innerWidth) * 2 - 1;
  const ndcY = -(y / window.innerHeight) * 2 + 1;

  // Unproject to 3D world space
  const vector = new THREE.Vector3(ndcX, ndcY, 0.5);
  vector.unproject(camera);

  // Vector now represents a point on the near clipping plane
  // We need to raycast or project it to our target zDepth plane
  const dir = vector.sub(camera.position).normalize();
  const distance = (zDepth - camera.position.z) / dir.z;
  
  const pos = camera.position.clone().add(dir.multiplyScalar(distance));
  
  return pos;
}
