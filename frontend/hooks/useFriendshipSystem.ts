import { useEffect } from 'react';
import { useMitraStore } from '@/stores/mitraStore';

export function useFriendshipSystem() {
  const { addFriendship, level } = useMitraStore();

  useEffect(() => {
    // Passive: +1 point per minute active app use
    const interval = setInterval(() => {
      addFriendship(1);
    }, 60000);

    return () => clearInterval(interval);
  }, [addFriendship]);

  // Optional: monitor level up events here and trigger celebrations
  useEffect(() => {
    if (level > 1) {
      // Just dinged a level (or loaded with level > 1)
      // Logic for celebration if it just happened can be placed here, 
      // but usually better handled in the addFriendship action or a separate unlock effect.
    }
  }, [level]);
}
