import React from 'react';
import { motion } from 'framer-motion';
// Import sub-components for the chat layout
import ChatHeader from './ChatHeader.js';
import MessageList from './MessageList.js';
import MessageInput from './MessageInput.js';

// This component encapsulates the main chat interface
export default function MainChatLayout({
  // Props related to overall app state & functionality
  isSidebarOpen, // For layout adjustment
  languages, selectedLanguage, onSelectLanguage,
  selectedVoiceStyle, onSelectVoiceStyle,
  toggleSidebar, loggedInUser, onLogin, onLogout,
  onGenerateRoast, isAutoSpeakEnabled, onToggleAutoSpeak,
  onAssignTask, onUnlockAchievement,
  // Props related to chat messages and input
  messages, isLoading, playReceivedAudio,
  input, setInput, sendMessage, toggleListening, isListening,
  sarcasmSuggestions, onGenerateBrocodeMeme,
}) {
  return (
    // Main Content Area - this is the central column
    // It will dynamically adjust its margins based on side panels and sidebar open state
    <div className={`flex flex-col flex-1 relative z-20 
                     ml-0 mr-0 /* Default full width on mobile */
                     md:ml-[var(--panel-width-val)] md:mr-[var(--panel-width-val)] /* Desktop: fixed margins */
                     ${isSidebarOpen ? 'ml-64 md:ml-[calc(var(--panel-width-val) + var(--sidebar-width))]' : ''} /* Adjust ml if sidebar is open */
                     p-2 sm:p-4`}>
      <ChatHeader
        languages={languages}
        selectedLanguage={selectedLanguage}
        onSelectLanguage={onSelectLanguage}
        selectedVoiceStyle={selectedVoiceStyle}
        onSelectVoiceStyle={onSelectVoiceStyle}
        toggleSidebar={toggleSidebar} // This now directly controls Sheet's open prop in App.js
        loggedInUser={loggedInUser}
        onLogin={onLogin}
        onLogout={onLogout}
        onGenerateRoast={onGenerateRoast}
        isAutoSpeakEnabled={isAutoSpeakEnabled}
        onToggleAutoSpeak={onToggleAutoSpeak}
        onAssignTask={onAssignTask}
        onUnlockAchievement={onUnlockAchievement}
      />

      <div className="flex-1 flex justify-center p-2 sm:p-4 overflow-hidden">
        <div className="w-full max-w-3xl h-full bg-zinc-900 rounded-xl shadow-2xl border-2 border-zinc-700 flex flex-col overflow-hidden">
          <MessageList
            messages={messages}
            isLoading={isLoading}
            playReceivedAudio={playReceivedAudio}
          />
        </div>
      </div>

      <div className="flex justify-center p-2 pt-0 sm:p-4 sm:pt-0">
          <MessageInput
              input={input}
              setInput={setInput}
              sendMessage={sendMessage}
              toggleListening={toggleListening}
              isListening={isListening}
              isLoading={isLoading}
              sarcasmSuggestions={sarcasmSuggestions}
              onGenerateBrocodeMeme={onGenerateBrocodeMeme}
          />
      </div>
    </div>
  );
}