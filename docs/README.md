# ChronoWeave — Timeline Visualizer

A visual, interactive timeline for world-builders, writers, and RPG enthusiasts.

Load your events from a simple JSON file, explore them on a horizontal scrollable timeline, and switch between a **Heroic Fantasy** and a **Sci-Fi** theme.

![Fantasy Theme](docs/screenshot-fantasy.png)

## Features

- **Three event types** — point events (exact date), period events (date range with expandable sub-timeline), and undated events (fuzzy placement between known events)
- **Expandable cards** — click any marker to reveal full details, images, and colored tags
- **Sub-timeline drill-down** — period events expand an inline sub-timeline below the main axis
- **Add events on-the-fly** — click on the timeline, fill the form; new events live in your browser and are downloadable as JSON
- **Multiple timelines** — switch between timelines from a manifest; each can have its own default theme
- **Zoom & scroll** — Ctrl+Scroll to zoom, drag to pan
- **Dual themes** — parchment & serif for fantasy, dark neon for sci-fi

## Quick start

Open `build/index.html` in a browser, or serve the `build/` folder with any static server.

To add your own timeline, create a JSON file in `build/data/`, then register it in `build/data/manifest.json`.

## Data format

```jsonc
// data/manifest.json
{
  "timelines": [
    { "id": "my-world", "title": "My World", "url": "data/my-world.json", "defaultTheme": "fantasy" }
  ]
}

// data/my-world.json
{
  "timeline": { "title": "My World", "startYear": -500, "endYear": 2000 },
  "events": [
    { "id": "evt-1", "type": "point",   "title": "...", "date": { "year": 100 }, "description": "...", "image": "https://...", "tags": ["war"] },
    { "id": "evt-2", "type": "period",  "title": "...", "startDate": { "year": 200 }, "endDate": { "year": 400 }, "children": [ /* sub-events */ ] },
    { "id": "evt-3", "type": "undated", "title": "...", "afterEvent": "evt-1", "beforeEvent": "evt-2", "description": "..." }
  ]
}
```

## License

MIT
