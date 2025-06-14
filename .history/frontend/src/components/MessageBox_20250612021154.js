import React from 'react';

// MessageBox component for displaying system messages/alerts
export default function MessageBox({ message, type, onClose }) {
  const bgColor = type === 'error' ? 'bg-red-700' : 'bg-blue-700';
  const textColor = 'text-white';
  const borderColor = type === 'error' ? 'border-red-500' : 'border-blue-500';

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 p-4 rounded-lg shadow-xl animate-fade-in-down"
         style={{ minWidth: '300px', maxWidth: '90%' }}>
      <div className={`${bgColor} ${textColor} border-l-4 ${borderColor} p-4 flex items-center justify-between`}>
        <p className="text-sm font-semibold">{message}</p>
        <button
          onClick={onClose}
          className="ml-4 text-white hover:text-gray-200 focus:outline-none"
          aria-label="Close message"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}