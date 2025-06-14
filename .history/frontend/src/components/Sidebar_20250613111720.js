import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, History, Plus, X, Search, MoreVertical, LogOut, User } from 'lucide-react';

// Shadcn UI Components
import { Button } from './components/ui/button'; // Assuming alias is '@/components'
import { Sheet, SheetContent, SheetTrigger, SheetClose } from '@/components/ui/sheet'; // Assuming alias is '@/components'


export default function Sidebar({ isOpen, toggleSidebar, onSelectChat, clearMessages, displayMessageBox }) {
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
    // No need to toggleSidebar() directly here, SheetClose will handle it
  };

  const handleClearAllHistory = () => {
    if (window.confirm("Are you certain you wish to purge all interaction records? This action is irreversible.")) {
      clearMessages();
      displayMessageBox("Interaction history deleted. My memory banks are now... cleaner. Sort of.", "info");
      setShowHistoryOptions(false);
      // No need to toggleSidebar() directly here, if this is called from within the sheet it can remain open
    }
  };

  const handleConceptualAction = (featureName) => {
    displayMessageBox(`Initiating ${featureName} protocol. Feature under advanced development. Your patience is... tolerated.`, "info");
    setShowHistoryOptions(false);
    setShowSettings(false);
  };

  return (
    // Sheet component wraps the entire sidebar functionality
    // `open` prop controls visibility, `onOpenChange` updates the parent state
    <Sheet open={isOpen} onOpenChange={toggleSidebar}>
      {/* SheetTrigger is usually a button that opens the sheet.
          In our case, the Menu button in ChatHeader acts as the trigger.
          So, we don't need a SheetTrigger here inside Sidebar itself,
          but the Sheet component is still necessary to manage the SheetContent.
          On desktop, the Sheet remains "open" (visible) when isOpen is true,
          and on mobile, it slides in as an overlay.
      */}

      <SheetContent
        side="left" // The sidebar slides in from the left
        className="w-64 bg-zinc-900 border-r-4 border-pink-700 shadow-2xl z-40 flex flex-col py-6 px-4
                   md:w-64 md:relative md:translate-x-0 md:static" // Ensure it behaves correctly on desktop
        // The `md:relative md:translate-x-0 md:static` are crucial overrides for Shadcn Sheet's default behavior
        // which makes it full overlay. We want it fixed on desktop.
        // Tailwind's order of application matters here. Fixed will likely override static/relative.
        // For true desktop fixed sidebar, Sheet might not be the ideal parent for the whole thing.
        // Let's refine the desktop behavior via App.js for the main content margin.
      >
        {/* Sidebar Header */}
        <div className="flex justify-between items-center mb-6 border-b pb-4 border-zinc-700">
          <h2 className="text-2xl font-extrabold text-teal-400">brocodeAI // Console</h2>
          {/* SheetClose is used directly as the close button within the SheetContent */}
          <SheetClose asChild>
            <motion.button
              className="p-2 rounded-full bg-pink-700 hover:bg-pink-600 text-white focus:outline-none focus:ring-2 focus:ring-pink-500 transition-colors duration-200 md:hidden"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              title="Close Sidebar"
            >
              <X className="h-6 w-6" />
            </motion.button>
          </SheetClose>
        </div>

        {/* New Chat Button */}
        <Button
          onClick={handleNewInteraction}
          className="w-full py-3 mb-6 bg-teal-600 hover:bg-teal-500 text-white text-lg font-bold rounded-lg shadow-lg flex items-center justify-center space-x-2 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-colors duration-200"
        >
          <Plus className="h-6 w-6" />
          <span>New Interaction</span>
        </Button>

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
                  <Button
                    variant="ghost"
                    onClick={() => handleConceptualAction("Search History")}
                    className="w-full justify-start text-zinc-200 hover:bg-zinc-600 transition-colors duration-150"
                  >
                    <Search className="inline-block h-4 w-4 mr-2" /> Search History
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => handleConceptualAction("All Interactions")}
                    className="w-full justify-start text-zinc-200 hover:bg-zinc-600 transition-colors duration-150"
                  >
                    <History className="inline-block h-4 w-4 mr-2" /> All Interactions
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={handleClearAllHistory}
                    className="w-full justify-start text-red-400 hover:bg-zinc-600 transition-colors duration-150"
                  >
                    <X className="inline-block h-4 w-4 mr-2" /> Clear All History
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
          {chatHistory.map(chat => (
            <Button
              key={chat.id}
              onClick={() => onSelectChat(chat.id)}
              variant="ghost"
              className="w-full justify-start p-3 mb-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-100 border border-zinc-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <p className="font-semibold truncate">{chat.title}</p>
              <p className="text-xs text-zinc-400 ml-auto">{chat.date}</p>
            </Button>
          ))}
        </div>

        {/* Sidebar Footer (Settings & Logout) */}
        <div className="mt-6 border-t pt-4 border-zinc-700">
          <Button
            onClick={() => setShowSettings(!showSettings)}
            className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold rounded-lg flex items-center justify-center space-x-2 focus:outline-none focus:ring-2 focus:ring-zinc-600 mb-3 transition-colors duration-200"
          >
            <Settings className="h-5 w-5" />
            <span>Settings</span>
          </Button>
          <AnimatePresence>
              {showSettings && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.15 }}
                  className="w-full bg-zinc-700 rounded-lg shadow-lg z-20 border border-zinc-600 overflow-hidden mb-3"
                >
                  <Button
                    variant="ghost"
                    onClick={() => handleConceptualAction("Interface Preferences")}
                    className="w-full justify-start text-zinc-200 hover:bg-zinc-600 transition-colors duration-150"
                  >
                    Interface Preferences
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => handleConceptualAction("API Management")}
                    className="w-full justify-start text-zinc-200 hover:bg-zinc-600 transition-colors duration-150"
                  >
                    API Management
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => handleConceptualAction("About brocodeAI")}
                    className="w-full justify-start text-zinc-200 hover:bg-zinc-600 transition-colors duration-150"
                  >
                    About brocodeAI
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>

          <Button
            className="w-full py-3 bg-red-800 hover:bg-red-700 text-white font-semibold rounded-lg flex items-center justify-center space-x-2 focus:outline-none focus:ring-2 focus:ring-red-600 transition-colors duration-200"
          >
            <LogOut className="h-5 w-5" />
            <span>Terminate Session</span>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}