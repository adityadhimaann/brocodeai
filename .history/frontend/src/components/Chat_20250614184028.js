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
  playAudioFromBase64, // playAudioFromBase64 passed from App.js
  onGenerateBrocodeMeme, // onGenerateBrocodeMeme passed from App.js
  // Add other novelty feature handlers that originate from App.js here if needed
  onGenerateRoast: appGenerateRoast, // Renaming to avoid conflict with local generateRoast
  onAssignTask: appAssignTask,
  onUnlockAchievement: appUnlockAchievement,
}) {
  const [isLoading, setIsLoading] = useState(false);

  // --- FIX: Declare states for Modals and Toasts within Chat.js ---
  const [isRoastModalOpen, setIsRoastModalOpen] = useState(false);
  const [currentRoast, setCurrentRoast] = useState(null);
  const [isLoadingRoast, setIsLoadingRoast] = useState(false);
  const [roastError, setRoastError] = useState(null);

  const [currentTask, setCurrentTask] = useState(null); // Declare currentTask state
  const [unlockedAchievement, setUnlockedAchievement] = useState(null); // Declare unlockedAchievement state
  const [unsolicitedAdvice, setUnsolicitedAdvice] = useState(null); // Declare unsolicitedAdvice state
  // --- END FIX ---


  const __app_id = window.__app_id || 'default-app-id';

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

  // --- Novelty Feature Handlers (local to Chat.js, will call App.js's passed handlers) ---
  const generateRoast = useCallback(async () => {
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
  }, [selectedLanguage, displayMessageBox]);

  const assignSarcasticTask = useCallback(async () => {
    if (!userId) {
      displayMessageBox('User ID required.', 'error');
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
      setCurrentTask(data); // Set local state
      displayMessageBox(`New Task: "${data.title}"`, 'info');
    } catch (error) {
      displayMessageBox(`Task error: ${error.message}`, 'error');
    }
  }, [userId, selectedLanguage, displayMessageBox]);

  const unlockSarcasticAchievement = useCallback(async () => {
    if (!userId) {
      displayMessageBox('User ID required.', 'error');
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
      setUnlockedAchievement(data); // Set local state
      displayMessageBox(`Achievement: "${data.title}"`, 'info');
    } catch (error) {
      displayMessageBox(`Achievement error: ${error.message}`, 'error');
    }
  }, [userId, selectedLanguage, displayMessageBox]);

  return (
    <div className="flex flex-col h-screen relative z-20">
      {/* System message display (local to Chat, or top-level in App) */}
      {systemMessage && (
        <MessageBox message={systemMessage} type={systemMessageType} onClose={() => setSystemMessage(null)} />
      )}
      {unsolicitedAdvice && ( // Display unsolicited advice toast
        <UnsolicitedAdviceToast message={unsolicitedAdvice} onClose={() => displayMessageBox('Advice dismissed.', 'info')} />
      )}
      {unlockedAchievement && ( // Display achievement toast
        <AchievementToast achievement={unlockedAchievement} onClose={() => displayMessageBox('Achievement dismissed.', 'info')} />
      )}

      <div className="fixed top-0 left-0 right-0 z-40">
        <ChatHeader
          languages={languages}
          selectedLanguage={selectedLanguage}
          onSelectLanguage={setSelectedLanguage}
          selectedPersonaMode={selectedPersonaMode}
          onSelectPersonalityMode={setSelectedPersonaMode}
          toggleSidebar={toggleSidebar}
          loggedInUser={loggedInUser}
          onLogin={() => displayMessageBox('Login handled by Auth component.', 'info')} // Conceptual login in ChatHeader
          onLogout={() => { setLoggedInUser(null); displayMessageBox('Logged out.', 'info'); }}
          onGenerateRoast={generateRoast} // Local handler
          isAutoSpeakEnabled={isAutoSpeakEnabled}
          onToggleAutoSpeak={() => {
            setIsAutoSpeakEnabled(prev => !prev);
            displayMessageBox(`Auto-Speak ${!isAutoSpeakEnabled ? 'ON' : 'OFF'}`, 'info');
          }}
          onAssignTask={assignSarcasticTask} // Local handler
          onUnlockAchievement={unlockSarcasticAchievement} // Local handler
        />
      </div>

      <div className="flex flex-col flex-1 pt-[var(--header-height)] pb-[var(--input-area-height)]"> {/* Adjusted padding */}
        {/* Main chat messages container - THIS NEEDS TO BE SCROLLABLE */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4"> {/* FIX: Added overflow-y-auto and custom-scrollbar */}
          <MessageList
            messages={messages}
            isLoading={isLoading} // Pass isLoading
            playReceivedAudio={playAudioFromBase64} // Pass playAudioFromBase64
          />
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-30">
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
            isLoading={isLoading} // Pass isLoading
            sarcasmSuggestions={sarcasmSuggestions}
            onGenerateBrocodeMeme={onGenerateBrocodeMeme} // Pass handler
          />
        </div>
      </div>

      {/* Modals */}
      <RoastModal
        isOpen={isRoastModalOpen}
        onClose={() => setIsRoastModalOpen(false)}
        roastText={currentRoast}
        isLoading={isLoadingRoast}
        error={roastError}
      />
    </div>
  );
}