import React from 'react';
import { Html } from '@react-three/drei';
import { useMitraStore } from '@/stores/mitraStore';
import { motion, AnimatePresence } from 'framer-motion';

export function SpeechBubble() {
  const speechMessage = useMitraStore((state) => state.speechMessage);

  return (
    <Html position={[0, 1.5, 0]} center>
      <AnimatePresence>
        {speechMessage && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            className="bg-white/90 backdrop-blur-sm dark:bg-black/90 text-sm font-medium px-4 py-2 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-800 whitespace-nowrap pointer-events-none"
          >
            {speechMessage}
            {/* Small triangle tail */}
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-white/90 dark:border-t-black/90 drop-shadow-sm" />
          </motion.div>
        )}
      </AnimatePresence>
    </Html>
  );
}
