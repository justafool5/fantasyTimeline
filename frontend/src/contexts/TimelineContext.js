import React, { createContext, useContext, useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { calculateMasterRange, localToMaster, masterToLocal } from '../utils/timelineUtils';

const TimelineContext = createContext();

const STORAGE_KEY = 'chronoweave_local_events';
const TRACKS_KEY = 'chronoweave_local_tracks';

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

function loadLocalTracks(timelineId) {
  try {
    const stored = localStorage.getItem(`${TRACKS_KEY}_${timelineId}`);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveLocalTracks(timelineId, tracks) {
  localStorage.setItem(`${TRACKS_KEY}_${timelineId}`, JSON.stringify(tracks));
}

export function TimelineProvider({ children }) {
  const [manifest, setManifest] = useState(null);
  const [currentTimelineId, setCurrentTimelineId] = useState(null);
  const [timelineData, setTimelineData] = useState(null);
  const [localEvents, setLocalEvents] = useState([]);
  const [localTracks, setLocalTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [expandedEvent, setExpandedEvent] = useState(null);
  const scrollRef = useRef(null);

  // Load manifest (with cache-busting)
  useEffect(() => {
    const cacheBuster = `?t=${Date.now()}`;
    fetch(`${process.env.PUBLIC_URL}/data/manifest.json${cacheBuster}`, { cache: 'no-store' })
      .then(r => r.json())
      .then(data => {
        setManifest(data);
        if (data.timelines.length > 0) {
          setCurrentTimelineId(data.timelines[0].id);
        }
      })
      .catch(() => setError('Failed to load timeline manifest'));
  }, []);

  // Load timeline data when ID changes
  useEffect(() => {
    if (!manifest || !currentTimelineId) return;
    const entry = manifest.timelines.find(t => t.id === currentTimelineId);
    if (!entry) return;

    setLoading(true);
    setExpandedEvent(null);

    const cacheBuster = `?t=${Date.now()}`;
    fetch(`${process.env.PUBLIC_URL}/${entry.url}${cacheBuster}`, { cache: 'no-store' })
      .then(r => r.json())
      .then(data => {
        setTimelineData(data);
        setLocalEvents(loadLocalEvents(currentTimelineId));
        setLocalTracks(loadLocalTracks(currentTimelineId));
        setLoading(false);
      })
      .catch(() => {
        setError(`Failed to load timeline: ${entry.title}`);
        setLoading(false);
      });
  }, [manifest, currentTimelineId]);

  // Combined tracks (JSON + local)
  const allTracks = useMemo(() => {
    if (!timelineData) return [];
    return [...(timelineData.tracks || []), ...localTracks];
  }, [timelineData, localTracks]);

  // Combined events (JSON + local)
  const allEvents = useMemo(() => {
    if (!timelineData) return [];
    return [...(timelineData.events || []), ...localEvents];
  }, [timelineData, localEvents]);

  // Calculate master range from all tracks
  const masterRange = useMemo(() => {
    return calculateMasterRange(allTracks);
  }, [allTracks]);

  // Timeline metadata
  const timelineMeta = useMemo(() => {
    if (!timelineData) return null;
    return timelineData.timeline;
  }, [timelineData]);

  // Update timeline metadata
  const updateTimelineMeta = useCallback((updates) => {
    if (!timelineData) return;
    setTimelineData(prev => ({
      ...prev,
      timeline: { ...prev.timeline, ...updates }
    }));
  }, [timelineData]);

  // Get events for a specific track
  const getTrackEvents = useCallback((trackId) => {
    return allEvents.filter(e => e.trackId === trackId);
  }, [allEvents]);

  // Get cross-track events
  const crossTrackEvents = useMemo(() => {
    return allEvents.filter(e => e.trackId === null);
  }, [allEvents]);

  // Add a new track
  const addTrack = useCallback((track) => {
    const newTrack = { ...track, id: `local-track-${Date.now()}`, isLocal: true };
    setLocalTracks(prev => {
      const next = [...prev, newTrack];
      saveLocalTracks(currentTimelineId, next);
      return next;
    });
    return newTrack.id;
  }, [currentTimelineId]);

  // Delete a track
  const deleteTrack = useCallback((trackId) => {
    // Remove track
    setLocalTracks(prev => {
      const next = prev.filter(t => t.id !== trackId);
      saveLocalTracks(currentTimelineId, next);
      return next;
    });
    // Remove events belonging to this track
    setLocalEvents(prev => {
      const next = prev.filter(e => e.trackId !== trackId);
      saveLocalEvents(currentTimelineId, next);
      return next;
    });
  }, [currentTimelineId]);

  // Add a new event (can be a child of a period)
  const addEvent = useCallback((event, parentPeriodId = null) => {
    const newEvent = { ...event, id: `local-${Date.now()}`, isLocal: true };
    
    if (parentPeriodId) {
      // Add as a child to a period event
      // First check local events
      setLocalEvents(prev => {
        const parentIdx = prev.findIndex(e => e.id === parentPeriodId);
        if (parentIdx >= 0) {
          const next = [...prev];
          const parent = { ...next[parentIdx] };
          parent.children = [...(parent.children || []), newEvent];
          next[parentIdx] = parent;
          saveLocalEvents(currentTimelineId, next);
          return next;
        }
        return prev;
      });
      
      // Also check JSON data
      if (timelineData) {
        const parentIdx = timelineData.events.findIndex(e => e.id === parentPeriodId);
        if (parentIdx >= 0) {
          const parent = timelineData.events[parentIdx];
          parent.children = [...(parent.children || []), newEvent];
          setTimelineData({ ...timelineData });
        }
      }
    } else {
      // Add as top-level event
      setLocalEvents(prev => {
        const next = [...prev, newEvent];
        saveLocalEvents(currentTimelineId, next);
        return next;
      });
    }
    return newEvent.id;
  }, [currentTimelineId, timelineData]);

  // Update an event
  const updateEvent = useCallback((eventId, updates) => {
    // Try updating in local events
    setLocalEvents(prev => {
      const idx = prev.findIndex(e => e.id === eventId);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], ...updates };
        saveLocalEvents(currentTimelineId, next);
        return next;
      }
      return prev;
    });

    // Try updating in JSON data
    if (timelineData) {
      const idx = timelineData.events.findIndex(e => e.id === eventId);
      if (idx >= 0) {
        timelineData.events[idx] = { ...timelineData.events[idx], ...updates };
        setTimelineData({ ...timelineData });
      }
    }
  }, [currentTimelineId, timelineData]);

  // Delete an event
  const deleteEvent = useCallback((eventId) => {
    setLocalEvents(prev => {
      const next = prev.filter(e => e.id !== eventId);
      saveLocalEvents(currentTimelineId, next);
      return next;
    });

    if (timelineData) {
      const idx = timelineData.events.findIndex(e => e.id === eventId);
      if (idx >= 0) {
        timelineData.events.splice(idx, 1);
        setTimelineData({ ...timelineData });
      }
    }

    setExpandedEvent(null);
  }, [currentTimelineId, timelineData]);

  // Download full timeline JSON
  const downloadFullTimelineJSON = useCallback(() => {
    if (!timelineData) return;

    const cleanEvent = (evt) => {
      const clean = { ...evt };
      delete clean.isLocal;
      if (clean.children) {
        clean.children = clean.children.map(cleanEvent);
      }
      return clean;
    };

    const fullJson = {
      timeline: timelineData.timeline,
      tracks: allTracks.map(t => {
        const clean = { ...t };
        delete clean.isLocal;
        return clean;
      }),
      events: allEvents.map(cleanEvent),
    };

    const blob = new Blob([JSON.stringify(fullJson, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentTimelineId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [timelineData, allTracks, allEvents, currentTimelineId]);

  // Switch timeline
  const switchTimeline = useCallback((id) => {
    setCurrentTimelineId(id);
    setZoom(1);
  }, []);

  return (
    <TimelineContext.Provider value={{
      manifest,
      currentTimelineId,
      timelineData,
      timelineMeta,
      updateTimelineMeta,
      allTracks,
      allEvents,
      crossTrackEvents,
      masterRange,
      loading,
      error,
      zoom,
      setZoom,
      expandedEvent,
      setExpandedEvent,
      getTrackEvents,
      addTrack,
      deleteTrack,
      addEvent,
      updateEvent,
      deleteEvent,
      downloadFullTimelineJSON,
      switchTimeline,
      scrollRef,
      localEvents,
      localTracks,
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
