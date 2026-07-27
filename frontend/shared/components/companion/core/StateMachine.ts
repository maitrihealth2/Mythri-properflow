export enum CompanionState {
  IDLE = 'IDLE',
  WALKING = 'WALKING',
  SITTING = 'SITTING',
  SLEEPING = 'SLEEPING',
  CURIOUS = 'CURIOUS',
  LISTENING = 'LISTENING',
  PLAYFUL = 'PLAYFUL',
  CLIMBING = 'CLIMBING',
  CELEBRATING = 'CELEBRATING',
}

export interface TransitionCondition {
  targetState: CompanionState;
  condition: () => boolean;
}
