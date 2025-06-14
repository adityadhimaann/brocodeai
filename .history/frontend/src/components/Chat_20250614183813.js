import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import ChatHeader from './ChatHeader';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import MessageBox from './MessageBox';
import RoastModal from './RoastModal';
import UnsolicitedAdviceToast from './UnsolicitedAdviceToast';
import AchievementToast from './AchievementToast';

export default function Chat({
  messages, setMessages, input, setInput, selectedLanguage, setSelectedLanguage,
  selectedPersonaMode, setSelectedPersonaMode, isAutoSpeakEnabled, setIsAutoSpeakEnabled,
  isListening, setIsListening, userId, loggedInUser, setLoggedInUser, systemMessage, systemMessageType,
  setSystemMessage, sarcasmSuggestions, languages, displayMessageBox, toggleSidebar, showHumorPanels,
  playAudioFromBase64, // Added playAudioFromBase64 prop
  onGenerateBrocodeMeme, // Added onGenerateBrocodeMeme prop
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [isRoastModalOpen, setIsRoastModalOpen] = useState(false);
  const [currentRoast, setCurrentRoast] = useState(null);
  const [isLoadingRoast, setIsLoadingRoast] = useState(false);
  const [roastError, setRoastError] = useState(null);
  const [currentTask, setCurrentTask] = useState(null); // This state isn't used here, but kept if passed from App.js
  const [unlockedAchievement, setUnlockedAchievement] = useState(null); // This state isn't used here, but kept if passed from App.js

  const __app_id = window.__app_id || 'default-app-id'; // Assuming this global var is available

  // playAudioFromBase64 is passed as a prop from App.js now.
  // The local definition below is removed to avoid conflicts.

  const speakArbitraryText = useCallback(async (text, lang, personaMode) => {
    if (!text) return;
    try {
      const response = await fetch('http://localhost:5002/speak_text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, language: lang, voice_style: personaMode }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to get audio.');
      if (data.audio) await playAudioFromBase64(data.audio, 'humor panel');
      else displayMessageBox('No audio returned.', 'error');
    } catch (error) {
      displayMessageBox(`Failed to speak text: ${error.message}`, 'error');
    }
  }, [playAudioFromBase64, displayMessageBox]); // Depends on playAudioFromBase64 prop

  const sendMessage = async () => {
    if (!input.trim() || !userId) {
      displayMessageBox('User ID required.', 'error');
      return;
    }
    const userMessage = { text: input, sender: 'user', language: selectedLanguage };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:5002/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: input,
          language: selectedLanguage,
          voice_style: selectedPersonaMode,
          persona_mode: selectedPersonaMode,
          history: messages.slice(-5).map(msg => ({ text: msg.text, sender: msg.sender })),
          user_id: userId,
          app_id: __app_id,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Chat failed.');
      const botMessage = { text: data.text, sender: 'brocodeAI', audio: data.audio };
      setMessages(prev => [...prev, botMessage]);
      if (isAutoSpeakEnabled && data.audio) await playAudioFromBase64(data.audio, 'auto-speak chat');
    } catch (error) {
      displayMessageBox(`Chat error: ${error.message}`, 'error');
      setMessages(prev => [...prev, { text: `System: ${error.message}`, sender: 'brocodeAI' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const generateRoast = useCallback(async () => { // Memoize generateRoast
    setIsRoastModalOpen(true);
    setIsLoadingRoast(true);
    setCurrentRoast(null);
    setRoastError(null);
    try {
      const response = await fetch('http://localhost:5002/roast_me', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: selectedLanguage }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Roast failed.');
      setCurrentRoast(data.roast);
    } catch (error) {
      setRoastError(error.message);
      displayMessageBox(`Roast failed: ${error.message}`, 'error');
    } finally {
      setIsLoadingRoast(false);
    }
  }, [selectedLanguage, displayMessageBox]); // Add dependencies

  const assignSarcasticTask = useCallback(async () => { // Memoize assignSarcasticTask
    if (!userId) {
      displayMessageBox('User ID required to assign tasks.', 'error');
      return;
    }
    try {
      const response = await fetch('http://localhost:5002/assign_task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, language: selectedLanguage }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Task failed.');
      setCurrentTask(data); // Assuming data structure matches currentTask expectation
      displayMessageBox(`New Task: "${data.title}"`, 'info');
    } catch (error) {
      displayMessageBox(`Task error: ${error.message}`, 'error');
    }
  }, [userId, selectedLanguage, displayMessageBox]); // Add dependencies

  const unlockSarcasticAchievement = useCallback(async () => { // Memoize unlockSarcasticAchievement
    if (!userId) {
      displayMessageBox('User ID required to track achievements.', 'error');
      return;
    }
    try {
      const response = await fetch('http://localhost:5002/unlock_achievement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, language: selectedLanguage }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Achievement failed.');
      setUnlockedAchievement(data); // Assuming data structure matches unlockedAchievement expectation
      displayMessageBox(`Achievement: "${data.title}"`, 'info');
    } catch (error) {
      displayMessageBox(`Achievement error: ${error.message}`, 'error');
    }
  }, [userId, selectedLanguage, displayMessageBox]); // Add dependencies

  return (
    <div className="flex flex-col h-screen relative z-20"> {/* This div needs to stretch vertically */}
      {/* Header takes full width, its position should be sticky/fixed if needed */}
      <div className="fixed top-0 left-0 right-0 z-40"> {/* Height defined by ChatHeader's padding */}
        <ChatHeader
          languages={languages}
          selectedLanguage={selectedLanguage}
          onSelectLanguage={setSelectedLanguage}
          selectedPersonaMode={selectedPersonaMode}
          onSelectPersonalityMode={setSelectedPersonaMode}
          toggleSidebar={toggleSidebar}
          loggedInUser={loggedInUser}
          onLogin={(username, password) => {
            // This login logic is handled by Auth.js now, just pass the setter
            // displayMessageBox is passed to Auth for its internal messages
            console.log(`Login attempt: ${username}`);
            displayMessageBox('Login is handled by Auth component. Clicked conceptual login.', 'info');
          }}
          onLogout={() => {
            setLoggedInUser(null);
            displayMessageBox('Logged out.', 'info');
          }}
          onGenerateRoast={generateRoast} // Pass handler
          isAutoSpeakEnabled={isAutoSpeakEnabled}
          onToggleAutoSpeak={() => {
            setIsAutoSpeakEnabled(prev => !prev);
            displayMessageBox(`Auto-Speak ${!isAutoSpeakEnabled ? 'ON' : 'OFF'}`, 'info');
          }}
          onAssignTask={assignSarcasticTask} // Pass handler
          onUnlockAchievement={unlockSarcasticAchievement} // Pass handler
        />
      </div>

      {/* Main chat content area - needs to be scrollable */}
      <div className="flex flex-col flex-1 mt-[var(--header-height)] mb-[var(--input-area-height)]"> {/* Adjusted margins */}
        <div className="flex-1 flex justify-center p-2 sm:p-4 overflow-hidden">
          <motion.div
            className="w-full h-full bg-gradient-to-b from-zinc-900 to-zinc-800 rounded-xl shadow-lg shadow-pink-700/20 border-2 border-pink-700/50 flex flex-col overflow-hidden"
            whileHover={{ scale: 1.01, boxShadow: '0 0 20px rgba(236, 72, 153, 0.3)' }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4"> {/* FIX: Added p-4 for padding inside scroll area */}
              <MessageList
                messages={messages}
                isLoading={isLoading} // isLoading needs to be passed down
                playReceivedAudio={playAudioFromBase64} // Pass playAudioFromBase64
              />
            </div>
          </motion.div>
        </div>
      </div>

      {/* Input section fixed at the bottom */}
      <div className="fixed bottom-0 left-0 right-0 z-30"> {/* Fixed at bottom */}
        <div className="flex justify-center p-2 sm:p-4">
          <MessageInput
            input={input}
            setInput={setInput}
            sendMessage={sendMessage}
            toggleListening={() => {
              if (isListening) setIsListening(false);
              else {
                setInput('');
                setIsListening(true);
              }
            }}
            isListening={isListening}
            isLoading={isLoading} // Pass isLoading to MessageInput
            sarcasmSuggestions={sarcasmSuggestions}
            onGenerateBrocodeMeme={() => displayMessageBox("Meme generation triggered.", "info")} // Placeholder for now
          />
        </div>
      </div>

      {/* Modals and Toasts */}
      <RoastModal
        isOpen={isRoastModalOpen}
        onClose={() => setIsRoastModalOpen(false)}
        roastText={currentRoast}
        isLoading={isLoadingRoast}
        error={roastError}
      />
      <UnsolicitedAdviceToast
        message={unsolicitedAdvice}
        onClose={() => displayMessageBox('Advice dismissed.', 'info')} // Need a setter for unsolicitedAdvice
      />
      <AchievementToast
        achievement={unlockedAchievement}
        onClose={() => displayMessageBox('Achievement dismissed.', 'info')} // Need a setter for unlockedAchievement
      />
      {systemMessage && ( // MessageBox is top-level, handles App's system messages
        <MessageBox message={systemMessage} type={systemMessageType} onClose={() => setSystemMessage(null)} />
      )}
    </div>
  );
}