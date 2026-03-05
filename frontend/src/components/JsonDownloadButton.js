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
        fixed bottom-6 left-6 z-50 flex items-center gap-2 px-4 py-2 text-sm font-bold transition-all
        ${theme === 'fantasy'
          ? 'bg-fantasy-card text-fantasy-accent border border-fantasy-border font-fantasy-heading hover:border-fantasy-accent hover:bg-fantasy-bg-secondary'
          : 'bg-scifi-bg-secondary text-scifi-accent border border-scifi-accent font-scifi-heading hover:bg-scifi-accent hover:text-scifi-bg'
        }
      `}
      title="Download the full timeline as JSON (for committing to your repository)"
    >
      <Download size={16} />
      <span>Export JSON</span>
    </button>
  );
}
