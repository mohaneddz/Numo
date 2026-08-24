import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';

import { polyfillCountryFlagEmojis } from 'country-flag-emoji-polyfill';

import { LanguageProvider } from './contexts/LanguageContext';
import { AppDataProvider } from './contexts/AppDataContext';
import { RuntimeProvider } from './contexts/RuntimeContext';
import { ProfileSessionProvider } from './contexts/ProfileSessionContext';
import { LanguageJourneyProvider } from './contexts/LanguageJourneyContext';
import { initializeLocalRuntimeSettings } from './services/localRuntimeSettings';

// Polyfill country flag emojis for Windows, which otherwise renders them as two text letters (like "DE" instead of 🇩🇪)
polyfillCountryFlagEmojis();
initializeLocalRuntimeSettings();

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ProfileSessionProvider>
      <LanguageProvider>
        <LanguageJourneyProvider>
          <AppDataProvider>
              <RuntimeProvider>
                <BrowserRouter>
                  <App />
                </BrowserRouter>
              </RuntimeProvider>
          </AppDataProvider>
        </LanguageJourneyProvider>
      </LanguageProvider>
    </ProfileSessionProvider>
  </React.StrictMode>,
);
