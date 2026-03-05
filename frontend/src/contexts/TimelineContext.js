import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';

const TimelineContext = createContext();

const STORAGE_KEY = 'chronoweave_local_events';

function loadLocalEvents(timelineId) {
  try {
    const stored = localStorage.getItem(`${STORAGE_KEY}_${timelineId}`);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveLocalEvents(timelineId, events) {
  localStorage.setItem(`${STORAGE_KEY}_${timelineId}`, JSON.stringify(events));
}

export function TimelineProvider({ children }) {
  const [manifest, setManifest] = useState(null);
  const [currentTimelineId, setCurrentTimelineId] = useState(null);
  const [timelineData, setTimelineData] = useState(null);
  const [localEvents, setLocalEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [expandedEvent, setExpandedEvent] = useState(null);
  const [expandedPeriod, setExpandedPeriod] = useState(null);
  const scrollRef = useRef(null);

  // Load manifest
  useEffect(() => {
    fetch(`${process.env.PUBLIC_URL}/data/manifest.json`)
      .then(r => r.json())
      .then(data => {
        setManifest(data);
        if (data.timelines.length > 0) {
          setCurrentTimelineId(data.timelines[0].id);
        }
      })
      .catch(e => setError('Failed to load timeline manifest'));
  }, []);

  // Load timeline data when ID changes
  useEffect(() => {
    if (!manifest || !currentTimelineId) return;
    const entry = manifest.timelines.find(t => t.id === currentTimelineId);
    if (!entry) return;

    setLoading(true);
    setExpandedEvent(null);
    setExpandedPeriod(null);

    fetch(`${process.env.PUBLIC_URL}/${entry.url}`)
      .then(r => r.json())
      .then(data => {
        setTimelineData(data);
        setLocalEvents(loadLocalEvents(currentTimelineId));
        setLoading(false);
      })
      .catch(() => {
        setError(`Failed to load timeline: ${entry.title}`);
        setLoading(false);
      });
  }, [manifest, currentTimelineId]);

  const allEvents = timelineData
    ? [...timelineData.events, ...localEvents]
    : [];

  const addLocalEvent = useCallback((event) => {
    setLocalEvents(prev => {
      const next = [...prev, { ...event, isLocal: true }];
      saveLocalEvents(currentTimelineId, next);
      return next;
    });
  }, [currentTimelineId]);

  // Add a child event to a period event (supports both JSON-loaded and local periods)
  const addChildEvent = useCallback((parentEventId, childEvent) => {
    const child = { ...childEvent, isLocal: true };

    // Check if parent is in loaded data
    if (timelineData) {
      const parentInData = timelineData.events.find(e => e.id === parentEventId);
      if (parentInData) {
        if (!parentInData.children) parentInData.children = [];
        parentInData.children.push(child);
        setTimelineData({ ...timelineData });
        // Also save the child as a local event so it shows up in exports
        setLocalEvents(prev => {
          const next = [...prev, { ...child, _parentId: parentEventId }];
          saveLocalEvents(currentTimelineId, next);
          return next;
        });
        return;
      }
    }

    // Check if parent is a local event
    setLocalEvents(prev => {
      const next = prev.map(e => {
        if (e.id === parentEventId) {
          return { ...e, children: [...(e.children || []), child] };
        }
        return e;
      });
      // Also store the child itself for export
      next.push({ ...child, _parentId: parentEventId });
      saveLocalEvents(currentTimelineId, next);
      return next;
    });
  }, [currentTimelineId, timelineData]);

  const removeLocalEvent = useCallback((eventId) => {
    setLocalEvents(prev => {
      const next = prev.filter(e => e.id !== eventId);
      saveLocalEvents(currentTimelineId, next);
      return next;
    });
  }, [currentTimelineId]);

  const downloadLocalEventsJSON = useCallback(() => {
    if (localEvents.length === 0) return;
    const blob = new Blob([JSON.stringify(localEvents, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentTimelineId}-local-events.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [localEvents, currentTimelineId]);

  const switchTimeline = useCallback((id) => {
    setCurrentTimelineId(id);
    setZoom(1);
  }, []);

  return (
    <TimelineContext.Provider value={{
      manifest,
      currentTimelineId,
      timelineData,
      allEvents,
      localEvents,
      loading,
      error,
      zoom,
      setZoom,
      expandedEvent,
      setExpandedEvent,
      expandedPeriod,
      setExpandedPeriod,
      addLocalEvent,
      addChildEvent,
      removeLocalEvent,
      downloadLocalEventsJSON,
      switchTimeline,
      scrollRef,
    }}>
      {children}
    </TimelineContext.Provider>
  );
}

export function useTimeline() {
  const ctx = useContext(TimelineContext);
  if (!ctx) throw new Error('useTimeline must be used within TimelineProvider');
  return ctx;
}
