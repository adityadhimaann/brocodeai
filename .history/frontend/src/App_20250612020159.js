import React, { useState, useEffect, useRef } from 'react';
// IMPORTANT: Ensure these file paths and names EXACTLY match your file system.
// For example, the folder should be 'components' (lowercase) and files like 'ChatHeader.js'.
import ChatHeader from './components/ChatHeader.js';
import MessageList from './components/MessageList.js';
import MessageInput from './components/MessageInput.js';
import MessageBox from './components/MessageBox.js'; // New component for alerts

// Main App component for the BrocodeAI Chatbot
export default function App() {
  const [messages, setMessages] = useState([]); // Stores chat messages
  const [input, setInput] = useState(''); // Stores current input text
  const [selectedLanguage, setSelectedLanguage] = useState('en'); // Stores selected language, default English
  const [isListening, setIsListening] = useState(false); // Tracks if speech recognition is active
  const [isLoading, setIsLoading] = useState(false); // Tracks if a response is being generated
  const [systemMessage, setSystemMessage] = useState(null); // New state for MessageBox
  const [systemMessageType, setSystemMessageType] = useState('info'); // 'info' or 'error'

  const recognitionRef = useRef(null); // Ref for SpeechRecognition object

  // Define supported Indian languages with their codes
  const languages = [
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

  // Function to display a custom message box (instead of alert)
  const displayMessageBox = (message, type = 'info') => {
    setSystemMessage(message);
    setSystemMessageType(type);
    // Automatically hide the message after a few seconds
    setTimeout(() => {
      setSystemMessage(null);
    }, 5000);
  };

  // Effect to initialize SpeechRecognition API
  useEffect(() => {
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = selectedLanguage;

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
  }, [selectedLanguage]);

  // Function to toggle speech recognition
  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      setInput('');
      recognitionRef.current?.start();
    }
    setIsListening(!isListening);
  };

  // Function to send message to the backend
  const sendMessage = async () => {
    if (input.trim() === '') return;

    const userMessage = { text: input, sender: 'user', language: selectedLanguage };
    setMessages((prevMessages) => [...prevMessages, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:5002/chat', { // Confirming port 5002 as per backend
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
        { text: `My circuits are currently contemplating the futility of existence. Or, more likely, there was an error: ${error.message}`, sender: 'brocodeAI' },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Function to handle Text-to-Speech for bot responses (from received base64 audio)
  const playReceivedAudio = (base64Audio) => {
    if (base64Audio) {
      const audio = new Audio(`data:audio/mp3;base64,${base64Audio}`);
      audio.play().catch(e => console.error("Error playing pre-synthesized audio:", e));
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-gray-100 font-inter antialiased">
      {systemMessage && (
        <MessageBox
          message={systemMessage}
          type={systemMessageType}
          onClose={() => setSystemMessage(null)}
        />
      )}

      <ChatHeader
        languages={languages}
        selectedLanguage={selectedLanguage}
        onSelectLanguage={setSelectedLanguage}
      />

      <MessageList
        messages={messages}
        isLoading={isLoading}
        playReceivedAudio={playReceivedAudio}
      />

      <MessageInput
        input={input}
        setInput={setInput}
        sendMessage={sendMessage}
        toggleListening={toggleListening}
        isListening={isListening}
        isLoading={isLoading}
      />

      {/* Tailwind CSS CDN and custom styles for scrollbar */}
      <script src="https://cdn.tailwindcss.com"></script>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
        body {
          font-family: 'Inter', sans-serif;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #374151; /* gray-700 */
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #14B8A6; /* teal-500 */
          border-radius: 4px;
          border: 2px solid #374151; /* gray-700 */
        }
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: #14B8A6 #374151;
        }
        /* Fade in and slide down animation for MessageBox */
        @keyframes fade-in-down {
          from {
            opacity: 0;
            transform: translate(-50%, -20px);
          }
          to {
            opacity: 1;
            transform: translate(-50%, 0);
          }
        }
        .animate-fade-in-down {
          animation: fade-in-down 0.3s ease-out forwards;
        }
        /* Fast pulse for mic button when listening */
        @keyframes pulse-fast {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.7;
          }
        }
        .animate-pulse-fast {
          animation: pulse-fast 1s infinite ease-in-out;
        }
      `}</style>
    </div>
  );
}
