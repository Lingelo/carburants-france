import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import './index.css';
import App from './App';
import {
  capturePrompt,
  consumePrompt,
  markInstalled,
  syncFromStorage,
} from './utils/installState';
import type { BeforeInstallPromptEvent } from './types';

// Listeners attached at module scope before React mounts so we don't miss
// `beforeinstallprompt`, which fires once and early in the page lifecycle.
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  capturePrompt(e as BeforeInstallPromptEvent);
});

window.addEventListener('appinstalled', () => {
  markInstalled();
  consumePrompt();
});

window.addEventListener('storage', (e) => {
  if (e.key === 'pwa_installed' && e.newValue === '1') {
    syncFromStorage();
  }
});

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    syncFromStorage();
  }
});

registerSW({
  immediate: true,
  onRegisterError(err) {
    console.error('SW registration failed', err);
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
