import React, { useState, useEffect, useRef } from 'react';

// Main App component for the BrocodeAI Chatbot
export default function App() {
  const [messages, setMessages] = useState([]); // Stores chat messages
  const [input, setInput] = useState(''); // Stores current input text
  const [selectedLanguage, setSelectedLanguage] = useState('en'); // Stores selected language, default English
  const [isListening, setIsListening] = useState(false); // Tracks if speech recognition is active
  const [isLoading, setIsLoading] = useState(false); // Tracks if a response is being generated
  const [showLanguageSelection, setShowLanguageSelection] = useState(false); // Controls language selection dropdown visibility
  const messagesEndRef = useRef(null); // Ref for scrolling to the latest message
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

  // Effect to scroll to the bottom of the chat on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Effect to initialize SpeechRecognition API
  useEffect(() => {
    // Check if the Web Speech API is available in the browser
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false; // Capture a single utterance
      recognitionRef.current.interimResults = false; // Only return final results
      recognitionRef.current.lang = selectedLanguage; // Set initial language for recognition

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
        // Using a custom modal or message box instead of alert()
        displayMessageBox(`Speech recognition error: ${event.error}. Please try again.`);
      };
    } else {
      console.warn('Web Speech API not supported in this browser.');
      displayMessageBox('Your browser does not support Web Speech API for voice input.');
    }

    // Cleanup function: stop recognition if component unmounts or language changes
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [selectedLanguage]); // Re-initialize if selectedLanguage changes

  // Function to display a custom message box (instead of alert)
  const displayMessageBox = (message) => {
    // In a real application, you'd render a modal or toast notification
    // For this example, we'll log to console and simulate a visual cue
    console.log("MESSAGE BOX:", message);
    // You could update a state variable here to show a temporary message on screen
    // e.g., setInfoMessage(message);
    // and then clear it after a few seconds
  };

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
      const response = await fetch('http://localhost:5000/chat', { // !!! IMPORTANT: Change to your backend URL in production !!!
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: userMessage.text,
          language: userMessage.language,
          // You might send limited chat history for context, e.g., last 5 turns
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
        const audio = new Audio(`data:audio/mp3;base64,${botAudioBase64}`); // Assuming MP3, adjust if needed
        audio.play().catch(e => console.error("Error playing audio:", e));
      }

    } catch (error) {
      console.error('Error sending message or getting response:', error);
      setMessages((prevMessages) => [
        ...prevMessages,
        { text: `My circuits are currently contemplating the futility of existence. Or, more likely, there was an error: ${error.message}`, sender: 'brocodeAI' },
      ]);
    } finally {
      setIsLoading(false); // Hide loading indicator
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
      {/* Header */}
      <header className="flex-shrink-0 bg-gray-800 p-4 shadow-lg flex justify-between items-center rounded-b-lg">
        <h1 className="text-2xl font-bold text-teal-400">brocodeAI</h1>
        <div className="relative">
          <button
            onClick={() => setShowLanguageSelection(!showLanguageSelection)}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-md shadow-md transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 focus:ring-offset-gray-800"
          >
            {languages.find(lang => lang.code === selectedLanguage)?.name || 'Select Language'}
            <span className="ml-2">&#9662;</span> {/* Dropdown arrow */}
          </button>
          {showLanguageSelection && (
            <div className="absolute right-0 mt-2 w-48 bg-gray-700 rounded-md shadow-xl z-10">
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => setSelectedLanguage(lang.code)}
                  className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-600 rounded-md ${selectedLanguage === lang.code ? 'bg-teal-700 text-white' : 'text-gray-200'}`}
                >
                  {lang.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* Chat Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {messages.length === 0 && (
          <div className="text-center text-gray-400 mt-20">
            <p className="text-lg">Welcome to brocodeAI! How can I humorously assist you today?</p>
            <p className="text-sm mt-2">Try asking something in your preferred Indian language, or click the mic to speak!</p>
          </div>
        )}
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-md p-3 rounded-xl shadow-md ${
                msg.sender === 'user'
                  ? 'bg-blue-600 text-white rounded-br-none'
                  : 'bg-gray-700 text-gray-100 rounded-bl-none'
              }`}
            >
              <p className="font-semibold">{msg.sender === 'user' ? 'You' : 'brocodeAI'}</p>
              <p className="mt-1">{msg.text}</p>
              {msg.sender === 'brocodeAI' && msg.audio && (
                <button
                  onClick={() => playReceivedAudio(msg.audio)}
                  className="mt-2 text-sm text-teal-300 hover:text-teal-200 focus:outline-none"
                  title="Listen to response"
                >
                  🔊 Listen
                </button>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="max-w-md p-3 rounded-xl rounded-bl-none bg-gray-700 text-gray-100 shadow-md">
              <p className="font-semibold">brocodeAI</p>
              <div className="flex items-center space-x-2">
                <div className="h-2 w-2 bg-teal-400 rounded-full animate-bounce delay-100"></div>
                <div className="h-2 w-2 bg-teal-400 rounded-full animate-bounce delay-200"></div>
                <div className="h-2 w-2 bg-teal-400 rounded-full animate-bounce delay-300"></div>
                <span className="ml-2 text-sm">Thinking... probably about your questionable life choices.</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} /> {/* Scroll target */}
      </div>

      {/* Input Area */}
      <div className="flex-shrink-0 bg-gray-800 p-4 border-t border-gray-700 flex items-center space-x-3 rounded-t-lg">
        <input
          type="text"
          className="flex-1 p-3 rounded-full bg-gray-700 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
          placeholder="Ask brocodeAI anything..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              sendMessage();
            }
          }}
          disabled={isLoading || isListening}
        />
        <button
          onClick={toggleListening}
          className={`p-3 rounded-full ${
            isListening ? 'bg-red-600 animate-pulse' : 'bg-pink-600 hover:bg-pink-700'
          } text-white shadow-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 focus:ring-offset-gray-800`}
          title={isListening ? 'Stop Listening' : 'Start Voice Input'}
          disabled={isLoading}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a4 4 0 11-8 0 4 4 0 018 0z"
            />
          </svg>
        </button>
        <button
          onClick={sendMessage}
          className="p-3 rounded-full bg-teal-600 hover:bg-teal-700 text-white shadow-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 focus:ring-offset-gray-800"
          title="Send Message"
          disabled={isLoading || input.trim() === ''}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M14 5l7 7m0 0l-7 7m7-7H3"
            />
          </svg>
        </button>
      </div>

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
      `}</style>
    </div>
  );
}
