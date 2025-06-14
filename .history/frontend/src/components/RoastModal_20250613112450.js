import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Flame, Loader2 } from 'lucide-react';

// Shadcn UI Components
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog'; // Assuming relative import path

export default function RoastModal({ isOpen, onClose, roastText, isLoading, error }) {
  // Use Dialog component, pass isOpen and onClose to it
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 rounded-xl shadow-2xl border-4 border-red-700 w-full max-w-lg overflow-hidden flex flex-col">
        <DialogHeader className="p-4 bg-zinc-800 border-b-2 border-pink-600 flex justify-between items-center">
          {/* DialogTitle for accessibility */}
          <DialogTitle className="text-2xl font-extrabold text-pink-400 flex items-center space-x-2">
            <Flame className="h-7 w-7 text-red-500" />
            <span>brocodeAI // Roast Protocol</span>
          </DialogTitle>
          {/* Optional DialogDescription for screen readers */}
          <DialogDescription className="sr-only">
            This dialog displays a dynamic, sarcastic roast from brocodeAI.
          </DialogDescription>
          <motion.button
            onClick={onClose}
            className="p-2 rounded-full bg-red-700 hover:bg-red-600 text-white focus:outline-none focus:ring-2 focus:ring-red-500"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            title="Close Roast"
          >
            <X className="h-6 w-6" />
          </motion.button>
        </DialogHeader>

        {/* Modal Content */}
        <div className="p-6 flex-1 flex flex-col items-center justify-center text-center">
          {isLoading ? (
            <div className="flex flex-col items-center">
              <Loader2 className="h-16 w-16 text-red-500 animate-spin" />
              <p className="mt-4 text-lg text-zinc-300">Firing up the insult generators...</p>
              <p className="text-sm text-zinc-400">Prepare for a personalized dose of reality.</p>
            </div>
          ) : error ? (
            <div className="text-red-400">
              <X className="h-16 w-16 mb-4" />
              <p className="text-xl font-bold">Roast failed!</p>
              <p className="mt-2 text-zinc-300">{error}</p>
              <p className="text-sm mt-1">Even my sarcasm has limits. Or maybe you're just not worth it.</p>
            </div>
          ) : roastText ? (
            <>
              <p className="text-3xl text-pink-300 font-bold leading-snug">{roastText}</p>
              <p className="text-sm text-zinc-400 mt-6">
                You're welcome. Now go reflect on your existence.
              </p>
            </>
          ) : (
            <div className="text-zinc-400">
              <Flame className="h-16 w-16 mb-4" />
              <p className="text-lg">No roast generated yet.</p>
              <p className="text-sm">Click the button to receive your dose of digital disdain.</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}