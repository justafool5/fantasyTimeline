/**
 * Multi-track timeline utilities
 */

/**
 * Convert a local year in a track's calendar to master year
 */
export function localToMaster(localYear, track) {
  return localYear + track.epoch;
}

/**
 * Convert a master year to local year in a track's calendar
 */
export function masterToLocal(masterYear, track) {
  return masterYear - track.epoch;
}

/**
 * Get the master year for an event (works for both track-specific and cross-track events)
 */
export function getEventMasterYear(event, tracks) {
  if (event.trackId === null) {
    // Cross-track event uses master dates
    if (event.type === 'point') {
      return event.masterDate.year;
    } else if (event.type === 'period') {
      return event.masterStartDate.year;
    }
  } else {
    // Track-specific event uses local dates
    const track = tracks.find(t => t.id === event.trackId);
    if (!track) return null;
    if (event.type === 'point') {
      return localToMaster(event.date.year, track);
    } else if (event.type === 'period') {
      return localToMaster(event.startDate.year, track);
    }
  }
  return null;
}

/**
 * Get the master year range for a period event
 */
export function getEventMasterRange(event, tracks) {
  if (event.type !== 'period') return null;
  
  if (event.trackId === null) {
    return {
      start: event.masterStartDate.year,
      end: event.masterEndDate.year
    };
  } else {
    const track = tracks.find(t => t.id === event.trackId);
    if (!track) return null;
    return {
      start: localToMaster(event.startDate.year, track),
      end: localToMaster(event.endDate.year, track)
    };
  }
}

/**
 * Calculate the visible master year range based on all tracks
 */
export function calculateMasterRange(tracks) {
  if (!tracks || tracks.length === 0) return { start: 0, end: 1000 };
  
  let minMaster = Infinity;
  let maxMaster = -Infinity;
  
  for (const track of tracks) {
    const trackMasterStart = localToMaster(track.startYear, track);
    const trackMasterEnd = localToMaster(track.endYear, track);
    minMaster = Math.min(minMaster, trackMasterStart);
    maxMaster = Math.max(maxMaster, trackMasterEnd);
  }
  
  return { start: minMaster, end: maxMaster };
}

/**
 * Resolve event positions for a single track (returns x positions in pixels)
 */
export function resolveTrackEventPositions(events, track, masterRange, pixelsPerYear) {
  const positions = {};
  
  const trackEvents = events.filter(e => e.trackId === track.id);
  
  for (const evt of trackEvents) {
    if (evt.type === 'point') {
      const masterYear = localToMaster(evt.date.year, track);
      positions[evt.id] = {
        x: (masterYear - masterRange.start) * pixelsPerYear,
        isFuzzy: false
      };
    } else if (evt.type === 'period') {
      const masterYear = localToMaster(evt.startDate.year, track);
      positions[evt.id] = {
        x: (masterYear - masterRange.start) * pixelsPerYear,
        isFuzzy: false
      };
    } else if (evt.type === 'undated') {
      // Handle undated events within track
      positions[evt.id] = {
        x: 0, // Will be computed separately
        isFuzzy: true
      };
    }
  }
  
  return positions;
}

/**
 * Resolve cross-track event positions
 */
export function resolveCrossTrackEventPositions(events, masterRange, pixelsPerYear) {
  const positions = {};
  
  const crossTrackEvents = events.filter(e => e.trackId === null);
  
  for (const evt of crossTrackEvents) {
    if (evt.type === 'point') {
      positions[evt.id] = {
        x: (evt.masterDate.year - masterRange.start) * pixelsPerYear,
        isFuzzy: false
      };
    } else if (evt.type === 'period') {
      positions[evt.id] = {
        x: (evt.masterStartDate.year - masterRange.start) * pixelsPerYear,
        width: (evt.masterEndDate.year - evt.masterStartDate.year) * pixelsPerYear,
        isFuzzy: false
      };
    }
  }
  
  return positions;
}

/**
 * Get period bar dimensions for a track event
 */
export function getTrackPeriodBarDimensions(event, track, masterRange, pixelsPerYear) {
  const startMaster = localToMaster(event.startDate.year, track);
  const endMaster = localToMaster(event.endDate.year, track);
  return {
    left: (startMaster - masterRange.start) * pixelsPerYear,
    width: (endMaster - startMaster) * pixelsPerYear
  };
}

/**
 * Convert a click position to master year
 */
export function positionToMasterYear(x, masterRange, pixelsPerYear) {
  return Math.round(masterRange.start + x / pixelsPerYear);
}

/**
 * Convert a click position to local year for a track
 */
export function positionToLocalYear(x, track, masterRange, pixelsPerYear) {
  const masterYear = positionToMasterYear(x, masterRange, pixelsPerYear);
  return masterToLocal(masterYear, track);
}

/**
 * Generate year markers for a track (in local years)
 */
export function generateTrackYearMarkers(track, masterRange, pixelsPerYear) {
  const trackMasterStart = localToMaster(track.startYear, track);
  const trackMasterEnd = localToMaster(track.endYear, track);
  
  // Clamp to visible master range
  const visibleStart = Math.max(trackMasterStart, masterRange.start);
  const visibleEnd = Math.min(trackMasterEnd, masterRange.end);
  
  const localVisibleStart = masterToLocal(visibleStart, track);
  const localVisibleEnd = masterToLocal(visibleEnd, track);
  const range = localVisibleEnd - localVisibleStart;
  
  // Calculate step based on zoom level
  let step;
  if (range * pixelsPerYear < 400) step = Math.max(1, Math.floor(range / 8));
  else if (pixelsPerYear > 3) step = 50;
  else if (pixelsPerYear > 1) step = 100;
  else if (pixelsPerYear > 0.5) step = 200;
  else step = 500;
  
  const markers = [];
  const start = Math.ceil(localVisibleStart / step) * step;
  
  for (let localYear = start; localYear <= localVisibleEnd; localYear += step) {
    const masterYear = localToMaster(localYear, track);
    markers.push({
      localYear,
      x: (masterYear - masterRange.start) * pixelsPerYear
    });
  }
  
  return markers;
}

/**
 * Format a year for display (plain number)
 */
export function formatYear(year) {
  return `${year}`;
}

/**
 * Format year with track abbreviation
 */
export function formatYearWithAbbr(year, abbr) {
  return `${year} ${abbr}`;
}

/**
 * Get equivalent years in all tracks for a master year
 */
export function getEquivalentYears(masterYear, tracks) {
  return tracks.map(track => ({
    trackId: track.id,
    trackName: track.name,
    abbr: track.abbr,
    localYear: masterToLocal(masterYear, track)
  }));
}

/**
 * Get a consistent color for a tag
 */
const TAG_COLORS_FANTASY = [
  { bg: '#8a0303', text: '#f9f1d8' },
  { bg: '#1a5c1a', text: '#f9f1d8' },
  { bg: '#2c3e8c', text: '#f9f1d8' },
  { bg: '#6b3a8c', text: '#f9f1d8' },
  { bg: '#8b5e3c', text: '#f9f1d8' },
  { bg: '#4a6741', text: '#f9f1d8' },
  { bg: '#7c2d4e', text: '#f9f1d8' },
  { bg: '#355c7d', text: '#f9f1d8' },
];

const TAG_COLORS_SCIFI = [
  { bg: '#00f3ff', text: '#050510' },
  { bg: '#ff00ff', text: '#050510' },
  { bg: '#00ff88', text: '#050510' },
  { bg: '#ff6600', text: '#050510' },
  { bg: '#ffff00', text: '#050510' },
  { bg: '#ff3366', text: '#050510' },
  { bg: '#66ccff', text: '#050510' },
  { bg: '#cc66ff', text: '#050510' },
];

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function getTagColor(tag, theme) {
  const colors = theme === 'fantasy' ? TAG_COLORS_FANTASY : TAG_COLORS_SCIFI;
  return colors[hashString(tag) % colors.length];
}

/**
 * Default track colors palette
 */
export const TRACK_COLORS = [
  '#c9a84c', // gold
  '#4a9eff', // blue
  '#50c878', // emerald
  '#ff6b6b', // coral
  '#9b59b6', // purple
  '#e67e22', // orange
  '#1abc9c', // teal
  '#e91e63', // pink
];
