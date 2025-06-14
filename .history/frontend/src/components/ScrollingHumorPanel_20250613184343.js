import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Laugh, X, AlertTriangle, RefreshCw, Volume2 } from 'lucide-react';

export default function ScrollingHumorPanel({ humorItems = [], direction = 'up', position = 'left', isLoading, error, onRefresh, onSpeakText, selectedLanguage, selectedVoiceStyle }) {
  const panelRef = useRef(null); // Ref for the outer panel (viewport)
  const contentRef = useRef(null); // Ref for the inner scrollable content div
  const [scrollDuration, setScrollDuration] = useState('0s'); // Initialize to '0s' (no animation)
  const [isHovered, setIsHovered] = useState(false);
  const [currentlySpeakingId, setCurrentlySpeakingId] = useState(null);
  const [isReadyToScroll, setIsReadyToScroll] = useState(false); // Indicates if content is measureable and requires scrolling

  // Duplicate items significantly to ensure continuous loop without jumps
  // We need at least 2 full sets of content to make the loop seamless.
  // Using 5x duplication to be safe.
  const displayItems = humorItems.length > 0 ? [...humorItems, ...humorItems, ...humorItems, ...humorItems, ...humorItems] : [];

  useEffect(() => {
    const calculateScrollDuration = () => {
      if (contentRef.current && panelRef.current && displayItems.length > 0) {
        const panelHeight = panelRef.current.clientHeight; // Height of the visible area
        const totalContentHeight = contentRef.current.scrollHeight; // Total height of duplicated content

        console.log(`[ScrollPanel Debug] Panel Height: ${panelHeight}px, Total Content Height: ${totalContentHeight}px`);

        // Only scroll if total content height is significantly greater than panel height
        if (totalContentHeight > panelHeight * 1.5) { // Factor of 1.5 ensures there's enough content to scroll without blank space
          // Calculate duration: Longer content = longer duration for same speed.
          // Adjust the divisor (e.g., 25) for desired speed (lower = faster, higher = slower)
          const duration = totalContentHeight / 25; // Roughly pixels per second
          setScrollDuration(`${Math.max(30, duration)}s`); // Ensure a minimum duration (e.g., 30s)
          setIsReadyToScroll(true);
          console.log(`[ScrollPanel Debug] Calculated scroll duration: ${Math.max(30, duration)}s. Scrolling enabled.`);
        } else {
          setScrollDuration('0s'); // No scrolling if content fits or is too short
          setIsReadyToScroll(false);
          console.log("[ScrollPanel Debug] Content fits or too short for continuous scroll. Scrolling disabled.");
        }
      } else {
        setScrollDuration('0s'); // No content, no scrolling
        setIsReadyToScroll(false);
        console.log("[ScrollPanel Debug] No display items or refs not ready. Scrolling disabled.");
      }
    };

    // Calculate on mount, and on window resize.
    // Also re-calculate when humorItems or their length change.
    calculateScrollDuration();
    window.addEventListener('resize', calculateScrollDuration);

    // Add a small delay to calculate after DOM updates for content, especially on initial load
    const timeoutId = setTimeout(calculateScrollDuration, 200); // 200ms delay

    return () => {
      window.removeEventListener('resize', calculateScrollDuration);
      clearTimeout(timeoutId);
    };
  }, [humorItems, displayItems.length]); // Dependencies for useEffect

  const animationName = direction === 'up' ? 'scroll-up' : 'scroll-down';

  const scrollingStyle = {
    animationName: isReadyToScroll ? animationName : 'none', // Only apply animation if ready
    animationDuration: scrollDuration,
    animationTimingFunction: 'linear',
    animationIterationCount: 'infinite',
    animationPlayState: isHovered ? 'paused' : 'running', // Pause on hover, otherwise running
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

    if (currentlySpeakingId !== null) {
      console.log(`[ScrollingHumorPanel] Already speaking item ${currentlySpeakingId}. Ignoring new request.`);
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
    <motion.div
      ref={panelRef} // Attach panelRef to the outer div (viewport)
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
          className="w-full h-full flex-1 overflow-hidden"
          style={{ position: 'relative' }}
        >
          <div
            ref={contentRef} // Attach contentRef here
            className="w-full absolute inset-0 will-change-transform scrolling-content"
            style={scrollingStyle}
          >
            {displayItems.map((item, index) => (
              <div
                key={`${item.type}-${index}-${item.content.substring(0, Math.min(item.content.length, 10))}`} // Robust key
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
                  <Volume2 className={`h-4 w-4 ${currentlySpeakingId !== null ? 'animate-pulse' : ''}`} />
                  <span>{currentlySpeakingId !== null ? 'Speaking...' : 'Listen'}</span>
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