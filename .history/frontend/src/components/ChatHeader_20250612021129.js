import React, { useState } from 'react';

// ChatHeader component displays the chatbot title and language selection
export default function ChatHeader({ languages, selectedLanguage, onSelectLanguage }) {
  const [showLanguageSelection, setShowLanguageSelection] = useState(false); // Controls language selection dropdown visibility

  return (
    <header className="flex-shrink-0 bg-gray-800 p-4 shadow-lg flex justify-between items-center rounded-b-lg">
      <h1 className="text-2xl font-bold text-teal-400">brocodeAI</h1>
      <div className="relative">
        <button
          onClick={() => setShowLanguageSelection(!showLanguageSelection)}
          className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-md shadow-md transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 focus:ring-offset-gray-800"
        >
          {languages.find(lang => lang.code === selectedLanguage)?.name || 'Select Language'}
          <span className="ml-2">&#9662;</span> {/* Dropdown arrow */}
        </button>
        {showLanguageSelection && (
          <div className="absolute right-0 mt-2 w-48 bg-gray-700 rounded-md shadow-xl z-10">
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => {
                  onSelectLanguage(lang.code);
                  setShowLanguageSelection(false);
                }}
                className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-600 rounded-md ${selectedLanguage === lang.code ? 'bg-teal-700 text-white' : 'text-gray-200'}`}
              >
                {lang.name}
              </button>
            ))}
          </div>
        )}
      </div>
    </header>
  );
}