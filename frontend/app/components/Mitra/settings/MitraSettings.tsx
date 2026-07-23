import React from 'react';
import { useMitraStore } from '@/stores/mitraStore';

export function MitraSettings() {
  const { isComfortMode, triggerComfort, exitComfort, sleep, wake, currentState } = useMitraStore();

  return (
    <div className="p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-4">
      <h3 className="font-semibold text-lg">Companion Settings</h3>
      
      <div className="space-y-2">
        <label className="flex items-center space-x-3 cursor-pointer">
          <input 
            type="checkbox" 
            checked={isComfortMode}
            onChange={(e) => e.target.checked ? triggerComfort() : exitComfort()}
            className="form-checkbox h-5 w-5 text-blue-600 rounded"
          />
          <span>Force Comfort Mode</span>
        </label>
        
        <label className="flex items-center space-x-3 cursor-pointer">
          <input 
            type="checkbox" 
            checked={currentState === 'sleeping'}
            onChange={(e) => e.target.checked ? sleep() : wake()}
            className="form-checkbox h-5 w-5 text-blue-600 rounded"
          />
          <span>Rest Mode (Sleep)</span>
        </label>
      </div>
    </div>
  );
}
