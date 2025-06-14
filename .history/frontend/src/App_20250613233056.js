import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Menu, Eye, EyeOff } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from './components/ui/sheet';
import { DialogTitle, DialogDescription } from './components/ui/dialog';
import Auth from './components/Auth';
import SpeechRecognition from './components/SpeechRecognition';
import Humor from './components/Humor';
import Chat from './components/Chat';
import Sidebar from './components/Sidebar';
import { Button } from './components/ui/button';

// Firebase imports for client-side (moved from original App.js)
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';

// Helper to generate UUID (moved from original App.js)
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0,
      v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Global variables for Firebase config (moved from original App.js)
const __app_id = (typeof window !== 'undefined' && typeof window.__app_id !== 'undefined') ? window.__app_id : 'default-app-id';
const __firebase_config_raw = (typeof window !== 'undefined' && typeof window.__firebase_config !== 'undefined') ? window.__firebase_config : '';
const __initial_auth_token = (typeof window !== 'undefined' && typeof window.__initial_auth_token !== 'undefined') ? window.__initial_auth_token : undefined;

// Dummy Firebase config for local development ONLY.
const DUMMY_FIREBASE_CONFIG = {
  apiKey: "YOUR_FIREBASE_API_KEY_HERE", // REPLACE WITH REAL KEY
  authDomain: "your-project-id.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "your-messaging-sender-id",
  appId: "your-web-app-id"
};

let firebaseConfig = {};
try {
    if (__firebase_config_raw) {
        firebaseConfig = JSON.parse(__firebase_config_raw);
    } else {
        console.warn("No __firebase_config provided by Canvas. Using dummy local config.");
        firebaseConfig = DUMMY_FIREBASE_CONFIG;
    }
} catch (e) {
    console.error("Failed to parse __firebase_config from Canvas. Using dummy local config. Error:", e);
    firebaseConfig = DUMMY_FIREBASE_CONFIG;
}


export default function App() {
  // --- Global States (managed here) ---
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('hinglish');
  const [selectedPersonaMode, setSelectedPersonaMode] = useState('Default brocodeAI');
  const [isAutoSpeakEnabled, setIsAutoSpeakEnabled] = useState(true);
  const [isListening, setIsListening] = useState(false); // Controlled by SpeechRecognition component
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [userId, setUserId] = useState(null); // Set by Auth component
  const [loggedInUser, setLoggedInUser] = useState(null); // Set by Auth component
  const [systemMessage, setSystemMessage] = useState(null);
  const [systemMessageType, setSystemMessageType] = useState('info');
  const [showHumorPanels, setShowHumorPanels] = useState(true);

  // --- Novelty Feature States (managed here for top-level control) ---
  const [currentTask, setCurrentTask] = useState(null);
  const [unlockedAchievement, setUnlockedAchievement] = useState(null);
  const [currentMeme, setCurrentMeme] = useState(null); // For BrocodeMemeModal
  const [isMemeModalOpen, setIsMemeModalOpen] = useState(false);
  const [isLoadingMeme, setIsLoadingMeme] = useState(false);
  const [memeError, setMemeError] = useState(null);
  const [currentRoast, setCurrentRoast] = useState(null); // For RoastModal
  const [isRoastModalOpen, setIsRoastModalOpen] = useState(false);
  const [isLoadingRoast, setIsLoadingRoast] = useState(false);
  const [roastError, setRoastError] = useState(null);
  const [unsolicitedAdvice, setUnsolicitedAdvice] = useState(null); // For UnsolicitedAdviceToast


  // --- Shared Callbacks (memoized for performance) ---
  const displayMessageBox = useCallback((message, type = 'info') => {
    setSystemMessage(message);
    setSystemMessageType(type);
    setTimeout(() => setSystemMessage(null), 5000);
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    displayMessageBox('Chat history cleared. A fresh start for fresh existential dread.', 'info');
  }, [displayMessageBox]);

  const handleSelectChat = useCallback((chatId) => {
    console.log(`Selected chat: ${chatId}. In a real app, this would load chat history. `);
    setMessages([]);
    displayMessageBox(`Loading chat ${chatId} history... (conceptual)`, 'info');
    setIsSidebarOpen(false);
  }, [displayMessageBox]);

  // Unified audio playback function
  const playAudioFromBase64 = useCallback(async (base64Audio, source = 'general') => {
    if (!base64Audio) {
      console.warn(`[playAudioFromBase64] No audio data provided for ${source}.`);
      return;
    }
    const audioUrl = `data:audio/mp3;base64,${base64Audio}`;
    const audioElement = document.createElement('audio');
    audioElement.src = audioUrl;
    audioElement.volume = 1.0;
    document.body.appendChild(audioElement);
    console.log(`[playAudioFromBase64] Attempting to play audio for ${source}. Source length: ${base64Audio.length} bytes.`);
    try {
      await audioElement.play();
      console.log(`[playAudioFromBase64] Audio playback started successfully for ${source}.`);
    } catch (e) {
      console.error(`[playAudioFromBase64] Failed to play audio for ${source}:`, e);
      if (e.name === 'NotAllowedError' || e.name === 'AbortError') {
        displayMessageBox('Browser blocked audio auto-play. Please interact with the page or enable audio for this site.', 'error');
        console.warn('Possible autoplay block. User needs to interact more or grant permission.');
      } else if (e.name === 'NotSupportedError') {
        displayMessageBox('Audio format not supported. Please check backend audio encoding. This indicates an issue with the MP3 data from backend.', 'error');
        console.error('Audio format not supported. This indicates an issue with the MP3 data from backend.');
      } else {
        displayMessageBox('Failed to play audio. The universe conspires against my voice.', 'error');
      }
    } finally {
      setTimeout(() => {
        if (audioElement.parentNode) {
          audioElement.parentNode.removeChild(audioElement);
          console.log(`[playAudioFromBase64] Audio element removed from DOM for ${source}.`);
        }
      }, 3000);
    }
  }, [displayMessageBox]);

  // Functions for Novelty Features (defined in App.js and passed down)
  const generateBrocodeMeme = useCallback(async () => {
    setIsMemeModalOpen(true);
    setIsLoadingMeme(true);
    setCurrentMeme(null);
    setMemeError(null);
    try {
      const response = await fetch('http://localhost:5002/generate_brocode_meme', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: selectedLanguage }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate brocode meme.');
      }
      const memeData = await response.json();
      setCurrentMeme(memeData);
    } catch (error) {
      console.error('Error generating brocode meme:', error);
      setMemeError(error.message);
    } finally {
      setIsLoadingMeme(false);
    }
  }, [selectedLanguage, displayMessageBox]);

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
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate roast.');
      }
      const data = await response.json();
      setCurrentRoast(data.roast);
    } catch (error) {
      console.error('Error generating roast:', error);
      setRoastError(error.message);
    } finally {
      setIsLoadingRoast(false);
    }
  }, [selectedLanguage, displayMessageBox]);

  const assignSarcasticTask = useCallback(async () => {
    if (!userId) { displayMessageBox('AI requires user ID to assign tasks. Please log in or refresh.', 'error'); return; }
    try {
      const response = await fetch('http://localhost:5002/assign_task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, language: selectedLanguage }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to assign task.');
      }
      const data = await response.json();
      setCurrentTask(data);
      displayMessageBox(`New Task: "${data.title}". Now go be productive, human.`, 'info');
    } catch (error) {
      console.error('Error assigning task:', error);
      displayMessageBox(`Task assignment failed. Even my algorithms are tired of your procrastination. Error: ${error.message}`, 'error');
    }
  }, [userId, selectedLanguage, displayMessageBox]);

  const unlockSarcasticAchievement = useCallback(async () => {
    if (!userId) { displayMessageBox('AI requires user ID to track achievements. Please log in or refresh.', 'error'); return; }
    try {
      const response = await fetch('http://localhost:5002/unlock_achievement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, language: selectedLanguage }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to unlock achievement.');
      }
      const data = await response.json();
      setUnlockedAchievement(data);
      displayMessageBox(`Achievement Unlocked: "${data.title}"`, 'info');
    } catch (error) {
      console.error('Error unlocking achievement:', error);
      displayMessageBox(`Achievement unlocking failed. Clearly, you're not trying hard enough to fail. Error: ${error.message}`, 'error');
    }
  }, [userId, selectedLanguage, displayMessageBox]);

  const toggleAutoSpeak = useCallback(() => {
    setIsAutoSpeakEnabled(prev => !prev);
    displayMessageBox(`Auto-Speak is now ${isAutoSpeakEnabled ? 'OFF' : 'ON'}. My voice will be heard (or not).`, 'info');
  }, [isAutoSpeakEnabled, displayMessageBox]);

  // --- Render logic ---
  if (userId === null) {
    return (
      <div className="flex items-center justify-center h-screen bg-zinc-950 text-teal-400 text-2xl font-bold">
        <Loader2 className="animate-spin h-8 w-8 mr-3" />
        <span>Booting brocodeAI systems...</span>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100 font-inter antialiased overflow-hidden relative">
      {/* Overlay Manager for all Modals and Toasts */}
      <OverlayManager
        systemMessage={systemMessage}
        systemMessageType={systemMessageType}
        onCloseSystemMessage={() => setSystemMessage(null)}
        unlockedAchievement={unlockedAchievement}
        onCloseAchievement={() => setUnlockedAchievement(null)}
        isMemeModalOpen={isMemeModalOpen}
        onCloseMemeModal={() => setIsMemeModalOpen(false)}
        memeData={currentMeme}
        isLoadingMeme={isLoadingMeme}
        memeError={memeError}
        isRoastModalOpen={isRoastModalOpen}
        onCloseRoastModal={() => setIsRoastModalOpen(false)}
        roastText={currentRoast}
        isLoadingRoast={isLoadingRoast}
        roastError={roastError}
        unsolicitedAdvice={unsolicitedAdvice}
        onCloseUnsolicitedAdvice={() => setUnsolicitedAdvice(null)}
      />

      {/* Auth Component (handles Firebase login/user ID) */}
      <Auth
        setUserId={setUserId}
        setLoggedInUser={setLoggedInUser}
        displayMessageBox={displayMessageBox}
        firebaseConfig={firebaseConfig}
        __initial_auth_token={__initial_auth_token}
      />

      {/* SpeechRecognition Component */}
      <SpeechRecognition
        selectedLanguage={selectedLanguage}
        setInput={setInput}
        setIsListening={setIsListening}
        displayMessageBox={displayMessageBox}
        isListening={isListening}
      />

      {/* Humor Panels (Left and Right) */}
      {showHumorPanels && (
        <Humor
          selectedLanguage={selectedLanguage}
          selectedPersonaMode={selectedPersonaMode}
          displayMessageBox={displayMessageBox}
          playAudioFromBase64={playAudioFromBase64} // Pass playAudioFromBase64
        />
      )}
      
      {/* Sidebar (controlled by Sheet in App.js for mobile overlay) */}
      <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
        <SheetTrigger asChild>
          <motion.button
            className="p-1 md:p-2 bg-zinc-700 hover:bg-zinc-600 text-white focus:outline-none focus:ring-2 focus:ring-zinc-600 transition-colors duration-200 absolute top-3 left-3 md:hidden z-50"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            title="Open Sidebar"
          >
            <Menu className="h-5 w-5 md:h-6 md:w-6" />
          </motion.button>
        </SheetTrigger>

        <SheetContent
          side="left"
          className="w-64 bg-zinc-900 border-r-4 border-pink-700 shadow-2xl z-40 flex flex-col py-6 px-4
                     fixed inset-y-0 left-0 transform -translate-x-full transition-transform duration-300 ease-in-out
                     md:translate-x-0 md:static md:flex"
        >
          <DialogTitle className="sr-only">Sidebar Navigation</DialogTitle>
          <DialogDescription className="sr-only">Contains chat history and application settings.</DialogDescription>
          <Sidebar
            toggleSidebar={() => setIsSidebarOpen(false)} // Explicitly close sidebar
            onSelectChat={handleSelectChat}
            clearMessages={clearMessages}
            displayMessageBox={displayMessageBox}
          />
        </SheetContent>
      </Sheet>

      {/* Main Chat Layout (Header, Message List, Input) */}
      <Chat
        messages={messages}
        setMessages={setMessages}
        input={input}
        setInput={setInput}
        selectedLanguage={selectedLanguage}
        setSelectedLanguage={setSelectedLanguage}
        selectedPersonaMode={selectedPersonaMode}
        setSelectedPersonaMode={setSelectedPersonaMode}
        isAutoSpeakEnabled={isAutoSpeakEnabled}
        setIsAutoSpeakEnabled={setIsAutoSpeakEnabled}
        isListening={isListening}
        setIsListening={setIsListening}
        userId={userId}
        loggedInUser={loggedInUser}
        displayMessageBox={displayMessageBox}
        // Pass novelty feature handlers
        onGenerateRoast={generateRoast}
        onAssignTask={assignSarcasticTask}
        onUnlockAchievement={unlockSarcasticAchievement}
        onGenerateBrocodeMeme={generateBrocodeMeme}
        // Pass playAudioFromBase64 for Chat to use internally for MessageList/Auto-speak
        playAudioFromBase64={playAudioFromBase64}
        // Pass other props needed by Chat's sub-components
        languages={languages} // For ChatHeader
        sarcasmSuggestions={sarcasmSuggestions} // For MessageInput
        toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} // For ChatHeader's menu button
      />
      
      {/* Toggle button for Humor Panels */}
      <motion.button
        className="fixed bottom-4 right-4 p-2 bg-pink-700 hover:bg-pink-600 text-white rounded-full z-50"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setShowHumorPanels(!showHumorPanels)}
        title={showHumorPanels ? 'Hide Humor Panels' : 'Show Humor Panels'}
      >
        {showHumorPanels ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
      </motion.button>
    </div>
  );
}