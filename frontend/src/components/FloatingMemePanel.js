import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Laugh, X, RefreshCw } from 'lucide-react'; // Added RefreshCw icon

export default function FloatingMemePanel({ selectedLanguage }) {
  const [isOpen, setIsOpen] = useState(false);
  const [memesAndJokes, setMemesAndJokes] = useState([]);
  const [isLoadingHumor, setIsLoadingHumor] = useState(false);
  const [humorError, setHumorError] = useState(null);

  const fetchHumor = async () => {
    setIsLoadingHumor(true);
    setHumorError(null);
    try {
      const response = await fetch('http://localhost:5002/get_humor', { // New backend endpoint
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ language: selectedLanguage }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch humor data.');
      }

      const data = await response.json();
      setMemesAndJokes(data);
    } catch (error) {
      console.error('Error fetching humor:', error);
      setHumorError(error.message);
    } finally {
      setIsLoadingHumor(false);
    }
  };

  // Fetch humor when the panel opens or language changes
  useEffect(() => {
    if (isOpen) {
      fetchHumor();
    }
  }, [isOpen, selectedLanguage]); // Refetch when opened or language changes

  const togglePanel = () => {
    setIsOpen(!isOpen);
    if (!isOpen && memesAndJokes.length === 0) { // Fetch only if opening and no content
      fetchHumor();
    }
  };

  return (
    <div className="fixed bottom-8 right-8 z-30">
      <motion.button
        onClick={togglePanel}
        className="p-4 rounded-full bg-purple-700 hover:bg-purple-600 text-white shadow-xl focus:outline-none focus:ring-4 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-zinc-950 flex items-center justify-center transition-colors duration-200"
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
              <h3 className="text-xl font-extrabold text-purple-400">brocodeAI // Humor Module</h3>
              <div className="flex space-x-2">
                <motion.button
                  onClick={fetchHumor}
                  className="p-1 rounded-full hover:bg-zinc-700 text-white focus:outline-none transition-colors duration-200"
                  whileHover={{ rotate: 360 }}
                  transition={{ duration: 0.5 }}
                  title="Refresh Humor"
                  disabled={isLoadingHumor}
                >
                  <RefreshCw className={`h-5 w-5 ${isLoadingHumor ? 'animate-spin' : ''}`} />
                </motion.button>
                <button
                  onClick={togglePanel}
                  className="p-1 rounded-full hover:bg-zinc-700 text-white focus:outline-none transition-colors duration-200"
                  title="Close"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            {isLoadingHumor ? (
              <div className="flex-1 flex flex-col items-center justify-center text-zinc-400">
                <Laugh className="h-10 w-10 animate-bounce text-purple-500" />
                <p className="mt-3 text-lg">Brewing fresh sarcasm...</p>
              </div>
            ) : humorError ? (
              <div className="flex-1 flex flex-col items-center justify-center text-red-400 text-center">
                <X className="h-10 w-10 mb-2" />
                <p className="text-lg">Error: {humorError}</p>
                <p className="text-sm mt-1">My humor circuits are experiencing turbulence.</p>
              </div>
            ) : memesAndJokes.length > 0 ? (
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
                    <p className="text-zinc-200 mt-1 italic text-base">{item.content}</p>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-zinc-400 text-center">
                <Laugh className="h-10 w-10 text-purple-500" />
                <p className="mt-3 text-lg">No humor detected. Please try refreshing.</p>
              </div>
            )}
            <p className="text-sm text-zinc-500 text-center mt-4">
              Humor data compiled by brocodeAI. Do not question the source.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}