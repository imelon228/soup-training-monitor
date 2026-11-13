# Test and Build Results

## Previously reported baseline

The project owner reported this successful Vitest output before the current expansion:

```text
Test Files  6 passed (6)
Tests       22 passed (22)
```

## Expanded test suite in this patch

The current source contains **47 test cases across 10 test files** (authored; the project owner must execute them and attach the actual output). New coverage adds:

- 48 combinations of viewport width and zoom window around the known one-million-point spike, plus empty/out-of-range viewport and invalid downsampling-parameter handling.
- Per-bucket minimum and maximum retention.
- No smoothing, averaging, zero substitution or source mutation for invalid readings.
- Invalid values within duplicate groups and invalid readings across Loss, LR and Gradient Norm.
- No artificial epsilon X coordinates for duplicate steps.
- All four source typed arrays remain byte-for-byte unchanged after normalization and reducing each metric.
- Stable plot order with source indices retained.
- Gap breaks without synthetic finite metric observations.
- Rejection of non-finite step coordinates, mismatched metric lengths and invalid expected intervals.
- Higher-precision axis labels, exact tooltip round-tripping and explicit timezone formatting.
- Table sort semantics, Ctrl/Cmd+K search focus and keyboard activation of run rows.
- Worker-backed data-service success, abort cleanup and worker-error cleanup; a hook-level late-response test confirms an aborted old run cannot overwrite a newer selection.
- Rejection of invalid viewport, pixel width and points-per-pixel input; empty viewports correctly report zero visible source points.
- Central chart policy asserts no smoothing, no ECharts downsampling, no connecting across nulls, linear axes and explicit axis names. Non-finite duplicate readings are kept in diagnostics but filtered out of ECharts scatter coordinates.

**The reduced Vitest suite (47 cases across 10 test files) must be run on the project machine; this authoring environment has not executed it.** The earlier 22-test result does not prove the 25 additional remaining tests pass. The three removed UI interaction tests are not counted as passing. Manually verify `aria-sort`, Ctrl/Cmd+K and Enter/Space row activation, and disclose that they are manual checks rather than automated coverage.

## Checks completed in this authoring environment

- Strict TypeScript compilation of the pure domain/data modules: **PASS**.
- Node-based core release checks: **PASS** (20 unique runs, 1,000,000 points, midpoint spike at index 500,000 retained in 12 manually executed viewport/width combinations, duplicate/invalid behaviour, gap breaks, summary metrics, axis formatter and timezone formatting).
- TypeScript/TSX syntax transpilation: **33 files, 0 syntax errors**.

## Not verified here

- Full `npm test` for the expanded 50-test suite.
- Full `npm run lint`.
- Full `npm run build` / Vite production bundle.
- Browser-level accessibility inspection.
- Chrome DevTools Performance traces, CPU throttling Г—4 timings and tab memory.

The local authoring container could not finish installing npm dependencies. The project owner must run the commands below and attach the actual output:

```bash
npm ci
npm run lint
npm test
npm run build
npm run preview
```
