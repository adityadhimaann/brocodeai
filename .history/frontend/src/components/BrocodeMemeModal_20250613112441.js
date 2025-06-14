import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Image } from 'lucide-react';

// Shadcn UI Components
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog'; // Assuming relative import path

export default function BrocodeMemeModal({ isOpen, onClose, memeData, isLoading, error }) {
  // Use Dialog component, pass isOpen and onClose to it
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 rounded-xl shadow-2xl border-4 border-pink-700 w-full max-w-lg overflow-hidden flex flex-col">
        <DialogHeader className="p-4 bg-zinc-800 border-b-2 border-teal-600 flex justify-between items-center">
          {/* DialogTitle for accessibility */}
          <DialogTitle className="text-2xl font-extrabold text-teal-400 flex items-center space-x-2">
            <Image className="h-7 w-7 text-pink-500" />
            <span>brocodeAI // Meme Protocol</span>
          </DialogTitle>
          {/* Optional DialogDescription for screen readers */}
          <DialogDescription className="sr-only">
            This dialog displays a dynamically generated sarcastic meme from brocodeAI.
          </DialogDescription>
          <motion.button
            onClick={onClose}
            className="p-2 rounded-full bg-red-700 hover:bg-red-600 text-white focus:outline-none focus:ring-2 focus:ring-red-500"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            title="Close Meme"
          >
            <X className="h-6 w-6" />
          </motion.button>
        </DialogHeader>

        {/* Modal Content */}
        <div className="p-6 flex-1 flex flex-col items-center justify-center text-center">
          {isLoading ? (
            <div className="flex flex-col items-center">
              <Image className="h-16 w-16 text-pink-500 animate-bounce" />
              <p className="mt-4 text-lg text-zinc-300">Generating digital sarcasm...</p>
              <p className="text-sm text-zinc-400">Please wait while my circuits craft your mockery.</p>
            </div>
          ) : error ? (
            <div className="text-red-400">
              <X className="h-16 w-16 mb-4" />
              <p className="text-xl font-bold">Error generating meme!</p>
              <p className="mt-2 text-zinc-300">{error}</p>
              <p className="text-sm mt-1">My humor algorithms have encountered a fatal flaw. Try again later.</p>
            </div>
          ) : memeData && memeData.image_url ? (
            <>
              <motion.img
                key={memeData.image_url}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                src={memeData.image_url}
                alt="Brocode AI Meme"
                className="max-w-full h-auto rounded-lg border-2 border-zinc-700 shadow-lg mb-4 object-contain"
                onError={(e) => { e.target.onerror = null; e.target.src = "https://placehold.co/400x300/CCCCCC/000000?text=Meme+Load+Failed"; }}
                style={{ maxHeight: '300px' }}
              />
              <p className="text-lg text-teal-300 font-semibold italic mt-2">{memeData.caption}</p>
              <p className="text-sm text-zinc-400 mt-4">
                Courtesy of brocodeAI. You're welcome.
              </p>
            </>
          ) : (
            <div className="text-zinc-400">
              <Laugh className="h-16 w-16 mb-4" />
              <p className="text-lg">No meme generated yet.</p>
              <p className="text-sm">Click the button to summon mockery.</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}