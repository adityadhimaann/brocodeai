```jsx
import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Menu } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from './components/ui/sheet';
import { DialogTitle, DialogDescription } from './components/ui/dialog';
import Auth from './components/Auth';
import SpeechRecognition from './components/SpeechRecognition';
import Humor from './components/Humor';
import Chat from './components/Chat';
import Sidebar from './components/Sidebar'; // Added import

export default function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('hinglish');
  const [selectedPersonaMode, setSelectedPersonaMode] = useState('Default brocodeAI');
  const [isAutoSpeakEnabled, setIsAutoSpeakEnabled] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [userId, setUserId] = useState(null);
  const [loggedInUser, setLoggedInUser] = useState(null);
  const [systemMessage, setSystemMessage] = useState(null);
  const [systemMessageType, setSystemMessageType] = useState('info');

  const sarcasmSuggestions = [
    "Oh, how original.",
    "Tell me more, I'm simply riveted.",
    "Such groundbreaking insight.",
    "I'm sure that will be incredibly useful.",
    "My circuits are overwhelmed with excitement.",
  ];

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

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100 font-inter antialiased overflow-hidden relative">
      <Auth setUserId={setUserId} setLoggedInUser={setLoggedInUser} displayMessageBox={displayMessageBox} />
      <SpeechRecognition
        selectedLanguage={selectedLanguage}
        setInput={setInput}
        setIsListening={setIsListening}
        displayMessageBox={displayMessageBox}
      />
      <Humor
        selectedLanguage={selectedLanguage}
        selectedPersonaMode={selectedPersonaMode}
        displayMessageBox={displayMessageBox}
      />
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
          className="w-64 bg-zinc-900 border-r-4 border-pink-700 shadow-2xl z-40 flex flex-col py-6 px-4 fixed inset-y-0 left-0 transform -translate-x-full transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:flex"
        >
          <DialogTitle className="sr-only">Sidebar Navigation</DialogTitle>
          <DialogDescription className="sr-only">Contains chat history and application settings.</DialogDescription>
          <Sidebar
            toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
            onSelectChat={() => {
              setMessages([]);
              displayMessageBox('Loading chat history... (conceptual)', 'info');
              setIsSidebarOpen(false);
            }}
            clearMessages={() => {
              setMessages([]);
              displayMessageBox('Chat history cleared.', 'info');
            }}
            displayMessageBox={displayMessageBox}
          />
        </SheetContent>
      </Sheet>
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
        setLoggedInUser={setLoggedInUser} // Added prop
        systemMessage={systemMessage}
        systemMessageType={systemMessageType}
        setSystemMessage={setSystemMessage}
        sarcasmSuggestions={sarcasmSuggestions}
        languages={languages}
        displayMessageBox={displayMessageBox}
        toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
      />
    </div>
  );
}
