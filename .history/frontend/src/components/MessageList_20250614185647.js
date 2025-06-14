import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2 } from 'lucide-react';

export default function MessageList({ messages, isLoading, playReceivedAudio }) {
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const messageVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } },
  };

  return (
    <div className="flex-1">
      <div ref={messagesEndRef} className="h-full max-h-[70vh] overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="text-center text-zinc-400 mt-20 p-4 bg-zinc-800 rounded-xl shadow-inner border border-zinc-700"
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
              layout
              className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-md p-4 rounded-2xl shadow-xl border ${
                  msg.sender === 'user'
                    ? 'bg-blue-700 text-white rounded-br-none border-blue-500'
                    : 'bg-zinc-700 text-zinc-100 rounded-bl-none border-zinc-600'
                } transform transition-all duration-200 ease-in-out`}
              >
                <p className={`font-extrabold mb-1 ${msg.sender === 'user' ? 'text-blue-200' : 'text-teal-300'}`}>
                  {msg.sender === 'user' ? 'Human Unit' : 'brocodeAI // Response Protocol'}
                </p>
                <p className="text-lg break-words">{msg.text}</p>
                {msg.sender === 'brocodeAI' && msg.audio && (
                  <motion.button
                    onClick={() => playReceivedAudio(msg.audio)}
                    className="mt-3 px-3 py-1 bg-zinc-600 hover:bg-teal-600 text-teal-300 hover:text-white text-sm font-semibold rounded-md flex items-center space-x-1 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:ring-offset-2 focus:ring-offset-zinc-700 transition-colors duration-200"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Volume2 className="h-4 w-4" />
                    <span>Listen</span>
                  </motion.button>
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
                <div className="h-3 w-3 bg-pink-500 rounded-full animate-ping-strong delay-100"></div>
                <div className="h-3 w-3 bg-pink-500 rounded-full animate-ping-strong delay-200"></div>
                <div className="h-3 w-3 bg-pink-500 rounded-full animate-ping-strong delay-300"></div>
                <span className="ml-2 text-md text-zinc-300">Calculating maximum sarcasm levels...</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}