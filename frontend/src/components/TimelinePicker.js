import React, { useRef, useEffect } from 'react';
import { useTimeline } from '../contexts/TimelineContext';
import { useTheme } from '../contexts/ThemeContext';
import { BookOpen, ChevronDown } from 'lucide-react';

export default function TimelinePicker() {
  const { manifest, currentTimelineId, switchTimeline } = useTimeline();
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = React.useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  if (!manifest) return null;
  const current = manifest.timelines.find(t => t.id === currentTimelineId);

  const handleSelect = (tl) => {
    switchTimeline(tl.id);
    if (tl.defaultTheme) setTheme(tl.defaultTheme);
    setOpen(false);
  };

  return (
    <div ref={dropdownRef} className="fixed top-4 left-4 z-50" data-testid="timeline-picker">
      <button
        data-testid="timeline-picker-button"
        onClick={() => setOpen(!open)}
        className={`
          flex items-center gap-2 px-4 py-2 font-bold text-sm transition-all
          ${theme === 'fantasy'
            ? 'bg-fantasy-card text-fantasy-accent border border-fantasy-border font-fantasy-heading hover:border-fantasy-accent'
            : 'bg-scifi-bg-secondary text-scifi-accent border border-scifi-border font-scifi-heading hover:border-scifi-accent'
          }
        `}
      >
        <BookOpen size={16} />
        <span>{current?.title || 'Select Timeline'}</span>
        <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className={`
          mt-1 min-w-[250px] overflow-hidden
          ${theme === 'fantasy'
            ? 'bg-fantasy-card border border-fantasy-border shadow-[0_4px_20px_rgba(0,0,0,0.5)]'
            : 'bg-scifi-bg-secondary border border-scifi-border shadow-[0_0_20px_rgba(0,243,255,0.15)]'
          }
        `}>
          {manifest.timelines.map(tl => (
            <button
              key={tl.id}
              data-testid={`timeline-option-${tl.id}`}
              onClick={() => handleSelect(tl)}
              className={`
                w-full text-left px-4 py-3 transition-all block
                ${tl.id === currentTimelineId
                  ? theme === 'fantasy'
                    ? 'bg-fantasy-accent/10 text-fantasy-accent font-bold'
                    : 'bg-scifi-accent/10 text-scifi-accent font-bold'
                  : theme === 'fantasy'
                    ? 'text-fantasy-text hover:bg-fantasy-bg-secondary'
                    : 'text-scifi-text hover:bg-scifi-accent/5'
                }
              `}
            >
              <div className={`font-bold text-sm ${theme === 'fantasy' ? 'font-fantasy-heading' : 'font-scifi-heading'}`}>{tl.title}</div>
              <div className={`text-xs mt-0.5 ${theme === 'fantasy' ? 'text-fantasy-muted' : 'text-scifi-muted'}`}>{tl.description}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
