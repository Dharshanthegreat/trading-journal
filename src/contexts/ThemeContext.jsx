import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }) => {
  const [theme, setThemeState] = useState(() => {
    const saved = localStorage.getItem('theme');
    const validThemes = ['dark', 'minimal', 'claymorphism'];
    return validThemes.includes(saved) ? saved : 'dark';
  });

  useEffect(() => {
    // List of all theme classes to clean up
    const themeClasses = [
      'light-theme', 'theme-light', 'theme-nord', 'theme-forest', 'theme-sunset', 'theme-minimal',
      'theme-spiderman', 'theme-cyberpunk', 'theme-glass',
      'theme-claymorphism', 'theme-neomorphism', 'theme-glassmorphism', 'theme-skeuomorphism',
      'theme-maximalism', 'theme-brutalism', 'theme-liquidglass', 'theme-bentogrid', 'theme-spatial'
    ];
    document.body.classList.remove(...themeClasses);

    // Apply active theme class to document body
    if (theme !== 'dark') {
      document.body.classList.add(`theme-${theme}`);
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const changeTheme = (newTheme) => {
    const validThemes = ['dark', 'minimal', 'claymorphism'];
    setThemeState(validThemes.includes(newTheme) ? newTheme : 'dark');
  };

  const toggleTheme = () => {
    const cycle = ['dark', 'minimal', 'claymorphism'];
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
