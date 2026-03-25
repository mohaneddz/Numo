import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';

import { LanguageProvider } from './contexts/LanguageContext';
import { AppDataProvider } from './contexts/AppDataContext';
import { CurriculumProvider } from './contexts/CurriculumContext';
import { RuntimeProvider } from './contexts/RuntimeContext';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <AppDataProvider>
      <LanguageProvider>
        <CurriculumProvider>
          <RuntimeProvider>
            <BrowserRouter>
              <App />
            </BrowserRouter>
          </RuntimeProvider>
        </CurriculumProvider>
      </LanguageProvider>
    </AppDataProvider>
  </React.StrictMode>,
);
