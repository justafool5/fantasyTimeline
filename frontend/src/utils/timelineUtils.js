/**
 * Resolve the pixel position of every event on the timeline.
 * Returns a map: eventId -> { x, isFuzzy }
 */

export function resolveEventPositions(events, timelineMeta, pixelsPerYear) {
  const { startYear, endYear } = timelineMeta;
  const totalWidth = (endYear - startYear) * pixelsPerYear;

  // First pass: position all dated events (point + period)
  const positions = {};

  const datedEvents = events.filter(e => e.type === 'point' || e.type === 'period');
  for (const evt of datedEvents) {
    const year = evt.type === 'point' ? evt.date.year : evt.startDate.year;
    positions[evt.id] = {
      x: (year - startYear) * pixelsPerYear,
      isFuzzy: false,
    };
  }

  // Second pass: position undated events
  const undatedEvents = events.filter(e => e.type === 'undated');

  // Group undated events by their anchor pair
  const anchorGroups = {};
  for (const evt of undatedEvents) {
    const key = `${evt.afterEvent || '__start__'}|${evt.beforeEvent || '__end__'}`;
    if (!anchorGroups[key]) anchorGroups[key] = [];
    anchorGroups[key].push(evt);
  }

  for (const [key, group] of Object.entries(anchorGroups)) {
    const [afterKey, beforeKey] = key.split('|');

    let startX = 0;
    if (afterKey !== '__start__' && positions[afterKey]) {
      startX = positions[afterKey].x;
    }

    let endX = totalWidth;
    if (beforeKey !== '__end__' && positions[beforeKey]) {
      endX = positions[beforeKey].x;
    }

    const segmentWidth = (endX - startX) / (group.length + 1);
    group.forEach((evt, i) => {
      positions[evt.id] = {
        x: startX + segmentWidth * (i + 1),
        isFuzzy: true,
      };
    });
  }

  return { positions, totalWidth };
}

/**
 * Get period bar dimensions
 */
export function getPeriodBarDimensions(event, startYear, pixelsPerYear) {
  const barStart = (event.startDate.year - startYear) * pixelsPerYear;
  const barEnd = (event.endDate.year - startYear) * pixelsPerYear;
  return { left: barStart, width: barEnd - barStart };
}

/**
 * Convert a click position on the timeline to a year
 */
export function positionToYear(x, startYear, pixelsPerYear) {
  return Math.round(startYear + x / pixelsPerYear);
}

/**
 * Format a year for display (handles BCE)
 */
export function formatYear(year) {
  if (year < 0) return `${Math.abs(year)} BCE`;
  if (year === 0) return 'Year 0';
  return `${year} CE`;
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
