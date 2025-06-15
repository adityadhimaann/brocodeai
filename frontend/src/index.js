// In frontend/src/index.js or main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.js'; // Ensure .js extension

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);