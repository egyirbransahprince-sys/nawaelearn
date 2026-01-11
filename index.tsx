
import React from 'react';
import ReactDOM from 'react-dom/client';
// FIX: The error "Module has no default export" is fixed by ensuring App.tsx has a default export. The import statement is correct.
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);