import React, { useState, useEffect, useCallback } from 'react';
import ScrollingHumorPanel from './ScrollingHumorPanel.js'; // Ensure .js extension

export default function Humor({ selectedLanguage, selectedPersonaMode, displayMessageBox, playAudioFromBase64 }) { // FIX: Added playAudioFromBase64 prop
  const [humorItemsLeft, setHumorItemsLeft] = useState([]); // Separate state for left panel
  const [humorItemsRight, setHumorItemsRight] = useState([]); // Separate state for right panel
  const [isLoadingHumor, setIsLoadingHumor] = useState(false);
  const [humorError, setHumorError] = useState(null);

  // This function is defined here because it makes API call specific to humor
  const speakArbitraryText = useCallback(async (text, lang, personaMode) => {
    if (!text) return;
    try {
      console.log(`[Humor] Requesting audio for text: "${text.substring(0, 30)}...", lang: ${lang}, personaMode: ${personaMode}`);
      const response = await fetch('http://localhost:5002/speak_text', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: text, language: lang, voice_style: personaMode }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get audio for text.');
      }

      const result = await response.json();
      console.log(`[Humor] Received audio data from backend. Length: ${result.audio ? result.audio.length : '0'}`);
      if (result.audio) {
        // Use the playAudioFromBase64 function passed from App.js
        await playAudioFromBase64(result.audio, "humor panel");
      } else {
        console.warn("[Humor] Backend returned no audio data for text.");
        displayMessageBox("Voice module returned no audio for that. How disappointing.", "error");
      }
    } catch (error) {
      console.error('[Humor] Error speaking arbitrary text:', error);
      displayMessageBox(`My voice module failed to process that text. Perhaps it wasn't worthy.`, "error");
    }
  }, [playAudioFromBase64, displayMessageBox]); // Added playAudioFromBase64 to dependencies

  // fetchHumor now fetches content for both panels separately
  const fetchHumor = useCallback(async () => {
    setIsLoadingHumor(true);
    setHumorError(null);
    try {
      const responseLeft = await fetch('http://localhost:5002/get_humor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: selectedLanguage }),
      });
      const dataLeft = await responseLeft.json();
      
      const responseRight = await fetch('http://localhost:5002/get_humor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: selectedLanguage }),
      });
      const dataRight = await responseRight.json();

      if (!responseLeft.ok || !responseRight.ok) {
        throw new Error((dataLeft.error || dataRight.error || 'Failed to fetch humor data.'));
      }

      setHumorItemsLeft(dataLeft);
      setHumorItemsRight(dataRight);
      
    } catch (error) {
      console.error('Error fetching humor:', error);
      setHumorError(error.message);
    } finally {
      setIsLoadingHumor(false);
    }
  }, [selectedLanguage]);

  useEffect(() => {
    fetchHumor();
    // No unsolicited advice interval here, it's in App.js now
  }, [selectedLanguage, fetchHumor]);

  return (
    <>
      <div className="hidden md:block fixed top-[var(--header-height)] bottom-0 left-0 w-[var(--panel-width-val)] z-30">
        <ScrollingHumorPanel
          humorItems={humorItemsLeft} // Pass left items
          direction="down"
          position="left"
          isLoading={isLoadingHumor}
          error={humorError}
          onRefresh={fetchHumor}
          onSpeakText={speakArbitraryText} // Pass component's speak function
          selectedLanguage={selectedLanguage}
          selectedPersonaMode={selectedPersonaMode} // Pass persona mode
          displayMessageBox={displayMessageBox}
        />
      </div>
      <div className="hidden md:block fixed top-[var(--header-height)] bottom-0 right-0 w-[var(--panel-width-val)] z-30">
        <ScrollingHumorPanel
          humorItems={humorItemsRight} // Pass right items
          direction="up"
          position="right"
          isLoading={isLoadingHumor}
          error={humorError}
          onRefresh={fetchHumor}
          onSpeakText={speakArbitraryText} // Pass component's speak function
          selectedLanguage={selectedLanguage}
          selectedPersonaMode={selectedPersonaMode} // Pass persona mode
          displayMessageBox={displayMessageBox}
        />
      </div>
    </>
  );
}