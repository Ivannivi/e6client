import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './i18n';
import App from './App';
import { applyStoredLanguage } from './i18n';

const container = document.getElementById('root');
if (!container) throw new Error('Root element not found');

applyStoredLanguage();

// Register the service worker for push/background-sync support on web.
if ('serviceWorker' in navigator && !window.Capacitor) {
  navigator.serviceWorker.register('/sw.js').catch((error) => {
    console.error('e6client: service worker registration failed', error);
  });
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>
);