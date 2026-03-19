# ChronoWeave — Technical Reference

> Authoritative implementation notes for the current app state.

---

## 1. Architecture overview

ChronoWeave is a static React app. The repository root is also the GitHub Pages deployment root.

```text
/                              ← deployed site root
  index.html
  static/js/main.js
  static/css/main.css
  data/
  docs/
  frontend/                    ← source app
    public/data/
    src/
      contexts/
      components/
      utils/
```

No backend. No database. Runtime persistence is browser `localStorage`.

---

## 2. Stack

- React 19
- Tailwind CSS 3.4
- Framer Motion 12
- Lucide React
- Create React App 5 with `react-app-rewired`
- Stable production filenames for GitHub Pages

---

## 3. Data model

### Manifest

```json
{
  "timelines": [
    {
      "id": "unique-slug",
      "title": "Display Name",
      "description": "Short description",
      "url": "data/file.json",
      "defaultTheme": "fantasy"
    }
  ]
}
```

### Timeline JSON

```json
{
  "timeline": {
    "title": "Display Name",
    "description": "Short description",
    "tagDefinitions": [
      { "id": "war", "label": "War", "color": "#8a0303" }
    ]
  },
  "tracks": [],
  "events": []
}
```

### Tracks

Tracks define the visible reference frame. Timeline limits are derived automatically from the minimum and maximum track ranges after applying each track epoch.

Required fields:

- `id`
- `name`
- `calendarName`
- `abbr`
- `epoch`
- `startYear`
- `endYear`
- `color`

### Events

Supported event types:

- `point`
- `period`
- `undated`

Shared fields:

- `id`
- `title`
- `description`
- `image`
- `tags`

#### Point event

```json
{
  "id": "evt-1",
  "type": "point",
  "trackId": "track-1",
  "title": "Event",
  "date": { "year": 100 },
  "tags": ["war"]
}
```

#### Period event

```json
{
  "id": "evt-2",
  "type": "period",
  "trackId": "track-1",
  "title": "Campaign",
  "startDate": { "year": 120 },
  "endDate": { "year": 150 },
  "children": []
}
```

#### Undated event

```json
{
  "id": "evt-3",
  "type": "undated",
  "trackId": "track-1",
  "title": "Rumor",
  "afterEvent": "evt-1",
  "beforeEvent": "evt-2",
  "tags": ["mystery"]
}
```

Undated behavior:

- `afterEvent = null` uses track/timeline start
- `beforeEvent = null` uses track/timeline end
- events sharing the same anchor pair are evenly spaced
- optional `placementYear` overrides anchor interpolation for rendering only

### Canonical tags

`timeline.tagDefinitions` is the canonical registry for tags.

```json
{
  "id": "war",
  "label": "War",
  "color": "#8a0303"
}
```

Rules:

- event tags store canonical ids
- unknown tags are pruned automatically on load and edit
- matching is normalized by id/label to clean older data such as `Join` vs `join`

---

## 4. Current UX behavior

- Unlimited zoom in, minimum zoom out floor only
- Zoom reset fits the active timeline or drilled-in period range
- Timeline selector always fetches a fresh manifest
- Dated events stay at their exact year; track content start is offset to leave room for labels
- Event titles are capped at 40 characters in create/edit flows
- Label layout is collision-aware and prefers earlier events when hiding later ones
- Hidden labels show `...`
- Nearby events cluster into count bubbles; clicking a cluster recenters and zooms enough to try splitting it
- Visible labels can show up to 3 colored tag chips plus overflow text
- Hidden labels can show tiny colored rectangular tag chips

---

## 5. Core rendering notes

### Ranges and zoom

- `masterRange` is derived from all tracks
- sub-timeline drill-in computes an `effectiveMasterRange`
- `pixelsPerYear = BASE_PX_PER_YEAR * zoom`
- track content starts after a left offset so labels do not force dated markers away from their true position

### Label handling

- titles are split into balanced lines without splitting words
- labels alternate above/below
- per-row collision detection hides later labels first
- hidden labels retain a visible cue via `...`

### Clustering

- nearby markers are grouped by pixel distance
- cluster click computes a centered zoom target based on spread and smallest gap

---

## 6. Persistence

- local events: `chronoweave_local_events_{timelineId}`
- local tracks: `chronoweave_local_tracks_{timelineId}`
- stale local timeline metadata is intentionally cleared so deployed manifest data stays authoritative

---

## 7. Key source files

- `frontend/src/contexts/TimelineContext.js` — data loading, derived bounds, local persistence, tag cleanup
- `frontend/src/components/TimelineView.js` — track rendering, labels, clusters, hidden cues, visible timeline tag chips
- `frontend/src/components/EventCard.js` — event detail and edit UI with canonical tag chips
- `frontend/src/components/AddEventForm.js` — event creation with canonical tag selection
- `frontend/src/components/EditTimelineForm.js` — timeline settings
- `frontend/src/components/EditTagDefinitionsForm.js` — timeline-level tag registry editor
- `frontend/src/utils/timelineUtils.js` — range math, placement helpers, tag normalization/resolution

---

## 8. Build and deploy

Local build:

```bash
cd frontend
npm ci
GENERATE_SOURCEMAP=false npm run build
```

Deploy sync to repo root:

```bash
rm -rf static
cp -R frontend/build/static ./static
cp frontend/build/index.html ./index.html
cp frontend/build/asset-manifest.json ./asset-manifest.json
cp frontend/build/favicon.ico ./favicon.ico
cp frontend/build/manifest.json ./manifest.json
cp frontend/build/robots.txt ./robots.txt
```

GitHub Pages serves the repository root.

---

## 9. GitHub Action

Workflow: `.github/workflows/build-sync.yml`

What it does:

- runs on pushes to `main` affecting frontend/docs/workflow files
- installs frontend dependencies with `npm ci`
- builds with `GENERATE_SOURCEMAP=false npm run build`
- replaces root deployment assets from `frontend/build/`
- commits regenerated assets back to `main` when they changed

Status check:

- the workflow matches the current npm-based build flow
- it disables source maps, which matches the documented deploy state
- it copies the correct root assets and `static/` directory
- the `github.actor != 'github-actions[bot]'` guard prevents commit loops

---

## 10. Current limitations

- year-level positioning only; month/day are reserved
- no mobile-first interaction model yet
- no tag filtering/search yet
- no UI for editing `placementYear`
