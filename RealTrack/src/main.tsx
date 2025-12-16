import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './styles/globals.css';
import App from './App.tsx';
import { ThemeProvider } from './contexts/ThemeContext';

const suppressedConsolePrefixes = ['[Telegram.WebView]'];

// Filter Telegram WebApp noise from the console without muting other logs.
if (typeof console !== 'undefined') {
  const originalLog = console.log;

  console.log = (...args) => {
    const firstArg = args[0];
    const shouldSuppress =
      typeof firstArg === 'string' &&
      suppressedConsolePrefixes.some((prefix) => firstArg.startsWith(prefix));

    if (!shouldSuppress) {
      originalLog(...args);
    }
  };
}

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Elemento root não encontrado');
}

createRoot(rootElement).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
    <App />
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>
);
