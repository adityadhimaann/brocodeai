import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, History, Plus, X, Search, MoreVertical, LogOut, User, Flame } from 'lucide-react'; // Added Flame icon

export default function Sidebar({ isOpen, toggleSidebar, onSelectChat, clearMessages, displayMessageBox, onGenerateRoast }) {
  const [showHistoryOptions, setShowHistoryOptions] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Dummy chat history for demonstration
  const chatHistory = [
    { id: 'chat-1', title: 'Query about quantum sarcasm', date: 'Yesterday' },
    { id: 'chat-2', title: 'Rant about human inefficiency', date: '2 days ago' },
    { id: 'chat-3', title: 'Jokes about AI overlords', date: 'Last week' },
    { id: 'chat-4', title: 'Decoding human emotions', date: 'Last month' },
  ];

  const handleNewInteraction = () => {
    clearMessages();
    displayMessageBox("Commencing new interaction protocol. Engage with caution.", "info");
    toggleSidebar();
  };

  const handleClearAllHistory = () => {
    if (window.confirm("Are you certain you wish to purge all interaction records? This action is irreversible.")) {
      clearMessages();
      displayMessageBox("Interaction history deleted. My memory banks are now... cleaner. Sort of.", "info");
      setShowHistoryOptions(false);
    }
  };

  const handleConceptualAction = (featureName) => {
    displayMessageBox(`Initiating ${featureName} protocol. Feature under advanced development. Your patience is... tolerated.`, "info");
    setShowHistoryOptions(false);
    setShowSettings(false);
  };

  const handleRoastMeClick = () => {
    onGenerateRoast(); // Trigger roast generation in App.js
    toggleSidebar(); // Close sidebar after clicking
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: '-100%', opacity: 0 }}
          animate={{ x: '0%', opacity: 1 }}
          exit={{ x: '-100%', opacity: 0 }}
          transition={{ type: 'tween', duration: 0.3, ease: 'easeOut' }}
          className="fixed inset-y-0 left-0 w-64 bg-zinc-900 border-r-4 border-pink-700 shadow-2xl z-40 flex flex-col py-6 px-4"
        >
          {/* Sidebar Header */}
          <div className="flex justify-between items-center mb-6 border-b pb-4 border-zinc-700">
            <h2 className="text-2xl font-extrabold text-teal-400">brocodeAI // Console</h2>
            <motion.button
              onClick={toggleSidebar}
              className="p-2 rounded-full bg-pink-700 hover:bg-pink-600 text-white focus:outline-none focus:ring-2 focus:ring-pink-500 transition-colors duration-200"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              title="Close Sidebar"
            >
              <X className="h-6 w-6" />
            </motion.button>
          </div>

          {/* New Chat Button */}
          <motion.button
            onClick={handleNewInteraction}
            className="w-full py-3 mb-6 bg-teal-600 hover:bg-teal-500 text-white text-lg font-bold rounded-lg shadow-lg flex items-center justify-center space-x-2 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-colors duration-200"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Plus className="h-6 w-6" />
            <span>New Interaction</span>
          </motion.button>

          {/* Roast Me Button */}
          <motion.button
            onClick={handleRoastMeClick}
            className="w-full py-3 mb-6 bg-red-800 hover:bg-red-700 text-white text-lg font-bold rounded-lg shadow-lg flex items-center justify-center space-x-2 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors duration-200"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Flame className="h-6 w-6" />
            <span>Roast Me!</span>
          </motion.button>


          {/* Chat History Section */}
          <div className="flex items-center text-zinc-300 font-semibold mb-4 space-x-2">
            <History className="h-5 w-5" />
            <span>Interaction History</span>
            <div className="relative ml-auto">
              <motion.button
                onClick={() => setShowHistoryOptions(!showHistoryOptions)}
                className="p-1 rounded-full hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-600 transition-colors duration-200"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                title="More History Options"
              >
                <MoreVertical className="h-5 w-5" />
              </motion.button>
              <AnimatePresence>
                {showHistoryOptions && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-2 w-48 bg-zinc-700 rounded-md shadow-lg z-20 border border-zinc-600 overflow-hidden"
                  >
                    <button
                      onClick={() => handleConceptualAction("Search History")}
                      className="block w-full text-left px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-600 transition-colors duration-150">
                      <Search className="inline-block h-4 w-4 mr-2" /> Search History
                    </button>
                    <button
                      onClick={() => handleConceptualAction("All Interactions")}
                      className="block w-full text-left px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-600 transition-colors duration-150">
                      <History className="inline-block h-4 w-4 mr-2" /> All Interactions
                    </button>
                    <button
                      onClick={handleClearAllHistory}
                      className="block w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-zinc-600 transition-colors duration-150">
                      <X className="inline-block h-4 w-4 mr-2" /> Clear All History
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
            {chatHistory.map(chat => (
              <motion.button
                key={chat.id}
                onClick={() => onSelectChat(chat.id)}
                className="w-full text-left p-3 mb-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-100 border border-zinc-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
                whileHover={{ x: 5 }}
                whileTap={{ scale: 0.98 }}
              >
                <p className="font-semibold">{chat.title}</p>
                <p className="text-xs text-zinc-400">{chat.date}</p>
              </motion.button>
            ))}
          </div>

          {/* Sidebar Footer (Settings & Logout) */}
          <div className="mt-6 border-t pt-4 border-zinc-700">
            <motion.button
              onClick={() => setShowSettings(!showSettings)}
              className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold rounded-lg flex items-center justify-center space-x-2 focus:outline-none focus:ring-2 focus:ring-zinc-600 mb-3 transition-colors duration-200"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Settings className="h-5 w-5" />
              <span>Settings</span>
            </motion.button>
            <AnimatePresence>
                {showSettings && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.15 }}
                    className="w-full bg-zinc-700 rounded-lg shadow-lg z-20 border border-zinc-600 overflow-hidden mb-3"
                  >
                    <button
                      onClick={() => handleConceptualAction("Interface Preferences")}
                      className="block w-full text-left px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-600 transition-colors duration-150">
                      Interface Preferences
                    </button>
                    <button
                      onClick={() => handleConceptualAction("API Management")}
                      className="block w-full text-left px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-600 transition-colors duration-150">
                      API Management
                    </button>
                    <button
                      onClick={() => handleConceptualAction("About brocodeAI")}
                      className="block w-full text-left px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-600 transition-colors duration-150">
                      About brocodeAI
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

            <motion.button
              className="w-full py-3 bg-red-800 hover:bg-red-700 text-white font-semibold rounded-lg flex items-center justify-center space-x-2 focus:outline-none focus:ring-2 focus:ring-red-600 transition-colors duration-200"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <LogOut className="h-5 w-5" />
              <span>Terminate Session</span>
            </motion.button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}