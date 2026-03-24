import React, { useRef, useEffect, useState } from 'react';
import { useTimeline } from '../contexts/TimelineContext';
import { useTheme } from '../contexts/ThemeContext';
import { BookOpen, ChevronDown, Plus } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import AddTimelineForm from './AddTimelineForm';

export default function TimelinePicker() {
  const { manifest, currentTimelineId, switchTimeline } = useTimeline();
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [showAddTimeline, setShowAddTimeline] = useState(false);
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

  const handleAddTimelineClick = () => {
    setOpen(false);
    setShowAddTimeline(true);
  };

  const handleTimelineCreated = (newTimelineId) => {
    // Timeline switching is handled in createTimeline
  };

  return (
    <>
    <div ref={dropdownRef} className="fixed top-4 left-4 z-50" data-testid="timeline-picker">
      <button
        data-testid="timeline-picker-button"
        onClick={() => setOpen(!open)}
        className={`
          flex items-center gap-3 px-5 py-2.5 font-bold text-sm transition-all
          ${theme === 'fantasy'
            ? 'bg-fantasy-bg-card text-fantasy-text border-2 border-fantasy-border font-fantasy-heading hover:border-fantasy-gold hover:text-fantasy-gold shadow-fantasy'
            : 'bg-scifi-bg-elevated/90 text-scifi-cyan border border-scifi-cyan-dim font-scifi-heading uppercase tracking-wider text-xs hover:border-scifi-cyan hover:shadow-scifi-glow'
          }
        `}
      >
        <BookOpen size={16} />
        <span className="max-w-[150px] truncate">{current?.title || 'Select Timeline'}</span>
        <ChevronDown size={14} className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className={`
          mt-2 min-w-[280px] max-w-[350px] overflow-hidden
          ${theme === 'fantasy'
            ? 'bg-fantasy-bg-card border-2 border-fantasy-border shadow-fantasy-lg'
            : 'bg-scifi-bg-elevated border border-scifi-cyan-dim shadow-scifi-lg'
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
                    ? 'bg-fantasy-gold/15 border-l-4 border-fantasy-gold'
                    : 'bg-scifi-cyan/10 border-l-2 border-scifi-cyan'
                  : theme === 'fantasy'
                    ? 'text-fantasy-text hover:bg-fantasy-gold/5 border-l-4 border-transparent hover:border-fantasy-border'
                    : 'text-scifi-text hover:bg-scifi-cyan/5 border-l-2 border-transparent hover:border-scifi-cyan-dim'
                }
              `}
            >
              <div className="flex items-center gap-2">
                <div className={`font-bold text-sm ${
                  theme === 'fantasy' 
                    ? 'font-fantasy-heading' 
                    : 'font-scifi-heading uppercase tracking-wider text-xs'
                } ${tl.id === currentTimelineId ? (theme === 'fantasy' ? 'text-fantasy-gold' : 'text-scifi-cyan') : ''}`}>
                  {tl.title}
                </div>
                {tl.isLocal && (
                  <span className={`text-[10px] px-2 py-0.5 ${
                    theme === 'fantasy' 
                      ? 'bg-fantasy-gold/20 text-fantasy-gold border border-fantasy-gold/30' 
                      : 'bg-scifi-cyan/20 text-scifi-cyan border border-scifi-cyan/30'
                  }`}>
                    Local
                  </span>
                )}
              </div>
              {tl.description && (
                <div className={`text-xs mt-1 line-clamp-2 ${
                  theme === 'fantasy' 
                    ? 'text-fantasy-muted font-fantasy-body' 
                    : 'text-scifi-text-dim'
                }`}>
                  {tl.description}
                </div>
              )}
            </button>
          ))}
          
          {/* Add Timeline Button */}
          <button
            data-testid="add-timeline-btn"
            onClick={handleAddTimelineClick}
            className={`
              w-full text-left px-4 py-3 transition-all flex items-center gap-3 border-t
              ${theme === 'fantasy'
                ? 'text-fantasy-gold hover:bg-fantasy-gold/10 border-fantasy-border/60'
                : 'text-scifi-cyan hover:bg-scifi-cyan/10 border-scifi-cyan-dim/40'
              }
            `}
          >
            <Plus size={16} />
            <span className={`font-bold text-sm ${
              theme === 'fantasy' 
                ? 'font-fantasy-heading' 
                : 'font-scifi-heading uppercase tracking-wider text-xs'
            }`}>
              Create New Timeline
            </span>
          </button>
        </div>
      )}
    </div>

    {/* Add Timeline Form Modal */}
    <AnimatePresence>
      {showAddTimeline && (
        <AddTimelineForm
          onClose={() => setShowAddTimeline(false)}
          onCreated={handleTimelineCreated}
        />
      )}
    </AnimatePresence>
    </>
  );
}
