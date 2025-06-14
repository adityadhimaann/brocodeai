import React from 'react';

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
    <div className="flex-shrink-0 bg-gray-800 p-4 border-t border-gray-700 flex items-center space-x-3 rounded-t-lg">
      <input
        type="text"
        className="flex-1 p-3 rounded-full bg-gray-700 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
        placeholder="Ask brocodeAI anything..."
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyPress={(e) => {
          if (e.key === 'Enter') {
            sendMessage();
          }
        }}
        disabled={isLoading || isListening}
      />
      <button
        onClick={toggleListening}
        className={`p-3 rounded-full ${
          isListening ? 'bg-red-600 animate-pulse-fast' : 'bg-pink-600 hover:bg-pink-700'
        } text-white shadow-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 focus:ring-offset-gray-800`}
        title={isListening ? 'Stop Listening' : 'Start Voice Input'}
        disabled={isLoading}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a4 4 0 11-8 0 4 4 0 018 0z"
          />
        </svg>
      </button>
      <button
        onClick={sendMessage}
        className="p-3 rounded-full bg-teal-600 hover:bg-teal-700 text-white shadow-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 focus:ring-offset-gray-800"
        title="Send Message"
        disabled={isLoading || input.trim() === ''}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M14 5l7 7m0 0l-7 7m7-7H3"
          />
        </svg>
      </button>
    </div>
  );
}