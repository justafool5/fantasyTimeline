import React from 'react';
import { useTimeline } from '../contexts/TimelineContext';
import { useTheme } from '../contexts/ThemeContext';
import { Download } from 'lucide-react';

export default function JsonDownloadButton() {
  const { downloadFullTimelineJSON, currentTimelineId } = useTimeline();
  const { theme } = useTheme();

  if (!currentTimelineId) return null;

  return (
    <button
      data-testid="json-download-btn"
      onClick={downloadFullTimelineJSON}
      className={`
        fixed bottom-6 left-6 z-50 flex items-center gap-3 px-5 py-2.5 text-sm font-bold transition-all
        ${theme === 'fantasy'
          ? 'bg-fantasy-bg-card text-fantasy-text border-2 border-fantasy-border font-fantasy-heading hover:border-fantasy-gold hover:text-fantasy-gold shadow-fantasy'
          : 'bg-scifi-bg-elevated/90 text-scifi-cyan border border-scifi-cyan-dim font-scifi-heading uppercase tracking-wider text-xs hover:border-scifi-cyan hover:shadow-scifi-glow'
        }
      `}
      title="Download the full timeline as JSON (for committing to your repository)"
    >
      <Download size={16} />
      <span>Export JSON</span>
    </button>
  );
}
