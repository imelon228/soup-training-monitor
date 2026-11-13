# Browser Performance Evidence Protocol

**Do not invent values.** The take-home requires Chrome DevTools Performance measurements with CPU throttling ×4 and tab memory at one million points. This repository does not generate authentic Chrome traces by itself.

## Environment record

Record the date, OS, browser version, CPU, RAM, screen/viewport size and build commit. Use the same device and browser for baseline and optimized captures.

## Scenarios

1. Open `/` and record the initial render / interaction readiness.
2. Open a standard run and capture the first chart render.
3. Open `/runs/run-020`, wait for the worker to finish generating 1,000,000 points, then capture chart render.
4. Capture a zoom gesture and a hover interaction on the Loss chart.
5. Record the browser tab's memory from Chrome Task Manager or the Memory panel.
6. Repeat each interaction at least three times; report the median and retain screenshots/trace files.

## CPU throttling ×4

Open Chrome DevTools → Performance. Enable CPU throttling and choose **4× slowdown**. Start a recording immediately before the action; stop after the interaction settles. Save the trace and a screenshot of the relevant timeline/summary.

## Before / after table

| Measurement | Baseline | Optimized | Notes |
|---|---:|---:|---|
| Overview first render | Not measured | Not measured | Same cold/warm cache policy |
| 1M run first chart render | Not measured | Not measured | Worker generation separated from chart render |
| Zoom response | Not measured | Not measured | Include interaction-to-paint |
| Hover response | Not measured | Not measured | Include interaction-to-paint |
| Tab memory at 1M points | Not measured | Not measured | Record after data generation and chart render |

## Evidence files

Place the unmodified Chrome trace (`.json` or `.trace`) and screenshots in this folder. Include a short note describing the capture steps and machine. Update `TECHNICAL_NOTE.md` only after collecting real values.
