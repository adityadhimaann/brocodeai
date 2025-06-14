import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
// Import all components with explicit .js extensions
import ChatHeader from './components/ChatHeader.js';
import MessageList from './components/MessageList.js';
import MessageInput from './components/MessageInput.js';
import MessageBox from './components/MessageBox.js';
import Sidebar from './components/Sidebar.js'; // New Sidebar component
import FloatingMemePanel from './components/FloatingMemePanel.js'; // New FloatingMemePanel component

// Main App component for the BrocodeAI Chatbot
export default function App() {
  const [messages, setMessages] = useState([]); // Stores chat messages
  const [input, setInput] = useState(''); // Stores current input text
  const [selectedLanguage, setSelectedLanguage] = useState('en'); // Stores selected language, default English
  const [isListening, setIsListening] = useState(false); // Tracks if speech recognition is active
  const [isLoading, setIsLoading] = useState(false); // Tracks if a response is being generated
  const [systemMessage, setSystemMessage] = useState(null); // State for MessageBox message
  const [systemMessageType, setSystemMessageType] = useState('info'); // State for MessageBox type ('info' or 'error')
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // State for sidebar visibility
  const [loggedInUser, setLoggedInUser] = useState(null); // Conceptual: for user login status { username: string, profilePic: string }

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
    }, 5000); // Message disappears after 5 seconds
  };

  // Effect to initialize SpeechRecognition API
  useEffect(() => {
    // Check if the Web Speech API is available in the browser
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false; // Capture a single utterance
      recognitionRef.current.interimResults = false; // Only return final results
      recognitionRef.current.lang = selectedLanguage; // Set language for recognition

      // Event listener for when a speech recognition result is received
      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript); // Set the transcribed text as input
        setIsListening(false); // Stop listening after result
        recognitionRef.current.stop(); // Explicitly stop recognition
      };

      // Event listener for when speech recognition ends
      recognitionRef.current.onend = () => {
        setIsListening(false); // Update listening state
      };

      // Event listener for speech recognition errors
      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false); // Stop listening on error
        displayMessageBox(`Speech recognition error: ${event.error}. Please try again.`, 'error');
      };
    } else {
      console.warn('Web Speech API not supported in this browser.');
      displayMessageBox('Your browser does not support Web Speech API for voice input.', 'error');
    }

    // Cleanup function: stop recognition if component unmounts or language changes
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [selectedLanguage]); // Re-initialize if selectedLanguage changes

  // Function to toggle speech recognition
  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop(); // Stop if already listening
    } else {
      setInput(''); // Clear input field before starting new recognition
      recognitionRef.current?.start(); // Start listening
    }
    setIsListening(!isListening); // Toggle listening state
  };

  // Function to send message to the backend
  const sendMessage = async () => {
    if (input.trim() === '') return; // Prevent sending empty messages

    const userMessage = { text: input, sender: 'user', language: selectedLanguage };
    setMessages((prevMessages) => [...prevMessages, userMessage]); // Add user message to chat
    setInput(''); // Clear input field
    setIsLoading(true); // Show loading indicator

    try {
      // Send message to the backend API
      // IMPORTANT: Ensure this URL matches your backend's running address and port.
      // Based on your previous context, the backend is expected on port 5002.
      const response = await fetch('http://localhost:5002/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: userMessage.text,
          language: userMessage.language,
          // Sending a limited chat history for context (e.g., last 5 turns)
          history: messages.slice(-5).map(msg => ({ text: msg.text, sender: msg.sender })),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Network response was not ok.');
      }

      const result = await response.json();
      const botResponseText = result.text;
      const botAudioBase64 = result.audio; // Base64 encoded audio from backend

      const botMessage = { text: botResponseText, sender: 'brocodeAI', audio: botAudioBase64 };
      setMessages((prevMessages) => [...prevMessages, botMessage]);

      // Play the audio response received from the backend
      if (botAudioBase64) {
        // Create an Audio object from the base64 data
        const audio = new Audio(`data:audio/mp3;base64,${botAudioBase64}`); // Assuming MP3 format
        audio.play().catch(e => console.error("Error playing audio:", e));
      }

    } catch (error) {
      console.error('Error sending message or getting response:', error);
      // Display error message using the custom MessageBox
      displayMessageBox(`My circuits are currently contemplating the futility of existence. Or, more likely, there was an error: ${error.message}`, 'error');
      // Also add a system message to the chat for visibility
      setMessages((prevMessages) => [
        ...prevMessages,
        { text: `System message: ${error.message}`, sender: 'brocodeAI' },
      ]);
    } finally {
      setIsLoading(false); // Hide loading indicator
    }
  };

  // Function to handle Text-to-Speech for bot responses (from received base64 audio)
  const playReceivedAudio = (base64Audio) => { // Corrected parameter name
    if (base64Audio) { // Now correctly uses base64Audio
      const audio = new Audio(`data:audio/mp3;base64,${base64Audio}`); // Now correctly uses base64Audio
      audio.play().catch(e => console.error("Error playing pre-synthesized audio:", e));
    }
  };

  // Dummy function for selecting chat history (conceptual)
  const handleSelectChat = (chatId) => {
    console.log(`Selected chat: ${chatId}. In a real app, this would load chat history.`);
    // Here, you would fetch the messages for the selected chatId from your backend
    // For now, let's clear current messages and simulate a new chat
    setMessages([]);
    displayMessageBox(`Loading chat ${chatId} history... (conceptual)`, 'info');
    setIsSidebarOpen(false); // Close sidebar after selecting chat
  };

  // Dummy login function (conceptual)
  const handleLogin = (username, password) => {
    console.log(`Attempting login for ${username}... (conceptual)`);
    // In a real app, this would call a backend auth endpoint
    if (username === "bro" && password === "code") { // Simple dummy check
      setLoggedInUser({ username: "Agent_47", profilePic: "https://placehold.co/150x150/FF00FF/FFFFFF?text=A47" });
      displayMessageBox("Authentication successful. Welcome, Agent_47.", "info");
    } else {
      displayMessageBox("Authentication failed. Invalid credentials. Access denied.", "error");
    }
  };

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100 font-inter antialiased overflow-hidden">
      {/* Conditionally render the MessageBox */}
      {systemMessage && (
        <MessageBox
          message={systemMessage}
          type={systemMessageType}
          onClose={() => setSystemMessage(null)}
        />
      )}

      {/* Sidebar Component */}
      <Sidebar
        isOpen={isSidebarOpen}
        toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        onSelectChat={handleSelectChat}
      />

      {/* Main Content Area */}
      {/* Adjusting ml-64 to accommodate the sidebar when open */}
      <div className={`flex flex-col flex-1 transition-all duration-300 ease-in-out ${isSidebarOpen ? 'md:ml-64' : 'ml-0'}`}>
        {/* Chat Header Component */}
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
        />

        {/* Main Chat Window Content Area */}
        <div className="flex-1 flex justify-center p-4 overflow-hidden">
          <div className="w-full max-w-3xl h-full bg-zinc-900 rounded-xl shadow-2xl border-2 border-zinc-700 flex flex-col overflow-hidden">
            <MessageList
              messages={messages}
              isLoading={isLoading}
              playReceivedAudio={playReceivedAudio}
            />
          </div>
        </div>

        {/* Message Input Component Area */}
        <div className="flex justify-center p-4 pt-0">
            <MessageInput
                input={input}
                setInput={setInput}
                sendMessage={sendMessage}
                toggleListening={toggleListening}
                isListening={isListening}
                isLoading={isLoading}
            />
        </div>
      </div>

      {/* Floating Meme Panel */}
      <FloatingMemePanel />
    </div>
  );
}