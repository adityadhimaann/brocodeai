import React, { useState } from 'react';

// LanguageSelector component for choosing the chat language
export default function LanguageSelector({ languages, selectedLanguage, onSelectLanguage }) {
  const [isOpen, setIsOpen] = useState(false); // Controls dropdown visibility

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  const handleSelect = (code) => {
    onSelectLanguage(code); // Call the parent's handler
    setIsOpen(false); // Close dropdown after selection
  };

  return (
    <div className="relative">
      <button
        onClick={toggleDropdown}
        className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-md shadow-md transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 focus:ring-offset-gray-800 flex items-center"
      >
        {languages.find(lang => lang.code === selectedLanguage)?.name || 'Select Language'}
        <span className="ml-2">
          <svg className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
          </svg>
        </span>
      </button>
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-gray-700 rounded-md shadow-xl z-10 overflow-hidden">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleSelect(lang.code)}
              className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-600 rounded-md ${selectedLanguage === lang.code ? 'bg-teal-700 text-white' : 'text-gray-200'}`}
            >
              {lang.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
