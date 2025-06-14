```jsx
import React, { useState, useEffect, useRef } from 'react';
import { motion, useAnimation } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { RefreshCw, Volume2, Share2, Copy, Loader2 } from 'lucide-react';

const ScrollingHumorPanel = ({
  humorItems,
  direction,
  position,
  isLoading,
  error,
  onRefresh,
  onSpeakText,
  selectedLanguage,
  selectedVoiceStyle,
  displayMessageBox
}) => {
  const [selectedItem, setSelectedItem] = useState(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const controls = useAnimation();
  const containerRef = useRef(null);
  const [isPaused, setIsPaused] = useState(false);
  const [isManuallyScrolling, setIsManuallyScrolling] = useState(false);
  const scrollTimeoutRef = useRef(null);

  const speed = 75; // Faster scrolling (was 50)
  const sarcasticComments = [
    "Wow, so funny 🙄",
    "I bet you laughed hard 😂",
    "Try not to cry 😢",
    "Such a masterpiece 🖼️",
    "You’re welcome, peasant 👑",
  ];

  useEffect(() => {
    if (!isPaused && !isManuallyScrolling && humorItems.length > 0) {
      const containerHeight = containerRef.current?.offsetHeight || 600;
      const contentHeight = containerRef.current?.scrollHeight || 1200;
      const duration = (contentHeight / speed) * humorItems.length;

      controls.start({
        y: direction === 'up' ? [-contentHeight + containerHeight, 0] : [0, -contentHeight + containerHeight],
        transition: {
          y: {
            repeat: Infinity,
            repeatType: 'loop',
            duration: duration,
            ease: 'linear',
          },
        },
      });
    } else {
      controls.stop();
    }
  }, [humorItems, direction, controls, isPaused, isManuallyScrolling, speed]);

  const handleScroll = () => {
    setIsManuallyScrolling(true);
    controls.stop();

    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    scrollTimeoutRef.current = setTimeout(() => {
      setIsManuallyScrolling(false);
    }, 3000); // Resume auto-scroll after 3 seconds of inactivity
  };

  const handleItemClick = (e, item) => {
    e.stopPropagation();
    setSelectedItem(item);
  };

  const handleSpeak = async (content) => {
    setIsSpeaking(true);
    try {
      await onSpeakText(content, selectedLanguage, selectedVoiceStyle);
      displayMessageBox('Playing audio.', 'info');
    } catch (error) {
      displayMessageBox('Failed to play audio.', 'error');
    } finally {
      setIsSpeaking(false);
    }
  };

  const handleCopy = async (content) => {
    try {
      await navigator.clipboard.writeText(content);
      displayMessageBox('Copied to clipboard!', 'info');
    } catch (error) {
      displayMessageBox('Failed to copy.', 'error');
    }
  };

  const handleShare = async (content, imageUrl) => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'BrocodeAI Humor',
          text: content,
          url: imageUrl || window.location.href,
        });
        displayMessageBox('Shared successfully!', 'info');
      } else {
        displayMessageBox('Share API not supported.', 'error');
      }
    } catch (error) {
      displayMessageBox('Failed to share.', 'error');
    }
  };

  return (
    <div
      className={`relative bg-gradient-to-b from-zinc-900 to-zinc-800 h-full overflow-y-auto flex flex-col border-2 ${position === 'left' ? 'border-r-4 border-pink-700/80' : 'border-l-4 border-pink-700/80'} shadow-lg shadow-pink-700/20`}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onScroll={handleScroll}
    >
      <div className="flex justify-between items-center p-2 bg-gradient-to-r from-pink-700 to-purple-700 border-b-2 border-pink-500 sticky top-0 z-10">
        <h2 className="text-sm font-bold text-white tracking-wide">
          {position === 'left' ? 'Sarcastic Left Vibes 😏' : 'Sarcastic Right Vibes 😏'}
        </h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={onRefresh}
          className="text-white hover:text-pink-300"
          disabled={isLoading}
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        </Button>
      </div>

      {error && (
        <div className="p-4 text-red-400 text-center font-medium">
          Error: {error} 🤦‍♂️
        </div>
      )}

      {isLoading && !error && (
        <div className="flex justify-center items-center h-full">
          <Loader2 className="h-8 w-8 animate-spin text-pink-500" />
        </div>
      )}

      {!isLoading && !error && humorItems.length === 0 && (
        <div className="p-4 text-zinc-400 text-center font-medium">
          No humor items available. How boring! 😴
        </div>
      )}

      {!isLoading && !error && humorItems.length > 0 && (
        <div className="flex-1 overflow-hidden" ref={containerRef}>
          <motion.div animate={controls} className="flex flex-col gap-4 p-4">
            {[...humorItems, ...humorItems].map((item, index) => (
              <motion.div
                key={`${item.id}-${index}`}
                className="relative bg-zinc-800/80 backdrop-blur-sm rounded-lg p-4 cursor-pointer border border-pink-500/50 hover:border-pink-400 transition-all duration-300"
                onClick={(e) => handleItemClick(e, item)}
                whileHover={{ scale: 1.02, boxShadow: '0 0 15px rgba(236, 72, 153, 0.5)' }}
                style={{ zIndex: 10 }}
              >
                <div className="absolute top-2 right-2 bg-pink-600/80 text-white text-xs font-bold px-2 py-1 rounded-full">
                  {sarcasticComments[index % sarcasticComments.length]}
                </div>
                {item.type === 'meme' && item.image_url && (
                  <img
                    src={item.image_url || 'https://placehold.co/400x300'}
                    alt="Meme"
                    className="w-full h-auto rounded-md mb-2 border border-zinc-700"
                    style={{ pointerEvents: 'none' }}
                  />
                )}
                <p className="text-zinc-100 text-sm font-medium">{item.content}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      )}

      <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
        <DialogContent className="bg-zinc-900 text-zinc-100 border-2 border-pink-700">
          <DialogHeader>
            <DialogTitle>{selectedItem?.type === 'meme' ? 'Meme' : 'Joke'}</DialogTitle>
            <DialogDescription className="text-zinc-400">
              {selectedItem?.content}
            </DialogDescription>
          </DialogHeader>
          {selectedItem?.type === 'meme' && selectedItem?.image_url && (
            <img
              src={selectedItem.image_url || 'https://placehold.co/400x300'}
              alt="Meme"
              className="w-full h-auto rounded-md"
            />
          )}
          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => handleSpeak(selectedItem?.content)}
              disabled={isSpeaking}
              className="border-pink-700 text-white hover:bg-pink-700"
            >
              {isSpeaking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Volume2 className="h-4 w-4" />}
              Speak
            </Button>
            <Button
              variant="outline"
              onClick={() => handleCopy(selectedItem?.content)}
              className="border-pink-700 text-white hover:bg-pink-700"
            >
              <Copy className="h-4 w-4" />
              Copy
            </Button>
            <Button
              variant="outline"
              onClick={() => handleShare(selectedItem?.content, selectedItem?.image_url)}
              className="border-pink-700 text-white hover:bg-pink-700"
            >
              <Share2 className="h-4 w-4" />
              Share
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ScrollingHumorPanel;