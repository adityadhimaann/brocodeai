import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
// Import custom components with explicit .js extensions
import ChatHeader from './components/ChatHeader.js';
import MessageList from './components/MessageList.js';
import MessageInput from './components/MessageInput.js';
import MessageBox from './components/MessageBox.js';
import Sidebar from './components/Sidebar.js';
import ScrollingHumorPanel from './components/ScrollingHumorPanel.js';
import BrocodeMemeModal from './components/BrocodeMemeModal.js';
import RoastModal from './components/RoastModal.js';
import UnsolicitedAdviceToast from './components/UnsolicitedAdviceToast.js';
import AchievementToast from './components/AchievementToast.js';
import { Button } from '../components/ui/button';

// NEW: Import Loader2 for loading spinner from lucide-react
import { Loader2 } from 'lucide-react'; // Ensure this is imported here

// Firebase imports for client-side
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';


// Helper to get a random UUID for anonymous users if __initial_auth_token isn't available
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0,
      v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Global variables for Firebase config (expected from Canvas environment)
const __app_id = typeof window !== 'undefined' && typeof window.__app_id !== 'undefined' ? window.__app_id : 'default-app-id';
const __firebase_config = typeof window !== 'undefined' && typeof window.__firebase_config !== 'undefined' ? window.__firebase_config : '{}';
const __initial_auth_token = typeof window !== 'undefined' && typeof window.__initial_auth_token !== 'undefined' ? window.__initial_auth_token : undefined;


// Main App component for the BrocodeAI Chatbot
export default function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('hinglish');
  const [selectedVoiceStyle, setSelectedVoiceStyle] = useState('default');
  const [isAutoSpeakEnabled, setIsAutoSpeakEnabled] = useState(true);

  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [systemMessage, setSystemMessage] = useState(null);
  const [systemMessageType, setSystemMessageType] = useState('info');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Firebase Auth states
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
        const firebaseConfig = JSON.parse(__firebase_config);
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
                        // Fallback to anonymous if custom token fails
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
  }, [displayMessageBox, __firebase_config, __initial_auth_token]);


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
          voice_style: selectedVoiceStyle,
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
            displayMessageBox("Audio format not supported. Please check backend audio encoding. This indicates an issue with the MP3 data from backend.", "error");
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
      displayMessageBox(`My voice module failed to process that text. Perhaps it wasn't worthy.`, 'error');
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
    // Ensure auth is initialized before using it
    if (auth) {
        signInWithCustomToken(auth, __initial_auth_token || 'dummy_token_for_dev') // Use token if available, else a dummy
            .then((userCredential) => {
                const user = userCredential.user;
                console.log("Firebase Auth: Custom token sign-in successful:", user.uid);
                setUserId(user.uid);
                setLoggedInUser({ username: user.uid.substring(0, 8), profilePic: `https://placehold.co/150x150/FF00FF/FFFFFF?text=${user.uid.substring(0, 2)}` });
            })
            .catch(async (error) => {
                console.error("Firebase Auth: Custom token sign-in failed during handleLogin:", error);
                // Fallback to anonymous sign-in if custom token login fails
                try {
                    const anonUserCredential = await signInAnonymously(auth);
                    const anonUser = anonUserCredential.user;
                    setUserId(anonUser.uid);
                    setLoggedInUser({ username: anonUser.uid.substring(0, 8) + ' (Anon)', profilePic: `https://placehold.co/150x150/CCCCCC/000000?text=${anonUser.uid.substring(0, 2)}` });
                    displayMessageBox("Anonymous sign-in successful as fallback. Welcome, Unidentified Unit.", "info");
                } catch (anonError) {
                    console.error("Firebase Auth: Anonymous sign-in failed as fallback:", anonError);
                    displayMessageBox("Firebase authentication failed. Chat history will not persist. Error: " + anonError.message, "error");
                    setUserId(generateUUID()); // Fallback to local UUID
                }
            });
    } else {
        console.error("Firebase Auth not initialized during handleLogin. Attempting to sign in anonymously directly.");
        // If auth is not ready, try anonymous sign-in directly (this might happen on first load)
        const app = initializeApp(JSON.parse(__firebase_config));
        const authInstance = getAuth(app);
        signInAnonymously(authInstance)
            .then(anonUserCredential => {
                setUserId(anonUserCredential.user.uid);
                setLoggedInUser({ username: anonUserCredential.user.uid.substring(0, 8) + ' (Anon)', profilePic: `https://placehold.co/150x150/CCCCCC/000000?text=${anonUserCredential.user.uid.substring(0, 2)}` });
                displayMessageBox("Anonymous sign-in successful. Welcome, Unidentified Unit.", "info");
            })
            .catch(error => {
                console.error("Direct anonymous sign-in failed:", error);
                displayMessageBox("Firebase auth is completely unavailable. History will not persist. Error: " + error.message, "error");
                setUserId(generateUUID());
            });
    }
  }, [displayMessageBox, auth, __initial_auth_token, __firebase_config]);


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
        displayMessageBox(`Task assignment failed. Even my algorithms are tired of your procrastination. Error: ${error.message}`, "error");
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


  const panelWidth = 'w-64 md:w-72 lg:w-80';
  const sidebarWidth = 'w-64';
  const mainContentMl = isSidebarOpen ? 'md:ml-64' : 'ml-0';
  const mainContentMx = `md:ml-[var(--panel-width-val)] md:mr-[var(--panel-width-val)]`;

  // Render a loading spinner until userId is determined (Firebase Auth is ready)
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

      {/* Left Scrolling Humor Panel - hidden on mobile */}
      <ScrollingHumorPanel
        humorItems={humorItems}
        direction="down"
        position="left"
        isLoading={isLoadingHumor}
        error={humorError}
        onRefresh={fetchHumor}
        onSpeakText={speakArbitraryText}
        selectedLanguage={selectedLanguage}
        selectedVoiceStyle={selectedVoiceStyle}
      />

      {/* Right Scrolling Humor Panel - hidden on mobile */}
      <ScrollingHumorPanel
        humorItems={humorItems}
        direction="up"
        position="right"
        isLoading={isLoadingHumor}
        error={humorError}
        onRefresh={fetchHumor}
        onSpeakText={speakArbitraryText}
        selectedLanguage={selectedLanguage}
        selectedVoiceStyle={selectedVoiceStyle}
      />

      {/* Sidebar Component */}
      <Sidebar
        isOpen={isSidebarOpen}
        toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        onSelectChat={handleSelectChat}
        clearMessages={clearMessages}
        displayMessageBox={displayMessageBox}
      />

      {/* Main Content Area */}
      <div className={`flex flex-col flex-1 transition-all duration-300 ease-in-out
                       ${mainContentMl}
                       ${isSidebarOpen ? '' : 'md:ml-[var(--panel-width-val)]'} md:mr-[var(--panel-width-val)]
                       z-20 p-2 sm:p-4`}>
        <ChatHeader
          languages={languages}
          selectedLanguage={selectedLanguage}
          onSelectLanguage={setSelectedLanguage}
          selectedVoiceStyle={selectedVoiceStyle}
          onSelectVoiceStyle={setSelectedVoiceStyle}
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

      {/* Brocode Meme Modal */}
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

      {/* Unsolicited Advice Toast */}
      {unsolicitedAdvice && (
          <UnsolicitedAdviceToast
              message={unsolicitedAdvice}
              onClose={() => setUnsolicitedAdvice(null)}
          />
      )}
    </div>
  );
}