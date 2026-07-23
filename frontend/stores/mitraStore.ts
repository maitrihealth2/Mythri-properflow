import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type MitraState = 'idle' | 'wandering' | 'sitting' | 'sleeping' | 'listening' | 'curious' | 'reading' | 'comforting' | 'excited' | 'celebrating';
export type MitraMood = 'warm' | 'cool' | 'dim' | 'bright';
export type AttentionTarget = 'cursor' | 'message' | 'input' | 'notification' | 'voice' | 'nothing' | null;

interface MitraStore {
  // Core State
  energy: number;
  curiosity: number;
  comfort: number;
  friendship: number;
  level: number;
  currentState: MitraState;
  mood: MitraMood;
  attentionTarget: AttentionTarget;
  targetElement: DOMRect | null;
  targetElementId: string | null;
  targetWorldPos: { x: number, y: number, z: number } | null;
  
  // Memory
  favoritePlace: string | null;
  favoriteActivity: string | null;
  lastSeenMood: string | null;
  daysTogether: number;
  lastVisit: number | null;
  nameLearned: boolean;

  // Transient values
  voiceVolume: number;
  speechMessage: string | null;
  isComfortMode: boolean;

  // Setters & Actions
  setEnergy: (val: number | ((prev: number) => number)) => void;
  setCuriosity: (val: number | ((prev: number) => number)) => void;
  setComfort: (val: number | ((prev: number) => number)) => void;
  addFriendship: (points: number) => void;
  
  setState: (state: MitraState) => void;
  setMood: (mood: MitraMood) => void;
  setAttentionTarget: (target: AttentionTarget, rect?: DOMRect | null, id?: string | null) => void;
  setTargetWorldPos: (pos: { x: number, y: number, z: number } | null) => void;
  clearAttention: () => void;
  
  // High-level Actions
  speak: (message: string, durationMs?: number) => void;
  syncVoiceVolume: (volume: number) => void;
  guide: (elementId: string, message?: string) => void;
  alert: () => void;
  sleep: () => void;
  wake: () => void;
  triggerComfort: () => void;
  exitComfort: () => void;

  // Memory Actions
  updateMemory: (updates: Partial<MitraStore>) => void;
}

export const useMitraStore = create<MitraStore>()(
  persist(
    (set, get) => ({
      // Defaults
      energy: 100,
      curiosity: 50,
      comfort: 100,
      friendship: 0,
      level: 1,
      currentState: 'idle',
      mood: 'warm',
      attentionTarget: 'nothing',
      targetElement: null,
      targetElementId: null,
      targetWorldPos: null,

      favoritePlace: null,
      favoriteActivity: null,
      lastSeenMood: null,
      daysTogether: 0,
      lastVisit: null,
      nameLearned: false,

      voiceVolume: 0,
      speechMessage: null,
      isComfortMode: false,

      setEnergy: (val) => set((state) => ({ 
        energy: Math.max(0, Math.min(100, typeof val === 'function' ? val(state.energy) : val)) 
      })),
      
      setCuriosity: (val) => set((state) => ({ 
        curiosity: Math.max(0, Math.min(100, typeof val === 'function' ? val(state.curiosity) : val)) 
      })),
      
      setComfort: (val) => set((state) => ({ 
        comfort: Math.max(0, Math.min(100, typeof val === 'function' ? val(state.comfort) : val)) 
      })),
      
      addFriendship: (points) => set((state) => {
        const newFriendship = state.friendship + points;
        // Simple level curve: 100 points per level
        const newLevel = Math.max(1, Math.floor(newFriendship / 100) + 1);
        return { friendship: newFriendship, level: newLevel };
      }),

      setState: (currentState) => set({ currentState }),
      setMood: (mood) => set({ mood }),
      setAttentionTarget: (attentionTarget, rect = null, id = null) => set({ 
        attentionTarget, 
        targetElement: rect,
        targetElementId: id
      }),
      setTargetWorldPos: (pos) => set({ targetWorldPos: pos }),
      clearAttention: () => set({ attentionTarget: 'nothing', targetElement: null, targetElementId: null, targetWorldPos: null }),

      speak: (message, durationMs = 4000) => {
        set({ speechMessage: message });
        setTimeout(() => {
          if (get().speechMessage === message) {
            set({ speechMessage: null });
          }
        }, durationMs);
      },

      syncVoiceVolume: (volume) => set({ voiceVolume: volume }),

      guide: (elementId, message) => {
        const el = document.getElementById(elementId);
        if (el) {
          const rect = el.getBoundingClientRect();
          get().setAttentionTarget('notification', rect, elementId);
          get().setState('curious');
          if (message) get().speak(message);
        }
      },

      alert: () => {
        get().setState('curious');
        get().setAttentionTarget('notification');
      },

      sleep: () => {
        set({ currentState: 'sleeping', attentionTarget: 'nothing', targetElement: null });
      },

      wake: () => {
        if (get().currentState === 'sleeping') {
          set({ currentState: 'idle' });
        }
      },

      triggerComfort: () => {
        set({ 
          isComfortMode: true, 
          currentState: 'comforting', 
          mood: 'dim', 
          attentionTarget: 'nothing', 
          targetElement: null 
        });
      },

      exitComfort: () => {
        set({ isComfortMode: false, currentState: 'idle', mood: 'warm' });
      },

      updateMemory: (updates) => set((state) => ({ ...state, ...updates }))
    }),
    {
      name: 'mitra-companion-storage',
      partialize: (state) => ({
        friendship: state.friendship,
        level: state.level,
        favoritePlace: state.favoritePlace,
        favoriteActivity: state.favoriteActivity,
        lastSeenMood: state.lastSeenMood,
        daysTogether: state.daysTogether,
        lastVisit: state.lastVisit,
        nameLearned: state.nameLearned,
        // Persist some core stats
        energy: state.energy,
        curiosity: state.curiosity
      }),
    }
  )
);
