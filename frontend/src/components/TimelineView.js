import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { useTimeline } from '../contexts/TimelineContext';
import { useTheme } from '../contexts/ThemeContext';
import { AnimatePresence } from 'framer-motion';
import {
  generateTrackYearMarkers,
  getTrackPeriodBarDimensions,
  positionToLocalYear,
  positionToMasterYear,
  formatYear,
  localToMaster,
  masterToLocal,
} from '../utils/timelineUtils';
import EventCard from './EventCard';
import AddEventForm from './AddEventForm';
import AddTrackForm from './AddTrackForm';
import { Plus, ArrowLeft } from 'lucide-react';

const BASE_PX_PER_YEAR = 0.8;
const TIMELINE_PADDING = 120;
const TRACK_HEIGHT = 180;
const AXIS_OFFSET = 100;
const MARKER_AREA_HEIGHT = 60;

export default function TimelineView() {
  const {
    timelineMeta,
    allTracks,
    allEvents,
    crossTrackEvents,
    masterRange,
    zoom,
    setZoom,
    expandedEvent,
    setExpandedEvent,
    scrollRef,
  } = useTimeline();
  const { theme } = useTheme();

  const [addEventState, setAddEventState] = useState(null); // { trackId, year } or { crossTrack: true, masterYear }
  const [showAddTrack, setShowAddTrack] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const hasDraggedRef = useRef(false);
  const isScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef(null);
  const [dragStart, setDragStart] = useState({ x: 0, scrollLeft: 0 });
  const timelineAreaRef = useRef(null);
  
  // Navigation stack for drilling into periods
  const [navStack, setNavStack] = useState([]); // [{ periodEvent, parentTrackId }]
  
  // Current period context (if drilled in)
  const currentPeriod = navStack.length > 0 ? navStack[navStack.length - 1] : null;

  // Calculate effective master range (constrained when drilled into a period)
  const effectiveMasterRange = useMemo(() => {
    if (!currentPeriod) return masterRange;
    
    const pe = currentPeriod.periodEvent;
    if (pe.trackId === null) {
      // Cross-track period uses master dates
      return {
        start: pe.masterStartDate.year - 50, // Add padding
        end: pe.masterEndDate.year + 50,
      };
    } else {
      // Track-specific period - convert to master
      const track = allTracks.find(t => t.id === pe.trackId);
      if (!track) return masterRange;
      return {
        start: localToMaster(pe.startDate.year, track) - 50,
        end: localToMaster(pe.endDate.year, track) + 50,
      };
    }
  }, [currentPeriod, masterRange, allTracks]);

  // Filter events based on drill-in context
  const displayEvents = useMemo(() => {
    if (!currentPeriod) return allEvents;
    
    // When drilled in, show children of the period event
    const pe = currentPeriod.periodEvent;
    return pe.children || [];
  }, [currentPeriod, allEvents]);

  // Filter cross-track events based on drill-in context
  const displayCrossTrackEvents = useMemo(() => {
    if (!currentPeriod) return crossTrackEvents;
    // When drilled in, don't show cross-track events (they're at the top level)
    return [];
  }, [currentPeriod, crossTrackEvents]);

  const pixelsPerYear = BASE_PX_PER_YEAR * zoom;
  const totalWidth = (effectiveMasterRange.end - effectiveMasterRange.start) * pixelsPerYear;

  // Zoom via scroll wheel (also track scrolling state)
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handler = (e) => {
      // Mark that we're scrolling to prevent click-to-add
      isScrollingRef.current = true;
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = setTimeout(() => {
        isScrollingRef.current = false;
      }, 150);

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
    hasDraggedRef.current = false;
    setDragStart({ x: e.clientX, scrollLeft: scrollRef.current?.scrollLeft || 0 });
  }, [scrollRef]);

  const handleMouseMove = useCallback((e) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStart.x;
    if (Math.abs(dx) > 3) hasDraggedRef.current = true;
    if (scrollRef.current) scrollRef.current.scrollLeft = dragStart.scrollLeft - dx;
  }, [isDragging, dragStart, scrollRef]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setTimeout(() => {
      hasDraggedRef.current = false;
    }, 50);
  }, []);

  useEffect(() => {
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, [handleMouseUp]);

  // Click on track axis to add event
  const handleTrackAxisClick = useCallback((e, track, axisRef) => {
    if (hasDraggedRef.current || isScrollingRef.current) return;
    e.stopPropagation();
    const rect = axisRef?.getBoundingClientRect();
    if (!rect) return;
    const clickX = e.clientX - rect.left;
    
    // Determine if we're in a cross-track period context
    const isParentCrossTrack = currentPeriod?.periodEvent?.trackId === null;
    
    if (isParentCrossTrack) {
      // Cross-track period: sub-events must also be cross-track, use master year
      const masterYear = positionToMasterYear(clickX, effectiveMasterRange, pixelsPerYear);
      setAddEventState({ 
        crossTrack: true,
        masterYear: masterYear,
        parentPeriodId: currentPeriod?.periodEvent?.id,
        forceCrossTrack: true, // Signal that this cannot be changed
      });
    } else {
      // Track-specific period or top-level: use local year
      const localYear = positionToLocalYear(clickX, track, effectiveMasterRange, pixelsPerYear);
      setAddEventState({ 
        trackId: track.id, 
        year: localYear,
        parentPeriodId: currentPeriod?.periodEvent?.id || null,
      });
    }
  }, [effectiveMasterRange, pixelsPerYear, currentPeriod]);

  if (!timelineMeta || !allTracks.length) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className={`text-sm ${theme === 'fantasy' ? 'text-fantasy-muted' : 'text-scifi-muted'}`}>
          No tracks defined. Add a track to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className={`text-center py-4 px-6 flex-shrink-0 ${theme === 'fantasy' ? 'border-b border-fantasy-border/40 bg-fantasy-card/60' : 'border-b border-scifi-border/40 bg-scifi-bg-secondary/50'}`}>
        <div className="flex items-center justify-center gap-4">
          {/* Back button when drilled into a period */}
          {currentPeriod && (
            <button
              data-testid="back-btn"
              data-interactive="true"
              onClick={() => setNavStack(prev => prev.slice(0, -1))}
              className={`flex items-center gap-1 px-3 py-1.5 text-xs font-bold transition-all ${theme === 'fantasy' ? 'bg-fantasy-bg text-fantasy-muted border border-fantasy-border hover:text-fantasy-accent hover:border-fantasy-accent/50 font-fantasy-heading' : 'bg-scifi-bg text-scifi-muted border border-scifi-border hover:text-scifi-accent hover:border-scifi-accent/50 font-scifi-heading'}`}
            >
              <ArrowLeft size={14} /> Back
            </button>
          )}
          
          <h1 data-testid="timeline-title" className={`text-2xl font-bold ${theme === 'fantasy' ? 'font-fantasy-heading text-fantasy-accent' : 'font-scifi-heading text-scifi-accent text-lg tracking-widest'}`}>
            {currentPeriod ? currentPeriod.periodEvent.title : timelineMeta.title}
          </h1>
          
          {/* Period date range indicator */}
          {currentPeriod && (() => {
            const pe = currentPeriod.periodEvent;
            const track = allTracks.find(t => t.id === pe.trackId);
            if (pe.trackId === null) {
              // Cross-track period
              return (
                <span className={`text-sm ${theme === 'fantasy' ? 'text-fantasy-muted' : 'text-scifi-muted'}`}>
                  (Reference: {pe.masterStartDate.year} — {pe.masterEndDate.year})
                </span>
              );
            } else if (track) {
              return (
                <span className={`text-sm ${theme === 'fantasy' ? 'text-fantasy-muted' : 'text-scifi-muted'}`}>
                  ({pe.startDate.year} — {pe.endDate.year} {track.abbr})
                </span>
              );
            }
            return null;
          })()}
          
          {!currentPeriod && (
            <button
              data-testid="add-track-btn"
              data-interactive="true"
              onClick={() => setShowAddTrack(true)}
              className={`flex items-center gap-1 px-3 py-1.5 text-xs font-bold transition-all ${theme === 'fantasy' ? 'bg-fantasy-accent/20 text-fantasy-accent border border-fantasy-accent/40 hover:bg-fantasy-accent/30 font-fantasy-heading' : 'bg-scifi-accent/20 text-scifi-accent border border-scifi-accent/40 hover:bg-scifi-accent/30 font-scifi-heading'}`}
            >
              <Plus size={14} /> Add Track
            </button>
          )}
        </div>
      </div>

      {/* Main content area with fixed sidebar and scrollable timeline */}
      <div className="flex-1 flex overflow-hidden">
        {/* Fixed left sidebar with track names */}
        <div 
          className={`flex-shrink-0 w-48 overflow-y-auto ${theme === 'fantasy' ? 'bg-fantasy-card/80 border-r border-fantasy-border/30' : 'bg-scifi-bg-secondary/80 border-r border-scifi-border/30'}`}
          style={{ paddingTop: 20 }}
        >
          {currentPeriod ? (
            <TrackLabel
              track={currentPeriod.parentTrackId 
                ? allTracks.find(t => t.id === currentPeriod.parentTrackId) 
                : allTracks[0]}
              trackIndex={0}
              theme={theme}
            />
          ) : (
            allTracks.map((track, trackIndex) => (
              <TrackLabel
                key={track.id}
                track={track}
                trackIndex={trackIndex}
                theme={theme}
              />
            ))
          )}
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
              width: totalWidth + TIMELINE_PADDING,
              minHeight: currentPeriod 
                ? TRACK_HEIGHT + 100
                : allTracks.length * TRACK_HEIGHT + 100,
            }}
          >
            {/* When drilled into a period, show single track with children */}
            {currentPeriod ? (
              <TrackRow
                key={`drilled-${currentPeriod.periodEvent.id}`}
                track={currentPeriod.parentTrackId 
                  ? allTracks.find(t => t.id === currentPeriod.parentTrackId) 
                  : allTracks[0]}
                trackIndex={0}
                events={displayEvents}
                masterRange={effectiveMasterRange}
                pixelsPerYear={pixelsPerYear}
                totalWidth={totalWidth}
                expandedEvent={expandedEvent}
                setExpandedEvent={setExpandedEvent}
                onAxisClick={handleTrackAxisClick}
                theme={theme}
                periodContext={currentPeriod.periodEvent}
                showHeader={false}
              />
            ) : (
              <>
                {/* Render each track */}
                {allTracks.map((track, trackIndex) => (
                  <TrackRow
                    key={track.id}
                    track={track}
                    trackIndex={trackIndex}
                    events={displayEvents.filter(e => e.trackId === track.id)}
                    masterRange={effectiveMasterRange}
                    pixelsPerYear={pixelsPerYear}
                    totalWidth={totalWidth}
                    expandedEvent={expandedEvent}
                    setExpandedEvent={setExpandedEvent}
                    onAxisClick={handleTrackAxisClick}
                    theme={theme}
                    showHeader={false}
                  />
                ))}

                {/* Cross-track events (vertical lines spanning all tracks) */}
                {displayCrossTrackEvents.map(evt => (
                  <CrossTrackEvent
                    key={evt.id}
                    event={evt}
                    tracks={allTracks}
                    masterRange={effectiveMasterRange}
                    pixelsPerYear={pixelsPerYear}
                    trackCount={allTracks.length}
                    expandedEvent={expandedEvent}
                    setExpandedEvent={setExpandedEvent}
                    theme={theme}
                  />
                ))}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Event Card Modal */}
      <AnimatePresence>
        {expandedEvent && (() => {
          // Search in both allEvents and displayEvents (for sub-events when drilled in)
          let evt = allEvents.find(e => e.id === expandedEvent);
          if (!evt && currentPeriod) {
            // Also search in the period's children
            evt = displayEvents.find(e => e.id === expandedEvent);
          }
          if (!evt) return null;
          
          // Drill-in handler for period events - always allow drilling in
          const handleDrillIn = evt.type === 'period' ? () => {
            // Push to navigation stack and close the card
            setNavStack(prev => [...prev, { 
              periodEvent: evt, 
              parentTrackId: evt.trackId 
            }]);
            setExpandedEvent(null);
          } : null;
          
          return (
            <EventCard
              key={expandedEvent}
              event={evt}
              tracks={allTracks}
              onClose={() => setExpandedEvent(null)}
              onDrillIn={handleDrillIn}
            />
          );
        })()}
      </AnimatePresence>

      {/* Add Event Form Modal */}
      <AnimatePresence>
        {addEventState && (
          <AddEventForm
            trackId={addEventState.trackId}
            year={addEventState.year}
            crossTrack={addEventState.crossTrack}
            masterYear={addEventState.masterYear}
            parentPeriodId={addEventState.parentPeriodId}
            forceCrossTrack={addEventState.forceCrossTrack}
            onClose={() => setAddEventState(null)}
          />
        )}
      </AnimatePresence>

      {/* Add Track Form Modal */}
      <AnimatePresence>
        {showAddTrack && (
          <AddTrackForm onClose={() => setShowAddTrack(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}

// Track label component for the fixed sidebar
function TrackLabel({ track, trackIndex, theme }) {
  return (
    <div
      className="flex items-center gap-2 px-3 py-2"
      style={{ height: TRACK_HEIGHT, paddingTop: AXIS_OFFSET - 20 }}
    >
      <div
        className="w-4 h-4 rounded-sm flex-shrink-0"
        style={{ backgroundColor: track.color }}
      />
      <div className="flex flex-col min-w-0">
        <span className={`text-sm font-bold truncate ${theme === 'fantasy' ? 'font-fantasy-heading text-fantasy-text' : 'font-scifi-heading text-scifi-text'}`}>
          {track.name}
        </span>
        <span className={`text-xs truncate ${theme === 'fantasy' ? 'text-fantasy-muted' : 'text-scifi-muted'}`}>
          {track.calendarName}
        </span>
      </div>
    </div>
  );
}

// Track row component
function TrackRow({
  track,
  trackIndex,
  events,
  masterRange,
  pixelsPerYear,
  totalWidth,
  expandedEvent,
  setExpandedEvent,
  onAxisClick,
  theme,
  showHeader = true,
}) {
  const axisRef = useRef(null);
  const topOffset = trackIndex * TRACK_HEIGHT + 20;
  const axisY = topOffset + AXIS_OFFSET;

  // Generate year markers for this track
  const yearMarkers = useMemo(() => {
    return generateTrackYearMarkers(track, masterRange, pixelsPerYear);
  }, [track, masterRange, pixelsPerYear]);

  // Calculate track's visible range in master coordinates
  const trackMasterStart = localToMaster(track.startYear, track);
  const trackMasterEnd = localToMaster(track.endYear, track);
  const trackStartX = Math.max(0, (trackMasterStart - masterRange.start) * pixelsPerYear);
  const trackEndX = Math.min(totalWidth, (trackMasterEnd - masterRange.start) * pixelsPerYear);

  // Sort events by position for alternating placement
  const sortedEvents = useMemo(() => {
    return [...events]
      .filter(e => e.type === 'point' || e.type === 'period')
      .sort((a, b) => {
        // Handle both track-specific and cross-track events
        const getYear = (e) => {
          if (e.trackId === null) {
            // Cross-track event
            return e.type === 'point' ? e.masterDate?.year : e.masterStartDate?.year;
          } else {
            // Track-specific event
            return e.type === 'point' ? e.date?.year : e.startDate?.year;
          }
        };
        const aYear = getYear(a) || 0;
        const bYear = getYear(b) || 0;
        return aYear - bYear;
      })
      .map((evt, i) => ({ ...evt, above: i % 2 === 0 }));
  }, [events]);

  const periodEvents = sortedEvents.filter(e => e.type === 'period');

  return (
    <div
      className="absolute"
      style={{ top: topOffset, left: 20, right: 20, height: TRACK_HEIGHT }}
    >
      {/* Track header - only show if showHeader is true */}
      {showHeader && (
        <div className="flex items-center gap-2 mb-2">
          <div
            className="w-3 h-3 rounded-sm"
            style={{ backgroundColor: track.color }}
          />
          <span className={`text-sm font-bold ${theme === 'fantasy' ? 'font-fantasy-heading text-fantasy-text' : 'font-scifi-heading text-scifi-text'}`}>
            {track.name}
          </span>
          <span className={`text-xs ${theme === 'fantasy' ? 'text-fantasy-muted' : 'text-scifi-muted'}`}>
            ({track.calendarName})
          </span>
        </div>
      )}

      {/* Year markers */}
      {yearMarkers.map(m => (
        <div
          key={m.localYear}
          className="absolute flex flex-col items-center pointer-events-none"
          style={{ left: m.x, top: AXIS_OFFSET - 20 }}
        >
          <div className={`h-5 w-px ${theme === 'fantasy' ? 'bg-fantasy-border/30' : 'bg-scifi-border/25'}`} />
          <span className={`text-[9px] mt-0.5 whitespace-nowrap select-none ${theme === 'fantasy' ? 'text-fantasy-muted/60' : 'text-scifi-muted/50'}`}>
            {formatYear(m.localYear)} {track.abbr}
          </span>
        </div>
      ))}

      {/* Axis line - larger click area for better UX */}
      <div
        ref={axisRef}
        data-testid={`track-axis-${track.id}`}
        data-interactive="true"
        className="absolute h-10 cursor-pointer"
        style={{
          top: AXIS_OFFSET - 20,
          left: trackStartX,
          width: trackEndX - trackStartX,
        }}
        onClick={(e) => onAxisClick(e, track, axisRef.current)}
        title="Click to add event"
      >
        <div
          className="absolute left-0 right-0 h-[3px] top-1/2 -translate-y-1/2"
          style={{
            background: theme === 'fantasy'
              ? `linear-gradient(90deg, transparent, ${track.color}80, ${track.color}, ${track.color}80, transparent)`
              : track.color,
            boxShadow: theme === 'scifi' ? `0 0 8px ${track.color}` : 'none',
          }}
        />
      </div>

      {/* Period bars */}
      {periodEvents.map(evt => {
        const dims = getTrackPeriodBarDimensions(evt, track, masterRange, pixelsPerYear);
        return (
          <div
            key={`period-${evt.id}`}
            data-interactive="true"
            data-testid={`period-bar-${evt.id}`}
            className="absolute cursor-pointer transition-all"
            style={{
              left: dims.left,
              width: Math.max(dims.width, 4),
              top: AXIS_OFFSET - 8,
              height: 16,
              backgroundColor: `${track.color}25`,
              borderLeft: `2px solid ${track.color}`,
              borderRight: `2px solid ${track.color}`,
            }}
            onClick={(e) => {
              e.stopPropagation();
              setExpandedEvent(evt.id);
            }}
            title={evt.title}
          />
        );
      })}

      {/* Event markers */}
      {sortedEvents.map(evt => {
        // Handle both track-specific and cross-track events
        const isCrossTrackEvent = evt.trackId === null;
        let year, masterYear;
        
        if (isCrossTrackEvent) {
          // Cross-track event uses masterDate/masterStartDate
          masterYear = evt.type === 'point' ? evt.masterDate?.year : evt.masterStartDate?.year;
          year = masterToLocal(masterYear, track); // Convert to local for display
        } else {
          // Track-specific event uses date/startDate
          year = evt.type === 'point' ? evt.date?.year : evt.startDate?.year;
          masterYear = localToMaster(year, track);
        }
        
        if (masterYear === undefined) return null; // Skip invalid events
        
        const x = (masterYear - masterRange.start) * pixelsPerYear;
        const isExpanded = expandedEvent === evt.id;
        const hasImage = !!evt.image;

        return (
          <div
            key={evt.id}
            data-interactive="true"
            className="absolute transition-all"
            style={{
              left: x,
              top: AXIS_OFFSET,
              transform: 'translateX(-50%)',
              zIndex: isExpanded ? 20 : 10,
            }}
          >
            {/* Connector line */}
            <div
              className="absolute left-1/2 -translate-x-1/2 w-px"
              style={{
                backgroundColor: `${track.color}50`,
                ...(evt.above
                  ? { bottom: 0, height: hasImage ? 70 : 50 }
                  : { top: 0, height: hasImage ? 70 : 50 }
                ),
              }}
            />

            {/* Marker dot */}
            <button
              data-testid={`event-marker-${evt.id}`}
              onClick={(e) => {
                e.stopPropagation();
                setExpandedEvent(isExpanded ? null : evt.id);
              }}
              className={`relative z-20 transition-all duration-200 ${theme === 'fantasy' ? 'w-3 h-3 rounded-full border-2 hover:scale-150' : 'w-3 h-3 rotate-45 border hover:scale-150'}`}
              style={{
                backgroundColor: evt.type === 'period' ? track.color : (theme === 'fantasy' ? track.color : '#050510'),
                borderColor: track.color,
                boxShadow: theme === 'scifi' ? `0 0 8px ${track.color}` : 'none',
                marginTop: -6,
                transform: isExpanded ? 'scale(1.5)' : undefined,
              }}
            />

            {/* Thumbnail + label */}
            <div
              className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center select-none pointer-events-none"
              style={evt.above ? { bottom: 16, marginBottom: hasImage ? 58 : 38 } : { top: 16, marginTop: hasImage ? 58 : 38 }}
            >
              {hasImage && (
                <div
                  className="w-8 h-8 rounded-full overflow-hidden mb-1"
                  style={{ border: `2px solid ${track.color}40` }}
                >
                  <img src={evt.image} alt="" className="w-full h-full object-cover" loading="lazy" />
                </div>
              )}
              <div className={`text-[10px] font-bold leading-tight max-w-[100px] text-center truncate ${theme === 'fantasy' ? 'font-fantasy-heading text-fantasy-text' : 'font-scifi-heading text-scifi-text'}`}>
                {evt.title}
              </div>
              <div className={`text-[8px] mt-0.5 ${theme === 'fantasy' ? 'text-fantasy-muted' : 'text-scifi-muted'}`}>
                {formatYear(year)} {track.abbr}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Cross-track event component (vertical line/band spanning all tracks)
function CrossTrackEvent({
  event,
  tracks,
  masterRange,
  pixelsPerYear,
  trackCount,
  expandedEvent,
  setExpandedEvent,
  theme,
}) {
  const isPeriod = event.type === 'period';
  const masterYear = isPeriod ? event.masterStartDate.year : event.masterDate.year;
  const x = (masterYear - masterRange.start) * pixelsPerYear + 20; // Reduced padding since sidebar handles it
  
  let width = 4;
  if (isPeriod) {
    width = Math.max((event.masterEndDate.year - event.masterStartDate.year) * pixelsPerYear, 4);
  }

  const totalHeight = trackCount * TRACK_HEIGHT;
  const isExpanded = expandedEvent === event.id;

  // Cross-track event color (neutral/accent)
  const crossTrackColor = theme === 'fantasy' ? '#8a0303' : '#ff00ff';

  return (
    <div
      data-interactive="true"
      data-testid={`cross-track-${event.id}`}
      className="absolute cursor-pointer transition-all group"
      style={{
        left: x,
        top: 40,
        width: isPeriod ? width : 3,
        height: totalHeight - 20,
        zIndex: isExpanded ? 25 : 2, // Lower z-index to avoid blocking track events
        pointerEvents: 'auto',
      }}
      onClick={(e) => {
        e.stopPropagation();
        setExpandedEvent(isExpanded ? null : event.id);
      }}
    >
      {/* Vertical line or band */}
      <div
        className="absolute inset-0 transition-all pointer-events-none"
        style={{
          backgroundColor: isPeriod ? `${crossTrackColor}15` : crossTrackColor,
          borderLeft: `2px solid ${crossTrackColor}`,
          borderRight: isPeriod ? `2px solid ${crossTrackColor}` : 'none',
          boxShadow: theme === 'scifi' ? `0 0 10px ${crossTrackColor}` : 'none',
        }}
      />

      {/* Label */}
      <div
        className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap transition-all pointer-events-auto"
        style={{ top: -25 }}
      >
        <div
          className={`px-2 py-1 text-[10px] font-bold text-center ${theme === 'fantasy' ? 'font-fantasy-heading bg-fantasy-card border border-fantasy-border' : 'font-scifi-heading bg-scifi-bg-secondary border border-scifi-border'}`}
          style={{ color: crossTrackColor }}
        >
          {event.title}
        </div>
      </div>
    </div>
  );
}
