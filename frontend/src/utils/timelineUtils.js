/**
 * Multi-track timeline utilities
 */

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
    if (event.type === 'point') {
      return event.masterDate.year;
    } else if (event.type === 'period') {
      return event.masterStartDate.year;
    }
  } else {
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
      positions[evt.id] = {
        x: 0,
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
 * Get period bar dimensions for a track event (handles both track-specific and cross-track)
 */
export function getTrackPeriodBarDimensions(event, track, masterRange, pixelsPerYear) {
  let startMaster;
  let endMaster;

  if (event.trackId === null) {
    startMaster = event.masterStartDate?.year;
    endMaster = event.masterEndDate?.year;
  } else {
    startMaster = localToMaster(event.startDate?.year, track);
    endMaster = localToMaster(event.endDate?.year, track);
  }

  if (startMaster === undefined || endMaster === undefined) {
    return { left: 0, width: 0 };
  }

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
 *
 * Rules:
 * - Use "nice" step sizes: 2, 5, 10, 20, 50, 100, 250, 500, 1000
 * - Pick the largest step that still produces at least 3 interior ticks
 *   (excluding start/end boundary ticks)
 * - Always include year 0 (local) if it falls within the visible range
 * - Start/end ticks are NOT included (this function only generates interior ticks)
 */
export function generateTrackYearMarkers(track, masterRange, pixelsPerYear) {
  const trackMasterStart = localToMaster(track.startYear, track);
  const trackMasterEnd = localToMaster(track.endYear, track);

  const visibleStart = Math.max(trackMasterStart, masterRange.start);
  const visibleEnd = Math.min(trackMasterEnd, masterRange.end);

  const localVisibleStart = masterToLocal(visibleStart, track);
  const localVisibleEnd = masterToLocal(visibleEnd, track);
  const range = localVisibleEnd - localVisibleStart;

  if (range <= 0) return [];

  const NICE_STEPS = [1, 2, 5, 10, 20, 50, 100, 250, 500, 1000];
  const MIN_INTERIOR_TICKS = 3;

  // Count how many interior ticks a given step would produce
  const countInteriorTicks = (step) => {
    const first = Math.ceil(localVisibleStart / step) * step;
    // Skip ticks that land exactly on the visible boundaries
    const adjustedFirst = first === localVisibleStart ? first + step : first;
    let count = 0;
    for (let y = adjustedFirst; y < localVisibleEnd; y += step) {
      count++;
    }
    return count;
  };

  // Pick the largest nice step that produces at least MIN_INTERIOR_TICKS
  let step = NICE_STEPS[0];
  for (let i = NICE_STEPS.length - 1; i >= 0; i--) {
    if (countInteriorTicks(NICE_STEPS[i]) >= MIN_INTERIOR_TICKS) {
      step = NICE_STEPS[i];
      break;
    }
  }

  // Generate the ticks
  const markers = [];
  const seenYears = new Set();

  // First, add year 0 if it falls inside the visible range (exclusive of boundaries)
  if (localVisibleStart < 0 && localVisibleEnd > 0) {
    const masterYear = localToMaster(0, track);
    markers.push({
      localYear: 0,
      x: (masterYear - masterRange.start) * pixelsPerYear,
    });
    seenYears.add(0);
  }

  // Then add regular step-based ticks
  const firstTick = Math.ceil(localVisibleStart / step) * step;
  for (let localYear = firstTick; localYear <= localVisibleEnd; localYear += step) {
    // Skip boundary ticks (exact start/end of visible range)
    if (localYear === localVisibleStart || localYear === localVisibleEnd) continue;
    // Skip if already added (e.g., year 0)
    if (seenYears.has(localYear)) continue;

    const masterYear = localToMaster(localYear, track);
    markers.push({
      localYear,
      x: (masterYear - masterRange.start) * pixelsPerYear,
    });
    seenYears.add(localYear);
  }

  // Sort by local year for consistent rendering
  markers.sort((a, b) => a.localYear - b.localYear);

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
  return colors[hashString(String(tag || 'tag')) % colors.length];
}

export function normalizeTagId(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function normalizeTagDefinitions(definitions = []) {
  const normalized = [];
  const seen = new Map();

  definitions.forEach((definition, index) => {
    const label = String(definition?.label || '').trim();
    if (!label) return;

    const normalizedDefinition = {
      id: normalizeTagId(definition?.id || label) || `tag-${index + 1}`,
      label,
      color: definition?.color || TRACK_COLORS[index % TRACK_COLORS.length],
    };

    if (seen.has(normalizedDefinition.id)) {
      normalized[seen.get(normalizedDefinition.id)] = normalizedDefinition;
    } else {
      seen.set(normalizedDefinition.id, normalized.length);
      normalized.push(normalizedDefinition);
    }
  });

  return normalized;
}

export function findMatchingTagDefinition(tagValue, tagDefinitions = []) {
  if (!tagValue) return null;

  const normalizedValue = normalizeTagId(tagValue);
  return tagDefinitions.find((definition) => {
    const normalizedId = normalizeTagId(definition?.id);
    const normalizedLabel = normalizeTagId(definition?.label);
    return definition?.id === tagValue || normalizedId === normalizedValue || normalizedLabel === normalizedValue;
  }) || null;
}

export function getDefinedEventTagIds(tags = [], tagDefinitions = []) {
  const matched = tags
    .map(tag => findMatchingTagDefinition(tag, tagDefinitions))
    .filter(Boolean)
    .map(definition => definition.id);

  return Array.from(new Set(matched));
}

export function getUndefinedEventTags(tags = [], tagDefinitions = []) {
  const unmatched = tags.filter(tag => !findMatchingTagDefinition(tag, tagDefinitions));
  return Array.from(new Set(unmatched));
}

export function pruneUnknownEventTags(tags = [], tagDefinitions = []) {
  return getDefinedEventTagIds(tags, tagDefinitions);
}

export function sanitizeEventsForTagDefinitions(events = [], tagDefinitions = []) {
  return events.map((event) => {
    const nextEvent = {
      ...event,
      tags: pruneUnknownEventTags(event.tags || [], tagDefinitions),
    };

    if (event.children?.length) {
      nextEvent.children = sanitizeEventsForTagDefinitions(event.children, tagDefinitions);
    }

    return nextEvent;
  });
}

export function getReadableTextColor(backgroundColor) {
  const hex = String(backgroundColor || '').replace('#', '');
  if (![3, 6].includes(hex.length)) return '#ffffff';

  const fullHex = hex.length === 3
    ? hex.split('').map(char => char + char).join('')
    : hex;

  const r = parseInt(fullHex.slice(0, 2), 16);
  const g = parseInt(fullHex.slice(2, 4), 16);
  const b = parseInt(fullHex.slice(4, 6), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;

  return brightness > 160 ? '#111111' : '#ffffff';
}

export function getResolvedEventTags(tags = [], tagDefinitions = [], theme = 'fantasy') {
  return Array.from(new Set(tags)).map((tagValue) => {
    const definition = findMatchingTagDefinition(tagValue, tagDefinitions);
    if (definition) {
      const resolvedColor = definition.color || getTagColor(definition.id, theme).bg;
      return {
        id: definition.id,
        label: definition.label,
        color: resolvedColor,
        textColor: getReadableTextColor(resolvedColor),
        isDefined: true,
      };
    }

    const fallback = getTagColor(tagValue, theme);
    return {
      id: normalizeTagId(tagValue) || String(tagValue),
      label: String(tagValue),
      color: fallback.bg,
      textColor: fallback.text,
      isDefined: false,
    };
  });
}
