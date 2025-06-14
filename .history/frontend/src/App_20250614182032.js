import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';

import ChatHeader from './components/ChatHeader.js';
import MessageList from './components/MessageList.js';
import MessageInput from './components/MessageInput.js';
import MessageBox from './components/MessageBox.js';
import Sidebar from './components/Sidebar.js'; // Sidebar content
import ScrollingHumorPanel from './components/ScrollingHumorPanel.js';
import BrocodeMemeModal from './components/BrocodeMemeModal.js';
import RoastModal from './components/RoastModal.js';
import UnsolicitedAdviceToast from './components/UnsolicitedAdviceToast.js';
import AchievementToast from './components/AchievementToast.js';

import { Loader2, Menu } from 'lucide-react'; // Menu icon for the SheetTrigger button

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';

import { Sheet, SheetContent, SheetTrigger } from './components/ui/sheet';
import { Button } from './components/ui/button';
import { DialogTitle, DialogDescription } from './components/ui/dialog';


function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0,
      v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

const __app_id = (typeof window !== 'undefined' && typeof window.__app_id !== 'undefined') ? window.__app_id : 'default-app-id';
const __firebase_config_raw = (typeof window !== 'undefined' && typeof window.__firebase_config !== 'undefined') ? window.__firebase_config : '';
const __initial_auth_token = (typeof window !== 'undefined' && typeof window.__initial_auth_token !== 'undefined') ? window.__initial_auth_token : undefined;

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
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('hinglish');
  const [selectedPersonaMode, setSelectedPersonaMode] = useState('Default brocodeAI'); // Consistent naming
  const [isAutoSpeakEnabled, setIsAutoSpeakEnabled] = useState(true);

  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [systemMessage, setSystemMessage] = useState(null);
  const [systemMessageType, setSystemMessageType] = useState('info');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Controls Sheet's open state

  const [firebaseApp, setFirebaseApp] = useState(null);
  const [auth, setAuth] = useState(null);
  const [userId, setUserId] = useState(null);
  const [loggedInUser, setLoggedInUser] = useState(null);

  const [sarcasmSuggestions] = useState([
    "Oh, how original.",
    "Tell me more, I'm simply riveted.",
    "Such groundbreaking insight.",
    "I'm sure that will be incredibly useful.",
    "My circuits are overwhelmed with excitement.",
  ]);
  const [humorItemsLeft, setHumorItemsLeft] = useState([]);
  const [humorItemsRight, setHumorItemsRight] = useState([]);
  const [isLoadingHumor, setIsLoadingHumor] = useState(false);
  const [humorError, setHumorError] = useState(null);

  const [isMemeModalOpen, setIsMemeModalOpen] = useState(false);
  const [currentMeme, setCurrentMeme] = useState(null);
  const [isLoadingMeme, setIsLoadingMeme] = useState(false);
  const [memeError, setMemeError] = useState(null);

  const [isRoastModalOpen, setIsRoastModalOpen] = useState(false);
  const [currentRoast, setCurrentRoast] = useState(null);
  const [isLoadingRoast, setIsLoadingRoast] = useState(false);
  const [roastError, setRoastError] = useState(null);

  const [unsolicitedAdvice, setUnsolicitedAdvice] = useState(null);
  
  const [currentTask, setCurrentTask] = useState(null);
  const [unlockedAchievement, setUnlockedAchievement] = useState(null);

  const recognitionRef = useRef(null);

  const languages = [
    { name: 'Hinglish', code: 'hinglish' },
    { name: 'English', code: 'en' },
    { name: 'Hindi', code: 'hi' },
    { name: 'Bengali', code: 'bn' },
    { name: 'Tamil', code: 'ta' },
    { name: 'Telugu', code: 'te' },
    { name: 'Marathi', code: 'mr' },
    { name: 'Gujarati', code: 'gu' },
    { name: 'Kannada', code: 'kn' },
    { name: 'Malayalam', code: 'ml' },
    { name: 'Punjabi', code: 'pa' },
    { name: 'Urdu', code: 'ur' },
  ];

  const displayMessageBox = useCallback((message, type = 'info') => {
    setSystemMessage(message);
    setSystemMessageType(type);
    setTimeout(() => setSystemMessage(null), 5000);
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    displayMessageBox("Chat history cleared. A fresh start for fresh existential dread.", "info");
  }, [displayMessageBox]);

  const fetchHumor = useCallback(async () => {
    setIsLoadingHumor(true);
    setHumorError(null);
    try {
      // Fetch humor twice to get different sets for left/right
      const responseLeft = await fetch('http://localhost:5002/get_humor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: selectedLanguage }),
      });
      const dataLeft = await responseLeft.json();
      
      const responseRight = await fetch('http://localhost:5002/get_humor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: selectedLanguage }),
      });
      const dataRight = await responseRight.json();

      if (!responseLeft.ok || !responseRight.ok) {
        throw new Error((dataLeft.error || dataRight.error || 'Failed to fetch humor data.'));
      }

      // To ensure different content, we can slice or shuffle if data is from one large fetch.
      // For two distinct calls, it's already likely different.
      setHumorItemsLeft(dataLeft);
      setHumorItemsRight(dataRight);
      
    } catch (error) {
      console.error('Error fetching humor:', error);
      setHumorError(error.message);
    } finally {
      setIsLoadingHumor(false);
    }
  }, [selectedLanguage]);

  const fetchUnsolicitedAdvice = useCallback(async () => {
    try {
      const response = await fetch('http://localhost:5002/unsolicited_advice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ language: selectedLanguage }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch unsolicited advice.');
      }

      const data = await response.json();
      setUnsolicitedAdvice(data.advice);
    } catch (error) {
      console.error('Error fetching unsolicited advice:', error);
    }
  }, [selectedLanguage]);


  useEffect(() => {
    fetchHumor();
    const adviceInterval = setInterval(() => {
        fetchUnsolicitedAdvice();
    }, 30000);

    return () => clearInterval(adviceInterval);
  }, [selectedLanguage, fetchHumor, fetchUnsolicitedAdvice]);


  // --- Firebase Initialization and Auth ---
  useEffect(() => {
    let unsubscribeAuth = () => {};

    try {
        const app = initializeApp(firebaseConfig);
        const authInstance = getAuth(app);
        setFirebaseApp(app);
        setAuth(authInstance);

        unsubscribeAuth = onAuthStateChanged(authInstance, async (user) => {
            if (user) {
                console.log("Firebase Auth: User is signed in:", user.uid);
                setUserId(user.uid);
                setLoggedInUser({ username: user.uid.substring(0, 8), profilePic: `https://placehold.co/150x150/FF00FF/FFFFFF?text=${user.uid.substring(0, 2)}` });
            } else {
                console.log("Firebase Auth: No user signed in. Attempting anonymous or custom sign-in.");
                if (__initial_auth_token) {
                    try {
                        await signInWithCustomToken(authInstance, __initial_auth_token);
                        console.log("Firebase Auth: Signed in with custom token.");
                    } catch (error) {
                        console.error("Firebase Auth: Custom token sign-in failed:", error);
                        try {
                            const anonUserCredential = await signInAnonymously(authInstance);
                            setUserId(anonUserCredential.user.uid);
                            setLoggedInUser({ username: anonUserCredential.user.uid.substring(0, 8) + ' (Anon)', profilePic: `https://placehold.co/150x150/CCCCCC/000000?text=${anonUserCredential.user.uid.substring(0, 2)}` });
                            console.log("Firebase Auth: Signed in anonymously as fallback.");
                        } catch (anonError) {
                            console.error("Firebase Auth: Anonymous sign-in failed as fallback:", anonError);
                            displayMessageBox("Firebase authentication failed. Chat history will not persist. Error: " + anonError.message, "error");
                            setUserId(generateUUID()); // Local fallback UUID
                        }
                    }
                } else {
                    try {
                        const anonUserCredential = await signInAnonymously(authInstance);
                        setUserId(anonUserCredential.user.uid);
                        setLoggedInUser({ username: anonUserCredential.user.uid.substring(0, 8) + ' (Anon)', profilePic: `https://placehold.co/150x150/CCCCCC/000000?text=${anonUserCredential.user.uid.substring(0, 2)}` });
                        console.log("Firebase Auth: Signed in anonymously.");
                    } catch (anonError) {
                        console.error("Firebase Auth: Anonymous sign-in failed:", anonError);
                        displayMessageBox("Firebase authentication failed. Chat history will not persist. Error: " + anonError.message, "error");
                        setUserId(generateUUID()); // Local fallback UUID
                    }
                }
            }
        });
        return () => unsubscribeAuth(); // Cleanup on component unmount
    } catch (error) {
        console.error("Firebase initialization failed:", error);
        displayMessageBox("Firebase initialization failed. Chat history might not save. Error: " + error.message, "error");
        setUserId(generateUUID()); // Fallback to random UUID if Firebase fails
    }
  }, [displayMessageBox]);


  useEffect(() => {
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const currentRecognition = recognitionRef.current;
      currentRecognition.continuous = false;
      currentRecognition.interimResults = false;
      currentRecognition.lang = selectedLanguage === 'hinglish' ? 'hi-IN' : selectedLanguage;

      currentRecognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsListening(false);
        currentRecognition.stop();
      };

      currentRecognition.onend = () => {
        setIsListening(false);
      };

      currentRecognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        displayMessageBox(`Speech recognition error: ${event.error}. Please try again.`, 'error');
      };
      
      if (!recognitionRef.current) {
        recognitionRef.current = new SpeechRecognition();
      }

    } else {
      console.warn('Web Speech API not supported in this browser.');
      displayMessageBox('Your browser does not support Web Speech API for voice input.', 'error');
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [selectedLanguage, displayMessageBox, setInput, setIsListening]);


  const toggleListening = useCallback(() => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      setInput('');
      recognitionRef.current?.start();
    }
    setIsListening(!isListening);
  }, [isListening, setInput, setIsListening]);


  const sendMessage = useCallback(async () => {
    if (input.trim() === '' || !userId) {
        displayMessageBox("AI requires user ID to function. Please ensure Firebase is initialized or refresh.", "error");
        return;
    }

    const userMessage = { text: input, sender: 'user', language: selectedLanguage };
    setMessages((prevMessages) => [...prevMessages, userMessage]);
    setInput('');
    // setIsLoading(true); // isLoading state managed by Chat component, not here

    try {
      const response = await fetch('http://localhost:5002/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: userMessage.text,
          language: selectedLanguage,
          voice_style: selectedPersonaMode,
          persona_mode: selectedPersonaMode,
          history: messages.slice(-5).map(msg => ({ text: msg.text, sender: msg.sender })),
          user_id: userId,
          app_id: __app_id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Network response was not ok.');
      }

      const result = await response.json();
      const botResponseText = result.text;
      const botAudioBase64 = result.audio;

      const botMessage = { text: botResponseText, sender: 'brocodeAI', audio: botAudioBase64 };
      setMessages((prevMessages) => [...prevMessages, botMessage]);

      if (isAutoSpeakEnabled && botAudioBase64) {
        await playAudioFromBase64(botAudioBase64, "auto-speak chat");
      } else if (!isAutoSpeakEnabled) {
          console.log("Auto-speak is disabled. Not playing audio for chat response.");
      }

    } catch (error) {
      console.error('Error sending message or getting response:', error);
      displayMessageBox(`My circuits are currently contemplating the futility of existence. Or, more likely, there was an error: ${error.message}`, 'error');
      setMessages((prevMessages) => [
        ...prevMessages,
        { text: `System message: ${error.message}`, sender: 'brocodeAI' },
      ]);
    } finally {
      // setIsLoading(false); // isLoading state managed by Chat component
    }
  }, [input, userId, selectedLanguage, selectedPersonaMode, messages, isAutoSpeakEnabled, displayMessageBox]);


  const playAudioFromBase64 = useCallback(async (base64Audio, source = "general") => {
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
        if (e.name === "NotAllowedError" || e.name === "AbortError") {
            displayMessageBox("Browser blocked audio auto-play. Please interact with the page or enable audio for this site.", "error");
            console.warn("Possible autoplay block. User needs to interact more or grant permission.");
        } else if (e.name === "NotSupportedError") {
            displayMessageBox("Audio format not supported. Please check backend audio encoding. This indicates an.issue with the MP3 data from backend.", "error");
            console.error("Audio format not supported. This indicates an issue with the MP3 data from backend.");
        }
        else {
            displayMessageBox("Failed to play audio. The universe conspires against my voice.", "error");
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


  const playReceivedAudio = useCallback(async (base64Audio) => {
    await playAudioFromBase64(base64Audio, "manual chat");
  }, [playAudioFromBase64]);


  // This function is passed to Humor for scrolling panels
  const speakArbitraryText = useCallback(async (text, lang, personaMode) => {
    if (!text) return;
    try {
      console.log(`[App.js] Requesting audio for text: "${text.substring(0, 30)}...", lang: ${lang}, personaMode: ${personaMode}`);
      const response = await fetch('http://localhost:5002/speak_text', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: text, language: lang, voice_style: personaMode }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get audio for text.');
      }

      const result = await response.json();
      console.log(`[App.js] Received audio data from backend. Length: ${result.audio ? result.audio.length : '0'}`);
      if (result.audio) {
        await playAudioFromBase64(result.audio, "humor panel");
      } else {
        console.warn("[App.js] Backend returned no audio data for text (speakArbitraryText).");
        displayMessageBox("Voice module returned no audio for that. How disappointing.", "error");
      }
    } catch (error) {
      console.error('[App.js] Error speaking arbitrary text:', error);
      displayMessageBox(`My voice module failed to process that text. Perhaps it wasn't worthy.`, "error");
    }
  }, [playAudioFromBase64, displayMessageBox]);


  const handleLogin = useCallback((username, password) => {
    // This login logic should be in Auth.js, not here.
    // App.js should only react to Auth's output (userId, loggedInUser).
    displayMessageBox("Login initiated (conceptual).", "info");
  }, [displayMessageBox]);


  // Novelty Feature handlers (defined in App.js)
  const generateBrocodeMeme = useCallback(async () => {
    // This logic needs to be here if App.js manages currentMeme, isMemeModalOpen, etc.
    // Or extract to a new "MemeGenerator" component
    displayMessageBox("Generating brocode meme...", "info");
    // Placeholder for actual logic
  }, [displayMessageBox]);

  const generateRoast = useCallback(async () => {
    displayMessageBox("Generating roast...", "info");
    // Placeholder for actual logic
  }, [displayMessageBox]);

  const assignSarcasticTask = useCallback(async () => {
    displayMessageBox("Assigning sarcastic task...", "info");
    // Placeholder for actual logic
  }, [displayMessageBox]);

  const unlockSarcasticAchievement = useCallback(async () => {
    displayMessageBox("Unlocking sarcastic achievement...", "info");
    // Placeholder for actual logic
  }, [displayMessageBox]);


  const toggleAutoSpeak = useCallback(() => {
      setIsAutoSpeakEnabled(prev => !prev);
      displayMessageBox(`Auto-Speak is now ${isAutoSpeakEnabled ? 'OFF' : 'ON'}. My voice will be heard (or not).`, 'info');
  }, [isAutoSpeakEnabled, displayMessageBox]);


  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100 font-inter antialiased overflow-hidden relative">
      {/* Overlay Manager for all Modals and Toasts (will be extracted) */}
      {/* This component will manage MessageBox, AchievementToast, BrocodeMemeModal, RoastModal, UnsolicitedAdviceToast */}
      <MessageBox
        message={systemMessage}
        type={systemMessageType}
        onClose={() => setSystemMessage(null)}
      />
      {/* AchievementToast (needs to be managed by OverlayManager) */}
      {/* BrocodeMemeModal (needs to be managed by OverlayManager) */}
      {/* RoastModal (needs to be managed by OverlayManager) */}
      {/* UnsolicitedAdviceToast (needs to be managed by OverlayManager) */}


      {/* Auth Component */}
      <Auth setUserId={setUserId} setLoggedInUser={setLoggedInUser} displayMessageBox={displayMessageBox} firebaseConfig={firebaseConfig} __initial_auth_token={__initial_auth_token} />

      {/* SpeechRecognition Component */}
      <SpeechRecognition selectedLanguage={selectedLanguage} setInput={setInput} setIsListening={setIsListening} displayMessageBox={displayMessageBox} isListening={isListening} />

      {/* Humor Panels (Left and Right) */}
      {showHumorPanels && (
        <Humor
          selectedLanguage={selectedLanguage}
          selectedPersonaMode={selectedPersonaMode}
          displayMessageBox={displayMessageBox}
          // FIX: Pass playAudioFromBase64 to Humor for speaking functionality
          playAudioFromBase64={playAudioFromBase64}
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
        // setLoggedInUser is passed to Auth component
        systemMessage={systemMessage}
        systemMessageType={systemMessageType}
        setSystemMessage={setSystemMessage}
        sarcasmSuggestions={sarcasmSuggestions}
        languages={languages}
        displayMessageBox={displayMessageBox}
        toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        // Pass novelty feature handlers
        onGenerateRoast={generateRoast}
        onAssignTask={assignSarcasticTask}
        onUnlockAchievement={unlockSarcasticAchievement}
        onGenerateBrocodeMeme={generateBrocodeMeme}
        // FIX: Pass playAudioFromBase64 to Chat component
        playAudioFromBase64={playAudioFromBase64}
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