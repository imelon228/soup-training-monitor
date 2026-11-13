# Soup · Training Run Monitor

A frontend take-home implementation for the Soup Frontend Engineer internship. It is a local, deterministic ML training monitor designed around one rule: **data truthfulness before chart smoothness**.

> This is an independent demo built for the take-home task. It is not an official Soup product and does not start real training or use a GPU.

## What is implemented

- React + TypeScript + Vite dashboard with Overview and Run Details routes.
- Exactly 20 deterministic synthetic runs, including invalid values, duplicate steps, unsorted steps, missing ranges and one 1,000,000-point run.
- The million-point run is generated lazily in a Web Worker using `Float64Array`; it contains a planted midpoint loss spike at source index `500,000`.
- Loss, learning-rate and gradient-norm charts use Apache ECharts Canvas rendering.
- Viewport-aware Min-Max downsampling keeps per-bucket extrema, visible integrity events and the known spike. The original arrays are not mutated.
- NaN and infinities are preserved in source data, counted as invalid and rendered as breaks rather than zeroes.
- Stable step sorting, duplicate-step grouping, gap detection, exact-value tooltips, zoom controls and raw issue-record inspection.
- Overview search, status filtering, sortable columns, loading/error states, responsive layout, light/dark toggle and keyboard-accessible table rows.
- Async request cancellation and a latest-request gate to prevent stale run data from replacing a newer selection.
- Unit tests for data normalization, metric calculations, spike preservation, data generation and asynchronous request ordering.

## Instant preview (no npm install)

Open `standalone-preview.html` directly in a modern browser. It is a self-contained canvas preview with the 20-run list, run detail view, local synthetic data, zoom controls and hover inspection. It is included as a no-install preview; the primary submission source is the React/Vite app under `src/`.

## Local development

Requirements: Node.js 20.19+ or 22.12+ recommended.

```bash
npm install
npm run dev
```

Vite prints the local URL (normally `http://localhost:5173`).

## Validation commands

```bash
npm test
npm run build
npm run preview
```

`npm run preview` serves the production build locally (normally `http://localhost:4173`).

## Vercel deployment

1. Create a GitHub repository and push this project.
2. Open [Vercel](https://vercel.com/) and choose **Add New → Project**.
3. Import the GitHub repository.
4. Use these settings:
   - Framework preset: **Vite**
   - Build command: `npm run build`
   - Output directory: `dist`
   - Install command: `npm install`
5. Deploy. `vercel.json` includes an SPA rewrite so direct visits to `/runs/run-020` resolve to `index.html`.
6. Open the production URL, visit `/runs/run-020`, wait for the worker to generate the one-million-point dataset and check the spike, zoom controls and raw data warnings.

### Vercel CLI alternative

```bash
npm install -g vercel
vercel
vercel --prod
```

## Data and correctness notes

- The generated records are synthetic and seeded; the values are not measurements from an actual training run.
- The `run-020` descriptor is shown in the Overview immediately, but its 1M-point arrays are created only when the detail page is opened. This avoids allocating a million-point dataset just to display the table.
- Min-Max downsampling is run against the visible viewport. The known spike index is explicitly retained whenever its source point is inside the viewport.
- The visualisation is a reduction of source points, not a rewrite of the source series. Tooltips and the issue-record table refer to original source indices and values.
- Duplicate step observations are not averaged or overwritten. The line is broken at duplicate groups and their values are shown separately.
- Gap detection uses each run's declared expected step interval; no missing observations are synthesized.

## Project structure

```text
src/
  components/     UI building blocks and ECharts chart
  data/           seeded run manifest, generator and worker-backed data service
  domain/         normalization, metrics, downsampling and request guard
  hooks/          async run loading hook
  pages/          overview and run detail screens
  workers/        large dataset generation worker
tests/            Vitest test suite
docs/             preserved take-home prompt and engineering notes
```

## Documentation

- `docs/ORIGINAL_PROMPT.txt` — preserved updated implementation prompt.
- `docs/TECHNICAL_NOTE.md` — concise architecture, integrity and decision note.
- `docs/TEST_RESULTS.md` — test results generated during implementation.
- `docs/performance/README.md` — repeatable Chrome DevTools ×4 performance measurement protocol.

## AI tool usage

ChatGPT was used to help translate the take-home specification into an implementation plan, scaffold the application, implement the core data and UI modules, and draft tests and documentation. The project owner should run the commands, review the implementation, inspect the traces and be ready to explain or change the algorithm during the live discussion. No claim is made that browser-level performance measurements were captured automatically by the code generator.
