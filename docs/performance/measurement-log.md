# Performance Measurement Log

Do not fill this with estimates. Capture real results from the same machine and browser.

## Environment

- Date:
- Deployment commit (baseline):
- Deployment commit (optimized):
- OS / device:
- CPU / RAM:
- Browser + version:
- Viewport / DPR:
- CPU throttling: 4× slowdown
- Cache policy:

## Measurements

| Metric | Baseline median | Optimized median | Unit | Evidence file |
|---|---:|---:|---|---|
| Overview first usable render | Not measured | Not measured | ms | |
| Standard run first chart render | Not measured | Not measured | ms | |
| 1M run worker generation + chart render | Not measured | Not measured | ms | |
| Zoom event-to-next-paint | Not measured | Not measured | ms | |
| Hover event-to-next-paint | Not measured | Not measured | ms | |
| Tab memory after 1M chart render | Not measured | Not measured | MB | |
| Tab memory after returning to Overview | Not measured | Not measured | MB | |

## Capture notes

- Use at least three repeated interactions and report the median.
- Keep worker generation time separate from chart rendering time where possible.
- Save unmodified DevTools `.trace` / `.json` files and memory screenshots in this folder.
- User Timing measures emitted by the app are interaction-to-two-animation-frame proxies. Use the Chrome Performance trace to inspect actual main-thread work and frame timing.
