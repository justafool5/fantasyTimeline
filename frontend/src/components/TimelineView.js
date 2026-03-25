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
  getReadableTextColor,
  getResolvedEventTags,
} from '../utils/timelineUtils';
import EventCard from './EventCard';
import AddEventForm from './AddEventForm';
import AddTrackForm from './AddTrackForm';
import EditTrackForm from './EditTrackForm';
import EditTimelineForm from './EditTimelineForm';
import EditTagDefinitionsForm from './EditTagDefinitionsForm';
import { Plus, ArrowLeft, Settings, Pencil, X, Globe } from 'lucide-react';

const BASE_PX_PER_YEAR = 0.8;
const MIN_ZOOM = 0.1;
const TIMELINE_PADDING = 120;
const TRACK_HEIGHT = 200;
const AXIS_OFFSET = 115;
const EVENT_LABEL_WIDTH = 240;
const EVENT_LABEL_GUTTER = 12;
const TRACK_CONTENT_START = Math.ceil(EVENT_LABEL_WIDTH / 2) + EVENT_LABEL_GUTTER;
const CLUSTER_DISTANCE_PX = 18;
const CLUSTER_SPLIT_TARGET_PX = 28;
const CLUSTER_STACK_EPSILON_PX = 0.5;
const STACK_DETAILS_WIDTH = 320;
const MIN_LABEL_WIDTH = 80;
const TARGET_LABEL_LINE_LENGTH = 22;
const ESTIMATED_CHAR_WIDTH = 7.5;
const CROSS_TRACK_LABELS_HEIGHT = 50;
const TRACK_NAME_MAX_LENGTH = 75;
const CROSS_TRACK_CLUSTER_DISTANCE_PX = 100;

// Cross-track events dedicated label row (fixed between header and timeline)
function CrossTrackLabelsRow({ 
  events, 
  masterRange, 
  pixelsPerYear, 
  totalWidth, 
  expandedEvent, 
  setExpandedEvent, 
  theme,
  scrollRef
}) {
  const rowRef = useRef(null);
  const crossTrackColor = theme === 'fantasy' ? '#8a0303' : '#ff00ff';
  const [expandedCluster, setExpandedCluster] = useState(null);
  
  // Sync scroll with main timeline
  useEffect(() => {
    const handleScroll = () => {
      if (rowRef.current && scrollRef.current) {
        rowRef.current.scrollLeft = scrollRef.current.scrollLeft;
      }
    };
    const mainScroll = scrollRef.current;
    if (mainScroll) {
      mainScroll.addEventListener('scroll', handleScroll);
    }
    return () => {
      if (mainScroll) {
        mainScroll.removeEventListener('scroll', handleScroll);
      }
    };
  }, [scrollRef]);

  // Compute positions and cluster events
  const clusteredLabels = useMemo(() => {
    if (!events.length) return [];
    
    // Calculate x positions for all events
    const positionedEvents = events.map(evt => {
      const isPeriod = evt.type === 'period';
      const masterYear = isPeriod ? evt.masterStartDate.year : evt.masterDate.year;
      const x = TRACK_CONTENT_START + (masterYear - masterRange.start) * pixelsPerYear;
      return { ...evt, x };
    }).sort((a, b) => a.x - b.x);

    // Cluster events that are too close together
    const clusters = [];
    let currentCluster = [positionedEvents[0]];

    for (let i = 1; i < positionedEvents.length; i++) {
      const evt = positionedEvents[i];
      const prevEvt = currentCluster[currentCluster.length - 1];
      
      if (evt.x - prevEvt.x < CROSS_TRACK_CLUSTER_DISTANCE_PX) {
        currentCluster.push(evt);
      } else {
        clusters.push(currentCluster);
        currentCluster = [evt];
      }
    }
    clusters.push(currentCluster);

    return clusters.map(cluster => {
      const centerX = cluster.reduce((sum, evt) => sum + evt.x, 0) / cluster.length;
      return {
        events: cluster,
        centerX,
        isClustered: cluster.length > 1,
        clusterKey: cluster.map(e => e.id).join('::'),
      };
    });
  }, [events, masterRange, pixelsPerYear]);

  return (
    <div className={`flex-shrink-0 flex border-b ${
      theme === 'fantasy'
        ? 'bg-fantasy-bg-dark/60 border-fantasy-border/40'
        : 'bg-scifi-bg-surface/60 border-scifi-cyan-dim/30'
    }`} style={{ height: CROSS_TRACK_LABELS_HEIGHT }}>
      {/* Fixed sidebar space */}
      <div className={`flex-shrink-0 w-52 flex items-center px-4 border-r ${
        theme === 'fantasy'
          ? 'bg-fantasy-bg-dark/80 border-fantasy-border/40'
          : 'bg-scifi-bg-elevated/80 border-scifi-cyan-dim/30'
      }`}>
        <div className="flex items-center gap-2">
          <Globe size={14} className={theme === 'fantasy' ? 'text-fantasy-crimson' : 'text-scifi-magenta'} />
          <span className={`text-xs font-bold ${
            theme === 'fantasy'
              ? 'font-fantasy-heading text-fantasy-muted'
              : 'font-scifi-heading text-scifi-text-dim uppercase tracking-wider'
          }`}>
            Cross-Track
          </span>
        </div>
      </div>
      
      {/* Scrollable labels area */}
      <div 
        ref={rowRef}
        className="flex-1 overflow-x-hidden relative"
      >
        <div 
          className="relative h-full"
          style={{ width: totalWidth + TRACK_CONTENT_START + TIMELINE_PADDING }}
        >
          {clusteredLabels.map((cluster, idx) => {
            const isExpanded = expandedCluster === cluster.clusterKey;
            
            if (cluster.isClustered && !isExpanded) {
              // Render cluster bubble
              return (
                <button
                  key={`cluster-${idx}`}
                  data-testid={`cross-track-cluster-${idx}`}
                  onClick={() => setExpandedCluster(isExpanded ? null : cluster.clusterKey)}
                  className={`absolute top-1/2 -translate-y-1/2 px-3 py-1.5 text-[12px] font-bold text-center transition-all cursor-pointer ${
                    theme === 'fantasy'
                      ? 'font-fantasy-heading bg-fantasy-bg-card border-2 border-fantasy-crimson hover:bg-fantasy-crimson/10'
                      : 'font-scifi-heading bg-scifi-bg-elevated border border-scifi-magenta hover:bg-scifi-magenta/20 hover:shadow-scifi-glow'
                  }`}
                  style={{ 
                    left: cluster.centerX, 
                    transform: 'translate(-50%, -50%)',
                    color: crossTrackColor,
                  }}
                >
                  {cluster.events.length} events
                </button>
              );
            }
            
            // Render individual labels (or expanded cluster)
            return cluster.events.map((evt, evtIdx) => {
              const isEventExpanded = expandedEvent === evt.id;
              
              return (
                <button
                  key={evt.id}
                  data-testid={`cross-track-label-${evt.id}`}
                  onClick={() => {
                    if (cluster.isClustered && isExpanded) {
                      setExpandedEvent(isEventExpanded ? null : evt.id);
                    } else {
                      setExpandedEvent(isEventExpanded ? null : evt.id);
                    }
                  }}
                  className={`absolute top-1/2 -translate-y-1/2 px-2 py-1 text-[12px] font-bold text-center transition-all cursor-pointer ${
                    theme === 'fantasy'
                      ? 'font-fantasy-heading bg-fantasy-bg-card border-2 hover:border-fantasy-crimson'
                      : 'font-scifi-heading bg-scifi-bg-elevated border hover:border-scifi-magenta hover:shadow-scifi-glow'
                  } ${isEventExpanded ? 'ring-2' : ''}`}
                  style={{ 
                    left: cluster.isClustered ? cluster.centerX + (evtIdx - (cluster.events.length - 1) / 2) * 80 : evt.x, 
                    transform: 'translate(-50%, -50%)',
                    color: crossTrackColor,
                    borderColor: isEventExpanded ? crossTrackColor : (theme === 'fantasy' ? '#8b7355' : '#007a8a'),
                    ringColor: crossTrackColor,
                    maxWidth: 140,
                    zIndex: cluster.isClustered ? 10 : 1,
                  }}
                >
                  <span className="line-clamp-1">{evt.title}</span>
                </button>
              );
            });
          })}
          
          {/* Collapse button when cluster is expanded */}
          {expandedCluster && (
            <button
              onClick={() => setExpandedCluster(null)}
              className={`absolute top-1 right-4 px-2 py-0.5 text-[9px] font-bold transition-all ${
                theme === 'fantasy'
                  ? 'bg-fantasy-border text-fantasy-bg-card hover:bg-fantasy-gold'
                  : 'bg-scifi-cyan-dim text-scifi-bg hover:bg-scifi-cyan'
              }`}
              style={{ zIndex: 20 }}
            >
              Collapse
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function splitTitleLines(title) {
  const normalized = (title || '').trim();
  if (!normalized) return [''];

  const words = normalized.split(/\s+/);
  if (words.length <= 1 || normalized.length <= TARGET_LABEL_LINE_LENGTH) {
    return [normalized];
  }

  let bestLines = [normalized];
  let bestScore = Infinity;

  for (let i = 1; i < words.length; i += 1) {
    const firstLine = words.slice(0, i).join(' ');
    const secondLine = words.slice(i).join(' ');
    const longestLine = Math.max(firstLine.length, secondLine.length);
    const balancePenalty = Math.abs(firstLine.length - secondLine.length);
    const overflowPenalty = Math.max(0, longestLine - TARGET_LABEL_LINE_LENGTH) * 4;
    const score = balancePenalty + overflowPenalty;

    if (score < bestScore) {
      bestScore = score;
      bestLines = [firstLine, secondLine];
    }
  }

  return bestLines;
}

function estimateLabelWidth(lines) {
  const longestLineLength = lines.reduce((max, line) => Math.max(max, line.length), 0);
  return Math.max(
    MIN_LABEL_WIDTH,
    Math.min(EVENT_LABEL_WIDTH, longestLineLength * ESTIMATED_CHAR_WIDTH + 18)
  );
}

export default function TimelineView() {
  const {
    timelineMeta,
    allTracks,
    allEvents,
    crossTrackEvents,
    masterRange,
    zoom,
    setZoom,
    fitToRange,
    setResetZoomRange,
    expandedEvent,
    setExpandedEvent,
    scrollRef,
    downloadFullTimelineJSON,
  } = useTimeline();
  const { theme } = useTheme();

  const [addEventState, setAddEventState] = useState(null); // { trackId, year } or { crossTrack: true, masterYear }
  const [showAddTrack, setShowAddTrack] = useState(false);
  const [editingTrack, setEditingTrack] = useState(null); // track object to edit
  const [showEditTimeline, setShowEditTimeline] = useState(false);
  const [showEditTagDefinitions, setShowEditTagDefinitions] = useState(false);
  const [selectedStackCluster, setSelectedStackCluster] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const hasDraggedRef = useRef(false);
  const isScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef(null);
  const [dragStart, setDragStart] = useState({ x: 0, scrollLeft: 0 });
  const timelineAreaRef = useRef(null);
  const sidebarRef = useRef(null);
  
  // Sync vertical scrolling: timeline scrolls, sidebar follows via transform
  useEffect(() => {
    const handleTimelineScroll = () => {
      if (scrollRef.current && sidebarRef.current) {
        const scrollTop = scrollRef.current.scrollTop;
        sidebarRef.current.style.transform = `translateY(-${scrollTop}px)`;
      }
    };
    
    const timeline = scrollRef.current;
    if (timeline) {
      timeline.addEventListener('scroll', handleTimelineScroll);
    }
    
    return () => {
      if (timeline) {
        timeline.removeEventListener('scroll', handleTimelineScroll);
      }
    };
  }, [scrollRef]);

  // Listen for custom events from ToolsMenu in App.js
  useEffect(() => {
    const handleAddTrack = () => setShowAddTrack(true);
    const handleEditTimeline = () => setShowEditTimeline(true);
    
    window.addEventListener('timeline:addTrack', handleAddTrack);
    window.addEventListener('timeline:editTimeline', handleEditTimeline);
    
    return () => {
      window.removeEventListener('timeline:addTrack', handleAddTrack);
      window.removeEventListener('timeline:editTimeline', handleEditTimeline);
    };
  }, []);
  
  // Navigation stack for drilling into periods
  const [navStack, setNavStack] = useState([]); // [{ periodEventId, parentTrackId }]
  
  // Helper to find an event by ID recursively
  const findEventById = useCallback((events, id) => {
    for (const evt of events) {
      if (evt.id === id) return evt;
      if (evt.children && evt.children.length > 0) {
        const found = findEventById(evt.children, id);
        if (found) return found;
      }
    }
    return null;
  }, []);
  
  // Current period context (if drilled in) - always get fresh from allEvents
  const currentPeriod = useMemo(() => {
    if (navStack.length === 0) return null;
    const { periodEventId, parentTrackId } = navStack[navStack.length - 1];
    const periodEvent = findEventById(allEvents, periodEventId);
    if (!periodEvent) return null;
    return { periodEvent, parentTrackId };
  }, [navStack, allEvents, findEventById]);

  const drilledDisplayTrack = useMemo(() => {
    if (!currentPeriod) return null;

    const parentTrack = currentPeriod.parentTrackId
      ? allTracks.find(t => t.id === currentPeriod.parentTrackId)
      : allTracks[0];

    if (!parentTrack) return null;

    const pe = currentPeriod.periodEvent;
    if (pe.trackId === null) {
      return parentTrack;
    }

    return {
      ...parentTrack,
      startYear: pe.startDate.year,
      endYear: pe.endDate.year,
    };
  }, [currentPeriod, allTracks]);

  // Calculate effective master range (constrained when drilled into a period)
  const effectiveMasterRange = useMemo(() => {
    if (!currentPeriod) return masterRange;

    const pe = currentPeriod.periodEvent;
    if (pe.trackId === null) {
      return {
        start: pe.masterStartDate.year,
        end: pe.masterEndDate.year,
      };
    }

    if (!drilledDisplayTrack) return masterRange;

    return {
      start: localToMaster(drilledDisplayTrack.startYear, drilledDisplayTrack),
      end: localToMaster(drilledDisplayTrack.endYear, drilledDisplayTrack),
    };
  }, [currentPeriod, masterRange, drilledDisplayTrack]);

  // Auto-fit zoom when entering/exiting sub-timelines
  useEffect(() => {
    setResetZoomRange(effectiveMasterRange);
    fitToRange(effectiveMasterRange.start, effectiveMasterRange.end);

    return () => setResetZoomRange(null);
  }, [navStack, effectiveMasterRange, fitToRange, setResetZoomRange]);

  // Filter events based on drill-in context
  const displayEvents = useMemo(() => {
    if (!currentPeriod) return allEvents;
    
    // When drilled in, show children of the period event (now always fresh)
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
      setZoom(prev => Math.max(prev * delta, MIN_ZOOM));
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

  const handleMainTimelineMouseDownCapture = useCallback((e) => {
    if (!selectedStackCluster) return;
    if (e.target.closest('[data-stack-panel]') || e.target.closest('[data-stack-trigger]')) return;
    setSelectedStackCluster(null);
  }, [selectedStackCluster]);

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
    const timelineX = clickX + (axisRef?.offsetLeft || 0) - TRACK_CONTENT_START;
    if (timelineX < 0) return;
    
    // Determine if we're in a cross-track period context
    const isParentCrossTrack = currentPeriod?.periodEvent?.trackId === null;
    
    if (isParentCrossTrack) {
      // Cross-track period: sub-events must also be cross-track, use master year
      const masterYear = positionToMasterYear(timelineX, effectiveMasterRange, pixelsPerYear);
      setAddEventState({ 
        crossTrack: true,
        masterYear: masterYear,
        parentPeriodId: currentPeriod?.periodEvent?.id,
        forceCrossTrack: true, // Signal that this cannot be changed
      });
    } else {
      // Track-specific period or top-level: use local year
      const localYear = positionToLocalYear(timelineX, track, effectiveMasterRange, pixelsPerYear);
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
    <div className="flex flex-col h-full overflow-hidden relative z-10">
      {/* Header - simplified with only title and description */}
      <div className={`text-center py-4 px-6 flex-shrink-0 relative ${
        theme === 'fantasy' 
          ? 'bg-gradient-to-b from-fantasy-bg-dark/90 to-fantasy-bg/80 border-b-2 border-fantasy-border shadow-fantasy' 
          : 'bg-gradient-to-b from-scifi-bg-elevated/95 to-scifi-bg-surface/90 border-b border-scifi-cyan-dim/50 shadow-scifi'
      }`}>
        {/* Sci-fi scan line effect */}
        {theme === 'scifi' && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-30">
            <div className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-scifi-cyan to-transparent" 
                 style={{ animation: 'scifiScan 3s linear infinite' }} />
          </div>
        )}
        
        <div className="flex items-center justify-center gap-5 relative">
          {/* Back button when drilled into a period */}
          {currentPeriod && (
            <button
              data-testid="back-btn"
              data-interactive="true"
              onClick={() => setNavStack(prev => prev.slice(0, -1))}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-bold transition-all ${
                theme === 'fantasy' 
                  ? 'bg-fantasy-bg-card text-fantasy-text-light border-2 border-fantasy-border hover:border-fantasy-gold hover:text-fantasy-gold font-fantasy-heading shadow-fantasy' 
                  : 'bg-scifi-bg-surface text-scifi-text-dim border border-scifi-cyan-dim hover:border-scifi-cyan hover:text-scifi-cyan font-scifi-heading uppercase tracking-wider'
              }`}
            >
              <ArrowLeft size={14} /> Back
            </button>
          )}
          
          <div className="flex flex-col items-center">
            <h1 data-testid="timeline-title" className={`text-3xl font-bold ${
              theme === 'fantasy' 
                ? 'font-fantasy-heading text-fantasy-text tracking-wide' 
                : 'font-scifi-heading text-scifi-cyan text-xl tracking-[0.2em] uppercase'
            }`}>
              {currentPeriod ? currentPeriod.periodEvent.title : timelineMeta.title}
            </h1>
            {/* Description - only show on main timeline, not when drilled in */}
            {!currentPeriod && timelineMeta.description && (
              <p data-testid="timeline-description" className={`text-sm mt-1 max-w-2xl leading-relaxed ${
                theme === 'fantasy' 
                  ? 'text-fantasy-text-light font-fantasy-body italic' 
                  : 'text-scifi-text-dim font-scifi-body tracking-wide'
              }`}>
                {timelineMeta.description}
              </p>
            )}
          </div>
          
          {/* Period date range indicator */}
          {currentPeriod && (() => {
            const pe = currentPeriod.periodEvent;
            const track = allTracks.find(t => t.id === pe.trackId);
            if (pe.trackId === null) {
              return (
                <span className={`text-sm px-3 py-1 rounded ${
                  theme === 'fantasy' 
                    ? 'text-fantasy-muted bg-fantasy-bg-dark/50 border border-fantasy-border/50' 
                    : 'text-scifi-text-dim bg-scifi-bg/50 border border-scifi-cyan-dim/30'
                }`}>
                  Reference: {pe.masterStartDate.year} — {pe.masterEndDate.year}
                </span>
              );
            } else if (track) {
              return (
                <span className={`text-sm px-3 py-1 rounded ${
                  theme === 'fantasy' 
                    ? 'text-fantasy-muted bg-fantasy-bg-dark/50 border border-fantasy-border/50' 
                    : 'text-scifi-text-dim bg-scifi-bg/50 border border-scifi-cyan-dim/30'
                }`}>
                  {pe.startDate.year} — {pe.endDate.year} {track.abbr}
                </span>
              );
            }
            return null;
          })()}
        </div>
      </div>

      {/* Cross-track events dedicated label row - always visible */}
      {!currentPeriod && displayCrossTrackEvents.length > 0 && (
        <CrossTrackLabelsRow
          events={displayCrossTrackEvents}
          masterRange={effectiveMasterRange}
          pixelsPerYear={pixelsPerYear}
          totalWidth={totalWidth}
          expandedEvent={expandedEvent}
          setExpandedEvent={setExpandedEvent}
          theme={theme}
          scrollRef={scrollRef}
        />
      )}

      {/* Main content area with fixed sidebar and scrollable timeline */}
      <div className="flex-1 flex overflow-hidden relative" onMouseDownCapture={handleMainTimelineMouseDownCapture}>
        {/* Fixed left sidebar with track names - no scroll, synced via JS */}
        <div 
          className={`flex-shrink-0 w-52 overflow-hidden relative z-10 ${
            theme === 'fantasy' 
              ? 'bg-gradient-to-r from-fantasy-bg-dark/95 to-fantasy-bg-dark/80 border-r-2 border-fantasy-border/60 shadow-lg' 
              : 'bg-gradient-to-r from-scifi-bg-elevated/98 to-scifi-bg-surface/95 border-r border-scifi-cyan-dim/40'
          }`}
          style={{ paddingTop: 20 }}
        >
          <div 
            ref={sidebarRef}
            className="relative transition-transform" 
            style={{ 
              minHeight: currentPeriod 
                ? TRACK_HEIGHT + 100
                : allTracks.length * TRACK_HEIGHT + 100 
            }}
          >
            {currentPeriod ? (
              <TrackLabel
                track={drilledDisplayTrack || (currentPeriod.parentTrackId
                  ? allTracks.find(t => t.id === currentPeriod.parentTrackId)
                  : allTracks[0])}
                trackIndex={0}
                theme={theme}
                onEdit={setEditingTrack}
              />
            ) : (
              allTracks.map((track, trackIndex) => (
                <TrackLabel
                  key={track.id}
                  track={track}
                  trackIndex={trackIndex}
                  theme={theme}
                  onEdit={setEditingTrack}
                />
              ))
            )}
          </div>
        </div>

        {selectedStackCluster && (
          <StackClusterDetailsPanel
            stackCluster={selectedStackCluster}
            expandedEvent={expandedEvent}
            setExpandedEvent={setExpandedEvent}
            theme={theme}
            onClose={() => setSelectedStackCluster(null)}
          />
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
              width: totalWidth + TRACK_CONTENT_START + TIMELINE_PADDING,
              minHeight: currentPeriod 
                ? TRACK_HEIGHT + 100
                : allTracks.length * TRACK_HEIGHT + 100,
            }}
          >
            {/* When drilled into a period, show single track with children */}
            {currentPeriod ? (
              <TrackRow
                key={`drilled-${currentPeriod.periodEvent.id}`}
                track={drilledDisplayTrack || (currentPeriod.parentTrackId
                  ? allTracks.find(t => t.id === currentPeriod.parentTrackId)
                  : allTracks[0])}
                trackIndex={0}
                events={displayEvents}
                masterRange={effectiveMasterRange}
                pixelsPerYear={pixelsPerYear}
                totalWidth={totalWidth}
                zoom={zoom}
                expandedEvent={expandedEvent}
                setExpandedEvent={setExpandedEvent}
                onAxisClick={handleTrackAxisClick}
                theme={theme}
                selectedStackCluster={selectedStackCluster}
                onToggleStackCluster={setSelectedStackCluster}
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
                    zoom={zoom}
                    expandedEvent={expandedEvent}
                    setExpandedEvent={setExpandedEvent}
                    onAxisClick={handleTrackAxisClick}
                    theme={theme}
                    selectedStackCluster={selectedStackCluster}
                    onToggleStackCluster={setSelectedStackCluster}
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
            // Also search in the period's children (use findEventById for deep search)
            evt = findEventById(allEvents, expandedEvent);
          }
          if (!evt) {
            // Last resort: search in displayEvents directly
            evt = displayEvents.find(e => e.id === expandedEvent);
          }
          if (!evt) return null;
          
          // Drill-in handler for period events - only for track-specific periods, not cross-track
          const handleDrillIn = (evt.type === 'period' && evt.trackId !== null) ? () => {
            // Push to navigation stack with just the ID (not the full object)
            setNavStack(prev => [...prev, { 
              periodEventId: evt.id, 
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

      {/* Edit Track Form Modal */}
      <AnimatePresence>
        {editingTrack && (
          <EditTrackForm 
            track={editingTrack} 
            onClose={() => setEditingTrack(null)} 
          />
        )}
      </AnimatePresence>

      {/* Edit Timeline Form Modal */}
      <AnimatePresence>
        {showEditTimeline && (
          <EditTimelineForm onClose={() => setShowEditTimeline(false)} onEditTags={() => setShowEditTagDefinitions(true)} />
        )}
      </AnimatePresence>

      {/* Edit Tag Definitions Modal */}
      <AnimatePresence>
        {showEditTagDefinitions && (
          <EditTagDefinitionsForm onClose={() => setShowEditTagDefinitions(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}

// Track label component for the fixed sidebar
function TrackLabel({ track, trackIndex, theme, onEdit }) {
  // Split long track names into multiple lines (word-wrap aware)
  const nameLines = useMemo(() => {
    const name = track.name || '';
    if (name.length <= 18) return [name];
    
    // Try to split at word boundaries
    const words = name.split(' ');
    const lines = [];
    let currentLine = '';
    
    for (const word of words) {
      if (currentLine.length + word.length + 1 <= 18) {
        currentLine = currentLine ? `${currentLine} ${word}` : word;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    }
    if (currentLine) lines.push(currentLine);
    
    // Limit to 3 lines max, add ellipsis if needed
    if (lines.length > 3) {
      lines[2] = lines[2] + '...';
      return lines.slice(0, 3);
    }
    return lines;
  }, [track.name]);

  return (
    <div
      data-testid={`track-label-${track.id}`}
      className={`flex items-start gap-2 px-3 py-2 group cursor-pointer transition-all ${
        theme === 'fantasy' 
          ? 'hover:bg-fantasy-gold/10 border-l-4 border-transparent hover:border-fantasy-gold' 
          : 'hover:bg-scifi-cyan/5 border-l-2 border-transparent hover:border-scifi-cyan'
      }`}
      style={{ height: TRACK_HEIGHT, paddingTop: AXIS_OFFSET - 25 }}
      onClick={() => onEdit(track)}
      title={`${track.name} - Click to edit track`}
    >
      <div
        className={`w-3 h-3 flex-shrink-0 mt-1.5 ${theme === 'fantasy' ? 'rounded-sm shadow-sm' : 'rotate-45'}`}
        style={{ 
          backgroundColor: track.color,
          boxShadow: theme === 'scifi' ? `0 0 8px ${track.color}` : undefined
        }}
      />
      <div className="flex flex-col min-w-0 flex-1">
        <div className={`font-bold leading-snug ${
          theme === 'fantasy' 
            ? 'font-fantasy-heading text-fantasy-text text-[14px]'
            : 'font-scifi-heading text-scifi-text uppercase tracking-wide text-[12px]'
        }`}>
          {nameLines.map((line, idx) => (
            <div key={idx}>{line}</div>
          ))}
        </div>
        <span className={`text-[10px] font-medium mt-0.5 ${
          theme === 'fantasy'
            ? 'text-fantasy-text-light italic font-fantasy-heading'
            : 'text-scifi-text-dim font-scifi-mono'
        }`}>
          {track.calendarName}
        </span>
      </div>
      <Pencil 
        size={12} 
        className={`opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-1.5 ${
          theme === 'fantasy' ? 'text-fantasy-gold' : 'text-scifi-cyan'
        }`} 
      />
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
  zoom,
  expandedEvent,
  setExpandedEvent,
  onAxisClick,
  theme,
  selectedStackCluster,
  onToggleStackCluster,
  showHeader = true,
}) {
  const { setZoom, scrollRef, timelineMeta } = useTimeline();
  const axisRef = useRef(null);
  const topOffset = trackIndex * TRACK_HEIGHT + 20;

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
    // Get year for dated events
    const getYear = (e) => {
      if (e.trackId === null) {
        // Cross-track event
        return e.type === 'point' ? e.masterDate?.year : e.masterStartDate?.year;
      } else {
        // Track-specific event
        return e.type === 'point' ? e.date?.year : e.startDate?.year;
      }
    };

    const getAfterAnchorYear = (anchorEvent) => {
      if (!anchorEvent) return masterRange.start;
      if (anchorEvent.type === 'period') {
        return anchorEvent.trackId === null
          ? anchorEvent.masterEndDate?.year
          : anchorEvent.endDate?.year;
      }
      return getYear(anchorEvent);
    };

    const getBeforeAnchorYear = (anchorEvent) => {
      if (!anchorEvent) return masterRange.end;
      if (anchorEvent.type === 'period') {
        return anchorEvent.trackId === null
          ? anchorEvent.masterStartDate?.year
          : anchorEvent.startDate?.year;
      }
      return getYear(anchorEvent);
    };

    // Separate dated and undated events
    const datedEvents = events.filter(e => e.type === 'point' || e.type === 'period');
    const undatedEvents = events.filter(e => e.type === 'undated');

    // Sort dated events by year
    datedEvents.sort((a, b) => (getYear(a) || 0) - (getYear(b) || 0));

    const directlyPlacedUndated = undatedEvents.filter(evt => Number.isFinite(evt.placementYear));
    const anchoredUndated = undatedEvents.filter(evt => !Number.isFinite(evt.placementYear));
    const undatedGroups = new Map();

    anchoredUndated.forEach((evt) => {
      const key = `${evt.afterEvent ?? '__start__'}::${evt.beforeEvent ?? '__end__'}`;
      if (!undatedGroups.has(key)) undatedGroups.set(key, []);
      undatedGroups.get(key).push(evt);
    });

    const processedUndated = directlyPlacedUndated
      .sort((a, b) => (a.placementYear - b.placementYear) || (a.title || '').localeCompare(b.title || ''))
      .map(evt => ({ ...evt, _calculatedYear: evt.placementYear }));

    undatedGroups.forEach((groupEvents) => {
      const sample = groupEvents[0];
      const afterEvt = sample.afterEvent ? datedEvents.find(e => e.id === sample.afterEvent) : null;
      const beforeEvt = sample.beforeEvent ? datedEvents.find(e => e.id === sample.beforeEvent) : null;

      let afterYear = getAfterAnchorYear(afterEvt);
      let beforeYear = getBeforeAnchorYear(beforeEvt);

      if (afterYear === undefined || afterYear === null) afterYear = masterRange.start;
      if (beforeYear === undefined || beforeYear === null) beforeYear = masterRange.end;

      const intervalStart = Math.min(afterYear, beforeYear);
      const intervalEnd = Math.max(afterYear, beforeYear);
      const interval = intervalEnd - intervalStart;

      const orderedGroup = [...groupEvents].sort((a, b) => {
        const titleCompare = (a.title || '').localeCompare(b.title || '');
        if (titleCompare !== 0) return titleCompare;
        return (a.id || '').localeCompare(b.id || '');
      });

      orderedGroup.forEach((evt, index) => {
        const position = interval === 0
          ? intervalStart
          : intervalStart + (interval * (index + 1)) / (orderedGroup.length + 1);

        processedUndated.push({ ...evt, _calculatedYear: position });
      });
    });

    // Merge all events and sort
    const allProcessed = [
      ...datedEvents.map(e => ({ ...e, _calculatedYear: getYear(e) })),
      ...processedUndated
    ].sort((a, b) => {
      const yearDiff = (a._calculatedYear || 0) - (b._calculatedYear || 0);
      if (yearDiff !== 0) return yearDiff;
      return (a.title || '').localeCompare(b.title || '');
    });

    return allProcessed.map((evt, i) => ({ ...evt, above: i % 2 === 0 }));
  }, [events, masterRange]);

  const periodEvents = sortedEvents.filter(e => e.type === 'period');

  const positionedEvents = useMemo(() => {
    return sortedEvents.map((evt) => {
      const isCrossTrackEvent = evt.trackId === null;
      const isUndated = evt.type === 'undated';
      let year;
      let masterYear;

      if (isUndated) {
        masterYear = evt._calculatedYear;
        year = masterToLocal(masterYear, track);
      } else if (isCrossTrackEvent) {
        masterYear = evt.type === 'point' ? evt.masterDate?.year : evt.masterStartDate?.year;
        year = masterToLocal(masterYear, track);
      } else {
        year = evt.type === 'point' ? evt.date?.year : evt.startDate?.year;
        masterYear = localToMaster(year, track);
      }

      if (masterYear === undefined || masterYear === null) return null;

      const titleLines = splitTitleLines(evt.title || '');
      const labelWidth = estimateLabelWidth(titleLines);

      return {
        ...evt,
        year,
        masterYear,
        x: TRACK_CONTENT_START + (masterYear - masterRange.start) * pixelsPerYear,
        titleLines,
        labelWidth,
        hasImage: !!evt.image,
        resolvedTags: getResolvedEventTags(evt.tags || [], timelineMeta?.tagDefinitions || [], theme),
      };
    }).filter(Boolean);
  }, [sortedEvents, track, masterRange, pixelsPerYear, timelineMeta?.tagDefinitions, theme]);

  const clusteredItems = useMemo(() => {
    if (positionedEvents.length === 0) return [];

    const buildClusterItem = (clusterEvents) => {
      if (clusterEvents.length === 1) {
        return { type: 'event', event: clusterEvents[0] };
      }

      const sortedClusterEvents = [...clusterEvents].sort((a, b) => a.x - b.x);
      const firstX = sortedClusterEvents[0].x;
      const samePosition = sortedClusterEvents.every(evt => Math.abs(evt.x - firstX) <= CLUSTER_STACK_EPSILON_PX);
      const sameYear = sortedClusterEvents.every(evt => evt.type !== 'undated' && evt.year === sortedClusterEvents[0].year);
      const stackable = samePosition && sameYear;

      return {
        type: 'cluster',
        events: sortedClusterEvents,
        stackable,
        clusterKey: sortedClusterEvents.map(evt => evt.id).join('::'),
      };
    };

    const items = [];
    let currentCluster = [positionedEvents[0]];

    for (let i = 1; i < positionedEvents.length; i += 1) {
      const evt = positionedEvents[i];
      const previous = currentCluster[currentCluster.length - 1];
      if (evt.x - previous.x <= CLUSTER_DISTANCE_PX) {
        currentCluster.push(evt);
      } else {
        items.push(buildClusterItem(currentCluster));
        currentCluster = [evt];
      }
    }

    items.push(buildClusterItem(currentCluster));
    return items;
  }, [positionedEvents]);

  const labelVisibility = useMemo(() => {
    const visibility = new Map();
    const rows = { above: [], below: [] };

    clusteredItems.forEach((item) => {
      if (item.type !== 'event') return;
      const evt = item.event;
      const key = evt.above ? 'above' : 'below';
      rows[key].push(evt);
    });

    ['above', 'below'].forEach((key) => {
      let lastRightEdge = -Infinity;
      rows[key].forEach((evt) => {
        const left = evt.x - evt.labelWidth / 2;
        const right = evt.x + evt.labelWidth / 2;
        const isVisible = left >= lastRightEdge + EVENT_LABEL_GUTTER;
        visibility.set(evt.id, isVisible);
        if (isVisible) {
          lastRightEdge = right;
        }
      });
    });

    return visibility;
  }, [clusteredItems]);

  const zoomIntoCluster = useCallback((clusterEvents, clusterCenterX) => {
    if (!clusterEvents?.length || !scrollRef.current) return;

    const viewport = scrollRef.current;
    const viewportWidth = viewport.clientWidth;
    const localPositions = clusterEvents.map(evt => evt.x - TRACK_CONTENT_START).sort((a, b) => a - b);

    let tightestGap = Infinity;
    for (let i = 1; i < localPositions.length; i += 1) {
      tightestGap = Math.min(tightestGap, localPositions[i] - localPositions[i - 1]);
    }

    const gapScale = Number.isFinite(tightestGap) && tightestGap > 0
      ? CLUSTER_SPLIT_TARGET_PX / tightestGap
      : 2;
    const spread = localPositions[localPositions.length - 1] - localPositions[0];
    const spreadScale = spread > 0 ? Math.min(4, Math.max(1.4, 140 / spread)) : 2;
    const scaleFactor = Math.max(1.4, gapScale, spreadScale);
    const nextZoom = zoom * scaleFactor;
    const centerRatio = clusterCenterX / Math.max(1, TRACK_CONTENT_START + totalWidth + TIMELINE_PADDING);

    setZoom(nextZoom);

    requestAnimationFrame(() => {
      if (!scrollRef.current) return;
      const nextViewport = scrollRef.current;
      const nextScrollWidth = nextViewport.scrollWidth;
      const targetCenterX = centerRatio * nextScrollWidth;
      nextViewport.scrollLeft = Math.max(0, targetCenterX - viewportWidth / 2);
    });
  }, [scrollRef, setZoom, totalWidth, zoom]);

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
          style={{ left: TRACK_CONTENT_START + m.x, top: AXIS_OFFSET - 20 }}
        >
          <div className={`h-5 w-px ${theme === 'fantasy' ? 'bg-fantasy-border/30' : 'bg-scifi-border/25'}`} />
          <span className={`text-[11px] font-medium mt-0.5 whitespace-nowrap select-none ${theme === 'fantasy' ? 'font-fantasy-heading text-fantasy-text-light' : 'text-scifi-text-dim'}`}>
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
          left: TRACK_CONTENT_START + trackStartX,
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
              left: TRACK_CONTENT_START + dims.left,
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
      {clusteredItems.map((item, index) => {
        if (item.type === 'cluster') {
          const clusterEvents = item.events;
          const clusterCenterX = clusterEvents.reduce((sum, evt) => sum + evt.x, 0) / clusterEvents.length;
          const clusterAbove = clusterEvents.filter(evt => evt.above).length >= clusterEvents.length / 2;
          const isStackSelected = item.stackable && selectedStackCluster?.clusterKey === item.clusterKey;

          return (
            <div
              key={`cluster-${track.id}-${index}`}
              data-interactive="true"
              className="absolute transition-all"
              style={{
                left: clusterCenterX,
                top: AXIS_OFFSET,
                transform: 'translateX(-50%)',
                zIndex: isStackSelected ? 24 : 18,
              }}
            >
              <div
                className="absolute left-1/2 -translate-x-1/2"
                style={{
                  backgroundColor: `${track.color}55`,
                  width: 2,
                  ...(clusterAbove
                    ? { bottom: 0, height: 54 }
                    : { top: 0, height: 54 }
                  ),
                }}
              />
              <button
                data-testid={`event-cluster-${track.id}-${index}`}
                data-stack-trigger="true"
                onClick={(e) => {
                  e.stopPropagation();
                  if (item.stackable) {
                    onToggleStackCluster(isStackSelected ? null : {
                      clusterKey: item.clusterKey,
                      trackId: track.id,
                      trackName: track.name,
                      trackAbbr: track.abbr,
                      trackColor: track.color,
                      events: clusterEvents,
                    });
                    return;
                  }
                  onToggleStackCluster(null);
                  zoomIntoCluster(clusterEvents, clusterCenterX);
                }}
                className={`relative z-20 min-w-[28px] h-7 px-2 rounded-full text-[11px] font-bold transition-all duration-200 ${theme === 'fantasy' ? 'font-fantasy-heading' : 'font-scifi-heading'}`}
                style={{
                  backgroundColor: theme === 'fantasy' ? '#1e160d' : '#050510',
                  color: track.color,
                  border: `2px solid ${track.color}`,
                  boxShadow: theme === 'scifi' ? `0 0 10px ${track.color}` : `0 2px 10px ${track.color}30`,
                  marginTop: -10,
                }}
                title={item.stackable ? `Show ${clusterEvents.length} stacked events` : `Zoom into ${clusterEvents.length} nearby events`}
              >
                {clusterEvents.length}
              </button>
            </div>
          );
        }

        const evt = item.event;
        const isUndated = evt.type === 'undated';
        const isExpanded = expandedEvent === evt.id;
        const showLabel = labelVisibility.get(evt.id);

        return (
          <div
            key={evt.id}
            data-interactive="true"
            className="absolute transition-all"
            style={{
              left: evt.x,
              top: AXIS_OFFSET,
              transform: 'translateX(-50%)',
              zIndex: isExpanded ? 20 : 10,
            }}
          >
            <div
              className="absolute left-1/2 -translate-x-1/2"
              style={{
                backgroundColor: isUndated ? 'transparent' : `${track.color}50`,
                borderLeft: isUndated ? `1px dashed ${track.color}60` : 'none',
                width: isUndated ? 0 : 1,
                ...(evt.above
                  ? { bottom: 0, height: 75 }
                  : { top: 0, height: 75 }
                ),
              }}
            />

            <button
              data-testid={`event-marker-${evt.id}`}
              onClick={(e) => {
                e.stopPropagation();
                setExpandedEvent(isExpanded ? null : evt.id);
              }}
              className={`relative z-20 transition-all duration-200 ${
                isUndated
                  ? 'w-5 h-5 rounded-full hover:scale-125'
                  : theme === 'fantasy'
                    ? 'w-4 h-4 rounded-full border-2 hover:scale-150'
                    : 'w-4 h-4 rotate-45 border hover:scale-150'
              }`}
              style={{
                backgroundColor: isUndated
                  ? `${track.color}30`
                  : evt.type === 'period'
                    ? track.color
                    : (theme === 'fantasy' ? track.color : '#050510'),
                borderColor: track.color,
                borderWidth: isUndated ? 2 : undefined,
                borderStyle: isUndated ? 'dashed' : 'solid',
                boxShadow: isUndated
                  ? `0 0 12px ${track.color}40`
                  : theme === 'scifi'
                    ? `0 0 8px ${track.color}`
                    : 'none',
                marginTop: isUndated ? -8 : -6,
                transform: isExpanded ? 'scale(1.5)' : undefined,
              }}
              title={isUndated ? `${evt.title} (undated - approximate position)` : evt.title}
            />

            {/* Main label: image, date, title */}
            <div
              className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center select-none pointer-events-none"
              style={{
                ...(evt.above ? { bottom: 16, marginBottom: 57 } : { top: 16, marginTop: 57 }),
                width: showLabel ? evt.labelWidth : MIN_LABEL_WIDTH,
                maxWidth: EVENT_LABEL_WIDTH,
              }}
            >
              {showLabel ? (
                <>
                  {evt.above ? (
                    <>
                      <div className={`text-[13px] font-bold leading-tight text-center ${theme === 'fantasy' ? 'font-fantasy-heading text-fantasy-text' : 'font-scifi-heading text-scifi-text'} ${isUndated ? 'opacity-80 italic' : ''}`}>
                        {evt.titleLines.map((line, lineIndex) => (
                          <div key={`${evt.id}-line-${lineIndex}`}>{line}</div>
                        ))}
                      </div>
                      <div className={`text-[11px] font-medium mt-0.5 ${theme === 'fantasy' ? 'font-fantasy-heading text-fantasy-text-light' : 'text-scifi-text-dim'}`}>
                        {isUndated ? '(undated)' : `${formatYear(evt.year)} ${track.abbr}`}
                      </div>
                      {evt.hasImage && (
                        <div
                          className={`w-8 h-8 rounded-full overflow-hidden mt-1 ${isUndated ? 'opacity-70' : ''}`}
                          style={{ border: `2px ${isUndated ? 'dashed' : 'solid'} ${track.color}40` }}
                        >
                          <img src={evt.image} alt="" className="w-full h-full object-cover" loading="lazy" />
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      {evt.hasImage && (
                        <div
                          className={`w-8 h-8 rounded-full overflow-hidden mb-1 ${isUndated ? 'opacity-70' : ''}`}
                          style={{ border: `2px ${isUndated ? 'dashed' : 'solid'} ${track.color}40` }}
                        >
                          <img src={evt.image} alt="" className="w-full h-full object-cover" loading="lazy" />
                        </div>
                      )}
                      <div className={`text-[11px] font-medium mb-0.5 ${theme === 'fantasy' ? 'font-fantasy-heading text-fantasy-text-light' : 'text-scifi-text-dim'}`}>
                        {isUndated ? '(undated)' : `${formatYear(evt.year)} ${track.abbr}`}
                      </div>
                      <div className={`text-[13px] font-bold leading-tight text-center ${theme === 'fantasy' ? 'font-fantasy-heading text-fantasy-text' : 'font-scifi-heading text-scifi-text'} ${isUndated ? 'opacity-80 italic' : ''}`}>
                        {evt.titleLines.map((line, lineIndex) => (
                          <div key={`${evt.id}-line-${lineIndex}`}>{line}</div>
                        ))}
                      </div>
                    </>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center gap-1">
                  <div className={`text-[13px] font-bold tracking-wide text-center ${theme === 'fantasy' ? 'font-fantasy-heading text-fantasy-muted' : 'font-scifi-heading text-scifi-muted'}`}>
                    ...
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StackClusterDetailsPanel({
  stackCluster,
  expandedEvent,
  setExpandedEvent,
  theme,
  onClose,
}) {
  return (
    <div
      data-stack-panel="true"
      className={`flex-shrink-0 overflow-y-auto border-r ${theme === 'fantasy' ? 'bg-fantasy-card/90 border-fantasy-border/30' : 'bg-scifi-bg-secondary/85 border-scifi-border/30'}`}
      style={{ width: STACK_DETAILS_WIDTH }}
    >
      <div className="flex items-center justify-between gap-2 px-3 py-3 border-b border-inherit">
        <div className="min-w-0">
          <div className={`text-xs font-bold uppercase tracking-wide ${theme === 'fantasy' ? 'font-fantasy-heading text-fantasy-muted' : 'font-scifi-heading text-scifi-muted'}`}>
            Stacked events
          </div>
          <div className={`text-sm font-bold truncate ${theme === 'fantasy' ? 'font-fantasy-heading text-fantasy-text' : 'font-scifi-heading text-scifi-text'}`}>
            {stackCluster.trackName}
          </div>
        </div>
        <button
          data-interactive="true"
          data-stack-panel="true"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className={`flex h-8 w-8 items-center justify-center border transition-colors ${theme === 'fantasy' ? 'border-fantasy-border/50 text-fantasy-muted hover:text-fantasy-accent hover:border-fantasy-accent/50' : 'border-scifi-border/50 text-scifi-muted hover:text-scifi-accent hover:border-scifi-accent/50'}`}
          title="Close stacked events"
        >
          <X size={14} />
        </button>
      </div>
      <div className="flex flex-col gap-2 p-3">
        {stackCluster.events.map((evt) => {
          const isExpanded = expandedEvent === evt.id;
          return (
            <button
              key={`${stackCluster.clusterKey}-${evt.id}`}
              data-interactive="true"
              data-stack-panel="true"
              onClick={(e) => {
                e.stopPropagation();
                setExpandedEvent(isExpanded ? null : evt.id);
              }}
              className={`w-full rounded-md border px-3 py-2 text-left text-[12px] transition-colors ${theme === 'fantasy' ? 'font-fantasy-heading border-fantasy-border/60 hover:bg-fantasy-bg/60' : 'font-scifi-heading border-scifi-border/60 hover:bg-scifi-bg/70'}`}
              style={{
                borderColor: isExpanded ? stackCluster.trackColor : undefined,
                boxShadow: isExpanded ? `0 0 0 1px ${stackCluster.trackColor} inset` : 'none',
              }}
              title={evt.title}
            >
              <div className="font-bold leading-snug whitespace-normal break-words">{evt.title}</div>
              {evt.resolvedTags.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {evt.resolvedTags.map(tag => (
                    <span
                      key={`${evt.id}-stack-panel-tag-${tag.id}`}
                      className="px-2 py-0.5 text-[11px] font-bold leading-none"
                      style={{ backgroundColor: tag.color, color: getReadableTextColor(tag.color) }}
                      title={tag.label}
                    >
                      {tag.label}
                    </span>
                  ))}
                </div>
              )}
              <div className={`mt-1 font-medium ${theme === 'fantasy' ? 'font-fantasy-heading text-fantasy-text-light' : 'text-scifi-text-dim'}`}>
                {formatYear(evt.year)} {stackCluster.trackAbbr}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Cross-track event component (vertical line/band spanning all tracks - no label, labels are in dedicated row)
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
  const x = TRACK_CONTENT_START + (masterYear - masterRange.start) * pixelsPerYear;
  
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
        top: 20,
        width: isPeriod ? width : 3,
        height: totalHeight,
        zIndex: isExpanded ? 25 : 2,
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
    </div>
  );
}
