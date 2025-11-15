import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface ThemeContextType {
  isDarkMode: boolean;
  // toggleDarkMode: () => void; // Removed as dark mode is permanent
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

// const LS_KEY_THEME_MODE = 'agritrust_theme_mode'; // No longer needed

export const ThemeContextProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  // Initialize isDarkMode to always be true for permanent dark mode
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);

  // Apply 'dark' class on the html element permanently
  useEffect(() => {
    const htmlElement = document.documentElement;
    htmlElement.classList.add('dark');
    // No need to save preference to localStorage as it's permanent
  }, [isDarkMode]); // isDarkMode is always true, but useEffect depends on it

  // toggleDarkMode function is removed

  return (
    <ThemeContext.Provider value={{ isDarkMode /*, toggleDarkMode */ }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeContextProvider');
  }
  return context;
};