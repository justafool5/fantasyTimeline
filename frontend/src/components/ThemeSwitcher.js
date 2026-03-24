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
        fixed top-4 right-4 z-50 flex items-center gap-3 px-5 py-2.5 font-bold text-sm
        transition-all duration-300 cursor-pointer
        ${theme === 'fantasy'
          ? 'bg-fantasy-bg-card text-fantasy-text border-2 border-fantasy-border font-fantasy-heading hover:border-fantasy-gold hover:text-fantasy-gold shadow-fantasy'
          : 'bg-scifi-bg-elevated/90 text-scifi-cyan border border-scifi-cyan font-scifi-heading uppercase tracking-widest text-xs hover:bg-scifi-cyan/20 hover:shadow-scifi-glow'
        }
      `}
    >
      {theme === 'fantasy' ? (
        <>
          <Zap size={16} className="text-scifi-cyan" />
          <span>Sci-Fi Mode</span>
        </>
      ) : (
        <>
          <Swords size={16} className="text-fantasy-gold" />
          <span>Fantasy Mode</span>
        </>
      )}
    </button>
  );
}
