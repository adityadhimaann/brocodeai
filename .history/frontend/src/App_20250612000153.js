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
        alert(`Speech recognition error: ${event.error}. Please try again.`); // User-friendly alert
      };
    } else {
      console.warn('Web Speech API not supported in this browser.');
      alert('Your browser does not support Web Speech API for voice input.');
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

  // Function to send message
  const sendMessage = async () => {
    if (input.trim() === '') return; // Prevent sending empty messages

    const userMessage = { text: input, sender: 'user', language: selectedLanguage };
    setMessages((prevMessages) => [...prevMessages, userMessage]); // Add user message to chat
    setInput(''); // Clear input field
    setIsLoading(true); // Show loading indicator

    try {
      // Simulate API call to backend (replace with actual fetch to your Python backend)
      // The backend would handle:
      // 1. Sending the `input` (user's text) and `selectedLanguage` to your Python backend.
      // 2. The backend would then call Google Cloud Speech-to-Text (if from voice input)
      //    or directly pass the text to Gemini-2.0-flash.
      // 3. Gemini-2.0-flash generates a response (with sarcasm/humor based on prompting).
      // 4. The backend calls Google Cloud Text-to-Speech to get an audio response (optional).
      // 5. The backend sends both text and audio URL back to the frontend.

      const prompt = `Act as a sarcastic, witty, funny, professional, and highly knowledgeable chatbot named brocodeAI. 
      Your responses should be insightful, updated, and subtly humorous or ironic. 
      The user's query is in ${languages.find(lang => lang.code === selectedLanguage).name}: "${userMessage.text}". 
      Respond in ${languages.find(lang => lang.code === selectedLanguage).name}.`;

      // API call to Gemini-2.0-flash directly from frontend (for demo purposes)
      // In a real application, this would go through your backend
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
        }),
      });

      const result = await response.json();
      let botResponseText = 'Oops! brocodeAI is currently pondering the meaning of life (or just had a minor glitch).';

      if (result.candidates && result.candidates.length > 0 &&
          result.candidates[0].content && result.candidates[0].content.parts &&
          result.candidates[0].content.parts.length > 0) {
        botResponseText = result.candidates[0].content.parts[0].text;
      }

      const botMessage = { text: botResponseText, sender: 'brocodeAI' };
      setMessages((prevMessages) => [...prevMessages, botMessage]);

      // Simulate TTS playback from backend (replace with actual audio playback)
      // In a real app, if your backend returned an audio URL, you'd play it here:
      // const audio = new Audio(audioUrl);
      // audio.play();

    } catch (error) {
      console.error('Error sending message or getting response:', error);
      setMessages((prevMessages) => [
        ...prevMessages,
        { text: 'My circuits are a bit fried. Try again later, puny human.', sender: 'brocodeAI' },
      ]);
    } finally {
      setIsLoading(false); // Hide loading indicator
    }
  };

  // Function to handle Text-to-Speech for bot responses (conceptual)
  const speakResponse = async (text, languageCode) => {
    // In a real application, this would involve a backend call to Google Cloud Text-to-Speech.
    // For now, we'll use the browser's SpeechSynthesis API for demonstration.
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      // Attempt to find a suitable voice for the selected language
      const voices = window.speechSynthesis.getVoices();
      const voice = voices.find(v => v.lang.startsWith(languageCode));
      if (voice) {
        utterance.voice = voice;
      } else {
        console.warn(`No voice found for ${languageCode}. Using default.`);
      }
      window.speechSynthesis.speak(utterance);
    } else {
      console.warn('Web Speech Synthesis API not supported in this browser.');
      alert('Your browser does not support text-to-speech.');
    }
  };

  // Function to handle language change
  const handleLanguageChange = (event) => {
    setSelectedLanguage(event.target.value);
    setShowLanguageSelection(false); // Hide dropdown after selection
    // You might want to clear messages or restart conversation when language changes
    setMessages([]);
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
            <p className="text-sm mt-2">Try asking something in your preferred Indian language!</p>
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
              {msg.sender === 'brocodeAI' && (
                <button
                  onClick={() => speakResponse(msg.text, selectedLanguage)}
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
          disabled={isLoading}
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
              d="M14 5l7 7m0 0l-7 7m7-7H3"
            />
          </svg>
        </button>
      </div>

      {/* Tailwind CSS CDN and custom styles for scrollbar */}
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
