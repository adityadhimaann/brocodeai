
import { useState, useCallback } from 'react';
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
  setSystemMessage, sarcasmSuggestions, languages, displayMessageBox, toggleSidebar
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [isRoastModalOpen, setIsRoastModalOpen] = useState(false);
  const [currentRoast, setCurrentRoast] = useState(null);
  const [isLoadingRoast, setIsLoadingRoast] = useState(false);
  const [roastError, setRoastError] = useState(null);
  const [currentTask, setCurrentTask] = useState(null);
  const [unlockedAchievement, setUnlockedAchievement] = useState(null);

  const __app_id = window.__app_id || 'default-app-id';

  const playAudioFromBase64 = useCallback(async (base64Audio, source = 'chat') => {
    if (!base64Audio) return;
    const audio = new Audio(`data:audio/mp3;base64,${base64Audio}`);
    audio.volume = 1.0;
    document.body.appendChild(audio);
    try {
      await audio.play();
    } catch (e) {
      displayMessageBox(`Failed to play audio: ${e.name}`, 'error');
    } finally {
      setTimeout(() => audio.parentNode?.removeChild(audio), 3000);
    }
  }, [displayMessageBox]);

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
  }, [playAudioFromBase64, displayMessageBox]);

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

  const generateRoast = async () => {
    setIsRoastModalOpen(true);
    setIsLoadingRoast(true);
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
    } finally {
      setIsLoadingRoast(false);
    }
  };

  const assignSarcasticTask = async () => {
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
      setCurrentTask(data);
      displayMessageBox(`New Task: "${data.title}"`, 'info');
    } catch (error) {
      displayMessageBox(`Task error: ${error.message}`, 'error');
    }
  };

  const unlockSarcasticAchievement = async () => {
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
      setUnlockedAchievement(data);
      displayMessageBox(`Achievement: "${data.title}"`, 'info');
    } catch (error) {
      displayMessageBox(`Achievement error: ${error.message}`, 'error');
    }
  };

  return (
    <div className="flex flex-col flex-1 relative z-20 ml-0 mr-0 md:ml-[var(--panel-width-val)] md:mr-[var(--panel-width-val)] p-2 sm:p-4">
      {systemMessage && (
        <MessageBox message={systemMessage} type={systemMessageType} onClose={() => setSystemMessage(null)} />
      )}
      {unlockedAchievement && (
        <AchievementToast achievement={unlockedAchievement} onClose={() => setUnlockedAchievement(null)} />
      )}
      <ChatHeader
        languages={languages}
        selectedLanguage={selectedLanguage}
        onSelectLanguage={setSelectedLanguage}
        selectedVoiceStyle={selectedPersonaMode}
        onSelectVoiceStyle={setSelectedPersonaMode}
        selectedPersonaMode={selectedPersonaMode}
        onSelectPersonalityMode={setSelectedPersonaMode}
        toggleSidebar={toggleSidebar}
        loggedInUser={loggedInUser}
        onLogin={(username, password) => {
          console.log(`Login attempt: ${username}`);
          displayMessageBox('Anonymous login not implemented.', 'error');
        }}
        onLogout={() => {
          setLoggedInUser(null);
          displayMessageBox('Logged out.', 'info');
        }}
        onGenerateRoast={generateRoast}
        isAutoSpeakEnabled={isAutoSpeakEnabled}
        onToggleAutoSpeak={() => {
          setIsAutoSpeakEnabled(prev => !prev);
          displayMessageBox(`Auto-Speak ${!isAutoSpeakEnabled ? 'ON' : 'OFF'}`, 'info');
        }}
        onAssignTask={assignSarcasticTask}
        onUnlockAchievement={unlockSarcasticAchievement}
      />
      <div className="flex-1 flex justify-center p-2 sm:p-4 overflow-hidden">
        <div className="w-full max-w-3xl h-full bg-zinc-900 rounded-xl shadow-2xl border-2 border-zinc-700 flex flex-col overflow-hidden">
          <MessageList
            messages={messages}
            isLoading={isLoading}
            playReceivedAudio={async base64Audio => await playAudioFromBase64(base64Audio, 'manual chat')}
          />
        </div>
      </div>
      <div className="flex justify-center p-2 pt-0 sm:p-4 sm:pt-0">
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
          isLoading={isLoading}
          sarcasmSuggestions={sarcasmSuggestions}
        />
      </div>
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