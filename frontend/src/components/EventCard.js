import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, Trash2 } from 'lucide-react';
import { formatYear, getTagColor } from '../utils/timelineUtils';

export default function EventCard({ event, onClose, onDelete }) {
  const { theme } = useTheme();
  const isLocal = event.isLocal;

  const year = event.type === 'point' ? event.date?.year
    : event.type === 'period' ? event.startDate?.year
    : null;

  const endYear = event.type === 'period' ? event.endDate?.year : null;

  return (
    <AnimatePresence>
      <motion.div
        data-testid={`event-card-${event.id}`}
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className={`
          absolute z-40 w-80 max-h-[70vh] overflow-y-auto
          ${theme === 'fantasy'
            ? 'bg-[#f9f1d8] border-4 border-double border-amber-900/40 text-amber-950 shadow-xl rounded-sm'
            : 'bg-slate-900/95 border border-cyan-500/50 text-cyan-50 shadow-[0_0_20px_rgba(0,243,255,0.15)] backdrop-blur-md relative overflow-hidden'
          }
        `}
        style={{ left: '50%', transform: 'translateX(-50%)' }}
      >
        {/* Sci-fi scanline overlay */}
        {theme === 'scifi' && <div className="scanlines absolute inset-0 pointer-events-none" />}

        {/* Header */}
        <div className={`
          flex items-start justify-between p-4 pb-2 relative z-10
          ${theme === 'fantasy' ? 'border-b-2 border-double border-amber-900/20' : 'border-b border-cyan-500/20'}
        `}>
          <div className="flex-1 pr-2">
            <h3 className={`text-lg font-bold leading-tight ${theme === 'fantasy' ? 'font-fantasy-heading' : 'font-scifi-heading text-sm'}`}>
              {event.title}
            </h3>
            <div className={`flex items-center gap-1 mt-1 text-xs ${theme === 'fantasy' ? 'text-fantasy-muted' : 'text-scifi-muted'}`}>
              <MapPin size={12} />
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
          <div className="flex items-center gap-1">
            {isLocal && (
              <button
                data-testid={`delete-event-${event.id}`}
                onClick={(e) => { e.stopPropagation(); onDelete?.(event.id); }}
                className={`p-1 transition-colors ${theme === 'fantasy' ? 'text-fantasy-accent hover:text-red-700' : 'text-red-400 hover:text-red-300'}`}
                title="Delete local event"
              >
                <Trash2 size={14} />
              </button>
            )}
            <button
              data-testid={`close-event-card-${event.id}`}
              onClick={onClose}
              className={`p-1 transition-colors ${theme === 'fantasy' ? 'text-fantasy-muted hover:text-fantasy-text' : 'text-scifi-muted hover:text-scifi-accent'}`}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Image */}
        {event.image && (
          <div className="relative z-10">
            <img
              src={event.image}
              alt={event.title}
              className={`w-full h-40 object-cover ${theme === 'fantasy' ? 'sepia-[0.2] contrast-[1.1]' : 'opacity-90'}`}
              loading="lazy"
            />
          </div>
        )}

        {/* Description */}
        <div className={`p-4 relative z-10 text-sm leading-relaxed ${theme === 'fantasy' ? 'font-fantasy-body' : 'font-scifi-body'}`}>
          {event.description}
        </div>

        {/* Tags */}
        {event.tags && event.tags.length > 0 && (
          <div className="px-4 pb-4 flex flex-wrap gap-1.5 relative z-10">
            {event.tags.map(tag => {
              const color = getTagColor(tag, theme);
              return (
                <span
                  key={tag}
                  data-testid={`tag-${tag}`}
                  className="px-2 py-0.5 text-xs font-bold rounded-sm"
                  style={{ backgroundColor: color.bg, color: color.text }}
                >
                  {tag}
                </span>
              );
            })}
          </div>
        )}

        {/* Period indicator */}
        {event.type === 'period' && event.children && event.children.length > 0 && (
          <div className={`
            px-4 pb-4 relative z-10 text-xs
            ${theme === 'fantasy' ? 'text-fantasy-accent' : 'text-scifi-accent'}
          `}>
            Click the period bar to explore {event.children.length} sub-events
          </div>
        )}

        {/* Local event badge */}
        {isLocal && (
          <div className={`
            px-4 pb-3 relative z-10
          `}>
            <span className={`
              inline-block px-2 py-0.5 text-xs rounded-sm
              ${theme === 'fantasy' ? 'bg-amber-900/20 text-fantasy-muted border border-fantasy-border' : 'bg-cyan-900/30 text-scifi-muted border border-scifi-border'}
            `}>
              Local event
            </span>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
