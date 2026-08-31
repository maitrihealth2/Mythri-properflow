import { motion } from 'framer-motion'

export default function TypingIndicator() {
  return (
    <div className="flex flex-col gap-1 w-full max-w-[85%] self-start animate-fade-in-up mt-2">
      <div className="flex items-center gap-2 p-4 bg-white/60 dark:bg-white/10 backdrop-blur-md rounded-2xl rounded-tl-sm shadow-sm border border-white/50 dark:border-white/20 w-fit">
        <motion.div
          className="w-2 h-2 rounded-full bg-primary/60 dark:bg-white/60"
          animate={{ y: [0, -6, 0], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 0.6, repeat: Infinity, ease: "easeInOut", delay: 0 }}
        />
        <motion.div
          className="w-2 h-2 rounded-full bg-primary/60 dark:bg-white/60"
          animate={{ y: [0, -6, 0], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 0.6, repeat: Infinity, ease: "easeInOut", delay: 0.15 }}
        />
        <motion.div
          className="w-2 h-2 rounded-full bg-primary/60 dark:bg-white/60"
          animate={{ y: [0, -6, 0], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 0.6, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
        />
      </div>
      <span className="text-[10px] text-gray-400 dark:text-gray-500 ml-2">Mythri is typing...</span>
    </div>
  )
}
