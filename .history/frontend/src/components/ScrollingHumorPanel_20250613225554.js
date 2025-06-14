
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

  const speed = 50; // Slower scrolling

  useEffect(() => {
    if (!isPaused && humorItems.length > 0) {
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
  }, [humorItems, direction, controls, isPaused, speed]);

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
      className={`relative bg-zinc-900 h-full overflow-hidden flex flex-col border-2 ${position === 'left' ? 'border-r-4 border-pink-700' : 'border-l-4 border-pink-700'}`}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="flex justify-between items-center p-2 bg-zinc-800 border-b-2 border-zinc-700">
        <h2 className="text-sm font-bold text-pink-500">{position === 'left' ? 'Left Humor' : 'Right Humor'}</h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={onRefresh}
          className="text-zinc-400 hover:text-pink-500"
          disabled={isLoading}
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        </Button>
      </div>

      {error && (
        <div className="p-4 text-red-500 text-center">
          Error: {error}
        </div>
      )}

      {isLoading && !error && (
        <div className="flex justify-center items-center h-full">
          <Loader2 className="h-8 w-8 animate-spin text-pink-500" />
        </div>
      )}

      {!isLoading && !error && humorItems.length === 0 && (
        <div className="p-4 text-zinc-400 text-center">
          No humor items available.
        </div>
      )}

      {!isLoading && !error && humorItems.length > 0 && (
        <div className="flex-1 overflow-hidden" ref={containerRef}>
          <motion.div animate={controls} className="flex flex-col gap-4 p-4">
            {[...humorItems, ...humorItems].map((item, index) => (
              <div
                key={`${item.id}-${index}`}
                className="bg-zinc-800 rounded-lg p-4 cursor-pointer hover:bg-zinc-700 transition-colors z-10"
                onClick={(e) => handleItemClick(e, item)}
                style={{ zIndex: 10 }}
              >
                {item.type === 'meme' && item.image_url && (
                  <img
                    src={item.image_url || 'https://placehold.co/400x300'}
                    alt="Meme"
                    className="w-full h-auto rounded-md mb-2"
                    style={{ pointerEvents: 'none' }}
                  />
                )}
                <p className="text-zinc-100 text-sm">{item.content}</p>
              </div>
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
              className="border-zinc-700 text-zinc-100 hover:bg-pink-700"
            >
              {isSpeaking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Volume2 className="h-4 w-4" />}
              Speak
            </Button>
            <Button
              variant="outline"
              onClick={() => handleCopy(selectedItem?.content)}
              className="border-zinc-700 text-zinc-100 hover:bg-pink-700"
            >
              <Copy className="h-4 w-4" />
              Copy
            </Button>
            <Button
              variant="outline"
              onClick={() => handleShare(selectedItem?.content, selectedItem?.image_url)}
              className="border-zinc-700 text-zinc-100 hover:bg-pink-700"
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
