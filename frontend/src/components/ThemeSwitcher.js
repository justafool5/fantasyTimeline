import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { Swords, Zap } from 'lucide-react';

export default function ThemeSwitcher() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      data-testid="theme-toggle"
      onClick={toggleTheme}
      className={`
        fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2 font-bold text-sm
        transition-all duration-300 cursor-pointer
        ${theme === 'fantasy'
          ? 'bg-fantasy-card text-fantasy-accent border border-fantasy-border font-fantasy-heading hover:border-fantasy-accent hover:bg-fantasy-bg-secondary'
          : 'bg-transparent text-scifi-accent border border-scifi-accent font-scifi-heading hover:bg-scifi-accent hover:text-scifi-bg neon-glow'
        }
      `}
    >
      {theme === 'fantasy' ? (
        <><Zap size={16} /><span>Sci-Fi Mode</span></>
      ) : (
        <><Swords size={16} /><span>Fantasy Mode</span></>
      )}
    </button>
  );
}
