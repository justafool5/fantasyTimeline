import React, { createContext, useContext, useState, useCallback, useEffect, useRef, useMemo } from 'react';

const TimelineContext = createContext();

const STORAGE_KEY = 'chronoweave_local_events';
const CONFIG_KEY = 'chronoweave_config';

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

function loadConfig(timelineId) {
  try {
    const stored = localStorage.getItem(`${CONFIG_KEY}_${timelineId}`);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

function saveConfig(timelineId, config) {
  localStorage.setItem(`${CONFIG_KEY}_${timelineId}`, JSON.stringify(config));
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
  const [configOverride, setConfigOverride] = useState(null);
  const scrollRef = useRef(null);

  // Navigation stack for drill-down
  // Each entry: { events, meta: {title, startYear, endYear, description}, contextEvents, label }
  const [navStack, setNavStack] = useState([]);

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
    setNavStack([]);

    const cacheBuster = `?t=${Date.now()}`;
    fetch(`${process.env.PUBLIC_URL}/${entry.url}${cacheBuster}`, { cache: 'no-store' })
      .then(r => r.json())
      .then(data => {
        setTimelineData(data);
        setLocalEvents(loadLocalEvents(currentTimelineId));
        setConfigOverride(loadConfig(currentTimelineId));
        setLoading(false);
      })
      .catch(() => {
        setError(`Failed to load timeline: ${entry.title}`);
        setLoading(false);
      });
  }, [manifest, currentTimelineId]);

  // Effective timeline meta (config override takes precedence)
  const effectiveMeta = useMemo(() => {
    if (!timelineData) return null;
    const base = timelineData.timeline;
    if (!configOverride) return base;
    return { ...base, ...configOverride };
  }, [timelineData, configOverride]);

  // All root-level events (JSON + local top-level)
  const rootEvents = useMemo(() => {
    if (!timelineData) return [];
    const topLocalEvents = localEvents.filter(e => !e._parentId);
    return [...timelineData.events, ...topLocalEvents];
  }, [timelineData, localEvents]);

  // Current view: either root or a drilled-in level
  const currentView = useMemo(() => {
    if (navStack.length === 0) {
      return {
        events: rootEvents,
        meta: effectiveMeta,
        contextEvents: [],
        isRoot: true,
      };
    }
    return { ...navStack[navStack.length - 1], isRoot: false };
  }, [navStack, rootEvents, effectiveMeta]);

  // Breadcrumbs
  const breadcrumbs = useMemo(() => {
    const crumbs = [{ label: effectiveMeta?.title || 'Root', level: -1 }];
    navStack.forEach((entry, i) => {
      crumbs.push({ label: entry.label, level: i });
    });
    return crumbs;
  }, [navStack, effectiveMeta]);

  // Drill into a period event
  const drillInto = useCallback((periodEvent, siblingEvents) => {
    const periodChildren = periodEvent.children || [];
    // Also include any local children for this period
    const localChildren = localEvents.filter(e => e._parentId === periodEvent.id);
    const allChildren = [...periodChildren, ...localChildren];

    // Only keep 1 context event before and 1 after the period for orientation
    const siblings = siblingEvents.filter(e => e.id !== periodEvent.id);
    const periodStart = periodEvent.startDate.year;
    const periodEnd = periodEvent.endDate.year;

    const getYear = (e) => {
      if (e.type === 'point') return e.date.year;
      if (e.type === 'period') return e.startDate.year;
      return null;
    };

    const before = siblings
      .filter(e => { const y = getYear(e); return y !== null && y < periodStart; })
      .sort((a, b) => getYear(b) - getYear(a));
    const after = siblings
      .filter(e => { const y = getYear(e); return y !== null && y > periodEnd; })
      .sort((a, b) => getYear(a) - getYear(b));

    const limitedContext = [
      ...(before.length > 0 ? [before[0]] : []),
      ...(after.length > 0 ? [after[0]] : []),
    ];

    setNavStack(prev => [...prev, {
      events: allChildren,
      meta: {
        title: periodEvent.title,
        startYear: periodEvent.startDate.year,
        endYear: periodEvent.endDate.year,
        description: periodEvent.description,
      },
      contextEvents: limitedContext,
      label: periodEvent.title,
      parentEventId: periodEvent.id,
    }]);
    setExpandedEvent(null);
  }, [localEvents]);

  // Navigate back via breadcrumb
  const navigateTo = useCallback((level) => {
    if (level === -1) {
      setNavStack([]);
    } else {
      setNavStack(prev => prev.slice(0, level + 1));
    }
    setExpandedEvent(null);
  }, []);

  const addLocalEvent = useCallback((event) => {
    setLocalEvents(prev => {
      const next = [...prev, { ...event, isLocal: true }];
      saveLocalEvents(currentTimelineId, next);
      return next;
    });
  }, [currentTimelineId]);

  // Add a child event to a period (works at any nesting level)
  const addChildEvent = useCallback((parentEventId, childEvent) => {
    const child = { ...childEvent, isLocal: true };

    // Add to the parent's children array in the data tree
    const addToTree = (events) => {
      for (const evt of events) {
        if (evt.id === parentEventId) {
          if (!evt.children) evt.children = [];
          evt.children.push(child);
          return true;
        }
        if (evt.children && addToTree(evt.children)) return true;
      }
      return false;
    };

    if (timelineData) {
      const found = addToTree(timelineData.events);
      if (found) {
        setTimelineData({ ...timelineData });
      }
    }

    // Also check local events tree
    setLocalEvents(prev => {
      const updated = prev.map(e => {
        if (e.id === parentEventId) {
          return { ...e, children: [...(e.children || []), child] };
        }
        return e;
      });
      updated.push({ ...child, _parentId: parentEventId });
      saveLocalEvents(currentTimelineId, updated);
      return updated;
    });

    // Update nav stack to reflect new child
    setNavStack(prev => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      if (last.parentEventId === parentEventId) {
        return [...prev.slice(0, -1), {
          ...last,
          events: [...last.events, child],
        }];
      }
      return prev;
    });
  }, [currentTimelineId, timelineData]);

  const removeLocalEvent = useCallback((eventId) => {
    setLocalEvents(prev => {
      const next = prev.filter(e => e.id !== eventId);
      saveLocalEvents(currentTimelineId, next);
      return next;
    });
  }, [currentTimelineId]);

  // Update any event (JSON-loaded or local) — edits stored in-memory and in localStorage
  const updateEvent = useCallback((eventId, updates) => {
    // Try updating in loaded JSON data tree
    const updateInTree = (events) => {
      for (let i = 0; i < events.length; i++) {
        if (events[i].id === eventId) {
          events[i] = { ...events[i], ...updates };
          return true;
        }
        if (events[i].children && updateInTree(events[i].children)) return true;
      }
      return false;
    };

    if (timelineData) {
      const found = updateInTree(timelineData.events);
      if (found) {
        setTimelineData({ ...timelineData });
        // Mark this edit in local storage for persistence
        setLocalEvents(prev => {
          // Store the edit as an override entry
          const existing = prev.findIndex(e => e._editOf === eventId);
          const editEntry = { _editOf: eventId, ...updates };
          const next = existing >= 0
            ? prev.map((e, i) => i === existing ? editEntry : e)
            : [...prev, editEntry];
          saveLocalEvents(currentTimelineId, next);
          return next;
        });
        return;
      }
    }

    // Try updating in local events
    setLocalEvents(prev => {
      const next = prev.map(e => e.id === eventId ? { ...e, ...updates } : e);
      saveLocalEvents(currentTimelineId, next);
      return next;
    });

    // Update nav stack if in drilled view
    setNavStack(prev => prev.map(entry => ({
      ...entry,
      events: entry.events.map(e => e.id === eventId ? { ...e, ...updates } : e),
    })));
  }, [currentTimelineId, timelineData]);

  // Delete any event (JSON-loaded or local)
  const deleteEvent = useCallback((eventId) => {
    // Remove from JSON data tree
    const removeFromTree = (events) => {
      const idx = events.findIndex(e => e.id === eventId);
      if (idx >= 0) { events.splice(idx, 1); return true; }
      for (const evt of events) {
        if (evt.children && removeFromTree(evt.children)) return true;
      }
      return false;
    };

    if (timelineData) {
      const found = removeFromTree(timelineData.events);
      if (found) {
        setTimelineData({ ...timelineData });
        // Store deletion marker in localStorage
        setLocalEvents(prev => {
          const next = [...prev, { _deletedId: eventId }];
          saveLocalEvents(currentTimelineId, next);
          return next;
        });
      }
    }

    // Also remove from local events
    setLocalEvents(prev => {
      const next = prev.filter(e => e.id !== eventId && e._parentId !== eventId);
      saveLocalEvents(currentTimelineId, next);
      return next;
    });

    // Update nav stack
    setNavStack(prev => prev.map(entry => ({
      ...entry,
      events: entry.events.filter(e => e.id !== eventId),
    })));

    setExpandedEvent(null);
  }, [currentTimelineId, timelineData]);

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

  // Download the full merged timeline JSON (for committing to repo)
  const downloadFullTimelineJSON = useCallback(() => {
    if (!timelineData) return;
    const meta = effectiveMeta || timelineData.timeline;
    const topLocalEvents = localEvents.filter(e => !e._parentId);

    // Deep-clone events and strip isLocal / _parentId markers
    const cleanEvent = (evt) => {
      const clean = { ...evt };
      delete clean.isLocal;
      delete clean._parentId;
      if (clean.children) {
        clean.children = clean.children.map(cleanEvent);
      }
      return clean;
    };

    const allEvents = [...timelineData.events, ...topLocalEvents].map(cleanEvent);

    const fullJson = {
      timeline: {
        title: meta.title,
        startYear: meta.startYear,
        endYear: meta.endYear,
        ...(meta.description ? { description: meta.description } : {}),
      },
      events: allEvents,
    };

    const blob = new Blob([JSON.stringify(fullJson, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentTimelineId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [timelineData, effectiveMeta, localEvents, currentTimelineId]);

  const updateConfig = useCallback((newConfig) => {
    setConfigOverride(newConfig);
    saveConfig(currentTimelineId, newConfig);
  }, [currentTimelineId]);

  const switchTimeline = useCallback((id) => {
    setCurrentTimelineId(id);
    setZoom(1);
    setNavStack([]);
  }, []);

  return (
    <TimelineContext.Provider value={{
      manifest,
      currentTimelineId,
      timelineData,
      effectiveMeta,
      rootEvents,
      currentView,
      breadcrumbs,
      localEvents,
      loading,
      error,
      zoom,
      setZoom,
      expandedEvent,
      setExpandedEvent,
      drillInto,
      navigateTo,
      navStack,
      addLocalEvent,
      addChildEvent,
      removeLocalEvent,
      updateEvent,
      deleteEvent,
      downloadLocalEventsJSON,
      downloadFullTimelineJSON,
      updateConfig,
      configOverride,
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
