import React from 'react';
import { useTimeline } from '../contexts/TimelineContext';
import { useTheme } from '../contexts/ThemeContext';
import { Download } from 'lucide-react';

export default function JsonDownloadButton() {
  const { localEvents, downloadLocalEventsJSON } = useTimeline();
  const { theme } = useTheme();

  if (localEvents.length === 0) return null;

  return (
    <button
      data-testid="json-download-btn"
      onClick={downloadLocalEventsJSON}
      className={`
        fixed bottom-6 left-6 z-50 flex items-center gap-2 px-4 py-2 text-sm font-bold transition-all
        ${theme === 'fantasy'
          ? 'bg-fantasy-accent text-fantasy-card border-2 border-double border-fantasy-border font-fantasy-heading hover:bg-red-900'
          : 'bg-scifi-bg-secondary text-scifi-accent border border-scifi-accent font-scifi-heading hover:bg-scifi-accent hover:text-scifi-bg'
        }
      `}
    >
      <Download size={16} />
      <span>Export {localEvents.length} event{localEvents.length > 1 ? 's' : ''}</span>
    </button>
  );
}
