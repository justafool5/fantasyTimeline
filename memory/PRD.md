# ChronoWeave PRD

## Original Problem Statement
Multi-track coordinated timeline visualizer for world-builders. Users can visualize multiple civilizations/empires with independent calendar systems, all aligned on a hidden master timeline.

## Architecture
- **Frontend**: React 19, Tailwind CSS 3, Framer Motion
- **Backend**: None (static site for GitHub Pages)
- **Storage**: localStorage for user-created tracks/events, JSON files for bundled timelines

## User Personas
1. **World-builders** - Creating fantasy/sci-fi universes with multiple civilizations
2. **Writers** - Tracking story timelines across different narrative perspectives
3. **Historians** - Visualizing parallel historical timelines with different calendars

## Core Requirements (Static)
- Multiple stacked horizontal track timelines
- Each track has its own calendar system (name, abbreviation, epoch offset)
- Cross-track events that span all tracks as vertical lines/bands
- Year labels in local calendar only (never show master reference to users)
- Add Track modal with color picker, calendar settings, epoch, range
- Add Event form with track selector and cross-track checkbox
- Edit events including year/reference year fields
- Period events with "Open Sub-Timeline" action
- Synchronized zoom across all tracks
- Export full timeline as JSON

## What's Been Implemented
### 2025-03-05
- Initial multi-track feature implementation
- Stacked parallel axes layout (Option A design)
- Cross-track events as vertical spanning lines/bands
- EventCard shows equivalent years in all track calendars for cross-track events
- Add Track modal with full configuration
- Add Event form with cross-track checkbox
- Year editing for both track-specific and cross-track events
- Period events clickable with "Open Sub-Timeline" button
- Two sample timelines: Ages of Eldoria (fantasy), Galactic Chronicles (sci-fi)
- Bug fixes: drag-to-scroll, cache-busting, image aspect ratio

## Prioritized Backlog
### P0 (Critical)
- ✅ Multi-track display
- ✅ Cross-track events
- ✅ Year editing
- ✅ Period event clickable

### P1 (High)
- Full sub-timeline drill-down for period events
- Track deletion UI

### P2 (Medium)
- Mobile responsive layout
- Tag-based filtering
- Keyboard accessibility

### P3 (Low)
- Drag-to-reorder tracks
- Import timeline JSON
- Search functionality

## Next Tasks
1. Implement full sub-timeline navigation stack for period events
2. Add track deletion button (with confirmation)
3. Test and fix any remaining cross-track period interaction issues
