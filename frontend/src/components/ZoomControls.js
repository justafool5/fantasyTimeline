import React from 'react';
import { useTimeline } from '../contexts/TimelineContext';
import { useTheme } from '../contexts/ThemeContext';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

const MIN_ZOOM = 0.1;

export default function ZoomControls() {
  const { zoom, setZoom, resetZoomToFit } = useTimeline();
  const { theme } = useTheme();

  const zoomIn = () => setZoom(prev => prev * 1.3);
  const zoomOut = () => setZoom(prev => Math.max(prev / 1.3, MIN_ZOOM));
  const resetZoom = () => resetZoomToFit();

  const btnClass = theme === 'fantasy'
    ? 'bg-fantasy-bg-card text-fantasy-text border-2 border-fantasy-border hover:border-fantasy-gold hover:text-fantasy-gold shadow-fantasy'
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
      <div className={`text-center text-xs mt-1 px-1 py-0.5 rounded ${
        theme === 'fantasy' 
          ? 'text-fantasy-muted font-fantasy-body' 
          : 'text-scifi-cyan font-scifi-mono'
      }`}>
        {Math.round(zoom * 100)}%
      </div>
    </div>
  );
}
