import { useEffect } from 'react';
import { useCompanionEngine } from '../core/CompanionEngine';

export const useFriendshipSystem = () => {
  const { addFriendship, friendshipLevel } = useCompanionEngine();

  // Expose a method to reward the user for positive interactions
  const rewardInteraction = (points: number) => {
    addFriendship(points);
  };

  useEffect(() => {
    // Just a passive tick or event listeners could go here
    // e.g. Passive reward for time spent
    const tick = setInterval(() => {
      addFriendship(1); // 1 point per minute of active time
    }, 60000);

    return () => clearInterval(tick);
  }, [addFriendship]);

  return { rewardInteraction, friendshipLevel };
};
