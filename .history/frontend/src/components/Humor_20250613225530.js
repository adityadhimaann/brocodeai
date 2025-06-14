
import { useState, useEffect, useCallback } from 'react';
import ScrollingHumorPanel from './ScrollingHumorPanel';

export default function Humor({ selectedLanguage, selectedPersonaMode, speakArbitraryText, displayMessageBox }) {
  const [humorItems, setHumorItems] = useState([]);
  const [isLoadingHumor, setIsLoadingHumor] = useState(false);
  const [humorError, setHumorError] = useState(null);

  const fetchHumor = useCallback(async () => {
    setIsLoadingHumor(true);
    setHumorError(null);
    try {
      const response = await fetch('http://localhost:5002/get_humor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: selectedLanguage }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to fetch humor.');
      setHumorItems(data);
    } catch (error) {
      console.error('Error fetching humor:', error);
      setHumorError(error.message);
    } finally {
      setIsLoadingHumor(false);
    }
  }, [selectedLanguage]);

  const fetchUnsolicitedAdvice = useCallback(async () => {
    try {
      const response = await fetch('http://localhost:5002/unsolicited_advice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: selectedLanguage }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to fetch advice.');
      return data.advice;
    } catch (error) {
      console.error('Error fetching advice:', error);
    }
  }, [selectedLanguage]);

  useEffect(() => {
    fetchHumor();
    const adviceInterval = setInterval(async () => {
      const advice = await fetchUnsolicitedAdvice();
      if (advice) displayMessageBox(advice, 'info');
    }, 30000);
    return () => clearInterval(adviceInterval);
  }, [fetchHumor, fetchUnsolicitedAdvice, displayMessageBox]);

  return (
    <>
      <div className="hidden md:block fixed top-[var(--header-height)] bottom-0 left-0 w-[var(--panel-width-val)] z-30">
        <ScrollingHumorPanel
          humorItems={humorItems}
          direction="down"
          position="left"
          isLoading={isLoadingHumor}
          error={humorError}
          onRefresh={fetchHumor}
          onSpeakText={speakArbitraryText}
          selectedLanguage={selectedLanguage}
          selectedVoiceStyle={selectedPersonaMode}
          displayMessageBox={displayMessageBox}
        />
      </div>
      <div className="hidden md:block fixed top-[var(--header-height)] bottom-0 right-0 w-[var(--panel-width-val)] z-30">
        <ScrollingHumorPanel
          humorItems={humorItems}
          direction="up"
          position="right"
          isLoading={isLoadingHumor}
          error={humorError}
          onRefresh={fetchHumor}
          onSpeakText={speakArbitraryText}
          selectedLanguage={selectedLanguage}
          selectedVoiceStyle={selectedPersonaMode}
          displayMessageBox={displayMessageBox}
        />
      </div>
    </>
  );
}
