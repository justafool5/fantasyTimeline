# ChronoWeave — Timeline Visualizer

A static, interactive timeline app for world-builders, writers, and RPG projects.

![Fantasy Theme](docs/screenshot-fantasy.png)

## Features

- Three event types: points, periods with drill-down sub-timelines, and undated events anchored between reference points
- Multiple calendar tracks with automatic timeline bounds derived from track ranges and epochs
- Unlimited zoom in, drag-to-pan, and zoom reset to the current timeline or sub-timeline limits
- Dense label handling with collision-aware hiding, `...` cues, and click-to-zoom cluster bubbles
- Optional visual placement for undated events via `placementYear`
- Timeline-level canonical tags with color, reused across events
- Colored tag chips in event cards and timeline labels
- Local editing in the browser for timelines, tracks, events, and tag definitions
- Fresh manifest loading so the timeline picker reflects deployed timelines
- Dual themes: Heroic Fantasy and Sci-Fi

## Quick start

The deployed app is served from the repository root. For local development:

```bash
cd frontend
npm install
npm start
```

For a production build:

```bash
cd frontend
GENERATE_SOURCEMAP=false npm run build
```

Then copy `frontend/build/` into the repo root (`index.html`, `static/`, and the root assets) for GitHub Pages.

## Data format

```jsonc
// data/manifest.json
{
  "timelines": [
    {
      "id": "my-world",
      "title": "My World",
      "description": "Short description",
      "url": "data/my-world.json",
      "defaultTheme": "fantasy"
    }
  ]
}

// data/my-world.json
{
  "timeline": {
    "title": "My World",
    "description": "Short description",
    "tagDefinitions": [
      { "id": "war", "label": "War", "color": "#8a0303" },
      { "id": "magic", "label": "Magic", "color": "#6b3a8c" }
    ]
  },
  "tracks": [
    {
      "id": "track-1",
      "name": "Imperial Calendar",
      "calendarName": "Imperial",
      "abbr": "IC",
      "epoch": 0,
      "startYear": 0,
      "endYear": 1200,
      "color": "#c9a84c"
    }
  ],
  "events": [
    { "id": "evt-1", "type": "point", "title": "Coronation", "trackId": "track-1", "date": { "year": 10 }, "tags": ["war"] },
    { "id": "evt-2", "type": "period", "title": "Northern Campaign", "trackId": "track-1", "startDate": { "year": 40 }, "endDate": { "year": 55 }, "tags": ["war"], "children": [] },
    { "id": "evt-3", "type": "undated", "title": "Lost Oath", "trackId": "track-1", "afterEvent": "evt-1", "beforeEvent": "evt-2", "tags": ["magic"] }
  ]
}
```

Notes:

- Event titles are capped at 40 characters in the UI.
- Event tags should reference timeline-level `tagDefinitions`.
- Unknown tags are removed automatically during editing/loading.
- For curated undated layouts, `placementYear` can be added to an undated event.

## License

MIT
