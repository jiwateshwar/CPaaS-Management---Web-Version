console.log('[renderer] main.tsx script is loading...');

import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './globals.css';

console.log('[renderer] All imports loaded, mounting React...');

const debugMsg = document.getElementById('debug-msg');
if (debugMsg) debugMsg.textContent = 'React is mounting...';

try {
  const rootEl = document.getElementById('root');
  console.log('[renderer] root element:', rootEl);
  const root = createRoot(rootEl!);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
  console.log('[renderer] React render called successfully');
  if (debugMsg) debugMsg.style.display = 'none';
} catch (err) {
  console.error('[renderer] React mount error:', err);
  if (debugMsg) debugMsg.textContent = 'React mount FAILED: ' + String(err);
}
