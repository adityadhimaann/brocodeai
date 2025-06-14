import React, { useState, useEffect, useRef } from 'react';
import { motion, useAnimation } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from './ui/dialog';
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
  displayMessageBox,
}) => {
  const [selectedItem, setSelectedItem] = useState(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const controls = useAnimation();
  const containerRef = useRef(null);
  const [isPaused, setIsPaused] = useState(false);
  const [isManuallyScrolling, setIsManuallyScrolling] = useState(false);
  const scrollTimeoutRef = useRef(null);

  const speed = 80;
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
        y:
          direction === 'up'
            ? [-contentHeight + containerHeight, 0]
            : [0, -contentHeight + containerHeight],
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

    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);

    scrollTimeoutRef.current = setTimeout(() => {
      setIsManuallyScrolling(false);
    }, 3000);
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
    } catch {
      displayMessageBox('Failed to play audio.', 'error');
    } finally {
      setIsSpeaking(false);
    }
  };

  const handleCopy = async (content) => {
    try {
      await navigator.clipboard.writeText(content);
      displayMessageBox('Copied to clipboard!', 'info');
    } catch {
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
    } catch {
      displayMessageBox('Failed to share.', 'error');
    }
  };

  return (
    <div
      className={`relative h-full flex flex-col overflow-hidden`}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onScroll={handleScroll}
    >
      <div className="flex justify-between items-center p-4 backdrop-blur-lg sticky top-0 z-50">
        <h2 className="text-base font-semibold text-white tracking-tight">
          {position === 'left' ? '' : ''}
        </h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={onRefresh}
          className="text-white hover:text-pink-400"
          disabled={isLoading}
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        </Button>
      </div>

      {error && (
        <div className="text-red-400 text-center py-4 font-medium">{error}</div>
      )}

      {isLoading && !error && (
        <div className="flex justify-center items-center flex-1">
          <Loader2 className="h-8 w-8 animate-spin text-pink-500" />
        </div>
      )}

      {!isLoading && !error && humorItems.length === 0 && (
        <div className="p-4 text-zinc-400 text-center">No items found 😐</div>
      )}

      {!isLoading && !error && humorItems.length > 0 && (
        <div className="flex-1 overflow-hidden" ref={containerRef}>
          <motion.div animate={controls} className="flex flex-col gap-6 p-4">
            {[...humorItems, ...humorItems].map((item, index) => (
              <motion.div
                key={`${item.id}-${index}`}
                onClick={(e) => handleItemClick(e, item)}
                className="relative bg-zinc-800/60 backdrop-blur-sm rounded-2xl p-4 cursor-pointer hover:bg-zinc-700/60 transition-all duration-300 shadow-md"
                whileHover={{ scale: 1.015 }}
              >
                <span className="absolute top-3 right-4 text-xs text-pink-400 italic font-semibold">
                  {sarcasticComments[index % sarcasticComments.length]}
                </span>
                {item.type === 'meme' && item.image_url && (
                  <img
                    src={item.image_url}
                    alt="Meme"
                    className="w-full max-h-80 object-cover rounded-lg mb-3 pointer-events-none"
                  />
                )}
                <p className="text-zinc-100 text-sm leading-relaxed">{item.content}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      )}

      <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
        <DialogContent className="bg-zinc-900/90 backdrop-blur-lg text-white max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedItem?.type === 'meme' ? 'Meme' : 'Joke'}</DialogTitle>
            <DialogDescription className="text-zinc-400 mt-1">
              {selectedItem?.content}
            </DialogDescription>
          </DialogHeader>
          {selectedItem?.type === 'meme' && selectedItem?.image_url && (
            <img
              src={selectedItem.image_url}
              alt="Meme"
              className="w-full max-h-80 object-contain rounded-md my-3"
            />
          )}
          <DialogFooter className="flex gap-2 pt-4">
            <Button
              onClick={() => handleSpeak(selectedItem?.content)}
              disabled={isSpeaking}
              className="bg-pink-600 hover:bg-pink-500 text-white flex gap-2"
            >
              {isSpeaking ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Volume2 className="h-4 w-4" />
              )}
              Speak
            </Button>
            <Button
              onClick={() => handleCopy(selectedItem?.content)}
              className="bg-zinc-700 hover:bg-zinc-600 text-white flex gap-2"
            >
              <Copy className="h-4 w-4" />
              Copy
            </Button>
            <Button
              onClick={() => handleShare(selectedItem?.content, selectedItem?.image_url)}
              className="bg-blue-600 hover:bg-blue-500 text-white flex gap-2"
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
