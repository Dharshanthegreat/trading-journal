import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }) => {
  const [theme, setThemeState] = useState(() => {
    const saved = localStorage.getItem('theme');
    const validThemes = ['dark', 'minimal', 'claymorphism', 'refero', 'slash', 'steep', 'ventriloc'];
    return validThemes.includes(saved) ? saved : 'dark';
  });

  const [cursorEffect, setCursorEffectState] = useState(() => {
    const saved = localStorage.getItem('cursor_effect');
    return saved !== 'false'; // defaults to true
  });

  const [bgEffect, setBgEffectState] = useState(() => {
    return localStorage.getItem('bg_effect') || 'none'; // 'none' | 'grid' | 'dots'
  });

  useEffect(() => {
    // List of all theme classes to clean up
    const themeClasses = [
      'light-theme', 'theme-light', 'theme-nord', 'theme-forest', 'theme-sunset', 'theme-minimal',
      'theme-spiderman', 'theme-cyberpunk', 'theme-glass',
      'theme-claymorphism', 'theme-neomorphism', 'theme-glassmorphism', 'theme-skeuomorphism',
      'theme-maximalism', 'theme-brutalism', 'theme-liquidglass', 'theme-bentogrid', 'theme-spatial',
      'theme-refero', 'theme-slash', 'theme-steep', 'theme-ventriloc'
    ];
    document.body.classList.remove(...themeClasses);

    // Apply active theme class to document body
    if (theme !== 'dark') {
      document.body.classList.add(`theme-${theme}`);
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    document.body.classList.remove('ui-grid-bg', 'ui-dots-bg');
    if (bgEffect === 'grid') {
      document.body.classList.add('ui-grid-bg');
    } else if (bgEffect === 'dots') {
      document.body.classList.add('ui-dots-bg');
    }
    localStorage.setItem('bg_effect', bgEffect);
  }, [bgEffect]);

  const changeTheme = (newTheme) => {
    const validThemes = ['dark', 'minimal', 'claymorphism', 'refero', 'slash', 'steep', 'ventriloc'];
    setThemeState(validThemes.includes(newTheme) ? newTheme : 'dark');
  };

  const toggleTheme = () => {
    const cycle = ['dark', 'minimal', 'claymorphism', 'refero', 'slash', 'steep', 'ventriloc'];
    const idx = cycle.indexOf(theme);
    const nextTheme = cycle[(idx + 1) % cycle.length];
    setThemeState(nextTheme);
  };

  const changeCursorEffect = (val) => {
    setCursorEffectState(val);
    localStorage.setItem('cursor_effect', val ? 'true' : 'false');
  };

  const changeBgEffect = (val) => {
    setBgEffectState(val);
  };

  return (
    <ThemeContext.Provider value={{ 
      theme, 
      setTheme: changeTheme, 
      toggleTheme, 
      cursorEffect, 
      setCursorEffect: changeCursorEffect,
      bgEffect,
      setBgEffect: changeBgEffect
    }}>
      {children}
    </ThemeContext.Provider>
  );
};
