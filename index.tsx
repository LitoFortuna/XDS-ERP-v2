
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import ErrorBoundary from './src/components/ErrorBoundary';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false, // Don't refetch on window focus for now to save reads
    },
  },
});

import MainRouter from './src/MainRouter';
import { registerSW } from 'virtual:pwa-register';

// Sin este registro, una pestaña dejada abierta nunca vuelve a comprobar si hay una nueva
// versión desplegada: se queda ejecutando el JS (y por tanto las reglas de negocio) del build
// con el que se abrió, indefinidamente. El poll periódico fuerza esa comprobación y, si hay
// una versión nueva, recarga la página una vez para activarla (clientsClaim/skipWaiting ya
// están configurados en vite.config.ts para que esa recarga sea inmediata).
const updateSW = registerSW({
  onRegisteredSW(_swUrl, registration) {
    if (registration) {
      setInterval(() => registration.update(), 15 * 60 * 1000);
    }
  },
  onNeedRefresh() {
    updateSW(true);
  },
});

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <MainRouter />
      </ErrorBoundary>
    </QueryClientProvider>
  </React.StrictMode>
);

