import { useEffect } from 'react';
import { create } from 'zustand';

export interface TerrainNode {
  id: string;
  type: 'message-card-top' | 'sidebar-edge' | 'header-corner' | 'input-bar-side' | 'dashboard-panel-edge' | 'journal-margin' | 'bottom-safe-zone';
  rect: DOMRect;
}

interface DOMTerrainStore {
  nodes: TerrainNode[];
  updateNodes: (nodes: TerrainNode[]) => void;
}

export const useDOMTerrainStore = create<DOMTerrainStore>((set) => ({
  nodes: [],
  updateNodes: (nodes) => set({ nodes })
}));

export function useDOMTerrain() {
  useEffect(() => {
    let animationFrameId: number;
    let lastUpdate = 0;

    const scanDOM = () => {
      const now = performance.now();
      if (now - lastUpdate < 200) {
        return; // Throttle to roughly 5 times a second
      }
      lastUpdate = now;

      const newNodes: TerrainNode[] = [];
      
      // Query selectors for safe zones based on Phase 3 rules
      // (Assuming class names exist in the actual UI, we use fallbacks here)
      
      // Header corner
      const header = document.querySelector('header');
      if (header) {
        newNodes.push({
          id: 'header-1',
          type: 'header-corner',
          rect: header.getBoundingClientRect()
        });
      }

      // Input bars
      const inputs = document.querySelectorAll('input[type="text"], textarea');
      inputs.forEach((input, i) => {
        newNodes.push({
          id: `input-${i}`,
          type: 'input-bar-side',
          rect: input.getBoundingClientRect()
        });
      });

      // Chat bubbles
      const bubbles = document.querySelectorAll('.chat-bubble, [data-chat-bubble]');
      bubbles.forEach((bubble, i) => {
        newNodes.push({
          id: `bubble-${i}`,
          type: 'message-card-top',
          rect: bubble.getBoundingClientRect()
        });
      });

      // Update store
      useDOMTerrainStore.getState().updateNodes(newNodes);
    };

    const observer = new MutationObserver(() => {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = requestAnimationFrame(scanDOM);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style', 'data-chat-bubble']
    });

    window.addEventListener('resize', scanDOM);
    window.addEventListener('scroll', scanDOM);

    // Initial scan
    scanDOM();

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', scanDOM);
      window.removeEventListener('scroll', scanDOM);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);
}
