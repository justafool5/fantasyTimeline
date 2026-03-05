# ChronoWeave Timeline Visualizer - PRD

## Original Problem Statement
Install the fantasyTimeline app from GitHub (https://github.com/justafool5/fantasyTimeline) and implement two enhancements:
1. A tool to create new timelines (like an "add" button in the dropdown timeline selection menu) where users can enter minimum information, with view shifting to the new timeline
2. The app should always open in a way that the longest available track fills the whole width of the screen (auto-fit zoom)

## Architecture
- **Frontend**: React 19 with Tailwind CSS 3.4, Framer Motion 12, Lucide React
- **Storage**: Browser localStorage for user-created timelines, JSON files for pre-built timelines
- **Type**: Pure static frontend app - no backend required

## User Personas
- World-builders and writers creating fictional histories
- RPG enthusiasts tracking campaign timelines
- Anyone visualizing parallel/overlapping timelines with multiple calendar systems

## Core Requirements (Static)
- Multi-track timeline visualization with different calendar systems
- Fantasy and Sci-Fi visual themes
- Point events, period events, and undated events
- Sub-timeline drill-down for period events
- Zoom and drag navigation
- Export timeline as JSON

## What's Been Implemented

### Session: Jan 5, 2026
**Enhancements Completed:**

1. **Create New Timeline Feature**
   - Added "Create New Timeline" button to TimelinePicker dropdown
   - Created AddTimelineForm component with fields:
     - Timeline: Title, Description, Theme (Fantasy/Sci-Fi)
     - First Track: Name, Calendar Name, Abbreviation, Color, Epoch, Year Range
   - New timelines stored in localStorage with `isLocal: true` flag
   - Timelines show "Local" badge in dropdown
   - Auto-switches to newly created timeline

2. **Auto-fit Zoom Feature**
   - Added `calculateAutoFitZoom()` function in TimelineContext
   - Automatically calculates optimal zoom level based on:
     - Master range of all tracks
     - Viewport width (minus sidebar)
     - Base pixels per year constant
   - Applied when timeline loads, resets when switching timelines

**Files Modified:**
- `/app/frontend/src/components/TimelinePicker.js` - Added create button and modal trigger
- `/app/frontend/src/components/AddTimelineForm.js` - New component for timeline creation
- `/app/frontend/src/contexts/TimelineContext.js` - Added createTimeline(), auto-fit zoom logic, local timeline support

## Prioritized Backlog

### P0 (Critical) - None remaining

### P1 (High Priority)
- Mobile optimization (pinch-to-zoom, responsive layout)
- Search/filter events by tags
- Import JSON file to restore local timelines

### P2 (Medium Priority)
- Month/day precision for zoom levels
- Nested period-within-period support
- Keyboard navigation

## Next Tasks
1. Test adding events to newly created local timelines
2. Consider adding "Delete Timeline" option for local timelines
3. Add confirmation when leaving page with unsaved local changes
