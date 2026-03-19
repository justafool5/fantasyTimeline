import React from 'react';
import { useTimeline } from '../contexts/TimelineContext';
import { useTheme } from '../contexts/ThemeContext';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 50;

export default function ZoomControls() {
  const { zoom, setZoom } = useTimeline();
  const { theme } = useTheme();

  const zoomIn = () => setZoom(prev => Math.min(prev * 1.3, MAX_ZOOM));
  const zoomOut = () => setZoom(prev => Math.max(prev / 1.3, MIN_ZOOM));
  const resetZoom = () => setZoom(1);

  const btnClass = theme === 'fantasy'
    ? 'bg-fantasy-card text-fantasy-accent border border-fantasy-border hover:border-fantasy-accent hover:bg-fantasy-bg-secondary'
    : 'bg-scifi-bg-secondary text-scifi-accent border border-scifi-border hover:border-scifi-accent hover:shadow-[0_0_10px_rgba(0,243,255,0.3)]';

  return (
    <div data-testid="zoom-controls" className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
      <button data-testid="zoom-in-btn" onClick={zoomIn} className={`p-2 transition-all ${btnClass}`} title="Zoom In"><ZoomIn size={18} /></button>
      <button data-testid="zoom-reset-btn" onClick={resetZoom} className={`p-2 transition-all ${btnClass}`} title="Reset Zoom"><RotateCcw size={18} /></button>
      <button data-testid="zoom-out-btn" onClick={zoomOut} className={`p-2 transition-all ${btnClass}`} title="Zoom Out"><ZoomOut size={18} /></button>
      <div className={`text-center text-xs mt-1 ${theme === 'fantasy' ? 'text-fantasy-muted/60' : 'text-scifi-muted'}`}>
        {Math.round(zoom * 100)}%
      </div>
    </div>
  );
}
