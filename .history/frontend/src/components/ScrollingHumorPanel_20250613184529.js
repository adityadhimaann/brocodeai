import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Laugh, X, AlertTriangle } from 'lucide-react';

export default function ScrollingHumorPanel({ humorItems = [], direction = 'up', position = 'left', isLoading, error, onRefresh }) {
  const panelRef = useRef(null);
  const [scrollDuration, setScrollDuration] = useState('100s'); // Default duration
  const [isHovered, setIsHovered] = useState(false); // State to pause on hover

  // Duplicate items to create a seamless loop.
  // We need enough items so the duplication isn't obvious during scrolling.
  const displayItems = humorItems.length > 0 ? [...humorItems, ...humorItems, ...humorItems] : [];

  useEffect(() => {
    if (panelRef.current && displayItems.length > 0) {
      // Calculate height of a single set of humor items
      const singleContentHeight = panelRef.current.scrollHeight / 3; // Because we duplicated 3 times
      // Adjust duration based on content height for consistent speed
      // More items = longer duration
      const duration = singleContentHeight / 50; // pixels per second, adjust 50 for desired speed
      setScrollDuration(`${Math.max(20, duration)}s`); // Ensure a minimum duration
    }
  }, [humorItems, displayItems.length]); // Recalculate if humorItems change

  const animationName = direction === 'up' ? 'scroll-up' : 'scroll-down';
  const animationStyle = {
    animation: `${animationName} ${scrollDuration} linear infinite`,
    animationPlayState: isHovered ? 'paused' : 'running', // Pause on hover
  };

  const panelBg = position === 'left' ? 'bg-zinc-800' : 'bg-zinc-800'; // Same background for both
  const panelBorder = position === 'left' ? 'border-r-4 border-purple-700' : 'border-l-4 border-pink-700';
  const panelRounded = position === 'left' ? 'rounded-r-xl' : 'rounded-l-xl';

  return (
    <motion.div
      initial={{ opacity: 0, [position]: '-100px' }}
      animate={{ opacity: 1, [position]: '0px' }}
      transition={{ delay: 0.7, duration: 0.5 }}
      className={`fixed inset-y-0 w-64 md:w-72 lg:w-80 ${position}-0 z-10 flex flex-col justify-center items-center p-4 overflow-hidden ${panelBg} shadow-2xl ${panelBorder} ${panelRounded}`}
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
            className="w-full absolute inset-0 will-change-transform"
            style={animationStyle}
          >
            {displayItems.map((item, index) => (
              <div
                key={`${item.type}-${index}`} // Unique key for duplicated items
                className={`p-3 mb-3 rounded-lg shadow-md ${item.type === 'joke' ? 'bg-purple-700' : 'bg-zinc-700'} border border-zinc-600 break-words`}
                style={{ flexShrink: 0 }} // Ensure items don't shrink
              >
                <p className="font-semibold text-white text-sm">{item.type.toUpperCase()}:</p>
                <p className="text-zinc-200 mt-1 italic text-sm">{item.content}</p>
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