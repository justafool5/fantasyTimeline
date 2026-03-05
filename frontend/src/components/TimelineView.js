import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { useTimeline } from '../contexts/TimelineContext';
import { useTheme } from '../contexts/ThemeContext';
import { AnimatePresence } from 'framer-motion';
import { resolveEventPositions, getPeriodBarDimensions, positionToYear, formatYear } from '../utils/timelineUtils';
import EventCard from './EventCard';
import AddEventForm from './AddEventForm';
import { ChevronRight } from 'lucide-react';

const BASE_PX_PER_YEAR = 0.8;
const TIMELINE_PADDING = 120;
const MARKER_AREA_HEIGHT = 200;
const AXIS_HITBOX_HEIGHT = 30;

export default function TimelineView() {
  const {
    currentView, breadcrumbs, effectiveMeta,
    zoom, setZoom,
    expandedEvent, setExpandedEvent,
    drillInto, navigateTo,
    scrollRef, navStack,
    updateEvent, deleteEvent,
  } = useTimeline();
  const { theme } = useTheme();

  const [addEventYear, setAddEventYear] = useState(null);
  const [addEventParentId, setAddEventParentId] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [hasDragged, setHasDragged] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, scrollLeft: 0 });
  const timelineAreaRef = useRef(null);
  const axisRef = useRef(null);

  const meta = currentView.meta;
  const events = currentView.events;
  const contextEvents = useMemo(() => currentView.contextEvents || [], [currentView.contextEvents]);
  const isRoot = currentView.isRoot;
  const pixelsPerYear = BASE_PX_PER_YEAR * zoom;

  // All events for positioning (main + context)
  const allDisplayEvents = useMemo(() => [...events, ...contextEvents], [events, contextEvents]);

  // Compute effective meta range that includes context events
  const effectiveDisplayMeta = useMemo(() => {
    if (!meta) return null;
    if (contextEvents.length === 0) return meta;

    let minYear = meta.startYear;
    let maxYear = meta.endYear;

    for (const evt of contextEvents) {
      if (evt.type === 'point' && evt.date) {
        minYear = Math.min(minYear, evt.date.year);
        maxYear = Math.max(maxYear, evt.date.year);
      } else if (evt.type === 'period' && evt.startDate && evt.endDate) {
        minYear = Math.min(minYear, evt.startDate.year);
        maxYear = Math.max(maxYear, evt.endDate.year);
      }
    }

    // Add padding around the range
    const range = maxYear - minYear;
    const pad = Math.max(range * 0.05, 10);
    return { ...meta, startYear: Math.floor(minYear - pad), endYear: Math.ceil(maxYear + pad) };
  }, [meta, contextEvents]);

  // Resolve positions for all displayed events using the expanded range
  const { positions, totalWidth } = useMemo(() => {
    if (!effectiveDisplayMeta || !allDisplayEvents.length) return { positions: {}, totalWidth: 0 };
    return resolveEventPositions(allDisplayEvents, effectiveDisplayMeta, pixelsPerYear);
  }, [allDisplayEvents, effectiveDisplayMeta, pixelsPerYear]);

  // Period events (main only, not context)
  const periodEvents = useMemo(() => events.filter(e => e.type === 'period'), [events]);
  const contextPeriodEvents = useMemo(() => contextEvents.filter(e => e.type === 'period'), [contextEvents]);

  // Year markers (use effectiveDisplayMeta for positioning consistency)
  const yearMarkers = useMemo(() => {
    if (!effectiveDisplayMeta) return [];
    const range = effectiveDisplayMeta.endYear - effectiveDisplayMeta.startYear;
    let step;
    if (range * pixelsPerYear < 800) step = Math.max(1, Math.floor(range / 10));
    else if (pixelsPerYear > 3) step = 50;
    else if (pixelsPerYear > 1) step = 100;
    else if (pixelsPerYear > 0.5) step = 200;
    else step = 500;
    const markers = [];
    const start = Math.ceil(effectiveDisplayMeta.startYear / step) * step;
    for (let y = start; y <= effectiveDisplayMeta.endYear; y += step) {
      markers.push({ year: y, x: (y - effectiveDisplayMeta.startYear) * pixelsPerYear });
    }
    return markers;
  }, [effectiveDisplayMeta, pixelsPerYear]);

  // Sort and alternate main events
  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) => (positions[a.id]?.x || 0) - (positions[b.id]?.x || 0))
      .map((evt, i) => ({ ...evt, above: i % 2 === 0 }));
  }, [events, positions]);

  // Sort context events
  const sortedContextEvents = useMemo(() => {
    return [...contextEvents].sort((a, b) => (positions[a.id]?.x || 0) - (positions[b.id]?.x || 0))
      .map((evt, i) => ({ ...evt, above: i % 2 === 0 }));
  }, [contextEvents, positions]);

  // Zoom via scroll wheel
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handler = (e) => {
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
    if (scrollRef.current) scrollRef.current.scrollLeft = dragStart.scrollLeft - dx;
  }, [isDragging, dragStart, scrollRef]);

  const handleMouseUp = useCallback(() => setIsDragging(false), []);

  useEffect(() => {
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, [handleMouseUp]);

  // Click on axis to add event
  const handleAxisClick = useCallback((e) => {
    if (hasDragged) return;
    e.stopPropagation();
    const rect = axisRef.current?.getBoundingClientRect();
    if (!rect || !effectiveDisplayMeta) return;
    // axisRef left edge = TIMELINE_PADDING - 20, event origin = TIMELINE_PADDING → offset = 20
    const clickX = e.clientX - rect.left - 20;
    const year = positionToYear(clickX, effectiveDisplayMeta.startYear, pixelsPerYear);
    const rangeStart = meta?.startYear ?? effectiveDisplayMeta.startYear;
    const rangeEnd = meta?.endYear ?? effectiveDisplayMeta.endYear;
    if (year >= rangeStart && year <= rangeEnd) {
      setAddEventYear(year);
      const currentNav = navStack.length > 0 ? navStack[navStack.length - 1] : null;
      setAddEventParentId(currentNav?.parentEventId || null);
    }
  }, [effectiveDisplayMeta, meta, pixelsPerYear, hasDragged, navStack]);

  if (!meta || !effectiveDisplayMeta) return null;

  const axisTop = MARKER_AREA_HEIGHT + 20;

  // Render a single event marker
  const renderMarker = (evt, pos, isAbove, isContext = false) => {
    const isExpanded = expandedEvent === evt.id;
    const isPeriod = evt.type === 'period';
    const hasImage = !!evt.image;
    const opacity = isContext ? 'opacity-30 hover:opacity-50' : 'opacity-100';

    return (
      <div
        key={evt.id}
        data-interactive="true"
        className={`absolute transition-opacity duration-300 ${opacity}`}
        style={{
          left: pos.x + TIMELINE_PADDING,
          top: axisTop,
          transform: 'translateX(-50%)',
          zIndex: isContext ? 5 : 10,
        }}
      >
        {/* Connector line */}
        <div
          className={`absolute left-1/2 -translate-x-1/2 w-px ${theme === 'fantasy' ? 'bg-fantasy-border/40' : 'bg-scifi-border/30'} ${pos.isFuzzy ? 'opacity-50' : ''}`}
          style={isAbove ? { bottom: 0, height: hasImage ? 90 : 60 } : { top: 0, height: hasImage ? 90 : 60 }}
        />

        {/* Marker dot */}
        <button
          data-testid={`event-marker-${evt.id}`}
          onClick={(e) => {
            e.stopPropagation();
            if (isContext) return;
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
            ${isContext ? 'cursor-default' : 'cursor-pointer'}
          `}
          style={{ marginTop: -6 }}
        />

        {/* Thumbnail + label */}
        <div
          className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center select-none pointer-events-none"
          style={isAbove ? { bottom: 16, marginBottom: hasImage ? 78 : 48 } : { top: 16, marginTop: hasImage ? 78 : 48 }}
        >
          {hasImage && (
            <div className={`event-thumbnail w-10 h-10 rounded-full overflow-hidden mb-1 ${theme === 'fantasy' ? 'ring-1 ring-fantasy-accent/30' : ''}`}>
              <img src={evt.image} alt="" className={`w-full h-full object-cover ${theme === 'fantasy' ? 'brightness-90' : 'brightness-75 contrast-110'}`} loading="lazy" />
            </div>
          )}
          <div className={`text-[11px] font-bold leading-tight max-w-[110px] text-center truncate ${theme === 'fantasy' ? 'font-fantasy-heading text-fantasy-text' : 'font-scifi-heading text-scifi-text text-[10px]'}`}>
            {evt.title}
          </div>
          <div className={`text-[9px] mt-0.5 ${theme === 'fantasy' ? 'text-fantasy-muted' : 'text-scifi-muted'} ${pos.isFuzzy ? 'italic' : ''}`}>
            {evt.type === 'point' ? formatYear(evt.date.year)
              : evt.type === 'period' ? `${formatYear(evt.startDate.year)}–${formatYear(evt.endDate.year)}`
              : '~ uncertain'}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className={`text-center py-4 px-6 flex-shrink-0 ${theme === 'fantasy' ? 'border-b border-fantasy-border/40 bg-fantasy-card/60' : 'border-b border-scifi-border/40 bg-scifi-bg-secondary/50'}`}>
        <h1 data-testid="timeline-title" className={`text-2xl font-bold ${theme === 'fantasy' ? 'font-fantasy-heading text-fantasy-accent' : 'font-scifi-heading text-scifi-accent text-lg tracking-widest'}`}>
          {effectiveMeta?.title}
        </h1>
        <p className={`text-xs mt-1 ${theme === 'fantasy' ? 'text-fantasy-muted' : 'text-scifi-muted'}`}>
          {formatYear(effectiveMeta?.startYear)} — {formatYear(effectiveMeta?.endYear)}
        </p>
        {effectiveMeta?.description && (
          <p className={`text-xs mt-1 max-w-2xl mx-auto ${theme === 'fantasy' ? 'text-fantasy-text/60 font-fantasy-body italic' : 'text-scifi-text/40 font-scifi-body'}`}>
            {effectiveMeta.description}
          </p>
        )}
      </div>

      {/* Breadcrumbs (only when drilled in) */}
      {breadcrumbs.length > 1 && (
        <div
          data-testid="breadcrumb-bar"
          className={`flex items-center gap-1 px-4 py-2 text-xs flex-shrink-0 overflow-x-auto ${theme === 'fantasy' ? 'bg-fantasy-card/40 border-b border-fantasy-border/20' : 'bg-scifi-bg-secondary/40 border-b border-scifi-border/20'}`}
        >
          {breadcrumbs.map((crumb, i) => (
            <React.Fragment key={i}>
              {i > 0 && <ChevronRight size={12} className={theme === 'fantasy' ? 'text-fantasy-muted/40' : 'text-scifi-muted/30'} />}
              <button
                data-testid={`breadcrumb-${i}`}
                data-interactive="true"
                onClick={() => navigateTo(crumb.level)}
                className={`
                  whitespace-nowrap transition-colors
                  ${i === breadcrumbs.length - 1
                    ? theme === 'fantasy' ? 'text-fantasy-accent font-bold font-fantasy-heading' : 'text-scifi-accent font-bold font-scifi-heading'
                    : theme === 'fantasy' ? 'text-fantasy-muted hover:text-fantasy-accent font-fantasy-heading cursor-pointer' : 'text-scifi-muted hover:text-scifi-accent font-scifi-heading cursor-pointer'
                  }
                `}
              >
                {crumb.label}
              </button>
            </React.Fragment>
          ))}
        </div>
      )}

      {/* Sub-level header (when drilled in) */}
      {!isRoot && meta && (
        <div className={`text-center py-2 px-6 flex-shrink-0 ${theme === 'fantasy' ? 'bg-fantasy-bg-secondary/40' : 'bg-scifi-bg-secondary/30'}`}>
          <h2 className={`text-lg font-bold ${theme === 'fantasy' ? 'font-fantasy-heading text-fantasy-accent' : 'font-scifi-heading text-scifi-accent text-sm'}`}>
            {meta.title}
          </h2>
          <p className={`text-xs ${theme === 'fantasy' ? 'text-fantasy-muted' : 'text-scifi-muted'}`}>
            {formatYear(meta.startYear)} — {formatYear(meta.endYear)}
          </p>
          {meta.description && (
            <p className={`text-[11px] mt-1 max-w-xl mx-auto ${theme === 'fantasy' ? 'text-fantasy-text/50 font-fantasy-body italic' : 'text-scifi-text/30 font-scifi-body'}`}>
              {meta.description}
            </p>
          )}
        </div>
      )}

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
            <div key={m.year} className="absolute flex flex-col items-center pointer-events-none" style={{ left: m.x + TIMELINE_PADDING, top: axisTop - 15, transform: 'translateX(-50%)' }}>
              <div className={`h-8 w-px ${theme === 'fantasy' ? 'bg-fantasy-border/30' : 'bg-scifi-border/25'}`} />
              <span className={`text-[10px] mt-1 whitespace-nowrap select-none ${theme === 'fantasy' ? 'text-fantasy-muted/50 font-fantasy-body' : 'text-scifi-muted/40 font-scifi-body'}`}>
                {formatYear(m.year)}
              </span>
            </div>
          ))}

          {/* AXIS LINE (clickable hitbox) */}
          <div
            ref={axisRef}
            data-testid="timeline-axis"
            className="absolute axis-hitbox"
            style={{ top: axisTop - AXIS_HITBOX_HEIGHT / 2, height: AXIS_HITBOX_HEIGHT, left: TIMELINE_PADDING - 20, right: TIMELINE_PADDING - 20 }}
            onClick={handleAxisClick}
            title="Click to add event"
          >
            <div className={`absolute left-0 right-0 ${theme === 'fantasy' ? 'h-[3px] bg-gradient-to-r from-transparent via-fantasy-accent/60 to-transparent' : 'h-[2px] bg-cyan-500/80 shadow-[0_0_10px_#00f3ff]'}`} style={{ top: '50%', transform: 'translateY(-50%)' }} />
          </div>

          {/* FIX #1: Period boundary markers when in drilled-in view */}
          {!isRoot && meta && effectiveDisplayMeta && (() => {
            const startX = (meta.startYear - effectiveDisplayMeta.startYear) * pixelsPerYear + TIMELINE_PADDING;
            const endX = (meta.endYear - effectiveDisplayMeta.startYear) * pixelsPerYear + TIMELINE_PADDING;
            const regionWidth = endX - startX;
            return (
              <>
                {/* Shaded region for the period */}
                <div
                  data-testid="period-region"
                  className={`absolute pointer-events-none ${theme === 'fantasy' ? 'bg-fantasy-accent/[0.04]' : 'bg-cyan-500/[0.03]'}`}
                  style={{ left: startX, width: regionWidth, top: 0, bottom: 0 }}
                />
                {/* Start boundary line */}
                <div
                  className={`absolute pointer-events-none ${theme === 'fantasy' ? 'w-px bg-fantasy-accent/30' : 'w-px bg-cyan-500/20'}`}
                  style={{ left: startX, top: 20, bottom: 20, borderLeft: theme === 'fantasy' ? '1px dashed rgba(201,168,76,0.3)' : '1px dashed rgba(0,243,255,0.2)' }}
                />
                {/* End boundary line */}
                <div
                  className={`absolute pointer-events-none ${theme === 'fantasy' ? 'w-px bg-fantasy-accent/30' : 'w-px bg-cyan-500/20'}`}
                  style={{ left: endX, top: 20, bottom: 20, borderLeft: theme === 'fantasy' ? '1px dashed rgba(201,168,76,0.3)' : '1px dashed rgba(0,243,255,0.2)' }}
                />
                {/* Start year label */}
                <div className={`absolute pointer-events-none text-[9px] ${theme === 'fantasy' ? 'text-fantasy-accent/40 font-fantasy-heading' : 'text-scifi-accent/30 font-scifi-heading'}`}
                  style={{ left: startX + 4, top: 24 }}>
                  {formatYear(meta.startYear)}
                </div>
                {/* End year label */}
                <div className={`absolute pointer-events-none text-[9px] ${theme === 'fantasy' ? 'text-fantasy-accent/40 font-fantasy-heading' : 'text-scifi-accent/30 font-scifi-heading'}`}
                  style={{ left: endX - 30, top: 24 }}>
                  {formatYear(meta.endYear)}
                </div>
              </>
            );
          })()}

          {/* Context period bars (dimmed) */}
          {contextPeriodEvents.map(evt => {
            const dims = getPeriodBarDimensions(evt, effectiveDisplayMeta.startYear, pixelsPerYear);
            return (
              <div key={`ctx-period-${evt.id}`} className={`absolute opacity-15 ${theme === 'fantasy' ? 'h-4 bg-fantasy-accent/20 border border-fantasy-border/20' : 'h-2 bg-cyan-900/20 border border-cyan-500/10'}`}
                style={{ left: dims.left + TIMELINE_PADDING, width: Math.max(dims.width, 4), top: axisTop - (theme === 'fantasy' ? 8 : 4) }}
              />
            );
          })}

          {/* Main period bars (interactive — click to drill in) */}
          {periodEvents.map(evt => {
            const dims = getPeriodBarDimensions(evt, effectiveDisplayMeta.startYear, pixelsPerYear);
            return (
              <div
                key={`period-${evt.id}`}
                data-interactive="true"
                data-testid={`period-bar-${evt.id}`}
                className={`
                  absolute period-bar transition-all cursor-pointer
                  ${theme === 'fantasy'
                    ? 'h-4 bg-fantasy-accent/10 border border-fantasy-border/40 hover:bg-fantasy-accent/25 hover:border-fantasy-accent/60'
                    : 'h-2 bg-cyan-900/40 border border-cyan-500/20 hover:bg-cyan-500/30 hover:border-cyan-400/50'
                  }
                `}
                style={{ left: dims.left + TIMELINE_PADDING, width: Math.max(dims.width, 4), top: axisTop - (theme === 'fantasy' ? 8 : 4) }}
                onClick={(e) => {
                  e.stopPropagation();
                  drillInto(evt, events);
                }}
                title={`${evt.title} — Click to explore`}
              />
            );
          })}

          {/* Context event markers (dimmed) */}
          {sortedContextEvents.map(evt => {
            const pos = positions[evt.id];
            if (!pos) return null;
            return renderMarker(evt, pos, evt.above, true);
          })}

          {/* Main event markers */}
          {sortedEvents.map(evt => {
            const pos = positions[evt.id];
            if (!pos) return null;
            return renderMarker(evt, pos, evt.above, false);
          })}
        </div>
      </div>

      {/* Event Card Modal (centered overlay) */}
      <AnimatePresence>
        {expandedEvent && (() => {
          const evt = allDisplayEvents.find(e => e.id === expandedEvent);
          if (!evt) return null;
          return (
            <EventCard
              key={expandedEvent}
              event={evt}
              onClose={() => setExpandedEvent(null)}
              onUpdate={(updates) => updateEvent(evt.id, updates)}
              onDelete={() => deleteEvent(evt.id)}
              onDrillIn={evt.type === 'period'
                ? () => { drillInto(evt, events); setExpandedEvent(null); }
                : null
              }
            />
          );
        })()}
      </AnimatePresence>

      {/* Add Event Form Modal */}
      <AnimatePresence>
        {addEventYear !== null && (
          <AddEventForm
            year={addEventYear}
            parentEventId={addEventParentId}
            onClose={() => { setAddEventYear(null); setAddEventParentId(null); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
