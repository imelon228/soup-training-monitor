# Data Truthfulness вЂ” Verification Matrix

This document maps the Soup take-home requirements to implementation behaviour and automated checks.

## Source invariants

- `step`, `loss`, `lr` and `gradNorm` arrays must have identical lengths.
- Every step coordinate must be finite. Viewport boundaries, pixel width and points-per-pixel settings must also be finite and valid. A non-finite X coordinate is rejected because no honest position on the X axis can be assigned.
- `expectedStepInterval` must be finite and greater than zero. The gap detector does not guess an interval when the declared interval is invalid.
- Non-finite metric observations (`NaN`, `+Infinity`, `-Infinity`) are valid diagnostic input. They remain unchanged in the source arrays and are reported by metric and source index.

Implementation: `src/domain/normalizeData.ts`.

## Rendering rules

- ECharts built-in sampling is disabled by omitting its `sampling` option (the shared `lineSeries` policy keeps `smooth: false` and `connectNulls: false`). The chart uses `connectNulls: false` and no smoothing. Values are not averaged or interpolated.
- Min-Max reduction keeps the finite minimum and maximum in each visible bucket, plus the first and last visible source observations.
- The known planted Loss spike is explicitly retained while its source step is in the visible viewport. It is marked as a known synthetic anomaly, not represented as a real training diagnosis.
- Invalid metric values are represented by null line breaks and integrity indicators, never by zero.
- Duplicate-step observations are excluded from the continuous line, retained as separate scatter observations when their Y values are finite, and listed with original source indices. Non-finite duplicate observations remain in diagnostic records and tooltips but are not passed to ECharts as invalid scatter coordinates. One null break is inserted at the duplicate X coordinate; no epsilon is added to or substituted for the source step.
- A missing range creates a null visual break marker. The marker has no metric value and is not included in summaries. No source row is synthesized.
- The original typed arrays are never mutated by normalization or downsampling.

Implementation: `src/domain/downsampling.ts` and `src/components/MetricChart.tsx`.

## Required automated checks

| Requirement | Automated check |
|---|---|
| 1M source points and midpoint spike | `tests/generateRuns.test.ts` |
| Spike in full view and multiple zoom widths / viewport widths | `tests/dataTruthfulness.test.ts` |
| Per-bucket minima and maxima retained | `tests/dataTruthfulness.test.ts` |
| NaN and infinities remain non-finite, never zero | `tests/normalizeData.test.ts`, `tests/downsampling.test.ts`, `tests/dataTruthfulness.test.ts` |
| Invalid values remain visible for each metric | `tests/dataTruthfulness.test.ts` |
| Duplicate source rows retained without artificial X epsilon | `tests/dataTruthfulness.test.ts` |
| Unsorted points plotted by step with source index preserved | `tests/dataTruthfulness.test.ts` |
| Gaps are visual breaks, not interpolated measurements | `tests/dataTruthfulness.test.ts` |
| Misaligned arrays, non-finite steps, invalid intervals, invalid viewports and invalid pixel settings are rejected | `tests/dataTruthfulness.test.ts` |
| Normalization and all metric reductions leave each source typed array unchanged | `tests/dataTruthfulness.test.ts`, `tests/normalizeData.test.ts` |
| Tooltip values round-trip to the same JS number | `tests/formatters.test.ts` |
| ECharts policy disables smoothing, sampling and connect-across-null; linear axes stay enabled | `tests/chartPolicy.test.ts` |
| Each metric has explicit X/Y axis names | `tests/chartPolicy.test.ts` |
| Compact axis labels retain useful precision | `tests/formatters.test.ts` |
| Explicit timezone formatting | `tests/formatters.test.ts` |

| Worker request success, abort and error cleanup | `tests/mockDataService.test.ts` |
| Late response from a previous run cannot overwrite the selected run | `tests/useRunDetails.test.tsx` |
| Non-finite duplicate values remain diagnosable but are excluded from chart scatter coordinates | `tests/chartPolicy.test.ts` |

## Theme and accessibility notes

Axis labels and tooltip surfaces adapt to the selected theme. Light-theme text/accent tokens have static contrast calculations of at least 4.66:1 against the sidebar background; visual confirmation at actual font sizes and display conditions is still a manual release check. Chart summaries are available as semantic tables for keyboard and assistive-technology users.

## What the tests do NOT catch

- A unit test can prove that a source spike is retained in the reduced array; it cannot guarantee that a human notices the spike on every display, at every zoom gesture, or under every theme.
- A formatter test can prove numeric round-tripping; it cannot prove that axis labels are readable at the actual browser font size or on a narrow phone screen.
- Unit tests do not prove ECharts paints every null break as intended in every browser/GPU combination. The browser view and saved Performance trace must be inspected.
- Tests of a request gate cover the ordering invariant but not every possible browser scheduling, tab suspension, worker crash or navigation sequence. The integration behaviour must be exercised in the deployed app.
- Synthetic data can test the mechanics of outlier preservation but cannot establish that a real model should be stopped. The UI is decision support, not an automated training verdict.
- A passing build does not measure load, zoom, hover or memory performance.

## Manual visual acceptance

Open `/runs/run-020` in the production deployment. Confirm the Loss spike is visibly marked in the full range, zoom into it at several widths, then zoom away and reset. Open the accessible data summary and the raw issue export. Confirm tooltips show the exact original value and source index. Repeat in dark and light themes and at a mobile viewport.
