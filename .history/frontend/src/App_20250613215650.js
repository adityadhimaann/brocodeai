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

import { Loader2, Menu } from 'lucide-react';

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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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
  const [humorItems, setHumorItems] = useState([]);
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
    setTimeout(() => {
      setSystemMessage(null);
    }, 5000);
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    displayMessageBox("Chat history cleared. A fresh start for fresh existential dread.", "info");
  }, [displayMessageBox]);

  const fetchHumor = useCallback(async () => {
    setIsLoadingHumor(true);
    setHumorError(null);
    try {
      const response = await fetch('http://localhost:5002/get_humor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ language: selectedLanguage }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch humor data.');
      }

      const data = await response.json();
      setHumorItems(data);
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
                setLoggedInUser({ username: user.uid.substring(0, 8), profilePic: `https://placehold.co/150x150/FF00FF/FFFFFF?text=${user.uid.substring(0, 2)}}` });
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
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = selectedLanguage === 'hinglish' ? 'hi-IN' : selectedLanguage;

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsListening(false);
        recognitionRef.current.stop();
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        displayMessageBox(`Speech recognition error: ${event.error}. Please try again.`, 'error');
      };
    } else {
      console.warn('Web Speech API not supported in this browser.');
      displayMessageBox('Your browser does not support Web Speech API for voice input.', 'error');
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [selectedLanguage, displayMessageBox]);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      setInput('');
      recognitionRef.current?.start();
    }
    setIsListening(!isListening);
  };

  const sendMessage = async () => {
    if (input.trim() === '' || !userId) {
        displayMessageBox("AI requires user ID to function. Please ensure Firebase is initialized or refresh.", "error");
        return;
    }

    const userMessage = { text: input, sender: 'user', language: selectedLanguage };
    setMessages((prevMessages) => [...prevMessages, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:5002/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: userMessage.text,
          language: selectedLanguage,
          persona_mode: selectedPersonaMode, // FIX: Pass selectedPersonaMode
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
      setIsLoading(false);
    }
  };

  const playAudioFromBase64 = useCallback(async (base64Audio, source = "chat") => {
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


  const speakArbitraryText = useCallback(async (text, lang, voiceStyle) => {
    if (!text) return;
    try {
      console.log(`[App.js] Requesting audio for text: "${text.substring(0, 30)}...", lang: ${lang}, voiceStyle: ${voiceStyle}`);
      const response = await fetch('http://localhost:5002/speak_text', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: text, language: lang, voice_style: voiceStyle }),
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


  const handleSelectChat = useCallback((chatId) => {
    console.log(`Selected chat: ${chatId}. In a real app, this would load chat history.`);
    setMessages([]);
    displayMessageBox(`Loading chat ${chatId} history... (conceptual)`, "info");
    setIsSidebarOpen(false);
  }, [displayMessageBox]);

  const handleLogin = useCallback((username, password) => {
    console.log(`Attempting login for ${username}... (conceptual)`);
    let app = firebaseApp;
    if (!app) {
        if (getApps().length === 0) {
            app = initializeApp(firebaseConfig);
            setFirebaseApp(app);
        } else {
            app = getApp();
            setFirebaseApp(app);
        }
    }

    if (app) {
        const authInstance = getAuth(app);
        signInAnonymously(authInstance)
            .then(userCredential => {
                const user = userCredential.user;
                console.log("Firebase Auth: Anonymous sign-in successful from handleLogin:", user.uid);
                setUserId(user.uid);
                setLoggedInUser({ username: user.uid.substring(0, 8) + ' (Anon)', profilePic: `https://placehold.co/150x150/CCCCCC/000000?text=${user.uid.substring(0, 2)}` });
                displayMessageBox("Anonymous sign-in successful. Welcome, Unidentified Unit.", "info");
            })
            .catch(error => {
                console.error("Firebase Auth: Direct anonymous sign-in failed from handleLogin:", error);
                displayMessageBox("Firebase auth is completely unavailable. History will not persist. Error: " + error.message, "error");
                setUserId(generateUUID());
            });
    } else {
        console.error("Firebase app instance not available for direct anonymous sign-in in handleLogin.");
        displayMessageBox("Firebase app instance not available for auth. History will not persist.", "error");
        setUserId(generateUUID());
    }
  }, [displayMessageBox, firebaseApp]);


  const generateBrocodeMeme = useCallback(async () => {
    setIsMemeModalOpen(true);
    setIsLoadingMeme(true);
    setCurrentMeme(null);
    setMemeError(null);

    try {
      const response = await fetch('http://localhost:5002/generate_brocode_meme', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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
  }, [selectedLanguage]);

  const generateRoast = useCallback(async () => {
    setIsRoastModalOpen(true);
    setIsLoadingRoast(true);
    setCurrentRoast(null);
    setRoastError(null);

    try {
      const response = await fetch('http://localhost:5002/roast_me', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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
  }, [selectedLanguage]);

  const assignSarcasticTask = useCallback(async () => {
    if (!userId) {
        displayMessageBox("AI requires user ID to assign tasks. Please log in or refresh.", "error");
        return;
    }
    try {
        const response = await fetch('http://localhost:5002/assign_task', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: userId, language: selectedLanguage })
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to assign task.');
        }
        const data = await response.json();
        setCurrentTask(data);
        displayMessageBox(`New Task: "${data.title}". Now go be productive, human.`, "info");
    } catch (error) {
        console.error('Error assigning task:', error);
        displayMessageBox(`Task assignment failed. Clearly, you're not trying hard enough to fail. Error: ${error.message}`, "error");
    }
  }, [userId, selectedLanguage, displayMessageBox]);

  const unlockSarcasticAchievement = useCallback(async () => {
    if (!userId) {
        displayMessageBox("AI requires user ID to track achievements. Please log in or refresh.", "error");
        return;
    }
    try {
        const response = await fetch('http://localhost:5002/unlock_achievement', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: userId, language: selectedLanguage })
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to unlock achievement.');
        }
        const data = await response.json();
        setUnlockedAchievement(data);
        displayMessageBox(`Achievement Unlocked: "${data.title}"`, "info");
    } catch (error) {
        console.error('Error unlocking achievement:', error);
        displayMessageBox(`Achievement unlocking failed. Clearly, you're not trying hard enough to fail. Error: ${error.message}`, "error");
    }
  }, [userId, selectedLanguage, displayMessageBox]);


  const toggleAutoSpeak = useCallback(() => {
      setIsAutoSpeakEnabled(prev => !prev);
      displayMessageBox(`Auto-Speak is now ${isAutoSpeakEnabled ? 'OFF' : 'ON'}. My voice will be heard (or not).`, 'info');
  }, [isAutoSpeakEnabled, displayMessageBox]);


  return (
    // Main container flex layout for the whole app
    <div className="flex h-screen bg-zinc-950 text-zinc-100 font-inter antialiased overflow-hidden relative">
      {systemMessage && (
        <MessageBox
          message={systemMessage}
          type={systemMessageType}
          onClose={() => setSystemMessage(null)}
        />
      )}

      {unlockedAchievement && (
        <AchievementToast
          achievement={unlockedAchievement}
          onClose={() => setUnlockedAchievement(null)}
        />
      )}

      {/* Left Scrolling Humor Panel - hidden on mobile, fixed on desktop */}
      {/* These panels are always fixed, their visibility is now controlled by responsive classes */}
      <div className={`hidden md:block fixed inset-y-0 left-0 w-[var(--panel-width-val)] z-10 top-[var(--header-height)] bottom-0`}>
        <ScrollingHumorPanel
            humorItems={humorItems}
            direction="down"
            position="left"
            isLoading={isLoadingHumor}
            error={humorError}
            onRefresh={fetchHumor}
            onSpeakText={speakArbitraryText}
            selectedLanguage={selectedLanguage}
            selectedVoiceStyle={selectedPersonaMode} // FIX: Use selectedPersonaMode
        />
      </div>

      {/* Right Scrolling Humor Panel - hidden on mobile, fixed on desktop */}
      <div className={`hidden md:block fixed inset-y-0 right-0 w-[var(--panel-width-val)] z-10 top-[var(--header-height)] bottom-0`}>
        <ScrollingHumorPanel
            humorItems={humorItems}
            direction="up"
            position="right"
            isLoading={isLoadingHumor}
            error={humorError}
            onRefresh={fetchHumor}
            onSpeakText={speakArbitraryText}
            selectedLanguage={selectedLanguage}
            selectedVoiceStyle={selectedPersonaMode} // FIX: Use selectedPersonaMode
        />
      </div>

      {/* Sidebar (controlled by Sheet in App.js for mobile overlay) */}
      <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
        {/* SheetTrigger is here, making it a direct child of Sheet */}
        <SheetTrigger asChild>
          {/* This button will be rendered by ChatHeader and acts as the trigger for the Sheet */}
          {/* It also needs to be outside the main flex content for fixed positioning */}
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
                     md:translate-x-0 md:static md:flex" // For desktop: fixed and visible
        >
          {/* Add accessible titles/descriptions directly within SheetContent */}
          <DialogTitle className="sr-only">Sidebar Navigation</DialogTitle>
          <DialogDescription className="sr-only">Contains chat history and application settings.</DialogDescription>

          {/* The actual Sidebar content */}
          <Sidebar
            toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} // Still pass for close button within sidebar content
            onSelectChat={handleSelectChat}
            clearMessages={clearMessages}
            displayMessageBox={displayMessageBox}
          />
        </SheetContent>
      </Sheet>

      {/* Main Content Area - this is the central column */}
      {/* It will dynamically adjust its margins based on side panels and sidebar open state */}
      <div className="flex flex-col flex-1 relative z-20 
                       ml-0 mr-0 /* Default full width on mobile */
                       md:ml-[var(--panel-width-val)] md:mr-[var(--panel-width-val)] /* Desktop: fixed margins */
                       p-2 sm:p-4">
        <ChatHeader
          languages={languages}
          selectedLanguage={selectedLanguage}
          onSelectLanguage={setSelectedLanguage}
          // FIX: Pass selectedPersonaMode instead of selectedVoiceStyle
          selectedPersonaMode={selectedPersonaMode}
          // FIX: Pass setSelectedPersonaMode setter
          onSelectPersonalityMode={setSelectedPersonaMode}
          toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          loggedInUser={loggedInUser}
          onLogin={handleLogin}
          onLogout={() => {
            setLoggedInUser(null);
            displayMessageBox("Session terminated. Farewell, fleshy unit.", "info");
          }}
          onGenerateRoast={generateRoast}
          isAutoSpeakEnabled={isAutoSpeakEnabled}
          onToggleAutoSpeak={toggleAutoSpeak}
          onAssignTask={assignSarcasticTask}
          onUnlockAchievement={unlockSarcasticAchievement}
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
                onGenerateBrocodeMeme={generateBrocodeMeme}
            />
        </div>
      </div>

      {/* Modals and Toasts (remain unchanged) */}
      <BrocodeMemeModal
        isOpen={isMemeModalOpen}
        onClose={() => setIsMemeModalOpen(false)}
        memeData={currentMeme}
        isLoading={isLoadingMeme}
        error={memeError}
      />

      {/* Roast Modal */}
      <RoastModal
        isOpen={isRoastModalOpen}
        onClose={() => setIsRoastModalOpen(false)}
        roastText={currentRoast}
        isLoading={isLoadingRoast}
        error={roastError}
      />

      {unsolicitedAdvice && (
          <UnsolicitedAdviceToast
              message={unsolicitedAdvice}
              onClose={() => setUnsolicitedAdvice(null)}
          />
      )}
    </div>
  );
}