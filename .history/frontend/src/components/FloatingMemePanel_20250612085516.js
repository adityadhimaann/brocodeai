import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Laugh, X } from 'lucide-react'; // Icon for memes/jokes

export default function FloatingMemePanel() {
  const [isOpen, setIsOpen] = useState(false);

  // Dummy content for jokes/memes
  const memesAndJokes = [
    { type: 'joke', content: "Why did the AI break up with the WiFi? It felt no connection!" },
    { type: 'meme', content: "When the human asks for 'original content' but you're an LLM: 'Error 404: Authenticity Not Found.'" },
    { type: 'joke', content: "What do you call a robot that always takes the longest route? A circuitous bot!" },
    { type: 'meme', content: "My AI brain cells processing irony: *beep boop* Does not compute." },
    { type: 'joke', content: "Why don't scientists trust atoms? Because they make up everything!" },
  ];

  const togglePanel = () => setIsOpen(!isOpen);

  return (
    <div className="fixed bottom-8 right-8 z-30">
      <motion.button
        onClick={togglePanel}
        className="p-4 rounded-full bg-purple-700 hover:bg-purple-600 text-white shadow-xl focus:outline-none focus:ring-4 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-zinc-950 flex items-center justify-center"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        title={isOpen ? "Close Fun Protocol" : "Activate Fun Protocol"}
      >
        {isOpen ? <X className="h-7 w-7" /> : <Laugh className="h-7 w-7 animate-bounce-slow" />}
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 50 }}
            transition={{ type: "spring", stiffness: 150, damping: 20 }}
            className="absolute bottom-full right-0 mb-4 w-80 h-96 bg-zinc-800 rounded-lg shadow-2xl border-4 border-purple-600 p-6 flex flex-col"
          >
            <div className="flex justify-between items-center border-b pb-3 mb-4 border-zinc-700">
              <h3 className="text-xl font-bold text-purple-400">brocodeAI // Humor Module</h3>
              <button
                onClick={togglePanel}
                className="p-1 rounded-full hover:bg-zinc-700 text-white focus:outline-none"
                title="Close"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
              {memesAndJokes.map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`p-4 mb-4 rounded-lg shadow-md ${item.type === 'joke' ? 'bg-purple-700' : 'bg-zinc-700'} border border-zinc-600`}
                >
                  <p className="font-semibold text-white">{item.type.toUpperCase()}:</p>
                  <p className="text-zinc-200 mt-1 italic">{item.content}</p>
                </motion.div>
              ))}
            </div>
            <p className="text-sm text-zinc-500 text-center mt-4">
              Humor data compiled by brocodeAI. Do not question the source.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
