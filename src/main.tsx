import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import indexCss from './index.css?inline';
import App from './App.tsx';

const STYLE_ID = 'morpheus-inline-styles';
const existingStyles = document.getElementById(STYLE_ID);

if (existingStyles instanceof HTMLStyleElement) {
  existingStyles.textContent = indexCss;
} else {
  const styleEl = document.createElement('style');
  styleEl.id = STYLE_ID;
  styleEl.textContent = indexCss;
  document.head.appendChild(styleEl);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
