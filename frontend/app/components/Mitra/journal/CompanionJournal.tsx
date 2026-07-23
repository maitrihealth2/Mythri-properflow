import React from 'react';
import { useMitraStore } from '@/stores/mitraStore';

export function CompanionJournal() {
  const { friendship, level, favoritePlace, favoriteActivity, daysTogether, lastVisit } = useMitraStore();

  return (
    <div className="p-6 bg-[#FAF9F6] dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 max-w-md">
      <h2 className="text-2xl font-serif text-gray-800 dark:text-gray-100 mb-6 flex items-center gap-2">
        <span>📖</span> Companion Journal
      </h2>
      
      <div className="space-y-4">
        <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-800">
          <span className="text-gray-500 dark:text-gray-400">Friendship Level</span>
          <span className="font-medium flex items-center gap-1">
            <span className="text-yellow-500">★</span> {level} ({friendship} XP)
          </span>
        </div>
        
        <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-800">
          <span className="text-gray-500 dark:text-gray-400">Days Together</span>
          <span className="font-medium">{daysTogether} days</span>
        </div>

        <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-800">
          <span className="text-gray-500 dark:text-gray-400">Favorite Spot</span>
          <span className="font-medium capitalize">{favoritePlace?.replace(/-/g, ' ') || 'Still exploring...'}</span>
        </div>

        <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-800">
          <span className="text-gray-500 dark:text-gray-400">Favorite Activity</span>
          <span className="font-medium capitalize">{favoriteActivity || 'Not sure yet'}</span>
        </div>

        <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-800">
          <span className="text-gray-500 dark:text-gray-400">Last Seen</span>
          <span className="font-medium">
            {lastVisit ? new Date(lastVisit).toLocaleDateString() : 'Just now'}
          </span>
        </div>
      </div>
      
      {level >= 2 && (
        <div className="mt-6 p-4 bg-white dark:bg-gray-800 rounded-xl">
          <h4 className="text-sm font-semibold mb-2">Unlocks</h4>
          <ul className="text-sm space-y-1 text-gray-600 dark:text-gray-300">
            {level >= 2 && <li>✨ Wave Animation unlocked</li>}
            {level >= 5 && <li>✨ Celebration Jump unlocked</li>}
            {level >= 8 && <li>✨ Golden Sparkles unlocked</li>}
            {level >= 12 && <li>✨ Personal Greetings unlocked</li>}
            {level >= 20 && <li>✨ Upside-down Sleep unlocked</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
