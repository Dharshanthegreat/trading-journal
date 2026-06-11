import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }) => {
  const [theme, setThemeState] = useState(() => {
    return localStorage.getItem('theme') || 'dark';
  });

  useEffect(() => {
    // List of all theme classes to clean up
    const themeClasses = ['light-theme', 'theme-light', 'theme-nord', 'theme-forest', 'theme-sunset', 'theme-minimal'];
    document.body.classList.remove(...themeClasses);

    // Apply active theme class to document body
    if (theme !== 'dark') {
      document.body.classList.add(`theme-${theme}`);
      // Backward compatibility with legacy styles
      if (theme === 'light') {
        document.body.classList.add('light-theme');
      }
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const changeTheme = (newTheme) => {
    setThemeState(newTheme);
  };

  const toggleTheme = () => {
    const cycle = ['dark', 'light', 'nord', 'forest', 'sunset', 'minimal'];
    const idx = cycle.indexOf(theme);
    const nextTheme = cycle[(idx + 1) % cycle.length];
    setThemeState(nextTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme: changeTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
