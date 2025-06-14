import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Menu, User, LogIn, LogOut, Flame, Volume2, VolumeX, Medal, MessageSquareMore, SlidersHorizontal } from 'lucide-react';

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from './ui/dropdown-menu';
import { Button } from './ui/button';


export default function ChatHeader({
  languages, selectedLanguage, onSelectLanguage,
  selectedVoiceStyle, onSelectVoiceStyle,
  toggleSidebar, // This prop will now directly toggle the isSidebarOpen state in App.js directly
  loggedInUser, onLogin, onLogout, onGenerateRoast,
  isAutoSpeakEnabled, onToggleAutoSpeak,
  onUnlockAchievement,
  personalityMode, // NEW: Pass personalityMode to highlight selected
  onSelectPersonalityMode, // NEW: Pass setter for personalityMode
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

  // NEW: Desi Personality Modes
  const personalityModes = [
    { name: 'Default brocodeAI', mode: 'default_ai' },
    { name: 'Taau with Trust Issues', mode: 'taau_trust_issues' },
    { name: 'Pados Wali Aunty', mode: 'pados_wali_aunty' },
    { name: 'Delhi Dude (Ranveer)', mode: 'delhi_dude_ranveer' },
    { name: 'School ke Topper ka Toxic Ghost', mode: 'topper_toxic_ghost' },
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
      // Use flex-row for horizontal alignment, items-center for vertical, and flex-wrap on small screens
      // gap-x-2 for horizontal spacing, gap-y-2 for vertical wrapping
      className="flex flex-row flex-wrap items-center justify-between gap-x-2 gap-y-2 px-3 py-3 md:px-4 md:py-4 bg-zinc-800 shadow-2xl rounded-b-xl border-b-4 border-teal-600 z-20 w-full" /* w-full here for full width */
    >
      {/* Left Block: Menu Button (mobile only), and NEW Modes Dropdown */}
      <div className="flex items-center gap-x-2 flex-shrink-0">
        <motion.button
          onClick={toggleSidebar} // This directly calls the setter in App.js
          className="p-1 md:p-2 rounded-full bg-zinc-700 hover:bg-zinc-600 text-white focus:outline-none focus:ring-2 focus:ring-zinc-600 transition-colors duration-200 md:hidden" // Hidden on desktop
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          title="Open Sidebar"
        >
          <Menu className="h-5 w-5" />
        </motion.button>

        {/* NEW: Modes Dropdown Button */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="px-2 py-1 bg-purple-700 hover:bg-purple-600 text-white font-bold rounded-lg shadow-xl transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-zinc-800 flex items-center text-xs sm:px-3 sm:py-1 md:px-4 md:py-2 md:text-sm flex-shrink-0"
            >
              <SlidersHorizontal className="h-4 w-4 mr-1" />
              <span>Modes</span>
              <ChevronDown className="h-3 w-3 ml-1 transition-transform duration-200" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-40 md:w-48 bg-zinc-700 rounded-lg shadow-2xl border border-zinc-600 overflow-hidden">
            <DropdownMenuLabel className="px-3 py-2 text-zinc-400 text-xs md:text-sm">brocodeAI Modes</DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-zinc-600" />
            {personalityModes.map((modeOption) => ( // Render personality modes
              <DropdownMenuItem
                key={modeOption.mode}
                onSelect={() => onSelectPersonalityMode(modeOption.mode)}
                className={`block w-full text-left px-4 py-2 text-xs md:text-sm font-medium transition-colors duration-200
                            ${personalityMode === modeOption.mode ? 'bg-purple-600 text-white' : 'text-zinc-200 hover:bg-zinc-600 focus:bg-zinc-600'}`}
              >
                {modeOption.name}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator className="bg-zinc-600" /> {/* Separator for action modes */}
            <DropdownMenuItem
              onSelect={onGenerateRoast}
              className="block w-full text-left px-4 py-2 text-xs md:text-sm font-medium text-red-400 hover:bg-zinc-600 focus:bg-zinc-600 flex items-center space-x-1"
            >
              <Flame className="h-4 w-4" />
              <span>Roast Me!</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={onUnlockAchievement}
              className="block w-full text-left px-4 py-2 text-xs md:text-sm font-medium text-yellow-400 hover:bg-zinc-600 focus:bg-zinc-600 flex items-center space-x-1"
            >
              <Medal className="h-4 w-4" />
              <span>Achievement!</span>
            </DropdownMenuItem>
            {/* Add more modes here later */}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>


      {/* Center Block: brocodeAI Branding */}
      {/* Removed absolute positioning. Use mx-auto to center within available flex space */}
      <div className="flex items-center gap-x-1 md:gap-x-3 mx-auto flex-shrink-0">
        <MessageSquareMore
          className="h-6 w-6 md:h-8 md:w-8 text-pink-500 animate-pulse-slow p-0.5"
          alt="brocodeAI Logo"
        />
        <h1 className="text-xl md:text-3xl font-extrabold text-teal-400 drop-shadow-lg tracking-wide whitespace-nowrap">
          brocodeAI
        </h1>
      </div>

      {/* Right Block: Auto-speak, Voice Style, Language & Profile */}
      <div className="flex items-center gap-x-2 flex-shrink-0">
        <motion.button
          onClick={onToggleAutoSpeak}
          className={`p-1 md:p-2 rounded-full ${isAutoSpeakEnabled ? 'bg-teal-600 hover:bg-teal-500' : 'bg-zinc-700 hover:bg-zinc-600'} text-white focus:outline-none focus:ring-2 focus:ring-teal-500 transition-colors duration-200 flex-shrink-0`}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          title={isAutoSpeakEnabled ? 'Auto-Speak: ON' : 'Auto-Speak: OFF'}
        >
          {isAutoSpeakEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
        </motion.button>


        {/* Voice Style Selector */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="px-2 py-1 bg-indigo-700 hover:bg-indigo-600 text-white font-bold rounded-lg shadow-xl transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-zinc-800 flex items-center text-xs sm:px-3 sm:py-1 md:px-4 md:py-2 md:text-sm flex-shrink-0"
            >
              <Volume2 className="h-4 w-4 mr-1" />
              <span className="truncate max-w-[40px] sm:max-w-[60px] md:max-w-[80px]">
                {voiceStyles.find(s => s.style === selectedVoiceStyle)?.name || 'Voice'}
              </span>
              <ChevronDown className="h-3 w-3 ml-1 transition-transform duration-200" />
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


        {/* Language Selector */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="px-2 py-1 bg-pink-700 hover:bg-pink-600 text-white font-bold rounded-lg shadow-xl transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-pink-500 focus:ring-offset-2 focus:ring-offset-zinc-800 flex items-center text-xs sm:px-3 sm:py-1 md:px-4 md:py-2 md:text-sm flex-shrink-0"
              aria-expanded={showLanguageSelection}
              aria-haspopup="true"
            >
              <span className="truncate max-w-[40px] sm:max-w-[60px] md:max-w-[80px]">{languages.find(lang => lang.code === selectedLanguage)?.name || 'Language'}</span>
              <ChevronDown className="h-3 w-3 ml-1 transition-transform duration-200" />
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


        {/* Profile/Login Section */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <motion.button
              className="p-1 md:p-2 rounded-full bg-zinc-700 hover:bg-zinc-600 text-white focus:outline-none focus:ring-2 focus:ring-zinc-600 transition-colors duration-200 flex-shrink-0"
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
            <DropdownMenuLabel className="px-3 py-2 text-zinc-300 text-xs md:text-sm border-b border-zinc-600">
              {loggedInUser ? `Logged in as: ${loggedInUser.username}` : "Account"}
            </DropdownMenuLabel>
            {loggedInUser ? (
              <DropdownMenuItem
                onSelect={onLogout}
                className="block w-full text-left px-4 py-2 text-xs md:text-sm font-medium text-red-400 hover:bg-red-700 hover:text-white transition-colors duration-200 flex items-center space-x-1 md:space-x-2"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                onSelect={handleDummyLogin}
                className="block w-full text-left px-4 py-2 text-xs md:text-sm font-medium text-teal-300 hover:bg-teal-600 hover:text-white transition-colors duration-200 flex items-center space-x-1 md:space-x-2"
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