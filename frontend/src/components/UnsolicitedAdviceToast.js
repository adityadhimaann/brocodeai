import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Info, X } from 'lucide-react';

export default function UnsolicitedAdviceToast({ message, onClose }) {
  // Auto-dismiss after 8 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 8000);
    return () => clearTimeout(timer);
  }, [message, onClose]); // Re-start timer if message changes

  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ opacity: 0, y: 50, x: '-50%' }}
          animate={{ opacity: 1, y: 0, x: '-50%' }}
          exit={{ opacity: 0, y: 50, x: '-50%' }}
          transition={{ duration: 0.3 }}
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 bg-zinc-800 border-l-4 border-teal-500 text-zinc-100 p-4 rounded-lg shadow-xl max-w-sm flex items-start space-x-3"
        >
          <Info className="h-6 w-6 text-teal-400 flex-shrink-0 mt-1" />
          <div className="flex-1">
            <p className="text-sm font-semibold mb-1">brocodeAI // Unsolicited Wisdom</p>
            <p className="text-base">{message}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors duration-150 focus:outline-none"
            title="Dismiss"
          >
            <X className="h-5 w-5" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}