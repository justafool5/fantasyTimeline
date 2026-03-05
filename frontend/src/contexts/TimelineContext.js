import React, { createContext, useContext, useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { calculateMasterRange, localToMaster, masterToLocal } from '../utils/timelineUtils';

const TimelineContext = createContext();

const STORAGE_KEY = 'chronoweave_local_events';
const TRACKS_KEY = 'chronoweave_local_tracks';
const LOCAL_TIMELINES_KEY = 'chronoweave_local_timelines';

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

// Load and save local timelines
function loadLocalTimelines() {
  try {
    const stored = localStorage.getItem(LOCAL_TIMELINES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveLocalTimelines(timelines) {
  localStorage.setItem(LOCAL_TIMELINES_KEY, JSON.stringify(timelines));
}

export function TimelineProvider({ children }) {
  const [manifest, setManifest] = useState(null);
  const [localTimelines, setLocalTimelines] = useState([]);
  const [currentTimelineId, setCurrentTimelineId] = useState(null);
  const [timelineData, setTimelineData] = useState(null);
  const [localEvents, setLocalEvents] = useState([]);
  const [localTracks, setLocalTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [autoFitApplied, setAutoFitApplied] = useState(false);
  const [expandedEvent, setExpandedEvent] = useState(null);
  const scrollRef = useRef(null);

  // Fetch with strong cache-busting
  const fetchNoCacheJSON = async (url) => {
    const cacheBuster = `?nocache=${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const response = await fetch(`${url}${cacheBuster}`, {
      method: 'GET',
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
    return response.json();
  };

  // Load manifest and then fetch metadata from each timeline file
  useEffect(() => {
    // Load local timelines first
    const storedLocalTimelines = loadLocalTimelines();
    setLocalTimelines(storedLocalTimelines);

    fetchNoCacheJSON(`${process.env.PUBLIC_URL}/data/manifest.json`)
      .then(async (data) => {
        // Load title/description from each timeline file
        const timelinesWithMeta = await Promise.all(
          data.timelines.map(async (entry) => {
            try {
              const timelineData = await fetchNoCacheJSON(`${process.env.PUBLIC_URL}/${entry.url}`);
              return {
                ...entry,
                title: timelineData.timeline?.title || entry.id,
                description: timelineData.timeline?.description || '',
              };
            } catch {
              return { ...entry, title: entry.id, description: '' };
            }
          })
        );
        
        // Merge with local timelines
        const allTimelines = [...timelinesWithMeta, ...storedLocalTimelines];
        setManifest({ ...data, timelines: allTimelines });
        
        if (allTimelines.length > 0) {
          setCurrentTimelineId(allTimelines[0].id);
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
    setAutoFitApplied(false); // Reset auto-fit flag when switching timelines

    // Check if it's a local timeline
    if (entry.isLocal) {
      // Local timeline - data is stored in localStorage
      const storedTracks = loadLocalTracks(currentTimelineId);
      const localData = {
        timeline: {
          title: entry.title,
          description: entry.description || '',
        },
        tracks: storedTracks,
        events: [],
      };
      setTimelineData(localData);
      setLocalEvents(loadLocalEvents(currentTimelineId));
      setLocalTracks([]); // Don't duplicate tracks - they're already in timelineData
      setLoading(false);
    } else {
      // Remote timeline - fetch from server
      fetchNoCacheJSON(`${process.env.PUBLIC_URL}/${entry.url}`)
        .then(data => {
          setTimelineData(data);
          setLocalEvents(loadLocalEvents(currentTimelineId));
          setLocalTracks(loadLocalTracks(currentTimelineId));
          setLoading(false);
        })
        .catch(() => {
          setError(`Failed to load timeline: ${entry.title || entry.id}`);
          setLoading(false);
        });
    }
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

  // Calculate auto-fit zoom when timeline loads
  const calculateAutoFitZoom = useCallback(() => {
    if (!allTracks.length || autoFitApplied) return null;
    
    const range = masterRange.end - masterRange.start;
    if (range <= 0) return 1;

    // Get viewport width (accounting for sidebar)
    const viewportWidth = window.innerWidth - 200; // 200px for sidebar + padding
    const BASE_PX_PER_YEAR = 0.8;
    const TIMELINE_PADDING = 150;
    
    // Calculate zoom to fit the longest track
    const idealZoom = (viewportWidth - TIMELINE_PADDING) / (range * BASE_PX_PER_YEAR);
    
    // Clamp zoom to reasonable bounds (0.1 to 10)
    return Math.min(Math.max(idealZoom, 0.1), 10);
  }, [allTracks, masterRange, autoFitApplied]);

  // Apply auto-fit zoom when tracks are loaded
  useEffect(() => {
    if (!loading && allTracks.length > 0 && !autoFitApplied) {
      const autoZoom = calculateAutoFitZoom();
      if (autoZoom !== null) {
        setZoom(autoZoom);
        setAutoFitApplied(true);
      }
    }
  }, [loading, allTracks, autoFitApplied, calculateAutoFitZoom]);

  // Fit zoom to a specific range (used for sub-timelines)
  const fitToRange = useCallback((rangeStart, rangeEnd) => {
    const range = rangeEnd - rangeStart;
    if (range <= 0) return;

    const viewportWidth = window.innerWidth - 200;
    const BASE_PX_PER_YEAR = 0.8;
    const TIMELINE_PADDING = 150;
    
    const idealZoom = (viewportWidth - TIMELINE_PADDING) / (range * BASE_PX_PER_YEAR);
    const clampedZoom = Math.min(Math.max(idealZoom, 0.1), 10);
    
    setZoom(clampedZoom);
  }, []);

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

  // Update a track
  const updateTrack = useCallback((trackId, updates) => {
    // Check if it's a local track
    const isLocalTrack = localTracks.some(t => t.id === trackId);
    
    if (isLocalTrack) {
      setLocalTracks(prev => {
        const next = prev.map(t => t.id === trackId ? { ...t, ...updates } : t);
        saveLocalTracks(currentTimelineId, next);
        return next;
      });
    } else {
      // Update in timelineData for JSON tracks (in-memory only, exported via JSON download)
      setTimelineData(prev => {
        if (!prev || !prev.tracks) return prev;
        return {
          ...prev,
          tracks: prev.tracks.map(t => t.id === trackId ? { ...t, ...updates } : t)
        };
      });
    }
  }, [currentTimelineId, localTracks]);

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

  // Helper to recursively find and update an event by ID
  const findAndUpdateEvent = (events, targetId, updater) => {
    for (let i = 0; i < events.length; i++) {
      if (events[i].id === targetId) {
        events[i] = updater(events[i]);
        return true;
      }
      if (events[i].children && events[i].children.length > 0) {
        if (findAndUpdateEvent(events[i].children, targetId, updater)) {
          return true;
        }
      }
    }
    return false;
  };

  // Add a new event (can be a child of a period at any nesting level)
  const addEvent = useCallback((event, parentPeriodId = null) => {
    const newEvent = { ...event, id: `local-${Date.now()}`, isLocal: true };
    
    if (parentPeriodId) {
      // Add as a child to a period event - search recursively
      let found = false;
      
      // First check local events (recursively)
      setLocalEvents(prev => {
        const next = JSON.parse(JSON.stringify(prev)); // Deep clone
        found = findAndUpdateEvent(next, parentPeriodId, (parent) => ({
          ...parent,
          children: [...(parent.children || []), newEvent]
        }));
        if (found) {
          saveLocalEvents(currentTimelineId, next);
          return next;
        }
        return prev;
      });
      
      // If not found in local, check JSON data (recursively)
      if (!found && timelineData) {
        const eventsCopy = JSON.parse(JSON.stringify(timelineData.events));
        found = findAndUpdateEvent(eventsCopy, parentPeriodId, (parent) => ({
          ...parent,
          children: [...(parent.children || []), newEvent]
        }));
        if (found) {
          setTimelineData({ ...timelineData, events: eventsCopy });
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

  // Clear all local data (events and tracks added via UI)
  const clearLocalData = useCallback(() => {
    if (!currentTimelineId) return;
    localStorage.removeItem(`${STORAGE_KEY}_${currentTimelineId}`);
    localStorage.removeItem(`${TRACKS_KEY}_${currentTimelineId}`);
    setLocalEvents([]);
    setLocalTracks([]);
  }, [currentTimelineId]);

  // Switch timeline
  const switchTimeline = useCallback((id) => {
    setCurrentTimelineId(id);
    setZoom(1);
  }, []);

  // Create a new timeline
  const createTimeline = useCallback(({ title, description, defaultTheme, firstTrack }) => {
    const id = `local-timeline-${Date.now()}`;
    
    // Create the timeline entry
    const newTimeline = {
      id,
      title,
      description: description || '',
      defaultTheme: defaultTheme || 'fantasy',
      isLocal: true,
    };

    // Create the first track
    const trackId = `local-track-${Date.now()}`;
    const newTrack = {
      id: trackId,
      name: firstTrack.name,
      calendarName: firstTrack.calendarName,
      abbr: firstTrack.abbr,
      color: firstTrack.color,
      epoch: firstTrack.epoch,
      startYear: firstTrack.startYear,
      endYear: firstTrack.endYear,
      isLocal: true,
    };

    // Save the track for this timeline
    saveLocalTracks(id, [newTrack]);

    // Update local timelines list
    const updatedLocalTimelines = [...localTimelines, newTimeline];
    setLocalTimelines(updatedLocalTimelines);
    saveLocalTimelines(updatedLocalTimelines);

    // Update manifest to include new timeline
    if (manifest) {
      setManifest(prev => ({
        ...prev,
        timelines: [...prev.timelines, newTimeline]
      }));
    }

    // Switch to the new timeline
    setCurrentTimelineId(id);

    return id;
  }, [localTimelines, manifest]);

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
      fitToRange,
      expandedEvent,
      setExpandedEvent,
      getTrackEvents,
      addTrack,
      updateTrack,
      deleteTrack,
      addEvent,
      updateEvent,
      deleteEvent,
      downloadFullTimelineJSON,
      clearLocalData,
      switchTimeline,
      createTimeline,
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
