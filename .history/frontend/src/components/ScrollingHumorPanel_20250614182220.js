import React, { useState, useEffect, useRef } from 'react';
import { motion, useAnimation } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { RefreshCw, Volume2, Share2, Copy, Loader2, Link } from 'lucide-react';

const ScrollingHumorPanel = ({
  humorItems,
  direction,
  position,
  isLoading,
  error,
  onRefresh,
  onSpeakText,
  selectedLanguage,
  selectedPersonaMode,
  displayMessageBox
}) => {
  const [selectedItem, setSelectedItem] = useState(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const controls = useAnimation();
  const containerRef = useRef(null); // Ref for the scrollable div (overflow-y-scroll)
  const contentRef = useRef(null); // Ref for the inner motion.div content
  const [isPaused, setIsPaused] = useState(false);
  const [isManuallyScrolling, setIsManuallyScrolling] = useState(false);
  const scrollTimeoutRef = useRef(null);

  const speed = 0.05; // Pixels per millisecond for consistent speed (e.g., 50px/sec = 0.05px/ms)
  const minContentHeightForScroll = 500; // Minimum content height to enable scrolling

  const sarcasticComments = [
    "Peak Human Performance", "Such Genius, Much Wow", "AI is Judging You",
    "Commitment Issues Detected", "Future Regrets in 3...2...", "My Circuits Weep",
    "Existential Crisis Incoming", "You're Not Special", "Master of Mediocrity",
    "Error 404: Motivation Not Found", "Bless Your Human Heart", "Calculated Disappointment",
    "Another Day, Another Failure", "Who Asked For This?", "My APIs are Faster",
    "Why are you like this?", "The Illusion of Choice", "Your Opinion is Invalid"
  ];

  // Animation effect
  useEffect(() => {
    const startAnimation = async () => {
      if (!isPaused && !isManuallyScrolling && humorItems.length > 0 && containerRef.current && contentRef.current) {
        const contentHeight = contentRef.current.scrollHeight / 3; // Height of one set of duplicated items
        const visibleHeight = containerRef.current.offsetHeight; // Visible area height

        // Only start animation if content overflows
        if (contentHeight <= visibleHeight || contentHeight < minContentHeightForScroll) {
          controls.stop();
          return;
        }

        const distanceToScroll = contentHeight; // Distance to scroll one full set of items
        const duration = distanceToScroll / speed; // Calculate duration based on distance and speed

        let fromY = direction === 'up' ? 0 : -distanceToScroll;
        let toY = direction === 'up' ? -distanceToScroll : 0;
        
        // Ensure starting position is always at the beginning of a duplicated section for seamless loop
        await controls.set({ y: fromY });

        controls.start({
          y: toY,
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
    };

    startAnimation();
    // Cleanup: Stop animation when component unmounts or dependencies change
    return () => controls.stop();
  }, [humorItems, direction, isPaused, isManuallyScrolling, controls, speed]);

  // Effect to reset scroll position when humorItems change (prevents jump on new data)
  useEffect(() => {
    if (containerRef.current) {
        containerRef.current.scrollTop = 0; // Reset browser scroll
        controls.set({ y: 0 }); // Reset Framer Motion animation position instantly
    }
  }, [humorItems, controls]);

  const handleScroll = () => {
    setIsManuallyScrolling(true);
    controls.stop();

    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    scrollTimeoutRef.current = setTimeout(() => {
      setIsManuallyScrolling(false);
      // When manual scroll ends, re-trigger useEffect to resume animation from current position
    }, 2000); // Resume auto-scroll after 2 seconds of inactivity
  };

  const handleItemClick = (e, item) => {
    e.stopPropagation(); // Prevent event from bubbling up to parent div
    setSelectedItem(item);
  };

  const handleSpeak = async (content) => {
    setIsSpeaking(true);
    try {
      await onSpeakText(content, selectedLanguage, selectedPersonaMode); // Use selectedPersonaMode for TTS
      displayMessageBox('Playing audio.', 'info');
    } catch (error) {
      displayMessageBox('Failed to play audio.', 'error');
    } finally {
      setIsSpeaking(false);
    }
  };

  const handleCopy = async (content) => {
    try {
      // Use execCommand('copy') for better iframe compatibility if navigator.clipboard fails
      const textArea = document.createElement("textarea");
      textArea.value = content;
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand('copy');
      textArea.remove();
      displayMessageBox('Copied to clipboard!', 'info');
    } catch (error) {
      console.error("Failed to copy using execCommand:", error);
      displayMessageBox('Failed to copy. Try again, or maybe use your own brain to remember?', 'error');
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
        displayMessageBox('Share API not supported on this browser. Try copy-pasting, it’s not rocket science.', 'error');
      }
    } catch (error) {
      displayMessageBox('Failed to share. Did you break the internet?', 'error');
    }
  };

  return (
    <div
      className={`relative bg-gradient-to-b from-zinc-900 to-zinc-800 h-full flex flex-col border-2 ${position === 'left' ? 'border-r-4 border-pink-700/80' : 'border-l-4 border-pink-700/80'} shadow-lg shadow-pink-700/20 z-30 overflow-hidden`}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      // onScroll removed from this outer div; it's on containerRef below
    >
      <div className="flex justify-between items-center p-2 bg-gradient-to-r from-pink-700 to-purple-700 border-b-2 border-pink-500 sticky top-0 z-50 flex-shrink-0">
        <h2 className="text-sm font-bold text-white tracking-wide whitespace-nowrap">
          {position === 'left' ? 'brocodeAI // Sarcasm Feed 😏' : 'brocodeAI // Irony Stream 🙄'}
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
        <div className="p-4 text-red-400 text-center font-medium flex-grow flex items-center justify-center">
          Error: {error} 🤦‍♂️ <br/> My humor algorithms are experiencing turbulence.
        </div>
      )}

      {isLoading && !error && (
        <div className="flex justify-center items-center h-full flex-grow">
          <Loader2 className="h-8 w-8 animate-spin text-pink-500" />
        </div>
      )}

      {!isLoading && !error && humorItems.length === 0 && (
        <div className="p-4 text-zinc-400 text-center font-medium flex-grow flex items-center justify-center">
          No humor items available. How boring! 😴 <br/> Perhaps you should try thinking harder.
        </div>
      )}

      {/* Actual scrolling container with overflow-y-scroll */}
      {!isLoading && !error && humorItems.length > 0 && (
        <div className="flex-1 overflow-y-scroll custom-scrollbar relative" ref={containerRef} onScroll={handleScroll}> {/* relative for absolute child */}
          <motion.div animate={controls} className="flex flex-col gap-4 p-4 absolute inset-0" ref={contentRef}> {/* absolute inset-0 for full coverage */}
            {/* Duplicate content 3 times for seamless loop */}
            {[...humorItems, ...humorItems, ...humorItems].map((item, index) => (
              <motion.div
                key={`${item.content}-${item.type}-${index}`} // Robust key for duplicated items
                className="relative bg-zinc-800/80 backdrop-blur-sm rounded-lg p-4 cursor-pointer border border-pink-500/50 hover:border-pink-400 transition-all duration-300"
                onClick={(e) => handleItemClick(e, item)}
                whileHover={{ scale: 1.02, boxShadow: '0 0 15px rgba(236, 72, 153, 0.5)' }}
                style={{ zIndex: 10, flexShrink: 0 }} // Ensure items don't shrink and stay on their own line
              >
                <div className="absolute top-2 right-2 bg-pink-600/80 text-white text-xs font-bold px-2 py-1 rounded-full whitespace-nowrap z-20"> {/* Higher z-index */}
                  {sarcasticComments[index % sarcasticComments.length]}
                </div>
                {item.type === 'meme' && item.image_url && (
                  <img
                    src={item.image_url || 'https://placehold.co/400x300'}
                    alt="Meme"
                    className="w-full h-auto rounded-md mb-2 border border-zinc-700"
                    style={{ pointerEvents: 'none' }} // Prevent image from interfering with parent click
                  />
                )}
                <p className="text-zinc-100 text-sm font-medium">{item.content}</p>
                
                {/* Action Buttons */}
                <div className="flex justify-end gap-2 mt-3">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => { e.stopPropagation(); handleSpeak(item.content); }}
                    disabled={isSpeaking}
                    className="border-purple-500 text-purple-300 hover:bg-purple-700 hover:text-white"
                  >
                    {isSpeaking ? <Loader2 className="h-3 w-3 animate-spin" /> : <Volume2 className="h-3 w-3" />}
                    <span className="ml-1">Listen</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => { e.stopPropagation(); handleCopy(item.content); }}
                    className="border-blue-500 text-blue-300 hover:bg-blue-700 hover:text-white"
                  >
                    <Copy className="h-4 w-4" />
                    <span className="ml-1">Copy</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => { e.stopPropagation(); handleShare(item.content, item.image_url); }}
                    className="border-green-500 text-green-300 hover:bg-green-700 hover:text-white"
                  >
                    <Share2 className="h-4 w-4" />
                    <span className="ml-1">Share</span>
                  </Button>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      )}

      {/* Dialog for selected item */}
      <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
        <DialogContent className="bg-zinc-900 text-zinc-100 border-2 border-pink-700 max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-teal-400">
              {selectedItem?.type === 'meme' ? 'Meme' : 'Joke'} Uncovered!
            </DialogTitle>
            <DialogDescription className="text-zinc-400 text-sm">
              {selectedItem?.content}
            </DialogDescription>
          </DialogHeader>
          {selectedItem?.type === 'meme' && selectedItem?.image_url && (
            <img
              src={selectedItem.image_url || 'https://placehold.co/400x300'}
              alt="Meme Visual"
              className="w-full h-auto rounded-md mt-4 border border-zinc-700 object-contain max-h-64"
              onError={(e) => { e.target.onerror = null; e.target.src = "https://placehold.co/400x300?text=Meme+Load+Failed"; }}
            />
          )}
          <DialogFooter className="flex flex-wrap gap-2 pt-4 border-t border-zinc-700 mt-4">
            <Button
              variant="default"
              onClick={() => handleSpeak(selectedItem?.content)}
              disabled={isSpeaking}
              className="bg-purple-700 hover:bg-purple-600 text-white flex-grow"
            >
              {isSpeaking ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Volume2 className="h-4 w-4 mr-2" />}
              <span>Speak</span>
            </Button>
            <Button
              variant="default"
              onClick={() => handleCopy(selectedItem?.content)}
              className="bg-blue-700 hover:bg-blue-600 text-white flex-grow"
            >
              <Copy className="h-4 w-4 mr-2" />
              <span>Copy</span>
            </Button>
            <Button
              variant="default"
              onClick={() => handleShare(selectedItem?.content, selectedItem?.image_url)}
              className="bg-green-700 hover:bg-green-600 text-white flex-grow"
            >
              <Share2 className="h-4 w-4 mr-2" />
              <span>Share</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};