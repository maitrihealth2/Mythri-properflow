import { Bone, MathUtils, Euler, Quaternion } from 'three';
import { CompanionState } from '../core/StateMachine';

// Helper to safely manipulate bones
const setBoneRotation = (bone: Bone | undefined, x: number, y: number, z: number, alpha: number = 0.1) => {
  if (!bone) return;
  const target = new Euler(x, y, z);
  const targetQuat = new Quaternion().setFromEuler(target);
  bone.quaternion.slerp(targetQuat, alpha);
};

export const applyProceduralAnimation = (
  bones: Record<string, Bone>,
  state: CompanionState,
  time: number,
  delta: number,
  lookAtTarget: [number, number, number] | null
) => {
  if (Object.keys(bones).length === 0) return;

  const t = time;

  // 1. Base breathing animation (applied in most states)
  if (state !== CompanionState.WALKING) {
    setBoneRotation(bones['Bone_000'], 0, 0, Math.sin(t * 2) * 0.05); // Hip
    setBoneRotation(bones['Bone_001'], 0, 0, Math.sin(t * 2 + 1) * 0.05); // Spine
  }

  // 2. State-specific animations
  switch (state) {
    case CompanionState.WALKING:
      // Leg swings
      setBoneRotation(bones['Bone_016'], Math.sin(t * 10) * 0.5, 0, 0); // L Leg
      setBoneRotation(bones['Bone_019'], -Math.sin(t * 10) * 0.5, 0, 0); // R Leg
      
      // Arm swings opposite to legs
      setBoneRotation(bones['Bone_005'], -Math.sin(t * 10) * 0.3, 0, 0.2); // L Arm
      setBoneRotation(bones['Bone_010'], Math.sin(t * 10) * 0.3, 0, -0.2); // R Arm
      
      // Body bob
      if (bones['Bone_000']) {
        bones['Bone_000'].position.y = Math.sin(t * 20) * 0.1;
      }
      break;

    case CompanionState.SLEEPING:
      // Curled up
      setBoneRotation(bones['Bone_001'], 0.5, 0, 0); // Spine bent forward
      setBoneRotation(bones['Bone_002'], 0.5, 0, 0); // Neck bent forward
      setBoneRotation(bones['Bone_005'], 0, 0, -0.5); // Arms tucked
      setBoneRotation(bones['Bone_010'], 0, 0, 0.5); 
      break;

    case CompanionState.CELEBRATING:
      // Jumping and waving
      if (bones['Bone_000']) {
        bones['Bone_000'].position.y = Math.abs(Math.sin(t * 8)) * 0.5;
      }
      setBoneRotation(bones['Bone_005'], 0, 0, Math.sin(t * 15) * 0.5 + 2); // L Arm up and wave
      setBoneRotation(bones['Bone_010'], 0, 0, -Math.sin(t * 15) * 0.5 - 2); // R Arm up and wave
      break;

    case CompanionState.IDLE:
    default:
      // Neutral pose with slight movement
      setBoneRotation(bones['Bone_016'], 0, 0, 0); 
      setBoneRotation(bones['Bone_019'], 0, 0, 0);
      setBoneRotation(bones['Bone_005'], 0, 0, 0.2);
      setBoneRotation(bones['Bone_010'], 0, 0, -0.2);
      if (bones['Bone_000']) {
        bones['Bone_000'].position.y = MathUtils.lerp(bones['Bone_000'].position.y, 0, 0.1);
      }
      break;
  }

  // 3. Head Tracking (overrides neck rotation if target exists)
  if (lookAtTarget && state !== CompanionState.SLEEPING) {
    const neck = bones['Bone_002'];
    if (neck) {
      // Simplified look-at: we just map cursor screen position roughly to head rotation
      const [tx, ty] = lookAtTarget;
      // tx, ty are rough world coordinates. We constrain max rotation.
      const targetX = MathUtils.clamp(-ty * 0.1, -0.5, 0.5); // Pitch
      const targetY = MathUtils.clamp(tx * 0.1, -1.0, 1.0);  // Yaw
      
      setBoneRotation(neck, targetX, targetY, 0, 0.1);
    }
  }
};
