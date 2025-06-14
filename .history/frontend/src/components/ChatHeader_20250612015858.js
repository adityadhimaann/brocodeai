import React from 'react';
import LanguageSelector from './LanguageSelector'; // Import the new LanguageSelector component

// ChatHeader component displaying the app title and language selector
export default function ChatHeader({ languages, selectedLanguage, onSelectLanguage }) {
  return (
    <header className="flex-shrink-0 bg-gray-800 p-4 shadow-lg flex justify-between items-center rounded-b-lg">
      <h1 className="text-2xl font-bold text-teal-400">brocodeAI</h1>
      <LanguageSelector
        languages={languages}
        selectedLanguage={selectedLanguage}
        onSelectLanguage={onSelectLanguage}
      />
    </header>
  );
}
