# Technical Note вЂ” Soup Training Run Monitor

## Architecture

Client-side React + TypeScript + Vite SPA. The overview reads a deterministic 20-run manifest. Detailed series are generated on demand in a Web Worker; the million-point run uses four `Float64Array` buffers. Apache ECharts renders the three metrics with Canvas. There is no backend, cloud API, real GPU workload or live training telemetry.

## Data integrity contract

Before normalization, the data layer requires equal lengths for `step`, `loss`, `lr` and `gradNorm`, finite step coordinates, and a finite positive `expectedStepInterval`. Non-finite metric readings remain supported diagnostic values. They are never coerced to zero and are counted by metric and original source index.

Unsorted steps use a stable ordering view; the source arrays are not mutated. Duplicate observations remain separate records and scatter markers. A single null line break is inserted at the duplicate X coordinate; values are not averaged and no epsilon is added to the source step. Missing ranges produce a null visual break marker only; no metric observation is interpolated. The raw-issue table previews at most 50 rows and the CSV action exports all detected issue records.

## Chart truthfulness and downsampling

Charts use Canvas. ECharts built-in sampling is disabled by omitting its `sampling` option (the shared `lineSeries` policy keeps `smooth: false` and `connectNulls: false`); `connectNulls: false` and no smoothing are applied. The viewport-aware Min-Max reducer scans visible buckets and retains each bucket's finite minimum and maximum plus visible endpoints. It also carries all visible invalid and duplicate observations, gap boundaries and the known planted Loss spike. Source indices are retained for traceability. The one-million-point test run contains a deterministic spike at index `500,000` with Loss `7.25`; the spike is explicitly retained whenever its source step is in the current viewport.

Duplicate source indices are marked with a typed mask during a reduction pass, avoiding a nested linear search through every duplicate group for every source point. The X-axis and Y-axis are named. Axis ticks use compact labels with more precision than rounded whole-k/M labels; tooltips use the shortest decimal representation that round-trips to the original JavaScript number.

## Silent-failure controls

- Worker cancellation and `LatestRequestGate` prevent a stale request from replacing the current route selection.
- Timestamps are stored as UTC ISO strings and displayed using the viewer's current locale/time zone.
- There is no smoothing toggle and no Log Scale control. The charts remain linear; zero and negative values are not silently discarded or transformed.
- Integrity summaries, chart accessible summaries and downloadable raw issue records expose source-data caveats.

## Automated checks

The remaining Vitest suite contains **47 test cases across 10 files**. It includes 48 combinations of viewport width and zoom range around the one-million-point spike, per-bucket extrema retention, finite-only duplicate scatter coordinates, invalid-value handling for all metrics, duplicate and gap behaviour, source typed-array immutability, input shape validation, locale/time-zone formatting, worker resolution, abort and worker-error cleanup, plus a hook-level out-of-order response test. The project owner reported the earlier baseline as 22 tests passing across 6 files. The remaining 47-test suite must be run again; do not treat the earlier result as proof that the new tests passed. Three optional UI interaction tests (`aria-sort`, Ctrl/Cmd+K, and Enter/Space row activation) were removed from automated testing after repeated failures in the current test setup. Their functionality remains in the component but must be verified manually and disclosed as manual coverage.

## Accessibility and presentation

Dark and light chart palettes use theme-aware axis and tooltip colours. Static WCAG contrast calculations for the light-theme text/accent tokens against the sidebar background are at least 4.66:1; browser-level inspection at the target viewport sizes remains required. Chart data is also exposed through a structured accessible summary table.

## What tests do NOT catch

A unit test can confirm that the spike's source index survives reduction, but cannot guarantee human visibility at every display size or browser zoom. Formatter tests cannot prove visual readability. Unit tests do not cover every ECharts/browser/GPU rendering combination or every worker scheduling interleaving. Synthetic data cannot determine whether a real model should be stopped. Passing tests and a passing build are not substitutes for Chrome Performance traces and memory measurements.

## Performance evidence

The app emits User Timing measures `soup:worker:request-to-message` (worker setup, generation and transfer), `soup:zoom:event-to-next-paint` and `soup:hover:event-to-next-paint` (interaction-to-two-animation-frame proxies). Chrome DevTools Performance traces remain the authoritative evidence. CPU throttling Г—4, before/after render and interaction timings, and one-million-point tab memory must be captured on the project owner's device and saved under `docs/performance/`. Current browser evidence is **not measured**; see `docs/performance/README.md` and `docs/performance/measurement-log.md`.

## Verdict: DON'T SHIP (evidence gate)

The feature and data-integrity implementation is stronger, but a final `SHIP` verdict requires the expanded test suite to pass, a successful Vercel production build, responsive/accessibility inspection, and real browser Performance traces under Г—4 CPU throttling. Do not claim measured performance before those artifacts exist.

## Reflection

The difficult part is not drawing three lines; it is preserving the meaning of a line after reducing a million observations. A naive stride or average would make rendering cheaper but could hide an important event. The implementation therefore retains per-bucket extrema and explicit integrity events. The remaining uncertainty is browser-level performance and visual perception across devices, which require real traces and manual inspection.

## AI tool usage

ChatGPT assisted with project scaffolding, implementation, tests and documentation. The project owner should review the changes, run the complete test/build commands, inspect browser traces and be prepared to explain or modify the algorithm during the live discussion.
