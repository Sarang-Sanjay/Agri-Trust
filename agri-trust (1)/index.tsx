import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { ThemeContextProvider } from './context/ThemeContext';
import { seedData } from './services/localDb';

// Seed initial data for demonstration purposes
seedData();

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Failed to find the root element.");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <HashRouter>
      <AuthProvider>
        <ThemeContextProvider>
          <App />
        </ThemeContextProvider>
      </AuthProvider>
    </HashRouter>
  </React.StrictMode>
);