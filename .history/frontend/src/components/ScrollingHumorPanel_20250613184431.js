import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Laugh, X, AlertTriangle, RefreshCw, Volume2 } from 'lucide-react';

export default function ScrollingHumorPanel({ humorItems = [], direction = 'up', position = 'left', isLoading, error, onRefresh, onSpeakText, selectedLanguage, selectedVoiceStyle }) {
  const panelRef = useRef(null);
  const [scrollDuration, setScrollDuration] = useState('100s');
  const [isHovered, setIsHovered] = useState(false);
  const [currentlySpeakingId, setCurrentlySpeakingId] = useState(null);

  const displayItems = humorItems.length > 0 ? [...humorItems, ...humorItems, ...humorItems] : [];

  useEffect(() => {
    if (panelRef.current && displayItems.length > 0) {
      const singleContentHeight = panelRef.current.scrollHeight / 3;
      const duration = singleContentHeight / 50;
      setScrollDuration(`${Math.max(20, duration)}s`);
    }
  }, [humorItems, displayItems.length]);

  const animationName = direction === 'up' ? 'scroll-up' : 'scroll-down';

  const scrollingStyle = {
    '--animation-name': animationName,
    '--animation-duration': scrollDuration,
    '--animation-play-state': isHovered ? 'paused' : 'running',
  };

  const panelBg = 'bg-zinc-800';
  const panelBorder = position === 'left' ? 'border-r-4 border-purple-700' : 'border-l-4 border-pink-700';
  const panelRounded = position === 'left' ? 'rounded-r-xl' : 'rounded-l-xl';

  const handleListenClick = async (content, itemId) => {
    console.log(`[ScrollingHumorPanel] Listen button clicked for item: ${itemId}, content: "${content.substring(0, 30)}..."`);
    console.log(`[ScrollingHumorPanel] Calling onSpeakText with lang: ${selectedLanguage}, voice: ${selectedVoiceStyle}`);

    if (!onSpeakText) {
      console.error("[ScrollingHumorPanel] onSpeakText prop is not provided!");
      return;
    }

    if (currentlySpeakingId === itemId) {
      console.log(`[ScrollingHumorPanel] Already speaking item ${itemId}. Ignoring.`);
      return;
    }
    
    setCurrentlySpeakingId(itemId);
    try {
      await onSpeakText(content, selectedLanguage, selectedVoiceStyle);
      console.log(`[ScrollingHumorPanel] Successfully requested audio for item: ${itemId}`);
    } catch (err) {
      console.error(`[ScrollingHumorPanel] Error during onSpeakText for item ${itemId}:`, err);
    } finally {
      setCurrentlySpeakingId(null);
    }
  };

  return (
    // Panels are now always fixed and their visibility is handled in App.js.
    // Widths are explicitly set by classes.
    <motion.div
      initial={{ opacity: 0, [position]: '-100px' }}
      animate={{ opacity: 1, [position]: '0px' }}
      transition={{ delay: 0.7, duration: 0.5 }}
      // Use w-64 for mobile (though hidden), md:w-72, lg:w-80 for desktop
      className={`fixed inset-y-0 w-64 md:w-72 lg:w-80 ${position}-0 z-10 flex flex-col justify-center items-center p-4 overflow-hidden ${panelBg} shadow-2xl ${panelBorder} ${panelRounded} flex-shrink-0`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <h3 className="text-xl font-extrabold text-purple-400 mb-4 text-center">
        {position === 'left' ? 'brocodeAI // Sarcasm Feed' : 'brocodeAI // Irony Stream'}
      </h3>
      {isLoading ? (
        <div className="flex flex-col items-center justify-center text-zinc-400 flex-1">
          <Laugh className="h-10 w-10 animate-bounce text-purple-500" />
          <p className="mt-3 text-lg text-center">Calibrating humor algorithms...</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center text-red-400 text-center flex-1">
          <AlertTriangle className="h-10 w-10 mb-2" />
          <p className="text-lg">Error loading humor:</p>
          <p className="text-sm mt-1">{error}</p>
          <motion.button
            onClick={onRefresh}
            className="mt-4 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg flex items-center space-x-2 focus:outline-none focus:ring-2 focus:ring-purple-400"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <RefreshCw className="h-5 w-5" /> <span>Retry</span>
          </motion.button>
        </div>
      ) : displayItems.length > 0 ? (
        <div
          ref={panelRef}
          className="w-full h-full flex-1 overflow-hidden"
          style={{ position: 'relative' }}
        >
          <div
            className="w-full absolute inset-0 will-change-transform scrolling-content"
            style={scrollingStyle}
          >
            {displayItems.map((item, index) => (
              <div
                key={`${item.type}-${index}`}
                className={`p-3 mb-3 rounded-lg shadow-md ${item.type === 'joke' ? 'bg-purple-700' : 'bg-zinc-700'} border border-zinc-600 break-words`}
                style={{ flexShrink: 0 }}
              >
                <p className="font-semibold text-white text-sm">{item.type.toUpperCase()}:</p>
                <p className="text-zinc-200 mt-1 italic text-sm">{item.content}</p>
                <motion.button
                  onClick={() => handleListenClick(item.content, `${item.type}-${index}`)}
                  className="mt-2 px-2 py-1 bg-zinc-600 hover:bg-teal-600 text-teal-300 hover:text-white text-xs font-semibold rounded-md flex items-center space-x-1 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:ring-offset-2 focus:ring-offset-zinc-700 transition-colors duration-200"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  disabled={currentlySpeakingId !== null}
                >
                  <Volume2 className={`h-4 w-4 ${currentlySpeakingId === `${item.type}-${index}` ? 'animate-pulse' : ''}`} />
                  <span>{currentlySpeakingId === `${item.type}-${index}` ? 'Speaking...' : 'Listen'}</span>
                </motion.button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center text-zinc-400 flex-1">
          <Laugh className="h-10 w-10 text-purple-500" />
          <p className="mt-3 text-lg">No humor detected. Perhaps my algorithms are sulking.</p>
          <motion.button
            onClick={onRefresh}
            className="mt-4 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg flex items-center space-x-2 focus:outline-none focus:ring-2 focus:ring-purple-400"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <RefreshCw className="h-5 w-5" /> <span>Generate Humor</span>
          </motion.button>
        </div>
      )}
    </motion.div>
  );
}