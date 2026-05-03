'use client';

import { useTheme } from '@/contexts/ThemeContext';
import './ThemeToggle.css';

export default function ThemeToggle() {
  const { theme, toggleTheme, setLightTheme, setDarkTheme } = useTheme();

  return (
    <div className="theme-toggle-container">
      <div className="theme-toggle-group">
        <button
          onClick={setLightTheme}
          className={`theme-toggle-btn ${theme === 'light' ? 'active' : ''}`}
          aria-label="Switch to light theme"
          title="Light theme"
        >
          <span className="material-symbols-outlined">light_mode</span>
        </button>
        
        <button
          onClick={setDarkTheme}
          className={`theme-toggle-btn ${theme === 'dark' ? 'active' : ''}`}
          aria-label="Switch to dark theme"
          title="Dark theme"
        >
          <span className="material-symbols-outlined">dark_mode</span>
        </button>
      </div>
      
      <div className="theme-toggle-divider"></div>
      
      <button
        onClick={toggleTheme}
        className="theme-toggle-quick"
        aria-label="Toggle theme"
        title="Toggle theme"
      >
        <span className="material-symbols-outlined">
          {theme === 'light' ? 'dark_mode' : 'light_mode'}
        </span>
      </button>
    </div>
  );
}