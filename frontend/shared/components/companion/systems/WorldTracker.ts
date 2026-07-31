import { useEffect } from 'react';
import { useCompanionEngine } from '../core/CompanionEngine';

export const useWorldTracker = () => {
  const { updateUIElement, removeUIElement } = useCompanionEngine();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Track input fields, chat bubbles, buttons
    const trackElements = () => {
      const interactables = document.querySelectorAll('input, textarea, button, [role="log"] > div');
      interactables.forEach((el) => {
        const id = el.id || el.getAttribute('name') || Math.random().toString(36).substring(7);
        if (!el.id) el.id = id;
        
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          updateUIElement(id, {
            id,
            rect,
            type: el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' ? 'input' : 
                  el.tagName === 'BUTTON' ? 'button' : 'chat'
          });
        }
      });
    };

    trackElements();

    const observer = new MutationObserver((mutations) => {
      trackElements();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style']
    });

    const resizeObserver = new ResizeObserver(() => {
      trackElements();
    });
    resizeObserver.observe(document.body);

    return () => {
      observer.disconnect();
      resizeObserver.disconnect();
    };
  }, [updateUIElement, removeUIElement]);
};
