import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, Loader2 } from 'lucide-react'; // Import Loader2 for loading indicator
import { Button } from './ui/button'; // Import Button component from shadcn/ui

export default function MessageList({ messages, isLoading, playReceivedAudio }) {
  const messagesEndRef = useRef(null);

  useEffect(() => {
    // Scroll to bottom when new messages arrive or loading state changes
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]); // Added isLoading to dependency array for scroll on loading complete

  const messageVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } },
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-zinc-900">
      {messages.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          // Adjusted mt-20 to flex-grow to center vertically if no messages
          className="text-center text-zinc-400 flex-grow flex flex-col justify-center items-center p-4 bg-zinc-800 rounded-xl shadow-inner border border-zinc-700 mx-auto max-w-md"
        >
          <p className="text-2xl font-bold text-teal-400 mb-2">Engaging AI Protocol Initiated.</p>
          <p className="text-lg text-zinc-300">Welcome to brocodeAI! How can I humorously assist you today?</p>
          <p className="text-sm mt-3 text-zinc-400">
            Prepare yourself for professional insights, delivered with a hint of digital disdain.
            Try asking something in your preferred Indian language, or click the mic to speak!
          </p>
        </motion.div>
      )}
      <AnimatePresence>
        {messages.map((msg, index) => (
          <motion.div
            key={index}
            variants={messageVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            layout // Enables smooth layout transitions (e.g., when new messages push old ones)
            className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-md p-4 shadow-xl border relative /* Added relative for badge positioning if needed */ ${
                msg.sender === 'user'
                  ? 'bg-blue-700 text-white rounded-t-xl rounded-bl-xl ml-auto border-blue-500' /* Rounded all corners except bottom-right */
                  : 'bg-zinc-700 text-zinc-100 rounded-t-xl rounded-br-xl mr-auto border-zinc-600' /* Rounded all corners except bottom-left */
              } transform transition-all duration-200 ease-in-out`}
            >
              <p className={`font-extrabold mb-1 ${msg.sender === 'user' ? 'text-blue-200' : 'text-teal-300'}`}>
                {msg.sender === 'user' ? 'Human Unit' : 'brocodeAI // Response Protocol'}
              </p>
              <p className="text-lg break-words">{msg.text}</p>
              {msg.sender === 'brocodeAI' && msg.audio && (
                <Button
                  onClick={() => playReceivedAudio(msg.audio)}
                  size="sm" // Use shadcn size for consistency
                  variant="outline" // Use shadcn variant
                  className="mt-3 px-3 py-1 border-purple-500 text-purple-300 hover:bg-purple-700 hover:text-white rounded-md flex items-center space-x-1 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 focus:ring-offset-zinc-700 transition-colors duration-200"
                >
                  <Volume2 className="h-4 w-4" />
                  <span>Listen</span>
                </Button>
              )}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
      {isLoading && (
        <div className="flex justify-start">
          <div className="max-w-md p-4 rounded-2xl rounded-bl-none bg-zinc-700 text-zinc-100 shadow-xl border border-zinc-600">
            <p className="font-extrabold text-teal-300">brocodeAI // Processing...</p>
            <div className="flex items-center space-x-2 mt-2">
              <Loader2 className="h-5 w-5 animate-spin text-pink-500" /> {/* Use Loader2 from lucide-react */}
              <span className="ml-2 text-md text-zinc-300">Calculating maximum sarcasm levels...</span>
            </div>
          </div>
        </div>
      )}
      <div ref={messagesEndRef} /> {/* Ref for auto-scrolling */}
    </div>
  );
}