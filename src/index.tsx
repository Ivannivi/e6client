import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './config/i18n';
import App from './App';

const container = document.getElementById('root');
if (!container) throw new Error('Root element not found');

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>
);