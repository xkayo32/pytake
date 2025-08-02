import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { pwaManager } from './utils/pwa'

// Register service worker for PWA functionality
if (import.meta.env.PROD) {
  pwaManager.registerServiceWorker().then((success) => {
    if (success) {
      console.log('[PWA] Service Worker registered successfully');
      // Auto-subscribe to push notifications if user already granted permission
      if (Notification.permission === 'granted') {
        pwaManager.subscribeToPushNotifications();
      }
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
