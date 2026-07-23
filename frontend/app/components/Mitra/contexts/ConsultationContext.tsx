'use client';

import { useEffect } from 'react';
import { useMitraStore } from '@/stores/mitraStore';

export function ConsultationContext({ isRecording = false }: { isRecording?: boolean }) {
  const { setAttentionTarget, clearAttention, syncVoiceVolume, setState } = useMitraStore();

  useEffect(() => {
    if (isRecording) {
      setAttentionTarget('voice');
      setState('listening');
      // In a real app, this is where you'd hook up Web Audio API 
      // analyzer node to call syncVoiceVolume(0 to 1) rapidly
    } else {
      clearAttention();
      setState('idle');
      syncVoiceVolume(0);
    }
  }, [isRecording, setAttentionTarget, clearAttention, syncVoiceVolume, setState]);

  useEffect(() => {
    // Listen for text input focus globally on this page
    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        setAttentionTarget('input', target.getBoundingClientRect(), target.id);
      }
    };

    const handleFocusOut = () => {
      clearAttention();
    };

    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('focusout', handleFocusOut);

    return () => {
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('focusout', handleFocusOut);
    };
  }, [setAttentionTarget, clearAttention]);

  return null;
}
