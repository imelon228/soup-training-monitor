# Browser Performance Evidence Protocol

This is the evidence required by the Soup take-home. **Do not invent values or treat Node timings as browser measurements.**

## Capture conditions

Record:

- Date and deployment commit SHA.
- OS and device model.
- Browser name and exact version.
- CPU and RAM.
- Viewport size and device pixel ratio.
- Cache policy (cold or warm); use the same policy for baseline and optimized runs.
- Chrome DevTools CPU throttling set to **4× slowdown**.

Use the same machine, browser, viewport, test data and throttling for both the baseline and optimized capture. Capture the current deployed version as the **baseline before deploying this patch**. Then deploy the optimized patch and repeat the same procedure.

## Scenarios

1. Open `/` in a new tab. In DevTools → Performance, start recording, reload, wait for the overview to settle, then stop. Record navigation-to-first-usable-render and retain the trace.
2. Open a standard run (for example `/runs/run-003`). Record from navigation until all three charts are visible and interactive.
3. Open `/runs/run-020`. The app emits `soup:worker:request-to-message` for worker creation, data generation and transfer. Record that interval separately from the chart paint time in the trace; the User Timing mark is a proxy, not a complete render measurement.
4. On Loss, perform the same zoom-in and zoom-out gesture three times. Record the interaction-to-next-paint measurement. The app emits User Timing entries named `soup:zoom:event-to-next-paint`.
5. Move the pointer over the Loss chart at a steady pace. The app emits throttled User Timing entries named `soup:hover:event-to-next-paint`. Use the Performance trace to inspect actual pointer and paint work; treat the User Timing duration as a repeatable proxy, not a substitute for visual verification.
6. Open Chrome Task Manager (`Shift+Esc`) and record the tab's memory after the million-point worker has completed and the charts are visible. Also note memory after navigating back to `/`.
7. Repeat each interaction at least three times and report the median. Keep screenshots and unmodified `.json`/`.trace` files.

## User Timing entries

After interacting with charts, inspect the Performance panel's User Timing track. Or run this in the browser console:

```js
performance.getEntriesByType('measure')
  .filter((entry) => entry.name.startsWith('soup:'))
  .map(({ name, duration }) => ({ name, durationMs: Number(duration.toFixed(2)) }));
```

These measures are event-to-two-animation-frame proxies. Chrome Performance traces remain the authoritative evidence for main-thread work and frame timing.

## Before / after table

Fill this table with actual observations from the same environment. `Not measured` is preferable to a fabricated number.

| Measurement | Baseline deployment | Optimized deployment | Evidence file |
|---|---:|---:|---|
| Overview first usable render | Not measured | Not measured | |
| Standard run first chart render | Not measured | Not measured | |
| 1M run generation + chart render | Not measured | Not measured | |
| Zoom event-to-next-paint (median, ×4) | Not measured | Not measured | |
| Hover event-to-next-paint (median, ×4) | Not measured | Not measured | |
| Tab memory after 1M render | Not measured | Not measured | |
| Tab memory after returning to Overview | Not measured | Not measured | |

## Evidence files

Save files in this directory using names such as:

- `baseline-overview.trace`
- `baseline-million-run.trace`
- `optimized-overview.trace`
- `optimized-million-run.trace`
- `memory-baseline.png`
- `memory-optimized.png`
- `measurement-log.md`

Do not edit the raw trace files. Add a short note describing the capture machine and actions.
