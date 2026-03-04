import React, { useMemo, useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { motion } from 'framer-motion';
import { resolveEventPositions, formatYear, getTagColor } from '../utils/timelineUtils';
import { ChevronUp, MapPin } from 'lucide-react';

const SUB_PX_PER_YEAR = 2;
const SUB_PADDING = 60;

export default function SubTimeline({ parentEvent, parentMeta, parentPixelsPerYear }) {
  const { theme } = useTheme();
  const [expandedChild, setExpandedChild] = useState(null);

  const subMeta = useMemo(() => ({
    startYear: parentEvent.startDate.year,
    endYear: parentEvent.endDate.year,
  }), [parentEvent.startDate.year, parentEvent.endDate.year]);

  const { positions, totalWidth } = useMemo(() => {
    return resolveEventPositions(parentEvent.children, subMeta, SUB_PX_PER_YEAR);
  }, [parentEvent.children, subMeta]);

  const sortedChildren = useMemo(() => {
    return [...parentEvent.children].sort((a, b) => {
      const posA = positions[a.id]?.x || 0;
      const posB = positions[b.id]?.x || 0;
      return posA - posB;
    }).map((evt, i) => ({ ...evt, above: i % 2 === 0 }));
  }, [parentEvent.children, positions]);

  // Year markers for sub-timeline
  const yearMarkers = useMemo(() => {
    const range = subMeta.endYear - subMeta.startYear;
    let step = Math.max(1, Math.floor(range / 8));
    if (step > 50) step = Math.ceil(step / 50) * 50;
    else if (step > 10) step = Math.ceil(step / 10) * 10;

    const markers = [];
    const start = Math.ceil(subMeta.startYear / step) * step;
    for (let y = start; y <= subMeta.endYear; y += step) {
      markers.push({ year: y, x: (y - subMeta.startYear) * SUB_PX_PER_YEAR });
    }
    return markers;
  }, [subMeta]);

  return (
    <motion.div
      data-testid={`sub-timeline-${parentEvent.id}`}
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.4, ease: 'easeInOut' }}
      className={`
        mx-4 mb-4 overflow-hidden
        ${theme === 'fantasy'
          ? 'border-2 border-double border-fantasy-border bg-fantasy-bg-secondary/50'
          : 'border border-scifi-border bg-scifi-bg-secondary/50'
        }
      `}
    >
      {/* Sub-timeline header */}
      <div className={`
        flex items-center gap-2 px-4 py-2
        ${theme === 'fantasy'
          ? 'bg-fantasy-card border-b-2 border-double border-fantasy-border'
          : 'bg-scifi-bg-secondary border-b border-scifi-border'
        }
      `}>
        <ChevronUp size={14} className={theme === 'fantasy' ? 'text-fantasy-accent' : 'text-scifi-accent'} />
        <h4 className={`text-sm font-bold ${theme === 'fantasy' ? 'font-fantasy-heading text-fantasy-text' : 'font-scifi-heading text-scifi-accent text-xs'}`}>
          Sub-events of: {parentEvent.title}
        </h4>
        <span className={`text-xs ${theme === 'fantasy' ? 'text-fantasy-muted' : 'text-scifi-muted'}`}>
          ({formatYear(subMeta.startYear)} — {formatYear(subMeta.endYear)})
        </span>
      </div>

      {/* Sub-timeline content */}
      <div className="overflow-x-auto p-4 timeline-scroll">
        <div
          className="relative"
          style={{
            width: totalWidth + SUB_PADDING * 2,
            minHeight: 200,
            paddingLeft: SUB_PADDING,
            paddingRight: SUB_PADDING,
          }}
        >
          {/* Year markers */}
          {yearMarkers.map(m => (
            <div
              key={m.year}
              className="absolute flex flex-col items-center"
              style={{ left: m.x + SUB_PADDING, top: 60, transform: 'translateX(-50%)' }}
            >
              <div className={`h-6 w-px ${theme === 'fantasy' ? 'bg-fantasy-border/30' : 'bg-scifi-border/20'}`} style={{ marginTop: 12 }} />
              <span className={`text-[9px] mt-0.5 whitespace-nowrap select-none ${theme === 'fantasy' ? 'text-fantasy-muted/50' : 'text-scifi-muted/30'}`}>
                {formatYear(m.year)}
              </span>
            </div>
          ))}

          {/* Sub axis */}
          <div
            className={`
              absolute left-0 right-0
              ${theme === 'fantasy' ? 'h-[2px] bg-amber-900/40' : 'h-px bg-cyan-500/50'}
            `}
            style={{ top: 80, marginLeft: SUB_PADDING - 10, marginRight: SUB_PADDING - 10 }}
          />

          {/* Sub event markers */}
          {sortedChildren.map(evt => {
            const pos = positions[evt.id];
            if (!pos) return null;
            const isExpanded = expandedChild === evt.id;

            return (
              <div
                key={evt.id}
                className="absolute"
                style={{ left: pos.x + SUB_PADDING, top: 80, transform: 'translateX(-50%)', zIndex: isExpanded ? 20 : 5 }}
              >
                {/* Connector */}
                <div
                  className={`absolute left-1/2 -translate-x-1/2 w-px ${theme === 'fantasy' ? 'bg-fantasy-border/40' : 'bg-scifi-border/30'}`}
                  style={evt.above ? { bottom: 0, height: 30 } : { top: 0, height: 30 }}
                />

                {/* Dot */}
                <button
                  data-testid={`sub-event-marker-${evt.id}`}
                  onClick={() => setExpandedChild(isExpanded ? null : evt.id)}
                  className={`
                    relative z-10 transition-all duration-200
                    ${theme === 'fantasy'
                      ? `w-3 h-3 rounded-full border border-fantasy-border shadow hover:scale-150 ${pos.isFuzzy ? 'bg-fantasy-muted border-dashed' : 'bg-fantasy-accent'}`
                      : `w-2 h-2 rotate-45 border hover:scale-150 ${pos.isFuzzy ? 'bg-scifi-muted border-dashed border-scifi-border' : 'bg-black border-cyan-400 shadow-[0_0_6px_#00f3ff]'}`
                    }
                  `}
                  style={{ marginTop: -6 }}
                />

                {/* Label */}
                <div
                  className="absolute left-1/2 -translate-x-1/2 text-center whitespace-nowrap select-none pointer-events-none"
                  style={evt.above ? { bottom: 12, marginBottom: 24 } : { top: 12, marginTop: 24 }}
                >
                  <div className={`text-[10px] font-bold max-w-[100px] truncate ${theme === 'fantasy' ? 'font-fantasy-heading text-fantasy-text' : 'font-scifi-heading text-scifi-text text-[9px]'}`}>
                    {evt.title}
                  </div>
                  <div className={`text-[8px] ${theme === 'fantasy' ? 'text-fantasy-muted' : 'text-scifi-muted'}`}>
                    {evt.type === 'point' ? formatYear(evt.date.year) : '~'}
                  </div>
                </div>

                {/* Expanded mini card */}
                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={`
                      absolute left-1/2 -translate-x-1/2 w-56 p-3 z-20
                      ${theme === 'fantasy'
                        ? 'bg-fantasy-card border-2 border-double border-fantasy-border shadow-lg'
                        : 'bg-slate-900/95 border border-cyan-500/40 shadow-[0_0_15px_rgba(0,243,255,0.1)] backdrop-blur-md'
                      }
                    `}
                    style={evt.above ? { bottom: 20, marginBottom: 50 } : { top: 20, marginTop: 50 }}
                  >
                    <div className="flex items-start justify-between mb-1">
                      <h5 className={`text-xs font-bold ${theme === 'fantasy' ? 'font-fantasy-heading' : 'font-scifi-heading text-scifi-accent'}`}>
                        {evt.title}
                      </h5>
                      <button onClick={() => setExpandedChild(null)} className={`text-xs ml-2 ${theme === 'fantasy' ? 'text-fantasy-muted' : 'text-scifi-muted'}`}>
                        x
                      </button>
                    </div>
                    {evt.date && (
                      <div className={`flex items-center gap-1 text-[10px] mb-1 ${theme === 'fantasy' ? 'text-fantasy-muted' : 'text-scifi-muted'}`}>
                        <MapPin size={10} /> {formatYear(evt.date.year)}
                      </div>
                    )}
                    <p className={`text-[11px] leading-relaxed ${theme === 'fantasy' ? 'font-fantasy-body' : 'font-scifi-body'}`}>
                      {evt.description}
                    </p>
                    {evt.tags?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {evt.tags.map(tag => {
                          const c = getTagColor(tag, theme);
                          return (
                            <span key={tag} className="px-1.5 py-0.5 text-[9px] font-bold" style={{ backgroundColor: c.bg, color: c.text }}>
                              {tag}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </motion.div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
