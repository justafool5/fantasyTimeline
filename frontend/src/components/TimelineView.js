import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { useTimeline } from '../contexts/TimelineContext';
import { useTheme } from '../contexts/ThemeContext';
import { AnimatePresence } from 'framer-motion';
import { resolveEventPositions, getPeriodBarDimensions, positionToYear, formatYear } from '../utils/timelineUtils';
import EventCard from './EventCard';
import SubTimeline from './SubTimeline';
import AddEventForm from './AddEventForm';
import { Plus } from 'lucide-react';

const BASE_PX_PER_YEAR = 0.8;
const TIMELINE_PADDING = 120;
const MARKER_AREA_HEIGHT = 180;

export default function TimelineView() {
  const {
    timelineData, allEvents, zoom, setZoom,
    expandedEvent, setExpandedEvent,
    expandedPeriod, setExpandedPeriod,
    removeLocalEvent, scrollRef,
  } = useTimeline();
  const { theme } = useTheme();

  const [addEventYear, setAddEventYear] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, scrollLeft: 0 });
  const timelineAreaRef = useRef(null);

  const meta = timelineData?.timeline;
  const pixelsPerYear = BASE_PX_PER_YEAR * zoom;

  // Resolve positions
  const { positions, totalWidth } = useMemo(() => {
    if (!meta || !allEvents.length) return { positions: {}, totalWidth: 0 };
    return resolveEventPositions(allEvents, meta, pixelsPerYear);
  }, [allEvents, meta, pixelsPerYear]);

  // Period events
  const periodEvents = useMemo(() =>
    allEvents.filter(e => e.type === 'period'),
    [allEvents]
  );

  // Year markers
  const yearMarkers = useMemo(() => {
    if (!meta) return [];
    const range = meta.endYear - meta.startYear;
    let step;
    if (range * pixelsPerYear < 800) step = Math.max(1, Math.floor(range / 10));
    else if (pixelsPerYear > 3) step = 50;
    else if (pixelsPerYear > 1) step = 100;
    else if (pixelsPerYear > 0.5) step = 200;
    else step = 500;

    const markers = [];
    const start = Math.ceil(meta.startYear / step) * step;
    for (let y = start; y <= meta.endYear; y += step) {
      markers.push({
        year: y,
        x: (y - meta.startYear) * pixelsPerYear,
      });
    }
    return markers;
  }, [meta, pixelsPerYear]);

  // Alternate above/below
  const sortedEvents = useMemo(() => {
    const sorted = [...allEvents].sort((a, b) => {
      const posA = positions[a.id]?.x || 0;
      const posB = positions[b.id]?.x || 0;
      return posA - posB;
    });
    return sorted.map((evt, i) => ({
      ...evt,
      above: i % 2 === 0,
    }));
  }, [allEvents, positions]);

  // Mouse wheel zoom
  const handleWheel = useCallback((e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      setZoom(prev => Math.min(Math.max(prev * delta, 0.1), 10));
    }
  }, [setZoom]);

  // Drag to scroll
  const handleMouseDown = useCallback((e) => {
    if (e.target.closest('[data-interactive]')) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX, scrollLeft: scrollRef.current?.scrollLeft || 0 });
  }, [scrollRef]);

  const handleMouseMove = useCallback((e) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStart.x;
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = dragStart.scrollLeft - dx;
    }
  }, [isDragging, dragStart, scrollRef]);

  const handleMouseUp = useCallback(() => setIsDragging(false), []);

  useEffect(() => {
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, [handleMouseUp]);

  // Click on timeline to add event
  const handleTimelineClick = useCallback((e) => {
    if (e.target.closest('[data-interactive]')) return;
    if (isDragging) return;
    const rect = timelineAreaRef.current?.getBoundingClientRect();
    if (!rect || !meta) return;
    const scrollLeft = scrollRef.current?.scrollLeft || 0;
    const clickX = e.clientX - rect.left + scrollLeft - TIMELINE_PADDING;
    const year = positionToYear(clickX, meta.startYear, pixelsPerYear);
    if (year >= meta.startYear && year <= meta.endYear) {
      setAddEventYear(year);
    }
  }, [meta, pixelsPerYear, scrollRef, isDragging]);

  if (!meta) return null;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Title */}
      <div className={`
        text-center py-4 px-6 flex-shrink-0
        ${theme === 'fantasy'
          ? 'border-b-2 border-double border-fantasy-border bg-fantasy-card/50'
          : 'border-b border-scifi-border bg-scifi-bg-secondary/50'
        }
      `}>
        <h1 data-testid="timeline-title" className={`text-2xl font-bold ${theme === 'fantasy' ? 'font-fantasy-heading text-fantasy-text' : 'font-scifi-heading text-scifi-accent text-lg tracking-widest'}`}>
          {meta.title}
        </h1>
        <p className={`text-xs mt-1 ${theme === 'fantasy' ? 'text-fantasy-muted' : 'text-scifi-muted'}`}>
          {formatYear(meta.startYear)} — {formatYear(meta.endYear)}
          <span className="mx-2">|</span>
          Ctrl+Scroll to zoom
          <span className="mx-2">|</span>
          Click timeline to add event
        </p>
      </div>

      {/* Scrollable timeline area */}
      <div
        ref={scrollRef}
        className={`flex-1 overflow-x-auto overflow-y-auto timeline-scroll ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        style={{ scrollBehavior: isDragging ? 'auto' : 'smooth' }}
      >
        <div
          ref={timelineAreaRef}
          className="relative"
          style={{
            width: totalWidth + TIMELINE_PADDING * 2,
            minHeight: MARKER_AREA_HEIGHT * 2 + 80,
            paddingLeft: TIMELINE_PADDING,
            paddingRight: TIMELINE_PADDING,
          }}
          onClick={handleTimelineClick}
        >
          {/* Year markers */}
          {yearMarkers.map(m => (
            <div
              key={m.year}
              className="absolute flex flex-col items-center"
              style={{
                left: m.x + TIMELINE_PADDING,
                top: MARKER_AREA_HEIGHT - 20,
                transform: 'translateX(-50%)',
              }}
            >
              <div className={`
                h-10 w-px
                ${theme === 'fantasy' ? 'bg-fantasy-border/40' : 'bg-scifi-border/30'}
              `} style={{ marginTop: 20 }} />
              <span className={`
                text-[10px] mt-1 whitespace-nowrap select-none
                ${theme === 'fantasy' ? 'text-fantasy-muted/60 font-fantasy-body' : 'text-scifi-muted/40 font-scifi-body'}
              `}>
                {formatYear(m.year)}
              </span>
            </div>
          ))}

          {/* Main timeline axis */}
          <div
            data-testid="timeline-axis"
            className={`
              absolute left-0 right-0
              ${theme === 'fantasy'
                ? 'h-1 bg-amber-900/60 shadow-sm'
                : 'h-[2px] bg-cyan-500/80 shadow-[0_0_10px_#00f3ff]'
              }
            `}
            style={{
              top: MARKER_AREA_HEIGHT + 20,
              marginLeft: TIMELINE_PADDING - 20,
              marginRight: TIMELINE_PADDING - 20,
            }}
          />

          {/* Period bars */}
          {periodEvents.map(evt => {
            const dims = getPeriodBarDimensions(evt, meta.startYear, pixelsPerYear);
            const isExpanded = expandedPeriod === evt.id;
            return (
              <div
                key={`period-${evt.id}`}
                data-interactive="true"
                data-testid={`period-bar-${evt.id}`}
                className={`
                  absolute period-bar cursor-pointer transition-all
                  ${theme === 'fantasy'
                    ? `h-3 rounded-sm ${isExpanded ? 'bg-fantasy-accent/50 border border-fantasy-accent' : 'bg-amber-900/25 border border-amber-900/30 hover:bg-amber-900/40'}`
                    : `h-2 ${isExpanded ? 'bg-cyan-500/40 border border-cyan-400/60' : 'bg-cyan-900/40 border border-cyan-500/20 hover:bg-cyan-500/30'}`
                  }
                `}
                style={{
                  left: dims.left + TIMELINE_PADDING,
                  width: Math.max(dims.width, 4),
                  top: MARKER_AREA_HEIGHT + (theme === 'fantasy' ? 15 : 16),
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setExpandedPeriod(isExpanded ? null : evt.id);
                }}
                title={`${evt.title} — Click to ${isExpanded ? 'collapse' : 'expand'} sub-timeline`}
              />
            );
          })}

          {/* Event markers */}
          {sortedEvents.map(evt => {
            const pos = positions[evt.id];
            if (!pos) return null;
            const isAbove = evt.above;
            const isExpanded = expandedEvent === evt.id;
            const isPeriod = evt.type === 'period';

            return (
              <div
                key={evt.id}
                data-interactive="true"
                className="absolute"
                style={{
                  left: pos.x + TIMELINE_PADDING,
                  top: MARKER_AREA_HEIGHT + 20,
                  transform: 'translateX(-50%)',
                  zIndex: isExpanded ? 30 : 10,
                }}
              >
                {/* Connector line */}
                <div
                  className={`
                    absolute left-1/2 -translate-x-1/2 w-px
                    ${theme === 'fantasy' ? 'bg-fantasy-border/50' : 'bg-scifi-border/40'}
                    ${pos.isFuzzy ? 'border-dashed' : ''}
                  `}
                  style={isAbove ? {
                    bottom: 0,
                    height: 60,
                  } : {
                    top: 0,
                    height: 60,
                  }}
                />

                {/* Marker dot */}
                <button
                  data-testid={`event-marker-${evt.id}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpandedEvent(isExpanded ? null : evt.id);
                  }}
                  className={`
                    relative z-20 transition-all duration-200
                    ${pos.isFuzzy ? 'fuzzy-marker' : ''}
                    ${theme === 'fantasy'
                      ? `w-4 h-4 rounded-full border-2 shadow-md hover:scale-150 ${isPeriod ? 'bg-amber-700 border-fantasy-border' : pos.isFuzzy ? 'bg-fantasy-muted border-dashed border-fantasy-border' : 'bg-fantasy-accent border-fantasy-border'}`
                      : `w-3 h-3 rotate-45 border shadow-[0_0_8px_#00f3ff] hover:bg-cyan-400 hover:shadow-[0_0_15px_#00f3ff] ${isPeriod ? 'bg-purple-900 border-purple-400' : pos.isFuzzy ? 'bg-scifi-muted border-dashed border-scifi-border' : 'bg-black border-cyan-400'}`
                    }
                    ${isExpanded ? 'scale-150' : ''}
                  `}
                  style={{ marginTop: -8 }}
                />

                {/* Thumbnail label */}
                <div
                  className={`
                    absolute left-1/2 -translate-x-1/2 text-center whitespace-nowrap
                    transition-opacity duration-200 select-none pointer-events-none
                    ${isExpanded ? 'opacity-40' : 'opacity-100'}
                  `}
                  style={isAbove ? {
                    bottom: 20,
                    marginBottom: 48,
                  } : {
                    top: 20,
                    marginTop: 48,
                  }}
                >
                  <div className={`
                    text-[11px] font-bold leading-tight max-w-[120px] truncate
                    ${theme === 'fantasy' ? 'font-fantasy-heading text-fantasy-text' : 'font-scifi-heading text-scifi-text text-[10px]'}
                  `}>
                    {evt.title}
                  </div>
                  <div className={`
                    text-[9px] mt-0.5
                    ${theme === 'fantasy' ? 'text-fantasy-muted' : 'text-scifi-muted'}
                    ${pos.isFuzzy ? 'italic' : ''}
                  `}>
                    {evt.type === 'point' ? formatYear(evt.date.year)
                      : evt.type === 'period' ? `${formatYear(evt.startDate.year)}–${formatYear(evt.endDate.year)}`
                      : '~ uncertain'}
                  </div>
                </div>

                {/* Expanded card */}
                {isExpanded && (
                  <div className="absolute left-1/2" style={isAbove ? { bottom: 50, marginBottom: 80 } : { top: 50, marginTop: 80 }}>
                    <EventCard
                      event={evt}
                      onClose={() => setExpandedEvent(null)}
                      onDelete={removeLocalEvent}
                    />
                  </div>
                )}
              </div>
            );
          })}

          {/* Add event indicator (plus icon on hover area) */}
          <div
            className="absolute left-0 right-0 flex items-center justify-center pointer-events-none"
            style={{ top: MARKER_AREA_HEIGHT + 12, height: 20 }}
          >
            <div className={`
              text-[10px] flex items-center gap-1 opacity-30
              ${theme === 'fantasy' ? 'text-fantasy-muted' : 'text-scifi-muted'}
            `}>
              <Plus size={10} /> Click to add event
            </div>
          </div>
        </div>

        {/* Sub-timeline for expanded period */}
        <AnimatePresence>
          {expandedPeriod && (() => {
            const periodEvt = allEvents.find(e => e.id === expandedPeriod);
            if (!periodEvt || !periodEvt.children?.length) return null;
            return (
              <SubTimeline
                key={expandedPeriod}
                parentEvent={periodEvt}
                parentMeta={meta}
                parentPixelsPerYear={pixelsPerYear}
              />
            );
          })()}
        </AnimatePresence>
      </div>

      {/* Add Event Form Modal */}
      <AnimatePresence>
        {addEventYear !== null && (
          <AddEventForm
            year={addEventYear}
            onClose={() => setAddEventYear(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
