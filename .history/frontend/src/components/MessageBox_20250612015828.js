import React from 'react';

// MessageBox component for displaying temporary system messages or errors
export default function MessageBox({ message, type, onClose }) {
  if (!message) return null; // Don't render if there's no message

  const bgColor = type === 'error' ? 'bg-red-500' : 'bg-blue-500'; // Red for error, blue for info
  const textColor = 'text-white';

  return (
    <div
      className={`fixed top-4 left-1/2 -translate-x-1/2 px-6 py-3 rounded-lg shadow-xl z-50 animate-fade-in-down ${bgColor} ${textColor}`}
      role="alert"
    >
      <div className="flex items-center justify-between">
        <p className="mr-4">{message}</p>
        <button
          onClick={onClose}
          className="text-white hover:text-gray-200 focus:outline-none"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
