import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import AIErrorBoundary from './components/AIErrorBoundary';
import App from './App.tsx';
import './index.css';
import { ReactLenis } from '@studio-freight/react-lenis';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ReactLenis root options={{ lerp: 0.1, duration: 1.5, smoothWheel: true }}>
      <AIErrorBoundary>
        <HelmetProvider>
          <App />
        </HelmetProvider>
      </AIErrorBoundary>
    </ReactLenis>
  </StrictMode>,
);
