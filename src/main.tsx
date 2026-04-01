import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';

import { polyfillCountryFlagEmojis } from 'country-flag-emoji-polyfill';

import { LanguageProvider } from './contexts/LanguageContext';
import { AppDataProvider } from './contexts/AppDataContext';
import { CurriculumProvider } from './contexts/CurriculumContext';
import { RuntimeProvider } from './contexts/RuntimeContext';
import { ProfileSessionProvider } from './contexts/ProfileSessionContext';
import { LanguageJourneyProvider } from './contexts/LanguageJourneyContext';

// Polyfill country flag emojis for Windows, which otherwise renders them as two text letters (like "DE" instead of 🇩🇪)
polyfillCountryFlagEmojis();

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ProfileSessionProvider>
      <AppDataProvider>
        <LanguageProvider>
          <LanguageJourneyProvider>
            <CurriculumProvider>
              <RuntimeProvider>
                <BrowserRouter>
                  <App />
                </BrowserRouter>
              </RuntimeProvider>
            </CurriculumProvider>
          </LanguageJourneyProvider>
        </LanguageProvider>
      </AppDataProvider>
    </ProfileSessionProvider>
  </React.StrictMode>,
);
