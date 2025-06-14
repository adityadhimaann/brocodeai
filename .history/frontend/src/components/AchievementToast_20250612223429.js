import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Medal, X } from 'lucide-react'; // Medal icon for achievements

export default function AchievementToast({ achievement, onClose }) {
  useEffect(() => {
    // Auto-dismiss after 7 seconds
    const timer = setTimeout(() => {
      onClose();
    }, 7000);
    return () => clearTimeout(timer);
  }, [achievement, onClose]); // Re-start timer if achievement changes

  if (!achievement) return null;

  return (
    <AnimatePresence>
      {achievement && (
        <motion.div
          initial={{ opacity: 0, y: 50, x: '-50%' }}
          animate={{ opacity: 1, y: 0, x: '-50%' }}
          exit={{ opacity: 0, y: 50, x: '-50%' }}
          transition={{ duration: 0.4 }}
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 bg-gradient-to-r from-yellow-700 to-yellow-900 border-l-4 border-yellow-400 text-white p-4 rounded-lg shadow-xl max-w-sm flex items-start space-x-3 animate-slide-in-bottom"
        >
          <Medal className="h-8 w-8 text-yellow-300 flex-shrink-0 mt-1" />
          <div className="flex-1">
            <p className="text-lg font-bold mb-1">Achievement Unlocked!</p>
            <p className="text-base font-semibold italic">"{achievement.title}"</p>
            <p className="text-sm text-yellow-200 mt-1">{achievement.description}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-yellow-200 hover:text-white hover:bg-yellow-800 transition-colors duration-150 focus:outline-none"
            title="Dismiss"
          >
            <X className="h-5 w-5" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}