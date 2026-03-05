# ChronoWeave Timeline Visualizer - PRD

## Original Problem Statement
Build a static timeline visualizer webapp (frontend-only, deployable via GitHub Pages) that loads data from static JSON files. Must support arbitrary dates (negative/positive years), three event types (point, period, undated), expandable event cards with images/tags, sub-timeline drill-down for period events, and dual themes (Heroic Fantasy / Sci-Fi).

## Architecture
- **Frontend**: React 19 + Tailwind CSS 3 + Framer Motion + Lucide React
- **Backend**: Minimal FastAPI (health check only, not needed for production)
- **Data**: Static JSON files in `public/data/` folder
- **Storage**: LocalStorage for user-added events
- **Deployment**: Built files at repo root, served by GitHub Pages at `https://justafool5.github.io/fantasyTimeline/`
## User Personas
- World-builders creating fictional history timelines
- Writers/authors mapping story chronology
- Tabletop RPG game masters organizing campaign lore
- History enthusiasts visualizing custom timelines

## Core Requirements
1. Horizontal scrollable timeline with zoom (Ctrl+Scroll, buttons)
2. Three event types: Point (exact date), Period (start+end, with sub-events), Undated (fuzzy placement)
3. Expandable event cards with title, date, image, description, colored tags
4. Sub-timeline drill-down for period events (inline below main timeline)
5. Add new events by clicking the timeline
6. JSON download of locally-added events
7. Timeline picker (manifest.json for multiple timelines)
8. Dual themes: Fantasy (parchment/medieval) and Sci-Fi (dark/neon)

## What's Been Implemented (March 2026)
- [x] Full timeline rendering with all 3 event types
- [x] Event card expansion with image, description, colored tags
- [x] Period bar visualization and sub-timeline drill-down
- [x] Undated events with fuzzy/dashed marker style
- [x] Zoom controls (button + Ctrl+Scroll)
- [x] Drag to scroll + horizontal scrolling
- [x] Theme switcher (Fantasy/Sci-Fi) with full theming
- [x] Timeline picker with manifest.json
- [x] Add Event form (click on timeline, fill form)
- [x] LocalStorage persistence for new events
- [x] JSON download of local events
- [x] Sample data: Ages of Eldoria (fantasy) + Galactic Chronicles (sci-fi)
- [x] Year formatting: BCE/CE with negative year support

## Data Model
```json
{
  "timeline": { "title": "...", "startYear": -3000, "endYear": 1500 },
  "events": [
    { "id": "...", "type": "point|period|undated", "title": "...", "date/startDate/endDate": {...}, "description": "...", "image": "url", "tags": ["..."], "children": [...] }
  ]
}
```

## Prioritized Backlog
### P0 - Done
- All core features implemented and tested (15/15)
- Production build with stable filenames (no hashes)
- README.md (user-facing) and TECHNICAL.md (developer reference) created
- v2 Fixes: no BCE/CE, scroll-to-zoom, axis-only click, dark D&D theme with thumbnails, editable sub-timelines

### P1 - Next
- Keyboard navigation (arrow keys to move between events)
- Touch/mobile optimization (pinch-to-zoom, swipe)
- Event search/filter by tags or keywords

### P2 - Future
- Timeline export as image (screenshot)
- Drag-and-drop event reordering
- Undo/redo for local event edits
- Custom color themes beyond Fantasy/Sci-Fi
- Import events from JSON file upload
- Collaborative editing via shareable links

## Next Tasks
1. Consider adding tag-based filtering
2. Mobile-responsive layout optimization
3. Keyboard accessibility improvements
