import React from 'react';
import { motion } from 'framer-motion';
import { Mic, Send, Lightbulb, Image } from 'lucide-react'; // Added Image icon

export default function MessageInput({
  input,
  setInput,
  sendMessage,
  toggleListening,
  isListening,
  isLoading,
  sarcasmSuggestions,
  onGenerateBrocodeMeme // New prop for meme generation
}) {
  const handleSuggestionClick = (suggestion) => {
    setInput(suggestion);
  };

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 120, damping: 14, delay: 0.2 }}
      className="flex-shrink-0 bg-zinc-800 p-4 border-t-4 border-pink-600 flex flex-col items-center rounded-t-xl shadow-2xl w-full max-w-3xl"
    >
      {/* Sarcasm Suggestions */}
      {sarcasmSuggestions && sarcasmSuggestions.length > 0 && (
        <div className="w-full mb-4 text-center">
          <h4 className="text-zinc-400 text-sm font-semibold mb-2 flex items-center justify-center space-x-2">
            <Lightbulb className="h-4 w-4 text-teal-400" />
            <span>Suggestions from my advanced irony algorithms:</span>
          </h4>
          <div className="flex flex-wrap justify-center gap-2">
            {sarcasmSuggestions.map((suggestion, index) => (
              <motion.button
                key={index}
                onClick={() => handleSuggestionClick(suggestion)}
                className="px-3 py-1 bg-zinc-700 hover:bg-teal-600 text-zinc-300 hover:text-white text-sm font-medium rounded-full border border-zinc-600
                           transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-teal-400"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {suggestion}
              </motion.button>
            ))}
          </div>
        </div>
      )}

      {/* Prompt Bar */}
      <div className="flex w-full items-center space-x-3">
        <input
          type="text"
          className="flex-1 p-3 rounded-lg bg-zinc-700 border border-zinc-600 text-white placeholder-zinc-400 text-base
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
          className={`p-3 rounded-lg ${
            isListening ? 'bg-red-700 animate-pulse-fast' : 'bg-pink-700 hover:bg-pink-600'
          } text-white shadow-lg transition-all duration-300 focus:outline-none focus:ring-3 focus:ring-pink-500 focus:ring-offset-2 focus:ring-offset-zinc-800`}
          title={isListening ? 'Deactivating input protocol...' : 'Activate voice input.'}
          disabled={isLoading}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Mic className="h-6 w-6" />
        </motion.button>
        <motion.button
          onClick={sendMessage}
          className="p-3 rounded-lg bg-teal-600 hover:bg-teal-500 text-white shadow-lg transition-all duration-300 focus:outline-none focus:ring-3 focus:ring-teal-500 focus:ring-offset-2 focus:ring-offset-zinc-800"
          title="Execute command."
          disabled={isLoading || input.trim() === ''}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Send className="h-6 w-6" />
        </motion.button>
      </div>
      {/* New: Generate Brocode Meme Button */}
      <motion.button
        onClick={onGenerateBrocodeMeme}
        className="mt-4 px-6 py-3 bg-indigo-700 hover:bg-indigo-600 text-white font-bold rounded-lg shadow-lg flex items-center space-x-2 focus:outline-none focus:ring-4 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-zinc-800 transition-colors duration-200"
        title="Summon ultimate sarcasm."
        disabled={isLoading}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
      >
        <Image className="h-6 w-6" />
        <span>Generate brocode Meme</span>
      </motion.button>
    </motion.div>
  );
}