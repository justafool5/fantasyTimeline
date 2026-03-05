import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { motion } from 'framer-motion';
import { X, MapPin, Trash2, Layers } from 'lucide-react';
import { formatYear, getTagColor } from '../utils/timelineUtils';

export default function EventCard({ event, onClose, onDelete, onDrillIn }) {
  const { theme } = useTheme();
  const isLocal = event.isLocal;

  const year = event.type === 'point' ? event.date?.year
    : event.type === 'period' ? event.startDate?.year
    : null;
  const endYear = event.type === 'period' ? event.endDate?.year : null;

  return (
    <motion.div
      data-testid="event-card-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: theme === 'fantasy' ? 'rgba(10,8,4,0.6)' : 'rgba(0,0,0,0.7)' }}
      onClick={onClose}
    >
      <motion.div
        data-testid={`event-card-${event.id}`}
        initial={{ y: 30, scale: 0.95 }}
        animate={{ y: 0, scale: 1 }}
        exit={{ y: 30, scale: 0.95 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        onClick={e => e.stopPropagation()}
        className={`
          w-full max-w-md max-h-[80vh] overflow-y-auto relative
          ${theme === 'fantasy'
            ? 'bg-[#1e160d] border border-fantasy-border text-fantasy-text shadow-[0_4px_40px_rgba(0,0,0,0.8)]'
            : 'bg-slate-900/95 border border-cyan-500/50 text-cyan-50 shadow-[0_0_30px_rgba(0,243,255,0.15)] backdrop-blur-md'
          }
        `}
      >
        {theme === 'scifi' && <div className="scanlines absolute inset-0 pointer-events-none" />}

        {/* Header */}
        <div className={`flex items-start justify-between p-5 pb-3 relative z-10 ${theme === 'fantasy' ? 'border-b border-fantasy-border/40' : 'border-b border-cyan-500/20'}`}>
          <div className="flex-1 pr-3">
            <h3 className={`text-xl font-bold leading-tight ${theme === 'fantasy' ? 'font-fantasy-heading text-fantasy-accent' : 'font-scifi-heading text-base text-scifi-accent'}`}>
              {event.title}
            </h3>
            <div className={`flex items-center gap-1.5 mt-1.5 text-sm ${theme === 'fantasy' ? 'text-fantasy-muted' : 'text-scifi-muted'}`}>
              <MapPin size={13} />
              {event.type === 'undated' ? (
                <span className="italic">Date uncertain</span>
              ) : (
                <span>
                  {formatYear(year)}
                  {endYear != null && ` — ${formatYear(endYear)}`}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {isLocal && (
              <button data-testid={`delete-event-${event.id}`} onClick={() => { onDelete?.(event.id); onClose(); }}
                className={`p-1.5 transition-colors ${theme === 'fantasy' ? 'text-red-400 hover:text-red-300' : 'text-red-400 hover:text-red-300'}`} title="Delete local event">
                <Trash2 size={15} />
              </button>
            )}
            <button data-testid={`close-event-card`} onClick={onClose}
              className={`p-1.5 transition-colors ${theme === 'fantasy' ? 'text-fantasy-muted hover:text-fantasy-text' : 'text-scifi-muted hover:text-scifi-accent'}`}>
              <X size={17} />
            </button>
          </div>
        </div>

        {/* Image */}
        {event.image && (
          <div className="relative z-10">
            <img src={event.image} alt={event.title} className={`w-full h-48 object-cover ${theme === 'fantasy' ? 'brightness-90' : 'opacity-90'}`} loading="lazy" />
            {theme === 'fantasy' && <div className="absolute inset-0 bg-gradient-to-t from-[#1e160d] to-transparent opacity-40" />}
          </div>
        )}

        {/* Description */}
        <div className={`p-5 relative z-10 text-sm leading-relaxed ${theme === 'fantasy' ? 'font-fantasy-body text-fantasy-text/90' : 'font-scifi-body'}`}>
          {event.description}
        </div>

        {/* Tags */}
        {event.tags && event.tags.length > 0 && (
          <div className="px-5 pb-4 flex flex-wrap gap-1.5 relative z-10">
            {event.tags.map(tag => {
              const color = getTagColor(tag, theme);
              return (
                <span key={tag} data-testid={`tag-${tag}`} className="px-2 py-0.5 text-xs font-bold" style={{ backgroundColor: color.bg, color: color.text }}>
                  {tag}
                </span>
              );
            })}
          </div>
        )}

        {/* Drill-in button for periods with children */}
        {onDrillIn && (
          <div className="px-5 pb-4 relative z-10">
            <button
              data-testid={`drill-into-${event.id}`}
              onClick={onDrillIn}
              className={`
                flex items-center gap-2 px-4 py-2 text-sm font-bold transition-all w-full justify-center
                ${theme === 'fantasy'
                  ? 'bg-fantasy-accent/15 text-fantasy-accent border border-fantasy-accent/40 font-fantasy-heading hover:bg-fantasy-accent/25'
                  : 'bg-scifi-accent/10 text-scifi-accent border border-scifi-accent/30 font-scifi-heading hover:bg-scifi-accent/20'
                }
              `}
            >
              <Layers size={15} />
              Explore {event.children.length} sub-events
            </button>
          </div>
        )}

        {/* Local badge */}
        {isLocal && (
          <div className="px-5 pb-4 relative z-10">
            <span className={`inline-block px-2 py-0.5 text-xs ${theme === 'fantasy' ? 'bg-fantasy-border/20 text-fantasy-muted border border-fantasy-border/40' : 'bg-cyan-900/30 text-scifi-muted border border-scifi-border'}`}>
              Local event
            </span>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
