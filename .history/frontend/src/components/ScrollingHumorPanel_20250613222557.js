```jsx
import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Laugh, AlertTriangle, RefreshCw, Volume2, Copy, Share2 } from 'lucide-react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';

export default function ScrollingHumorPanel({
  humorItems = [],
  direction = 'up',
  position = 'left',
  isLoading,
  error,
  onRefresh,
  onSpeakText,
  selectedLanguage,
  selectedVoiceStyle,
  displayMessageBox,
}) {
  const panelRef = useRef(null); // Outer panel (viewport)
  const contentRef = useRef(null); // Inner scrollable content
  const [scrollDuration, setScrollDuration] = useState(20); // Default duration in seconds
  const [isHovered, setIsHovered] = useState(false);
  const [currentlySpeakingId, setCurrentlySpeakingId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  // Duplicate items 2x for seamless looping
  const displayItems = humorItems.length > 0 ? [...humorItems, ...humorItems] : [];

  // Calculate scroll duration based on content height
  useEffect(() => {
    const calculateScrollDuration = () => {
      if (contentRef.current && panelRef.current && displayItems.length > 0) {
        const panelHeight = panelRef.current.clientHeight;
        const contentHeight = contentRef.current.scrollHeight / 2; // Account for duplication
        if (contentHeight > panelHeight * 1.2) { // Ensure enough content to scroll
          const speed = 30; // Slower speed: 30 pixels per second
          const duration = contentHeight / speed;
          setScrollDuration(Math.max(15, duration)); // Minimum 15 seconds
          console.log(`[ScrollPanel ${position}] Panel: ${panelHeight}px, Content: ${contentHeight}px, Speed: ${speed}px/s, Duration: ${duration.toFixed(2)}s`);
        } else {
          setScrollDuration(0); // No scrolling if content fits
          console.log(`[ScrollPanel ${position}] Content too short for scrolling.`);
        }
      } else {
        setScrollDuration(0);
        console.log(`[ScrollPanel ${position}] No content or refs not ready.`);
      }
    };

    // Run after initial render and on resize
    calculateScrollDuration();
    const timeoutId = setTimeout(calculateScrollDuration, 300); // Delay for DOM updates
    window.addEventListener('resize', calculateScrollDuration);

    return () => {
      window.removeEventListener('resize', calculateScrollDuration);
      clearTimeout(timeoutId);
    };
  }, [displayItems.length, position]);

  const handleListenClick = async (content, itemId) => {
    if (!onSpeakText) {
      console.error('[ScrollPanel] onSpeakText prop missing.');
      displayMessageBox?.('Text-to-speech unavailable.', 'error');
      return;
    }
    if (currentlySpeakingId !== null) {
      console.log(`[ScrollPanel] Already speaking item ${currentlySpeakingId}.`);
      return;
    }
    setCurrentlySpeakingId(itemId);
    try {
      await onSpeakText(content, selectedLanguage, selectedVoiceStyle);
      console.log(`[ScrollPanel] Audio requested for item: ${itemId}`);
    } catch (err) {
      console.error(`[ScrollPanel] onSpeakText error for ${itemId}:`, err);
      displayMessageBox?.(`Failed to speak text: ${err.message}`, 'error');
    } finally {
      setCurrentlySpeakingId(null);
    }
  };

  const handleItemClick = (item, index) => {
    setSelectedItem({ ...item, index }); // Store item with index for unique ID
    setIsModalOpen(true);
    setIsHovered(true); // Pause scrolling when modal opens
  };

  const handleCopy = async () => {
    if (!selectedItem) return;
    const content = selectedItem.type === 'meme' && selectedItem.image_url ? selectedItem.image_url : selectedItem.content || 'No content';
    try {
      await navigator.clipboard.writeText(content);
      displayMessageBox?.('Content copied to clipboard!', 'info');
    } catch (err) {
      console.error('[ScrollPanel] Copy error:', err);
      displayMessageBox?.(`Failed to copy: ${err.message}`, 'error');
    }
  };

  const handleShare = async () => {
    if (!selectedItem) return;
    const content = selectedItem.type === 'meme' && selectedItem.image_url ? selectedItem.image_url : selectedItem.content || 'No content';
    const shareData = {
      title: `brocodeAI ${selectedItem.type.toUpperCase()}`,
      text: selectedItem.content || 'Check out this content from brocodeAI!',
      url: selectedItem.type === 'meme' && selectedItem.image_url ? selectedItem.image_url : undefined,
    };

    if (navigator.share && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
        displayMessageBox?.('Content shared successfully!', 'info');
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('[ScrollPanel] Share error:', err);
          displayMessageBox?.(`Failed to share: ${err.message}`, 'error');
        }
      }
    } else {
      // Fallback: Copy content to clipboard
      try {
        await navigator.clipboard.writeText(content);
        displayMessageBox?.('Share not supported. Content copied to clipboard!', 'info');
      } catch (err) {
        console.error('[ScrollPanel] Fallback copy error:', err);
        displayMessageBox?.(`Failed to copy: ${err.message}`, 'error');
      }
    }
  };

  return (
    <motion.div
      ref={panelRef}
      initial={{ opacity: 0, [position]: '-100px' }}
      animate={{ opacity: 1, [position]: '0px' }}
      transition={{ delay: 0.7, duration: 0.5 }}
      className={`scrolling-container fixed inset-y-0 ${position}-0 z-10 hidden md:block p-4 bg-zinc-800/80 backdrop-blur-sm ${
        position === 'left' ? 'border-r-4 border-purple-700 rounded-r-xl' : 'border-l-4 border-pink-700 rounded-l-xl'
      }`}
      style={{ width: 'var(--current-panel-width)' }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => !isModalOpen && setIsHovered(false)} // Resume only if modal is closed
    >
      <h3 className="text-lg font-bold text-purple-400 mb-4 text-center">
        {position === 'left' ? 'Sarcasm Feed' : 'Irony Stream'}
      </h3>
      {isLoading ? (
        <div className="flex flex-col items-center justify-center h-full text-zinc-400">
          <Laugh className="h-8 w-8 animate-bounce text-purple-500" />
          <p className="mt-2 text-sm">Loading humor...</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center h-full text-red-400 text-center">
          <AlertTriangle className="h-8 w-8 mb-2" />
          <p className="text-sm">Error: {error}</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-2 bg-zinc-700 text-teal-400 border-teal-600 hover:bg-teal-600 hover:text-white"
            onClick={onRefresh}
          >
            <RefreshCw className="h-4 w-4 mr-1" /> Retry
          </Button>
        </div>
      ) : displayItems.length > 0 ? (
        <div className="scrolling-container h-full overflow-hidden">
          <motion.div
            ref={contentRef}
            className="scrolling-content flex flex-col gap-3 w-full"
            style={{
              '--animation-name': scrollDuration > 0 ? (direction === 'up' ? 'scroll-up' : 'scroll-down') : 'none',
              '--animation-duration': `${scrollDuration}s`,
              '--animation-play-state': isHovered || isModalOpen ? 'paused' : 'running',
            }}
          >
            {displayItems.map((item, index) => (
              <div
                key={`${item.id || item.type}-${index}`}
                className={`p-3 rounded-lg shadow-md cursor-pointer hover:bg-zinc-600/50 ${
                  item.type === 'joke' ? 'bg-purple-700' : 'bg-zinc-700'
                } border border-zinc-600`}
                onClick={() => handleItemClick(item, index)}
              >
                <p className="font-semibold text-white text-xs">{item.type.toUpperCase()}</p>
                {item.type === 'meme' && item.image_url ? (
                  <img
                    src={item.image_url}
                    alt={item.content || 'Meme'}
                    className="w-full h-24 object-cover rounded-md mt-1"
                    loading="lazy"
                  />
                ) : (
                  <p className="text-zinc-200 mt-1 text-sm italic">{item.content || 'No content'}</p>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2 text-teal-400 hover:text-teal-300 hover:bg-zinc-600"
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent modal from opening
                    handleListenClick(item.content || item.caption || 'No text', `${item.id || item.type}-${index}`);
                  }}
                  disabled={currentlySpeakingId !== null}
                >
                  <Volume2 className={`h-4 w-4 mr-1 ${currentlySpeakingId === `${item.id || item.type}-${index}` ? 'animate-pulse' : ''}`} />
                  {currentlySpeakingId === `${item.id || item.type}-${index}` ? 'Speaking...' : 'Listen'}
                </Button>
              </div>
            ))}
          </motion.div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-full text-zinc-400">
          <Laugh className="h-8 w-8 text-purple-500" />
          <p className="mt-2 text-sm">No humor available.</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-2 bg-zinc-700 text-teal-400 border-teal-600 hover:bg-teal-600 hover:text-white"
            onClick={onRefresh}
          >
            <RefreshCw className="h-4 w-4 mr-1" /> Generate Humor
          </Button>
        </div>
      )}
      <Dialog open={isModalOpen} onOpenChange={(open) => {
        setIsModalOpen(open);
        if (!open) setIsHovered(false); // Resume scrolling when modal closes
      }}>
        <DialogContent className="bg-zinc-800 text-zinc-200 border-zinc-700 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-purple-400">
              {selectedItem?.type.toUpperCase()}
            </DialogTitle>
          </DialogHeader>
          <div className="mt-2">
            {selectedItem?.type === 'meme' && selectedItem?.image_url ? (
              <img
                src={selectedItem.image_url}
                alt={selectedItem.content || 'Meme'}
                className="w-full h-64 object-contain rounded-md"
              />
            ) : (
              <p className="text-sm italic">{selectedItem?.content || 'No content'}</p>
            )}
            {selectedItem?.content && selectedItem?.type === 'meme' && (
              <p className="mt-2 text-sm italic">{selectedItem.content}</p>
            )}
          </div>
          <DialogFooter className="mt-4 flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="bg-zinc-700 text-teal-400 border-teal-600 hover:bg-teal-600 hover:text-white"
              onClick={handleCopy}
            >
              <Copy className="h-4 w-4 mr-1" /> Copy
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="bg-zinc-700 text-teal-400 border-teal-600 hover:bg-teal-600 hover:text-white"
              onClick={handleShare}
            >
              <Share2 className="h-4 w-4 mr-1" /> Share
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
```