import React, { useState, useRef, useEffect } from 'react';
import { useTimeline } from '../contexts/TimelineContext';
import { useTheme } from '../contexts/ThemeContext';
import { ZoomIn, ZoomOut, RotateCcw, Settings, Plus, Download, Zap, Swords } from 'lucide-react';

const MIN_ZOOM = 0.1;

export default function ZoomControls() {
  const { zoom, setZoom, resetZoomToFit, downloadFullTimelineJSON } = useTimeline();
  const { theme, toggleTheme } = useTheme();
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const menuRef = useRef(null);

  const zoomIn = () => setZoom(prev => prev * 1.3);
  const zoomOut = () => setZoom(prev => Math.max(prev / 1.3, MIN_ZOOM));
  const resetZoom = () => resetZoomToFit();

  // Close tools menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsToolsOpen(false);
      }
    };
    if (isToolsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isToolsOpen]);

  // Dispatch custom events to TimelineView
  const handleAddTrack = () => {
    window.dispatchEvent(new CustomEvent('timeline:addTrack'));
    setIsToolsOpen(false);
  };

  const handleEditTimeline = () => {
    window.dispatchEvent(new CustomEvent('timeline:editTimeline'));
    setIsToolsOpen(false);
  };

  const btnClass = theme === 'fantasy'
    ? 'bg-fantasy-bg-card text-fantasy-text border-2 border-fantasy-border hover:border-fantasy-gold hover:text-fantasy-gold'
    : 'bg-scifi-bg-elevated text-scifi-cyan border border-scifi-cyan-dim hover:border-scifi-cyan hover:shadow-scifi-glow';

  return (
    <div data-testid="zoom-controls" className={`fixed bottom-6 right-6 z-50 flex flex-col gap-2 p-2 rounded ${
      theme === 'fantasy' 
        ? 'bg-fantasy-bg-dark/90 border-2 border-fantasy-border shadow-fantasy-lg' 
        : 'bg-scifi-bg-surface/95 border border-scifi-cyan-dim/50 shadow-scifi'
    }`}>
      <button 
        data-testid="zoom-in-btn" 
        onClick={zoomIn} 
        className={`p-2.5 transition-all rounded ${btnClass}`} 
        title="Zoom In"
      >
        <ZoomIn size={18} />
      </button>
      <button 
        data-testid="zoom-reset-btn" 
        onClick={resetZoom} 
        className={`p-2.5 transition-all rounded ${btnClass}`} 
        title="Fit Timeline to View"
      >
        <RotateCcw size={18} />
      </button>
      <button 
        data-testid="zoom-out-btn" 
        onClick={zoomOut} 
        className={`p-2.5 transition-all rounded ${btnClass}`} 
        title="Zoom Out"
      >
        <ZoomOut size={18} />
      </button>
      
      {/* Divider */}
      <div className={`h-px my-1 ${theme === 'fantasy' ? 'bg-fantasy-border/60' : 'bg-scifi-cyan-dim/40'}`} />
      
      {/* Tools Menu */}
      <div ref={menuRef} className="relative">
        <button
          data-testid="tools-menu-btn"
          onClick={() => setIsToolsOpen(!isToolsOpen)}
          className={`p-2.5 transition-all rounded w-full ${btnClass}`}
          title="Tools"
        >
          <Settings size={18} />
        </button>
        
        {isToolsOpen && (
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
              onClick={() => { toggleTheme(); setIsToolsOpen(false); }}
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
              onClick={() => { downloadFullTimelineJSON(); setIsToolsOpen(false); }}
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
    </div>
  );
}
