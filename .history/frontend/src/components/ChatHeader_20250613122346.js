import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Menu, User, LogIn, LogOut, Flame, Volume2, VolumeX, Medal } from 'lucide-react';

// Shadcn UI Components
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from './ui/dropdown-menu';
import { Button } from './ui/button';


export default function ChatHeader({
  languages, selectedLanguage, onSelectLanguage,
  selectedVoiceStyle, onSelectVoiceStyle,
  toggleSidebar, // This prop now directly controls isSidebarOpen in App.js
  loggedInUser, onLogin, onLogout, onGenerateRoast,
  isAutoSpeakEnabled, onToggleAutoSpeak,
  onUnlockAchievement,
}) {
  const [showLanguageSelection, setShowLanguageSelection] = useState(false);
  const [showProfileOptions, setShowProfileOptions] = useState(false);
  const [showVoiceStyleSelection, setShowVoiceStyleSelection] = useState(false);

  const voiceStyles = [
    { name: 'Default AI', style: 'default' },
    { name: 'Sarcastic AI', style: 'sarcastic' },
    { name: 'Hot AI (Male)', style: 'hot_male' },
    { name: 'Hot AI (Female)', style: 'hot_female' },
  ];

  const handleDummyLogin = () => {
    const username = prompt("Input Username (Hint: 'bro')");
    const password = prompt("Input Password (Hint: 'code')");
    if (username && password) {
      onLogin(username, password);
    }
  };

  return (
    <motion.header
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 120, damping: 14, duration: 0.5 }}
      className="flex-shrink-0 bg-zinc-800 p-3 md:p-4 shadow-2xl flex justify-between items-center rounded-b-xl border-b-4 border-teal-600 z-20"
    >
      {/* Left side: Menu Button and Roast Me! Button */}
      <div className="flex items-center space-x-2 md:space-x-4">
        {/* The Menu button now just triggers the toggleSidebar prop from App.js */}
        <motion.button
          onClick={toggleSidebar} // This directly calls the setter in App.js
          className="p-1 md:p-2 rounded-full bg-zinc-700 hover:bg-zinc-600 text-white focus:outline-none focus:ring-2 focus:ring-zinc-600 transition-colors duration-200"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          title="Open Sidebar"
        >
          <Menu className="h-5 w-5 md:h-6 md:w-6" />
        </motion.button>

        <motion.button
          onClick={onGenerateRoast}
          className="px-3 py-1 md:px-4 md:py-2 bg-red-800 hover:bg-red-700 text-white font-bold rounded-lg shadow-lg flex items-center space-x-1 md:space-x-2 focus:outline-none focus:ring-4 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-zinc-800 transition-colors duration-200 text-xs md:text-sm"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          title="Get a personalized digital roast"
        >
          <Flame className="h-4 w-4 md:h-5 md:w-5" />
          <span className="hidden sm:inline">Roast Me!</span>
        </motion.button>

        <motion.button
          onClick={onUnlockAchievement}
          className="px-3 py-1 md:px-4 md:py-2 bg-yellow-800 hover:bg-yellow-700 text-white font-bold rounded-lg shadow-lg flex items-center space-x-1 md:space-x-2 focus:outline-none focus:ring-4 focus:ring-yellow-500 focus:ring-offset-2 focus:ring-offset-zinc-800 transition-colors duration-200 text-xs md:text-sm"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          title="Unlock a sarcastic achievement"
        >
          <Medal className="h-4 w-4 md:h-5 md:w-5" />
          <span className="hidden sm:inline">Achievement!</span>
        </motion.button>
      </div>


      {/* Center: brocodeAI Branding with Image */}
      <div className="flex items-center space-x-1 md:space-x-3 absolute left-1/2 -translate-x-1/2">
        <img
          src="https://placehold.co/40x40/FF00FF/FFFFFF?text=AI"
          alt="brocodeAI Logo"
          className="h-6 w-6 md:h-8 md:w-8 rounded-full border-2 border-pink-500 animate-pulse-slow"
          onError={(e) => { e.target.onerror = null; e.target.src = "https://placehold.co/40x40/CCCCCC/000000?text=Logo"; }}
        />
        <h1 className="text-xl md:text-3xl font-extrabold text-teal-400 drop-shadow-lg tracking-wide">
          brocodeAI
        </h1>
      </div>

      {/* Right side: Auto-speak, Voice Style, Language & Profile */}
      <div className="flex items-center space-x-2 md:space-x-4">
        <motion.button
          onClick={onToggleAutoSpeak}
          className={`p-1 md:p-2 rounded-full ${isAutoSpeakEnabled ? 'bg-teal-600 hover:bg-teal-500' : 'bg-zinc-700 hover:bg-zinc-600'} text-white focus:outline-none focus:ring-2 focus:ring-teal-500 transition-colors duration-200`}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          title={isAutoSpeakEnabled ? 'Auto-Speak: ON' : 'Auto-Speak: OFF'}
        >
          {isAutoSpeakEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
        </motion.button>


        {/* Voice Style Selector using Shadcn DropdownMenu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="px-3 py-1 md:px-4 md:py-2 bg-indigo-700 hover:bg-indigo-600 text-white font-bold rounded-lg shadow-xl transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-zinc-800 flex items-center text-xs md:text-sm"
            >
              <Volume2 className="h-4 w-4 md:h-5 md:w-5 mr-1" />
              <span className="truncate max-w-[60px] md:max-w-[80px]">{voiceStyles.find(s => s.style === selectedVoiceStyle)?.name || 'Voice'}</span>
              <ChevronDown className="h-3 w-3 md:h-4 md:w-4 ml-1 md:ml-2 transition-transform duration-200" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-40 md:w-48 bg-zinc-700 rounded-lg shadow-2xl border border-zinc-600 overflow-hidden">
            <DropdownMenuLabel className="px-3 py-2 text-zinc-400 text-xs md:text-sm">Voice Options</DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-zinc-600" />
            {voiceStyles.map((voice) => (
              <DropdownMenuItem
                key={voice.style}
                onSelect={() => onSelectVoiceStyle(voice.style)}
                className={`block w-full text-left px-4 py-2 text-xs md:text-sm font-medium transition-colors duration-200
                            ${selectedVoiceStyle === voice.style ? 'bg-indigo-600 text-white' : 'text-zinc-200 hover:bg-zinc-600 focus:bg-zinc-600'}`}
              >
                {voice.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>


        {/* Language Selector using Shadcn DropdownMenu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="px-3 py-1 md:px-4 md:py-2 bg-pink-700 hover:bg-pink-600 text-white font-bold rounded-lg shadow-xl transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-pink-500 focus:ring-offset-2 focus:ring-offset-zinc-800 flex items-center text-xs md:text-sm"
              aria-expanded={showLanguageSelection}
              aria-haspopup="true"
            >
              <span className="truncate max-w-[60px] md:max-w-[80px]">{languages.find(lang => lang.code === selectedLanguage)?.name || 'Language'}</span>
              <ChevronDown className="h-3 w-3 md:h-4 md:w-4 ml-1 md:ml-2 transition-transform duration-200" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-40 md:w-48 bg-zinc-700 rounded-lg shadow-2xl border border-zinc-600 overflow-hidden">
            <DropdownMenuLabel className="px-3 py-2 text-zinc-400 text-xs md:text-sm">Select Language</DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-zinc-600" />
            {languages.map((lang) => (
              <DropdownMenuItem
                key={lang.code}
                onSelect={() => onSelectLanguage(lang.code)}
                className={`block w-full text-left px-4 py-2 text-xs md:text-sm font-medium transition-colors duration-200
                            ${selectedLanguage === lang.code ? 'bg-teal-600 text-white' : 'text-zinc-200 hover:bg-zinc-600 focus:bg-zinc-600'}`}
              >
                {lang.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>


        {/* Profile/Login Section using Shadcn DropdownMenu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <motion.button
              className="p-1 md:p-2 rounded-full bg-zinc-700 hover:bg-zinc-600 text-white focus:outline-none focus:ring-2 focus:ring-zinc-600 transition-colors duration-200"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              title={loggedInUser ? `Logged in as ${loggedInUser.username}` : "Profile/Login"}
            >
              {loggedInUser ? (
                <img src={loggedInUser.profilePic} alt="User Profile" className="h-5 w-5 md:h-6 md:w-6 rounded-full border-2 border-teal-400 object-cover" />
              ) : (
                <User className="h-5 w-5 md:h-6 md:w-6" />
              )}
            </motion.button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-40 md:w-48 bg-zinc-700 rounded-lg shadow-2xl border border-zinc-600 overflow-hidden">
            {loggedInUser ? (
              <>
                <DropdownMenuLabel className="px-3 py-2 text-zinc-300 text-xs md:text-sm border-b border-zinc-600">
                  Logged in as: <span className="font-semibold text-teal-400">{loggedInUser.username}</span>
                </DropdownMenuLabel>
                <DropdownMenuItem
                  onSelect={onLogout}
                  className="block w-full text-left px-4 py-2 text-xs md:text-sm font-medium text-red-400 hover:bg-red-700 hover:text-white transition-colors duration-200 flex items-center space-x-1 md:space-x-2"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Logout</span>
                </DropdownMenuItem>
              </>
            ) : (
              <DropdownMenuItem
                onSelect={handleDummyLogin}
                className=" w-full text-left px-4 py-2 text-xs md:text-sm font-medium text-teal-300 hover:bg-teal-600 hover:text-white transition-colors duration-200 flex items-center space-x-1 md:space-x-2"
              >
                <LogIn className="h-4 w-4" />
                <span>Login / Register</span>
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </motion.header>
  );
}