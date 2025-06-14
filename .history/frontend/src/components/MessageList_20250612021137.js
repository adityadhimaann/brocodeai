import React, { useRef, useEffect } from 'react';

// MessageList component displays the chat messages and handles scrolling
export default function MessageList({ messages, isLoading, playReceivedAudio }) {
  const messagesEndRef = useRef(null); // Ref for scrolling to the latest message

  // Effect to scroll to the bottom of the chat on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
      {messages.length === 0 && (
        <div className="text-center text-gray-400 mt-20">
          <p className="text-lg">Welcome to brocodeAI! How can I humorously assist you today?</p>
          <p className="text-sm mt-2">Try asking something in your preferred Indian language, or click the mic to speak!</p>
        </div>
      )}
      {messages.map((msg, index) => (
        <div
          key={index}
          className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
        >
          <div
            className={`max-w-md p-3 rounded-xl shadow-md ${
              msg.sender === 'user'
                ? 'bg-blue-600 text-white rounded-br-none'
                : 'bg-gray-700 text-gray-100 rounded-bl-none'
            }`}
          >
            <p className="font-semibold">{msg.sender === 'user' ? 'You' : 'brocodeAI'}</p>
            <p className="mt-1">{msg.text}</p>
            {msg.sender === 'brocodeAI' && msg.audio && (
              <button
                onClick={() => playReceivedAudio(msg.audio)}
                className="mt-2 text-sm text-teal-300 hover:text-teal-200 focus:outline-none"
                title="Listen to response"
              >
                🔊 Listen
              </button>
            )}
          </div>
        </div>
      ))}
      {isLoading && (
        <div className="flex justify-start">
          <div className="max-w-md p-3 rounded-xl rounded-bl-none bg-gray-700 text-gray-100 shadow-md">
            <p className="font-semibold">brocodeAI</p>
            <div className="flex items-center space-x-2">
              <div className="h-2 w-2 bg-teal-400 rounded-full animate-bounce delay-100"></div>
              <div className="h-2 w-2 bg-teal-400 rounded-full animate-bounce delay-200"></div>
              <div className="h-2 w-2 bg-teal-400 rounded-full animate-bounce delay-300"></div>
              <span className="ml-2 text-sm">Thinking... probably about your questionable life choices.</span>
            </div>
          </div>
        </div>
      )}
      <div ref={messagesEndRef} /> {/* Scroll target */}
    </div>
  );
}