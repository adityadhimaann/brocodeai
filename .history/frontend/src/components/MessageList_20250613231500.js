
import React from 'react';
import { Loader2 } from 'lucide-react';

const MessageList = ({ messages, isLoading, playReceivedAudio }) => {
  return (
    <div className="flex flex-col gap-4 p-4 h-full">
      {messages.map((message, index) => (
        <div
          key={index}
          className={`p-3 rounded-lg max-w-[80%] ${
            message.sender === 'user'
              ? 'self-end bg-pink-700 text-white'
              : 'self-start bg-zinc-700 text-zinc-100'
          }`}
        >
          <p>{message.text}</p>
          {message.audio && message.sender === 'brocodeAI' && (
            <button
              onClick={() => playReceivedAudio(message.audio)}
              className="mt-2 text-sm text-pink-300 hover:text-pink-400"
            >
              Play Audio
            </button>
          )}
        </div>
      ))}
      {isLoading && (
        <div className="self-center">
          <Loader2 className="h-6 w-6 animate-spin text-pink-500" />
        </div>
      )}
    </div>
  );
};

export default MessageList;