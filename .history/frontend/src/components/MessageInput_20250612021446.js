import React from 'react';
import { motion } from 'framer-motion';
import { Mic, Send } from 'lucide-react'; // Lucide icons

// MessageInput component handles the input field, mic button, and send button
export default function MessageInput({
  input,
  setInput,
  sendMessage,
  toggleListening,
  isListening,
  isLoading,
}) {
  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 120, damping: 14, delay: 0.2 }}
      className="flex-shrink-0 bg-zinc-800 p-4 border-t-4 border-pink-600 flex items-center space-x-3 rounded-t-xl shadow-2xl"
    >
      <input
        type="text"
        className="flex-1 p-4 rounded-xl bg-zinc-700 border border-zinc-600 text-white placeholder-zinc-400 text-lg
                   focus:outline-none focus:ring-4 focus:ring-teal-500 focus:border-transparent transition-all duration-200"
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
        className={`p-4 rounded-xl ${
          isListening ? 'bg-red-700 animate-pulse-fast' : 'bg-pink-700 hover:bg-pink-600'
        } text-white shadow-lg transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-pink-500 focus:ring-offset-2 focus:ring-offset-zinc-800`}
        title={isListening ? 'Deactivating input protocol...' : 'Activate voice input.'}
        disabled={isLoading}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <Mic className="h-7 w-7" />
      </motion.button>
      <motion.button
        onClick={sendMessage}
        className="p-4 rounded-xl bg-teal-600 hover:bg-teal-500 text-white shadow-lg transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-teal-500 focus:ring-offset-2 focus:ring-offset-zinc-800"
        title="Execute command."
        disabled={isLoading || input.trim() === ''}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <Send className="h-7 w-7" />
      </motion.button>
    </motion.div>
  );
}
