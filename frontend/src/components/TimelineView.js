import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { useTimeline } from '../contexts/TimelineContext';
import { useTheme } from '../contexts/ThemeContext';
import { AnimatePresence } from 'framer-motion';
import { resolveEventPositions, getPeriodBarDimensions, positionToYear, formatYear } from '../utils/timelineUtils';
import EventCard from './EventCard';
import SubTimeline from './SubTimeline';
import AddEventForm from './AddEventForm';

const BASE_PX_PER_YEAR = 0.8;
const TIMELINE_PADDING = 120;
const MARKER_AREA_HEIGHT = 200;
const AXIS_HITBOX_HEIGHT = 30;

export default function TimelineView() {
  const {
    timelineData, allEvents, zoom, setZoom,
    expandedEvent, setExpandedEvent,
    expandedPeriod, setExpandedPeriod,
    removeLocalEvent, scrollRef,
  } = useTimeline();
  const { theme } = useTheme();

  const [addEventYear, setAddEventYear] = useState(null);
  const [addEventContext, setAddEventContext] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [hasDragged, setHasDragged] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, scrollLeft: 0 });
  const timelineAreaRef = useRef(null);
  const axisRef = useRef(null);

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
      markers.push({ year: y, x: (y - meta.startYear) * pixelsPerYear });
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
    return sorted.map((evt, i) => ({ ...evt, above: i % 2 === 0 }));
  }, [allEvents, positions]);

  // FIX #2: Zoom via plain scroll wheel, native listener with passive:false
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handler = (e) => {
      // Only zoom if NOT horizontal scrolling (shift key = horizontal scroll)
      if (e.shiftKey) return;
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.92 : 1.08;
      setZoom(prev => Math.min(Math.max(prev * delta, 0.1), 10));
    };
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, [scrollRef, setZoom]);

  // Drag to scroll
  const handleMouseDown = useCallback((e) => {
    if (e.target.closest('[data-interactive]')) return;
    setIsDragging(true);
    setHasDragged(false);
    setDragStart({ x: e.clientX, scrollLeft: scrollRef.current?.scrollLeft || 0 });
  }, [scrollRef]);

  const handleMouseMove = useCallback((e) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStart.x;
    if (Math.abs(dx) > 5) setHasDragged(true);
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = dragStart.scrollLeft - dx;
    }
  }, [isDragging, dragStart, scrollRef]);

  const handleMouseUp = useCallback(() => setIsDragging(false), []);

  useEffect(() => {
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, [handleMouseUp]);

  // FIX #3: Click only on the axis line to add event
  const handleAxisClick = useCallback((e) => {
    if (hasDragged) return;
    e.stopPropagation();
    const rect = axisRef.current?.getBoundingClientRect();
    if (!rect || !meta) return;
    const scrollLeft = scrollRef.current?.scrollLeft || 0;
    const clickX = e.clientX - rect.left + scrollLeft;
    const year = positionToYear(clickX, meta.startYear, pixelsPerYear);
    if (year >= meta.startYear && year <= meta.endYear) {
      setAddEventYear(year);
      setAddEventContext(null);
    }
  }, [meta, pixelsPerYear, scrollRef, hasDragged]);

  if (!meta) return null;

  const axisTop = MARKER_AREA_HEIGHT + 20;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Title */}
      <div className={`
        text-center py-4 px-6 flex-shrink-0
        ${theme === 'fantasy'
          ? 'border-b border-fantasy-border/40 bg-fantasy-card/60'
          : 'border-b border-scifi-border/40 bg-scifi-bg-secondary/50'
        }
      `}>
        <h1 data-testid="timeline-title" className={`text-2xl font-bold ${theme === 'fantasy' ? 'font-fantasy-heading text-fantasy-accent' : 'font-scifi-heading text-scifi-accent text-lg tracking-widest'}`}>
          {meta.title}
        </h1>
        <p className={`text-xs mt-1 ${theme === 'fantasy' ? 'text-fantasy-muted' : 'text-scifi-muted'}`}>
          {formatYear(meta.startYear)} — {formatYear(meta.endYear)}
          <span className="mx-2">|</span>
          Scroll to zoom
          <span className="mx-2">|</span>
          Click the timeline to add event
        </p>
      </div>

      {/* Scrollable timeline area */}
      <div
        ref={scrollRef}
        className={`flex-1 overflow-x-auto overflow-y-auto timeline-scroll ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        style={{ scrollBehavior: isDragging ? 'auto' : 'smooth' }}
      >
        <div
          ref={timelineAreaRef}
          className="relative"
          style={{
            width: totalWidth + TIMELINE_PADDING * 2,
            minHeight: MARKER_AREA_HEIGHT * 2 + 100,
            paddingLeft: TIMELINE_PADDING,
            paddingRight: TIMELINE_PADDING,
          }}
        >
          {/* Year markers */}
          {yearMarkers.map(m => (
            <div
              key={m.year}
              className="absolute flex flex-col items-center pointer-events-none"
              style={{
                left: m.x + TIMELINE_PADDING,
                top: axisTop - 15,
                transform: 'translateX(-50%)',
              }}
            >
              <div className={`h-8 w-px ${theme === 'fantasy' ? 'bg-fantasy-border/30' : 'bg-scifi-border/25'}`} />
              <span className={`text-[10px] mt-1 whitespace-nowrap select-none ${theme === 'fantasy' ? 'text-fantasy-muted/50 font-fantasy-body' : 'text-scifi-muted/40 font-scifi-body'}`}>
                {formatYear(m.year)}
              </span>
            </div>
          ))}

          {/* AXIS LINE + CLICKABLE HITBOX (FIX #3) */}
          <div
            ref={axisRef}
            data-testid="timeline-axis"
            className={`absolute axis-hitbox ${theme === 'fantasy' ? '' : ''}`}
            style={{
              top: axisTop - AXIS_HITBOX_HEIGHT / 2,
              height: AXIS_HITBOX_HEIGHT,
              left: TIMELINE_PADDING - 20,
              right: TIMELINE_PADDING - 20,
            }}
            onClick={handleAxisClick}
          >
            {/* The visible line */}
            <div
              className={`absolute left-0 right-0 ${theme === 'fantasy'
                ? 'h-[3px] bg-gradient-to-r from-transparent via-fantasy-accent/60 to-transparent'
                : 'h-[2px] bg-cyan-500/80 shadow-[0_0_10px_#00f3ff]'
              }`}
              style={{ top: '50%', transform: 'translateY(-50%)' }}
            />
          </div>

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
                    ? `h-4 ${isExpanded ? 'bg-fantasy-accent/30 border border-fantasy-accent/60' : 'bg-fantasy-accent/10 border border-fantasy-border/40 hover:bg-fantasy-accent/20'}`
                    : `h-2 ${isExpanded ? 'bg-cyan-500/40 border border-cyan-400/60' : 'bg-cyan-900/40 border border-cyan-500/20 hover:bg-cyan-500/30'}`
                  }
                `}
                style={{
                  left: dims.left + TIMELINE_PADDING,
                  width: Math.max(dims.width, 4),
                  top: axisTop - (theme === 'fantasy' ? 8 : 4),
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setExpandedPeriod(isExpanded ? null : evt.id);
                }}
                title={`${evt.title} — Click to ${isExpanded ? 'collapse' : 'expand'} sub-timeline`}
              />
            );
          })}

          {/* Event markers with thumbnails (FIX #4) */}
          {sortedEvents.map(evt => {
            const pos = positions[evt.id];
            if (!pos) return null;
            const isAbove = evt.above;
            const isExpanded = expandedEvent === evt.id;
            const isPeriod = evt.type === 'period';
            const hasImage = !!evt.image;

            return (
              <div
                key={evt.id}
                data-interactive="true"
                className="absolute"
                style={{
                  left: pos.x + TIMELINE_PADDING,
                  top: axisTop,
                  transform: 'translateX(-50%)',
                  zIndex: isExpanded ? 30 : 10,
                }}
              >
                {/* Connector line */}
                <div
                  className={`
                    absolute left-1/2 -translate-x-1/2 w-px
                    ${theme === 'fantasy' ? 'bg-fantasy-border/40' : 'bg-scifi-border/30'}
                    ${pos.isFuzzy ? 'opacity-50' : ''}
                  `}
                  style={isAbove ? { bottom: 0, height: hasImage ? 90 : 60 } : { top: 0, height: hasImage ? 90 : 60 }}
                />

                {/* Marker dot on the axis */}
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
                      ? `w-3 h-3 rounded-full border-2 hover:scale-[1.8] ${isPeriod ? 'bg-fantasy-accent-red border-fantasy-accent' : pos.isFuzzy ? 'bg-fantasy-muted/60 border-dashed border-fantasy-border' : 'bg-fantasy-accent border-fantasy-border'}`
                      : `w-3 h-3 rotate-45 border shadow-[0_0_8px_#00f3ff] hover:bg-cyan-400 hover:shadow-[0_0_15px_#00f3ff] ${isPeriod ? 'bg-purple-900 border-purple-400' : pos.isFuzzy ? 'bg-scifi-muted border-dashed border-scifi-border' : 'bg-black border-cyan-400'}`
                    }
                    ${isExpanded ? (theme === 'fantasy' ? 'scale-[1.8] ring-2 ring-fantasy-accent/50' : 'scale-150 ring-1 ring-cyan-400/50') : ''}
                  `}
                  style={{ marginTop: -6 }}
                />

                {/* Thumbnail + label cluster */}
                <div
                  className={`
                    absolute left-1/2 -translate-x-1/2 flex flex-col items-center
                    transition-opacity duration-200 select-none
                    ${isExpanded ? 'opacity-30' : 'opacity-100'}
                  `}
                  style={isAbove ? { bottom: 16, marginBottom: hasImage ? 78 : 48 } : { top: 16, marginTop: hasImage ? 78 : 48 }}
                >
                  {/* Image thumbnail */}
                  {hasImage && (
                    <div
                      className={`event-thumbnail w-10 h-10 rounded-full overflow-hidden mb-1 pointer-events-none ${theme === 'fantasy' ? 'ring-1 ring-fantasy-accent/30' : ''}`}
                    >
                      <img
                        src={evt.image}
                        alt=""
                        className={`w-full h-full object-cover ${theme === 'fantasy' ? 'brightness-90' : 'brightness-75 contrast-110'}`}
                        loading="lazy"
                      />
                    </div>
                  )}

                  {/* Title */}
                  <div className={`
                    text-[11px] font-bold leading-tight max-w-[110px] text-center truncate
                    ${theme === 'fantasy' ? 'font-fantasy-heading text-fantasy-text' : 'font-scifi-heading text-scifi-text text-[10px]'}
                  `}>
                    {evt.title}
                  </div>
                  {/* Year */}
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
                  <div className="absolute left-1/2" style={isAbove ? { bottom: 50, marginBottom: hasImage ? 110 : 80 } : { top: 50, marginTop: hasImage ? 110 : 80 }}>
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
        </div>

        {/* Sub-timeline for expanded period */}
        <AnimatePresence>
          {expandedPeriod && (() => {
            const periodEvt = allEvents.find(e => e.id === expandedPeriod);
            if (!periodEvt) return null;
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
            parentContext={addEventContext}
            onClose={() => { setAddEventYear(null); setAddEventContext(null); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
