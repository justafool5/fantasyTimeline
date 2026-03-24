import React, { useState, useRef, useEffect } from 'react';
import { ThemeProvider } from './contexts/ThemeContext';
import { TimelineProvider, useTimeline } from './contexts/TimelineContext';
import { useTheme } from './contexts/ThemeContext';
import TimelinePicker from './components/TimelinePicker';
import ZoomControls from './components/ZoomControls';
import TimelineView from './components/TimelineView';
import { Loader2, Settings, Plus, Download, Zap, Swords } from 'lucide-react';

// Tools Menu Component (icon only, positioned below zoom controls)
function ToolsMenu() {
  const { downloadFullTimelineJSON } = useTimeline();
  const { theme, toggleTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [showAddTrack, setShowAddTrack] = useState(false);
  const [showEditTimeline, setShowEditTimeline] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Dispatch custom events to TimelineView
  const handleAddTrack = () => {
    window.dispatchEvent(new CustomEvent('timeline:addTrack'));
    setIsOpen(false);
  };

  const handleEditTimeline = () => {
    window.dispatchEvent(new CustomEvent('timeline:editTimeline'));
    setIsOpen(false);
  };

  return (
    <div ref={menuRef} className={`fixed bottom-6 right-6 z-50 mt-14 ${
      theme === 'fantasy' 
        ? 'bg-fantasy-bg-dark/90 border-2 border-fantasy-border shadow-fantasy-lg rounded p-2' 
        : 'bg-scifi-bg-surface/95 border border-scifi-cyan-dim/50 shadow-scifi rounded p-2'
    }`} style={{ marginTop: '180px' }}>
      <button
        data-testid="tools-menu-btn"
        data-interactive="true"
        onClick={() => setIsOpen(!isOpen)}
        className={`p-2.5 transition-all rounded ${
          theme === 'fantasy' 
            ? 'bg-fantasy-bg-card text-fantasy-text border-2 border-fantasy-border hover:border-fantasy-gold hover:text-fantasy-gold shadow-fantasy' 
            : 'bg-scifi-bg-elevated text-scifi-cyan border border-scifi-cyan-dim hover:border-scifi-cyan hover:shadow-scifi-glow'
        }`}
        title="Tools"
      >
        <Settings size={18} />
      </button>
      
      {isOpen && (
        <div className={`absolute bottom-full right-0 mb-2 min-w-[180px] ${
          theme === 'fantasy'
            ? 'bg-fantasy-bg-card border-2 border-fantasy-border shadow-fantasy-lg'
            : 'bg-scifi-bg-elevated border border-scifi-cyan-dim shadow-scifi-lg'
        }`}>
          <button
            data-testid="add-track-btn"
            onClick={handleAddTrack}
            className={`w-full flex items-center gap-3 px-4 py-3 text-left text-xs font-bold transition-all ${
              theme === 'fantasy'
                ? 'text-fantasy-gold hover:bg-fantasy-gold/10 font-fantasy-heading border-b border-fantasy-border/40'
                : 'text-scifi-cyan hover:bg-scifi-cyan/10 font-scifi-heading uppercase tracking-wider border-b border-scifi-cyan-dim/30'
            }`}
          >
            <Plus size={14} />
            Add Track
          </button>
          <button
            data-testid="toggle-theme-btn"
            onClick={() => { toggleTheme(); setIsOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 text-left text-xs font-bold transition-all ${
              theme === 'fantasy'
                ? 'text-fantasy-text hover:bg-fantasy-gold/10 hover:text-fantasy-gold font-fantasy-heading border-b border-fantasy-border/40'
                : 'text-scifi-text hover:bg-scifi-cyan/10 hover:text-scifi-cyan font-scifi-heading uppercase tracking-wider border-b border-scifi-cyan-dim/30'
            }`}
          >
            {theme === 'fantasy' ? <Zap size={14} /> : <Swords size={14} />}
            {theme === 'fantasy' ? 'Sci-Fi Mode' : 'Fantasy Mode'}
          </button>
          <button
            data-testid="edit-timeline-btn"
            onClick={handleEditTimeline}
            className={`w-full flex items-center gap-3 px-4 py-3 text-left text-xs font-bold transition-all ${
              theme === 'fantasy'
                ? 'text-fantasy-text hover:bg-fantasy-gold/10 hover:text-fantasy-gold font-fantasy-heading border-b border-fantasy-border/40'
                : 'text-scifi-text hover:bg-scifi-cyan/10 hover:text-scifi-cyan font-scifi-heading uppercase tracking-wider border-b border-scifi-cyan-dim/30'
            }`}
          >
            <Settings size={14} />
            Timeline Settings
          </button>
          <button
            data-testid="json-download-btn"
            onClick={() => { downloadFullTimelineJSON(); setIsOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 text-left text-xs font-bold transition-all ${
              theme === 'fantasy'
                ? 'text-fantasy-text hover:bg-fantasy-gold/10 hover:text-fantasy-gold font-fantasy-heading'
                : 'text-scifi-text hover:bg-scifi-cyan/10 hover:text-scifi-cyan font-scifi-heading uppercase tracking-wider'
            }`}
          >
            <Download size={14} />
            Export JSON
          </button>
        </div>
      )}
    </div>
  );
}

function AppContent() {
  const { loading, error } = useTimeline();
  const { theme } = useTheme();

  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className={`text-center p-8 ${theme === 'fantasy' ? 'text-fantasy-accent font-fantasy-heading' : 'text-red-400 font-scifi-heading'}`}>
          <p className="text-xl font-bold mb-2">Chronicle Lost</p>
          <p className="text-sm opacity-70">{error}</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={40} className={`animate-spin mx-auto mb-4 ${theme === 'fantasy' ? 'text-fantasy-accent' : 'text-scifi-accent'}`} />
          <p className={`text-sm ${theme === 'fantasy' ? 'text-fantasy-muted font-fantasy-heading' : 'text-scifi-muted font-scifi-heading'}`}>
            Loading timeline...
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <TimelinePicker />
      <ZoomControls />
      <ToolsMenu />
      <TimelineView />
    </>
  );
}

function App() {
  return (
    <ThemeProvider>
      <TimelineProvider>
        <AppContent />
      </TimelineProvider>
    </ThemeProvider>
  );
}

export default App;
