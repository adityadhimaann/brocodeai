import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, MessageSquareMore, Menu, User, LogIn, LogOut } from 'lucide-react';

export default function ChatHeader({ languages, selectedLanguage, onSelectLanguage, toggleSidebar, loggedInUser, onLogin, onLogout }) {
  const [showLanguageSelection, setShowLanguageSelection] = useState(false);
  const [showProfileOptions, setShowProfileOptions] = useState(false);

  const handleDummyLogin = () => {
    const username = prompt("Input Username (Hint: 'bro')");
    const password = prompt("Input Password (Hint: 'code')");
    if (username && password) {
      onLogin(username, password);
    }
    setShowProfileOptions(false);
  };

  return (
    <motion.header
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 120, damping: 14, duration: 0.5 }}
      className="flex-shrink-0 bg-zinc-800 p-4 shadow-2xl flex justify-between items-center rounded-b-xl border-b-4 border-teal-600 z-20"
    >
      <motion.button
        onClick={toggleSidebar}
        className="p-2 rounded-full bg-zinc-700 hover:bg-zinc-600 text-white focus:outline-none focus:ring-2 focus:ring-zinc-600 transition-colors duration-200"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        title="Open Sidebar"
      >
        <Menu className="h-6 w-6" />
      </motion.button>

      <div className="flex items-center space-x-3 absolute left-1/2 -translate-x-1/2">
        <MessageSquareMore className="h-8 w-8 text-pink-500 animate-pulse-slow" />
        <h1 className="text-3xl font-extrabold text-teal-400 drop-shadow-lg tracking-wide">
          brocodeAI
        </h1>
      </div>

      <div className="flex items-center space-x-4">
        <div className="relative">
          <button
            onClick={() => setShowLanguageSelection(!showLanguageSelection)}
            className="px-4 py-2 bg-pink-700 hover:bg-pink-600 text-white font-bold rounded-lg shadow-xl transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-pink-500 focus:ring-offset-2 focus:ring-offset-zinc-800 flex items-center text-sm"
            aria-expanded={showLanguageSelection}
            aria-haspopup="true"
          >
            <span className="truncate max-w-[80px]">{languages.find(lang => lang.code === selectedLanguage)?.name || 'Language'}</span>
            <ChevronDown className={`h-4 w-4 ml-2 transition-transform duration-200 ${showLanguageSelection ? 'rotate-180' : 'rotate-0'}`} />
          </button>
          <AnimatePresence>
            {showLanguageSelection && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="absolute right-0 mt-3 w-48 bg-zinc-700 rounded-lg shadow-2xl z-10 border border-zinc-600 overflow-hidden"
              >
                {languages.map((lang) => (
                  <motion.button
                    key={lang.code}
                    onClick={() => {
                      onSelectLanguage(lang.code);
                      setShowLanguageSelection(false);
                    }}
                    whileHover={{ backgroundColor: '#2dd4bf', color: '#18181b' }}
                    whileTap={{ scale: 0.95 }}
                    className={`block w-full text-left px-5 py-2 text-sm font-medium transition-colors duration-200
                                ${selectedLanguage === lang.code ? 'bg-teal-600 text-white' : 'text-zinc-200 hover:text-white'}`}
                  >
                    {lang.name}
                  </motion.button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="relative">
          <motion.button
            onClick={() => setShowProfileOptions(!showProfileOptions)}
            className="p-2 rounded-full bg-zinc-700 hover:bg-zinc-600 text-white focus:outline-none focus:ring-2 focus:ring-zinc-600 transition-colors duration-200"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            title={loggedInUser ? `Logged in as ${loggedInUser.username}` : "Profile/Login"}
          >
            {loggedInUser ? (
              <img src={loggedInUser.profilePic} alt="User Profile" className="h-6 w-6 rounded-full border-2 border-teal-400 object-cover" />
            ) : (
              <User className="h-6 w-6" />
            )}
          </motion.button>
          <AnimatePresence>
            {showProfileOptions && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="absolute right-0 mt-3 w-48 bg-zinc-700 rounded-lg shadow-2xl z-10 border border-zinc-600 overflow-hidden"
              >
                {loggedInUser ? (
                  <>
                    <div className="px-5 py-3 text-sm text-zinc-300 border-b border-zinc-600">
                      Logged in as: <span className="font-semibold text-teal-400">{loggedInUser.username}</span>
                    </div>
                    <motion.button
                      onClick={() => { onLogout(); setShowProfileOptions(false); }}
                      whileHover={{ backgroundColor: '#dc2626', color: '#fff' }}
                      whileTap={{ scale: 0.95 }}
                      className="block w-full text-left px-5 py-2 text-sm font-medium text-red-400 hover:text-white transition-colors duration-200 flex items-center space-x-2"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Logout</span>
                    </motion.button>
                  </>
                ) : (
                  <motion.button
                    onClick={handleDummyLogin}
                    whileHover={{ backgroundColor: '#10b981', color: '#fff' }}
                    whileTap={{ scale: 0.95 }}
                    className="block w-full text-left px-5 py-2 text-sm font-medium text-teal-300 hover:text-white transition-colors duration-200 flex items-center space-x-2"
                  >
                    <LogIn className="h-4 w-4" />
                    <span>Login / Register</span>
                  </motion.button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.header>
  );
}