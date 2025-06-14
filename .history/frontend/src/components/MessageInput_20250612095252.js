import React from 'react';
import { motion } from 'framer-motion';
import { Mic, Send, Image } from 'lucide-react';

export default function MessageInput({
  input,
  setInput,
  sendMessage,
  toggleListening,
  isListening,
  isLoading,
  // sarcasmSuggestions prop removed as it's not used for display here
  onGenerateBrocodeMeme
}) {
  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 120, damping: 14, delay: 0.2 }}
      className="flex-shrink-0 bg-zinc-800 p-3 md:p-4 border-t-4 border-pink-600 flex flex-col items-center rounded-t-xl shadow-2xl w-full max-w-3xl"
    >
      {/* Sarcasm Suggestions section is removed */}

      {/* Prompt Bar */}
      <div className="flex w-full items-center space-x-2 md:space-x-3">
        <input
          type="text"
          className="flex-1 p-2 md:p-3 rounded-lg bg-zinc-700 border border-zinc-600 text-white placeholder-zinc-400 text-sm md:text-base
                     focus:outline-none focus:ring-3 focus:ring-teal-500 focus:border-transparent transition-all duration-200"
          placeholder="Query brocodeAI. Be specific, human..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              sendMessage();
            }
          }}
          disabled={isLoading || isListening}
        />
        <motion.button
          onClick={toggleListening}
          className={`p-2 md:p-3 rounded-lg ${
            isListening ? 'bg-red-700 animate-pulse-fast' : 'bg-pink-700 hover:bg-pink-600'
          } text-white shadow-lg transition-all duration-300 focus:outline-none focus:ring-3 focus:ring-pink-500 focus:ring-offset-2 focus:ring-offset-zinc-800`}
          title={isListening ? 'Deactivating input protocol...' : 'Activate voice input.'}
          disabled={isLoading}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Mic className="h-5 w-5 md:h-6 md:w-6" />
        </motion.button>
        <motion.button
          onClick={sendMessage}
          className="p-2 md:p-3 rounded-lg bg-teal-600 hover:bg-teal-500 text-white shadow-lg transition-all duration-300 focus:outline-none focus:ring-3 focus:ring-teal-500 focus:ring-offset-2 focus:ring-offset-zinc-800"
          title="Execute command."
          disabled={isLoading || input.trim() === ''}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Send className="h-5 w-5 md:h-6 md:w-6" />
        </motion.button>
      </div>
      {/* Generate Brocode Meme Button */}
      <motion.button
        onClick={onGenerateBrocodeMeme}
        className="mt-3 md:mt-4 px-4 py-2 md:px-6 md:py-3 bg-indigo-700 hover:bg-indigo-600 text-white font-bold rounded-lg shadow-lg flex items-center space-x-1 md:space-x-2 focus:outline-none focus:ring-4 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-zinc-800 transition-colors duration-200 text-sm md:text-base"
        title="Summon ultimate sarcasm."
        disabled={isLoading}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
      >
        <Image className="h-5 w-5 md:h-6 md:w-6" />
        <span>Generate brocode Meme</span>
      </motion.button>
    </motion.div>
  );
}