// In frontend/src/index.js or main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.js'; // Ensure .js extension
import './index.css'; // Import the new global CSS file

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);