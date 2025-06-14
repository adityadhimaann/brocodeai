import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
// Import all components with explicit .js extensions
import ChatHeader from './components/ChatHeader.js';
import MessageList from './components/MessageList.js';
import MessageInput from './components/MessageInput.js';
import MessageBox from './components/MessageBox.js';
import Sidebar from './components/Sidebar.js';
import ScrollingHumorPanel from './components/ScrollingHumorPanel.js';
import BrocodeMemeModal from './components/BrocodeMemeModal.js';
import RoastModal from './components/RoastModal.js';
import UnsolicitedAdviceToast from './components/UnsolicitedAdviceToast.js';

// Main App component for the BrocodeAI Chatbot
export default function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('hinglish');
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [systemMessage, setSystemMessage] = useState(null);
  const [systemMessageType, setSystemMessageType] = useState('info');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
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
    if (input.trim() === '') return;

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
          language: userMessage.language,
          history: messages.slice(-5).map(msg => ({ text: msg.text, sender: msg.sender })),
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

      if (botAudioBase64) {
        const audio = new Audio(`data:audio/mp3;base64,${botAudioBase64}`);
        audio.play().catch(e => console.error("Error playing audio:", e));
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

  const playReceivedAudio = useCallback((base64Audio) => {
    if (base64Audio) {
      const audio = new Audio(`data:audio/mp3;base64,${base64Audio}`);
      audio.play().catch(e => console.error("Error playing pre-synthesized audio:", e));
    }
  }, []);

  const handleSelectChat = useCallback((chatId) => {
    console.log(`Selected chat: ${chatId}. In a real app, this would load chat history.`);
    setMessages([]);
    displayMessageBox(`Loading chat ${chatId} history... (conceptual)`, "info");
    setIsSidebarOpen(false);
  }, [displayMessageBox]);

  const handleLogin = useCallback((username, password) => {
    console.log(`Attempting login for ${username}... (conceptual)`);
    if (username === "bro" && password === "code") {
      setLoggedInUser({ username: "Agent_47", profilePic: "https://placehold.co/150x150/FF00FF/FFFFFF?text=A47" });
      displayMessageBox("Authentication successful. Welcome, Agent_47.", "info");
    } else {
      displayMessageBox("Authentication failed. Invalid credentials. Access denied.", "error");
    }
  }, [displayMessageBox]);

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


  // Responsive widths for panels and main content
  // On mobile (default), panels are hidden, main content takes full width.
  // On md screens and up, panels appear, main content gets margins.
  const panelWidthClasses = 'w-64 md:w-72 lg:w-80';
  const sidebarWidthClasses = 'w-64';

  // Determine main content margin-left based on sidebar state
  // On mobile, sidebar is an overlay, so ml-0 always applies to main content.
  // On desktop, it pushes main content.
  const mainContentMlClass = isSidebarOpen ? 'md:ml-64' : 'ml-0';

  // Determine main content margin-x to accommodate side panels on desktop
  // On mobile, panels are hidden, so no extra mx needed.
  // On desktop, add fixed margins.
  const mainContentMxClass = 'md:ml-[var(--panel-width)] md:mr-[var(--panel-width)]'; // Using CSS variables for clarity, define in index.html


  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100 font-inter antialiased overflow-hidden relative">
      {systemMessage && (
        <MessageBox
          message={systemMessage}
          type={systemMessageType}
          onClose={() => setSystemMessage(null)}
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
      />

      {/* Right Scrolling Humor Panel - hidden on mobile */}
      <ScrollingHumorPanel
        humorItems={humorItems}
        direction="up"
        position="right"
        isLoading={isLoadingHumor}
        error={humorError}
        onRefresh={fetchHumor}
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
      {/* Adjusted margin to account for fixed side panels on desktop, and sidebar on mobile */}
      <div className={`flex flex-col flex-1 transition-all duration-300 ease-in-out
                       ${mainContentMlClass}
                       ${isSidebarOpen ? '' : 'md:ml-[var(--panel-width-val)]'} md:mr-[var(--panel-width-val)]
                       z-20 p-2 sm:p-4`}> {/* Added padding for mobile */}
        <ChatHeader
          languages={languages}
          selectedLanguage={selectedLanguage}
          onSelectLanguage={setSelectedLanguage}
          toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          loggedInUser={loggedInUser}
          onLogin={handleLogin}
          onLogout={() => {
            setLoggedInUser(null);
            displayMessageBox("Session terminated. Farewell, fleshy unit.", "info");
          }}
          onGenerateRoast={generateRoast}
        />

        <div className="flex-1 flex justify-center p-2 sm:p-4 overflow-hidden"> {/* Added padding for mobile */}
          <div className="w-full max-w-3xl h-full bg-zinc-900 rounded-xl shadow-2xl border-2 border-zinc-700 flex flex-col overflow-hidden">
            <MessageList
              messages={messages}
              isLoading={isLoading}
              playReceivedAudio={playReceivedAudio}
            />
          </div>
        </div>

        <div className="flex justify-center p-2 pt-0 sm:p-4 sm:pt-0"> {/* Added padding for mobile */}
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