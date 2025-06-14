import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, MessageSquareMore } from 'lucide-react'; // Added MessageSquareMore for branding

// ChatHeader component displays the chatbot title and language selection
export default function ChatHeader({ languages, selectedLanguage, onSelectLanguage }) {
  const [showLanguageSelection, setShowLanguageSelection] = useState(false);

  return (
    <motion.header
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 120, damping: 14, duration: 0.5 }}
      className="flex-shrink-0 bg-zinc-800 p-4 shadow-2xl flex justify-between items-center rounded-b-xl border-b-4 border-teal-600"
    >
      <div className="flex items-center space-x-3">
        <MessageSquareMore className="h-8 w-8 text-pink-500 animate-pulse-slow" /> {/* Iconic logo */}
        <h1 className="text-3xl font-extrabold text-teal-400 drop-shadow-lg tracking-wide">
          brocodeAI
        </h1>
      </div>
      <div className="relative">
        <button
          onClick={() => setShowLanguageSelection(!showLanguageSelection)}
          className="px-5 py-2 bg-pink-700 hover:bg-pink-600 text-white font-bold rounded-lg shadow-xl transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-pink-500 focus:ring-offset-2 focus:ring-offset-zinc-800 flex items-center"
          aria-expanded={showLanguageSelection}
          aria-haspopup="true"
        >
          <span className="truncate max-w-[100px]">{languages.find(lang => lang.code === selectedLanguage)?.name || 'Select Language'}</span>
          <ChevronDown className={`h-5 w-5 ml-2 transition-transform duration-200 ${showLanguageSelection ? 'rotate-180' : 'rotate-0'}`} />
        </button>
        <AnimatePresence>
          {showLanguageSelection && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="absolute right-0 mt-3 w-48 bg-zinc-700 rounded-lg shadow-2xl z-10 border border-zinc-600 overflow-hidden"
            >
              {languages.map((lang) => (
                <motion.button
                  key={lang.code}
                  onClick={() => {
                    onSelectLanguage(lang.code);
                    setShowLanguageSelection(false);
                  }}
                  whileHover={{ backgroundColor: '#2dd4bf', color: '#18181b' }} // Teal-400 on hover, text-zinc-950
                  whileTap={{ scale: 0.95 }}
                  className={`block w-full text-left px-5 py-2 text-sm font-medium transition-colors duration-200
                              ${selectedLanguage === lang.code ? 'bg-teal-600 text-white' : 'text-zinc-200 hover:text-white'}`}
                >
                  {lang.name}
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.header>
  );
}
