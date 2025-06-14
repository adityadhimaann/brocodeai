```jsx
import { useEffect, useRef } from 'react';

export default function SpeechRecognition({ selectedLanguage, setInput, setIsListening, displayMessageBox }) {
  const recognitionRef = useRef(null);

  useEffect(() => {
    if (!window.SpeechRecognition && !window.webkitSpeechRecognition) {
      displayMessageBox('Web Speech API not supported.', 'error');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = false;
    recognitionRef.current.interimResults = false;
    recognitionRef.current.lang = selectedLanguage === 'hinglish' ? 'hi-IN' : selectedLanguage;

    recognitionRef.current.onresult = event => {
      setInput(event.results[0][0].transcript);
      setIsListening(false);
      recognitionRef.current.stop();
    };

    recognitionRef.current.onend = () => setIsListening(false);
    recognitionRef.current.onerror = event => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      displayMessageBox(`Speech recognition error: ${event.error}`, 'error');
    };

    return () => recognitionRef.current?.stop();
  }, [selectedLanguage, setInput, setIsListening, displayMessageBox]);

  return null;
}
