import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, Volume2 } from 'lucide-react';
import { Button } from './ui/button';

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
}) => {
  const containerRef = useRef(null);
  const [animationDuration, setAnimationDuration] = useState(20); // Default duration in seconds

  // Calculate animation duration based on content height for consistent speed
  useEffect(() => {
    if (containerRef.current && humorItems.length > 0) {
      const contentHeight = containerRef.current.scrollHeight / 2; // Account for duplication
      const speed = 50; // Pixels per second
      const duration = contentHeight / speed;
      setAnimationDuration(Math.max(10, duration)); // Minimum 10 seconds
    }
  }, [humorItems]);

  // Duplicate humor items for seamless looping
  const duplicatedItems = [...humorItems, ...humorItems];

  return (
    <div
      className={`scrolling-container fixed top-0 ${position === 'left' ? 'left-0' : 'right-0'} h-full hidden md:block z-10`}
      style={{ '--panel-width-val': 'var(--current-panel-width)' }}
    >
      <motion.div
        className="scrolling-content flex flex-col gap-4 p-4 bg-zinc-900/80 backdrop-blur-sm"
        style={{
          '--animation-name': direction === 'up' ? 'scroll-up' : 'scroll-down',
          '--animation-duration': `${animationDuration}s`,
          '--animation-play-state': isLoading || error ? 'paused' : 'running',
        }}
        ref={containerRef}
      >
        {duplicatedItems.map((item, index) => (
          <div
            key={`${item.id || index}-${index}`} // Ensure unique keys for duplicated items
            className="bg-zinc-800 rounded-lg shadow-lg p-3 flex flex-col gap-2 w-full max-w-[18rem]"
          >
            {item.type === 'meme' && item.image_url ? (
              <img
                src={item.image_url}
                alt={item.caption || 'Meme'}
                className="w-full h-32 object-cover rounded-md"
                loading="lazy"
              />
            ) : (
              <p className="text-zinc-200 text-sm font-medium">{item.text || item.caption || 'No content'}</p>
            )}
            {item.text && item.type !== 'meme' && (
              <p className="text-zinc-200 text-sm font-medium">{item.text}</p>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="self-end text-teal-400 hover:text-teal-300 hover:bg-zinc-700"
              onClick={() => onSpeakText(item.text || item.caption || 'No text to speak', selectedLanguage, selectedVoiceStyle)}
              title="Speak content"
            >
              <Volume2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </motion.div>

      {/* Overlay for loading/error states and refresh button */}
      {(isLoading || error) && (
        <div className="absolute inset-0 bg-zinc-900/90 flex flex-col items-center justify-center text-zinc-200">
          {isLoading && <p className="text-sm">Loading humor...</p>}
          {error && <p className="text-sm text-red-400">{error}</p>}
          <Button
            variant="outline"
            size="sm"
            className="mt-2 bg-zinc-800 text-teal-400 border-teal-600 hover:bg-teal-600 hover:text-white"
            onClick={onRefresh}
            title="Refresh humor"
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
        </div>
      )}
    </div>
  );
};

export default ScrollingHumorPanel;