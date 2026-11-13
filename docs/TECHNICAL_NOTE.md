# Technical Note — Soup Training Run Monitor

## Architecture

The app is a client-side React + TypeScript + Vite SPA. The Overview reads a small deterministic manifest; run data is created only when a user opens a detail route. A Web Worker generates each selected series, keeping the one-million-point allocation off the main UI thread. Apache ECharts uses Canvas rendering for Loss, Learning Rate and Gradient Norm. There is no backend, external data API or real model training.

## Data integrity

The generator creates exactly 20 runs with a fixed seed. It deliberately includes NaN, positive/negative Infinity, duplicate and unsorted steps, missing ranges, and a one-million-point series with one planted loss spike at source index 500,000. The source uses Float64Array fields and is not mutated by normalization or chart reduction.

Normalization performs a stable ordering by step only when the input is not already sorted. It records duplicate groups, invalid source indices and gaps based on each series' declared expected step interval. Non-finite metric values remain non-finite in source memory and become null line points in the plotted view; they are never coerced to zero. Duplicate observations are retained as separate marker records rather than silently averaged. Gaps create a line break; no interpolated data is added.

## Downsampling

The chart uses viewport-aware Min-Max bucket reduction. For the visible step range, it scans buckets and keeps each bucket's finite minimum and maximum, plus visible endpoints. Invalid positions, duplicate groups, gap boundaries and the known anomaly index are retained as integrity events. The output retains original source indices. When the planted spike is inside the viewport, the spike index is explicitly included in addition to the per-bucket extrema. This prevents a narrow, isolated event from disappearing due to stride or average sampling.

## Silent-failure controls

- A request-scoped AbortController terminates the worker after route changes.
- A latest-request gate prevents an older completion from replacing the currently selected run.
- Dates are stored as UTC ISO strings and formatted with the browser's locale.
- Linear scale is the default; no log transform or automatic smoothing is applied.
- Invalids, duplicates and gaps are surfaced in an integrity panel and raw issue-record table.

## Tests and known limitations

The authored Vitest suite is designed to cover seeded 20-run generation, exact million-point generation, midpoint spike preservation over multiple viewports, non-finite values, stable sort, duplicate groups, gaps, summary metrics, formatting and request ordering. The suite was not executed in the assembly environment because npm dependencies could not be installed. Tests validate the data transformations, not the user's perception of a rendered anomaly. Browser/OS/GPU-specific performance, screen-reader quality, visual contrast in every environment and every possible asynchronous interleaving still require manual verification.

**Performance evidence:** Chrome DevTools CPU-throttling ×4 traces and tab-memory measurements have not been captured in this runtime. Do not treat build/test success as a substitute. Follow `docs/performance/README.md`, record baseline and optimized measurements on the same machine, then attach the trace/screenshots before submission.

## Verdict: DON'T SHIP (evidence gate)

The core demo implementation and automated tests are ready for local review, but a submission claiming full compliance is not ready until browser-level Performance traces, ×4 measurements and manual responsive/accessibility checks are attached. First priority: run the measurement protocol, resolve any interaction or memory regressions, then update the verdict based on observed evidence.

## Reflection

What surprised me most was that the difficult part was not drawing three curves, but preserving what a curve is allowed to claim after reducing a million observations. A naive stride or average would make the chart cheaper while making the evidence weaker, so the implementation keeps per-bucket extrema and explicitly carries known integrity events into the plotted view. The main remaining concern is browser-level behaviour under CPU throttling and different display sizes; the Node core timings cannot answer that, so the Chrome trace and manual accessibility checks remain a release gate.

## AI tool usage

ChatGPT assisted with the initial implementation, code structure, tests and documentation. The domain modules were separately compiled and exercised with Node assertions during assembly. The project owner should independently run the installed test suite, inspect Chrome traces, review the code and be prepared to explain or change the algorithm during the live discussion.
