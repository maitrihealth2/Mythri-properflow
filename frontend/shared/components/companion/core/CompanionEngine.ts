import { create } from 'zustand';
import { CompanionState } from './StateMachine';

export interface UIElement {
  id: string;
  rect: DOMRect;
  type: 'chat' | 'input' | 'button' | 'vine';
}

interface CompanionStore {
  // State Machine
  currentState: CompanionState;
  setState: (state: CompanionState) => void;

  // Transforms
  currentPosition: [number, number, number];
  targetPosition: [number, number, number];
  setPosition: (pos: [number, number, number]) => void;
  setTarget: (target: [number, number, number]) => void;
  lookAtTarget: [number, number, number] | null;
  setLookAtTarget: (target: [number, number, number] | null) => void;

  // Emotion Variables (0-100)
  energy: number;
  curiosity: number;
  comfort: number;
  happiness: number;
  trust: number;
  attention: number;
  updateEmotion: (emotion: 'energy' | 'curiosity' | 'comfort' | 'happiness' | 'trust' | 'attention', value: number) => void;

  // Friendship
  friendshipLevel: number;
  friendshipPoints: number;
  addFriendship: (points: number) => void;

  // Awareness
  isVoiceActive: boolean;
  setVoiceActive: (active: boolean) => void;
  isUserTyping: boolean;
  setUserTyping: (typing: boolean) => void;
  uiElements: Record<string, UIElement>;
  updateUIElement: (id: string, element: UIElement) => void;
  removeUIElement: (id: string) => void;
}

export const useCompanionEngine = create<CompanionStore>((set) => ({
  currentState: CompanionState.IDLE,
  setState: (state) => set({ currentState: state }),

  currentPosition: [0, -3.5, -5],
  targetPosition: [0, -3.5, -5],
  setPosition: (pos) => set({ currentPosition: pos }),
  setTarget: (target) => set({ targetPosition: target }),
  lookAtTarget: null,
  setLookAtTarget: (target) => set({ lookAtTarget: target }),

  energy: 100,
  curiosity: 50,
  comfort: 80,
  happiness: 80,
  trust: 50,
  attention: 50,
  updateEmotion: (emotion, value) => set((state) => ({ [emotion]: Math.max(0, Math.min(100, state[emotion] as number + value)) })),

  friendshipLevel: 1,
  friendshipPoints: 0,
  addFriendship: (points) => set((state) => {
    const newPoints = state.friendshipPoints + points;
    const newLevel = Math.floor(newPoints / 100) + 1;
    return { friendshipPoints: newPoints, friendshipLevel: newLevel };
  }),

  isVoiceActive: false,
  setVoiceActive: (active) => set({ isVoiceActive: active }),
  isUserTyping: false,
  setUserTyping: (typing) => set({ isUserTyping: typing }),
  uiElements: {},
  updateUIElement: (id, element) => set((state) => ({ uiElements: { ...state.uiElements, [id]: element } })),
  removeUIElement: (id) => set((state) => {
    const newElements = { ...state.uiElements };
    delete newElements[id];
    return { uiElements: newElements };
  }),
}));
