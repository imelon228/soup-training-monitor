# Submission Release Checklist

Do not mark a box complete until it has been performed against the deployed build.

## Build and CI

- [ ] `npm ci` succeeds from the committed lockfile.
- [ ] `npm run lint` completes without errors.
- [ ] `npm test` completes; attach the actual Vitest output.
- [ ] `npm run build` completes successfully.
- [ ] Vercel deployment uses the intended commit SHA and status `Ready`.
- [ ] Direct navigation and refresh both work for `/` and `/runs/run-020`.

## Data truthfulness

- [ ] Exactly 20 deterministic run descriptors are visible.
- [ ] `run-020` contains exactly 1,000,000 source observations.
- [ ] Loss spike at source index 500,000 is visible in the full range.
- [ ] The spike remains visible after zooming at desktop and mobile widths.
- [ ] NaN and +/-Infinity are never displayed as zero.
- [ ] Invalid observations are represented as breaks and remain inspectable in the raw issue export.
- [ ] Duplicate values remain separate and are not averaged or overwritten.
- [ ] Unsorted data is plotted in stable step order with source indices retained.
- [ ] Gaps are not interpolated; break markers are not treated as source observations.
- [ ] Tooltip values round-trip to the original metric value.
- [ ] Axis labels include metric and step labels with adequate precision.
- [ ] Source arrays remain unchanged after normalization and chart reduction.

## Silent failures

- [ ] Rapidly switch between two runs and confirm stale responses cannot replace the selected run.
- [ ] Navigate away during worker generation and confirm the worker is terminated.
- [ ] Confirm worker failures surface an error state and do not leave an active worker behind.
- [ ] Check timestamps in at least two time zones and one alternate locale.
- [ ] Confirm smoothing is not applied and ECharts sampling is disabled.
- [ ] Confirm no Log Scale control is exposed; the chart remains linear for zero/negative values.
- [ ] Confirm issue counts and CSV export include all detected records (the on-screen table preview is capped at 50 rows).

## Performance

- [ ] Record a baseline Performance trace with CPU throttling ×4 before applying the optimized deployment.
- [ ] Record an optimized Performance trace under the same conditions.
- [ ] Measure first render, standard run render, 1M run render, zoom, hover and tab memory.
- [ ] Report median of at least three runs per interaction.
- [ ] Save the raw traces and memory screenshots under `docs/performance/`.

## Accessibility and responsive UX

- [ ] Skip-to-content link works with keyboard.
- [ ] Sortable table headers announce `aria-sort`.
- [ ] Run rows open with Enter and Space.
- [ ] Search shortcut Ctrl/Cmd+K focuses the search box.
- [ ] Chart has an accessible summary table.
- [ ] All controls have accessible names and visible focus.
- [ ] Reduced-motion preference disables nonessential shimmer/transition animation.
- [ ] Verify 1440px, 1024px, 768px, 390px and 320px widths without horizontal page overflow.
- [ ] Manually inspect contrast in dark and light themes.

## Final evidence

- [ ] `docs/TEST_RESULTS.md` contains the actual latest test and build output.
- [ ] `docs/performance/measurement-log.md` contains real measurements and environment details.
- [ ] `docs/TECHNICAL_NOTE.md` is no more than two pages and reflects the actual implementation.
- [ ] The section “What tests do NOT catch” is included.
- [ ] Final verdict is evidence-based: SHIP only if all release-critical checks pass.
