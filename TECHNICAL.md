# ChronoWeave — Technical Reference

> This document is the authoritative reference for any future development on this project.  
> Read it fully before making changes.

---

## 1. Architecture overview

ChronoWeave is a **pure static frontend app** — no backend, no database.

```
frontend/                  ← React 19 app (Create React App + react-app-rewired)
  public/
    data/
      manifest.json        ← registry of available timelines
      ages-of-eldoria.json ← sample fantasy timeline
      galactic-chronicles.json ← sample sci-fi timeline
    index.html
  src/
    contexts/
      ThemeContext.js       ← theme state (fantasy | scifi), provides toggle
      TimelineContext.js    ← timeline data, local events, zoom, expansion state
    components/
      TimelineView.js      ← main timeline renderer (axis, markers, period bars, click-to-add)
      EventCard.js         ← expanded event detail card
      SubTimeline.js       ← inline sub-timeline for period events
      AddEventForm.js      ← modal form for adding events
      ThemeSwitcher.js     ← top-right toggle button
      TimelinePicker.js    ← top-left dropdown to switch timelines
      ZoomControls.js      ← bottom-right +/−/reset
      JsonDownloadButton.js← bottom-left, visible when local events exist
    utils/
      timelineUtils.js     ← positioning math, year formatting, tag colors
    App.js                 ← root: providers → AppContent
    index.js               ← entry point
    index.css              ← Tailwind directives, theme globals, animations
  config-overrides.js      ← webpack overrides for stable filenames
  tailwind.config.js
  postcss.config.js

build/                     ← production output (committed, ready for GitHub Pages)
  index.html
  static/
    js/main.js
    css/main.css
  data/                    ← copies of public/data/
```

The `backend/` folder contains a minimal FastAPI health-check endpoint used only for the Emergent preview environment. It is **not** part of the production app.

---

## 2. Tech stack

| Layer       | Technology                | Version   | Purpose                         |
|-------------|---------------------------|-----------|---------------------------------|
| UI          | React                     | 19        | Component framework             |
| Styling     | Tailwind CSS              | 3.4       | Utility-first CSS               |
| Animation   | Framer Motion             | 12        | Card expansion, sub-timeline    |
| Icons       | Lucide React              | 0.577     | UI icons                        |
| Build       | Create React App          | 5         | Toolchain                       |
| Build tweak | react-app-rewired         | 2.2       | Stable output filenames         |
| Fonts       | Google Fonts              | —         | Cormorant Garamond, Lato, Orbitron, Rajdhani |

No runtime backend. No database. All persistence is browser `localStorage`.

---

## 3. Data model

### manifest.json

```json
{
  "timelines": [
    {
      "id": "unique-slug",
      "title": "Display Name",
      "description": "Short description",
      "url": "data/filename.json",
      "defaultTheme": "fantasy" | "scifi"
    }
  ]
}
```

### Timeline JSON

```json
{
  "timeline": {
    "title": "Display Name",
    "startYear": -3000,
    "endYear": 1500
  },
  "events": [ ... ]
}
```

### Event types

**Point** — exact date:
```json
{
  "id": "evt-unique",
  "type": "point",
  "title": "Event Name",
  "date": { "year": -1200, "month": 3, "day": 15 },
  "description": "Long text",
  "image": "https://url-or-null",
  "tags": ["tag1", "tag2"]
}
```
Only `year` is required; `month` and `day` are optional (unused in positioning today, reserved for future zoom levels).

**Period** — date range, with optional sub-events:
```json
{
  "id": "evt-unique",
  "type": "period",
  "title": "Event Name",
  "startDate": { "year": -1800 },
  "endDate": { "year": -1650 },
  "description": "...",
  "image": "https://...",
  "tags": ["war"],
  "children": [
    { "id": "sub-1", "type": "point", "title": "...", "date": { "year": -1780 }, ... }
  ]
}
```
Children appear in the inline sub-timeline when the period bar is clicked.

**Undated** — positioned between anchor events:
```json
{
  "id": "evt-unique",
  "type": "undated",
  "title": "Event Name",
  "afterEvent": "evt-id-or-null",
  "beforeEvent": "evt-id-or-null",
  "description": "...",
  "image": null,
  "tags": ["mystery"]
}
```
- If `afterEvent` is `null`, the timeline start is used as anchor.
- If `beforeEvent` is `null`, the timeline end is used as anchor.
- Multiple undated events sharing the same anchors are evenly spaced.
- Undated events render with a dashed/fuzzy marker style.

---

## 4. Design system — dual themes

The app has two fully independent visual themes. Theme state lives in `ThemeContext`. Every themed component reads `theme` from context and switches classes.

| Property         | Fantasy                                | Sci-Fi                                 |
|------------------|----------------------------------------|----------------------------------------|
| Background       | `#f4e4bc` (parchment)                  | `#050510` (void)                       |
| Text             | `#2c1810` (dark brown)                 | `#e0e0ff` (pale blue)                  |
| Accent           | `#8a0303` (blood red)                  | `#00f3ff` (cyan neon)                  |
| Border           | `#d4af37` (gold), double style         | `#0066cc` (blue), solid + glow         |
| Heading font     | Cormorant Garamond (serif)             | Orbitron (geometric sans)              |
| Body font        | Lato (sans)                            | Rajdhani (angular sans)                |
| Markers          | Rounded circles                        | Rotated 45° diamonds                   |
| Card style       | Sepia, ornate double borders           | Glass-morphism, backdrop blur, glow    |
| Scrollbar        | Amber-brown thumb                      | Cyan glowing thumb                     |

Fonts are loaded from Google Fonts via `@import` in `index.css`. All theme colors are defined in `tailwind.config.js` under `theme.extend.colors.fantasy` / `theme.extend.colors.scifi`.

---

## 5. Core algorithms

### Event positioning (`utils/timelineUtils.js`)

`resolveEventPositions(events, timelineMeta, pixelsPerYear)` → `{ positions, totalWidth }`

1. **Dated events** (point + period): `x = (year - startYear) * pixelsPerYear`
2. **Undated events**: grouped by anchor pair, then evenly spaced between the anchor positions (or timeline bounds if anchor is null).

### Zoom

- `pixelsPerYear = BASE_PX_PER_YEAR * zoom` (base = 0.8)
- Zoom range: 0.1× – 10×
- Changed via Ctrl+Scroll (wheel event), or zoom buttons

### Year markers

Auto-calculated step sizes based on zoom level to avoid crowding: 500 → 200 → 100 → 50 years.

### Alternating placement

Events are sorted by x-position, then assigned `above: index % 2 === 0` for visual alternation.

---

## 6. Local events & persistence

- Added via click-on-timeline → form.
- Stored in `localStorage` under key `chronoweave_local_events_{timelineId}`.
- Merged with JSON-loaded events in `TimelineContext.allEvents`.
- Marked with `isLocal: true` — shown with a "Local event" badge and a delete button.
- Downloadable as JSON via the export button (bottom-left, visible only when local events exist).

---

## 7. Development workflow

### Prerequisites

- Node.js ≥ 18
- Yarn 1.x

### Install & run (dev mode)

```bash
cd frontend
yarn install
yarn start          # → http://localhost:3000
```

Hot-reload is active. Edit any file under `src/` and see changes instantly.

### Build for production

```bash
cd frontend
GENERATE_SOURCEMAP=false yarn build
```

Output: `frontend/build/` — a self-contained static site.

The build uses `react-app-rewired` with `config-overrides.js` to produce **stable filenames** (`main.js`, `main.css`, no content hashes). This means the output filenames are deterministic and diff-friendly in version control.

### Deploy to GitHub Pages

1. Build as above.
2. Copy the contents of `frontend/build/` into your repository root (or a `docs/` folder).
3. Enable GitHub Pages on that folder.
4. The `homepage: "."` setting in `package.json` ensures all asset paths are relative.

Alternatively, use a `gh-pages` branch:
```bash
# from repo root
cp -r frontend/build/* .
git add -A && git commit -m "deploy" && git push
```

### Adding a new timeline

1. Create `frontend/public/data/my-timeline.json` following the data model above.
2. Add an entry to `frontend/public/data/manifest.json`.
3. Rebuild (or, for GitHub Pages, also copy the new JSON into `build/data/`).

---

## 8. File-by-file reference

| File | Responsibility | Key exports |
|------|---------------|-------------|
| `contexts/ThemeContext.js` | Theme state + toggle | `ThemeProvider`, `useTheme` |
| `contexts/TimelineContext.js` | All timeline state: data loading, local events, zoom, expansion | `TimelineProvider`, `useTimeline` |
| `components/TimelineView.js` | Main renderer: axis, year markers, event markers, period bars, drag-scroll, click-to-add | default export |
| `components/EventCard.js` | Expanded event detail card (image, description, tags, close, delete) | default export |
| `components/SubTimeline.js` | Inline sub-timeline for period events | default export |
| `components/AddEventForm.js` | Modal form: title, type, dates, description, image, tags | default export |
| `components/ThemeSwitcher.js` | Top-right toggle button | default export |
| `components/TimelinePicker.js` | Top-left dropdown to switch timelines | default export |
| `components/ZoomControls.js` | Bottom-right zoom buttons | default export |
| `components/JsonDownloadButton.js` | Bottom-left download button (conditional) | default export |
| `utils/timelineUtils.js` | Positioning math, year formatting, tag color mapping | `resolveEventPositions`, `getPeriodBarDimensions`, `positionToYear`, `formatYear`, `getTagColor` |
| `config-overrides.js` | Webpack override: stable filenames | module.exports |

---

## 9. Known limitations & future work

- **Month/day precision**: the data model supports month and day, but positioning currently uses year only. Higher precision can be added at a future zoom threshold.
- **No mobile optimization**: drag-to-scroll works but there's no pinch-to-zoom or responsive layout for narrow screens yet.
- **No search/filter**: planned as tag-based filtering.
- **No import**: users can export local events as JSON but cannot import a JSON file back via the UI.
- **Sub-timelines are one level deep**: nested period-within-period is not supported.

---

## 10. Testing

All interactive elements carry `data-testid` attributes for automated testing:

- `timeline-axis`, `timeline-title`
- `event-marker-{id}`, `event-card-{id}`, `close-event-card-{id}`, `delete-event-{id}`
- `period-bar-{id}`, `sub-timeline-{id}`, `sub-event-marker-{id}`
- `theme-toggle`, `timeline-picker`, `timeline-picker-button`, `timeline-option-{id}`
- `zoom-in-btn`, `zoom-out-btn`, `zoom-reset-btn`, `zoom-controls`
- `add-event-overlay`, `add-event-form`, `submit-event-btn`, `close-add-form`
- `event-title-input`, `event-year-input`, `event-type-{type}`, `event-description-input`, etc.
- `json-download-btn`, `tag-{tagname}`
