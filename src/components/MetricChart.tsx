import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import { AlertTriangle, Minus, Plus, RotateCcw } from 'lucide-react';
import { downsampleMetric } from '../domain/downsampling';
import { formatAxisTick, formatTooltipValue } from '../domain/formatters';
import { buildFiniteDuplicateScatterData, CHART_AXIS_NAMES, CHART_INTEGRITY_POLICY } from '../domain/chartPolicy';
import type { MetricKey, NormalizedSeries, TrainingSeries } from '../domain/types';

const META: Record<MetricKey, { title: string; subtitle: string; color: string }> = {
  loss: { title: 'Loss', subtitle: 'Objective function · lower is generally better', color: '#f47b48' },
  lr: { title: 'Learning rate', subtitle: 'Optimizer step size · scheduler behaviour', color: '#77b7e8' },
  gradNorm: { title: 'Gradient norm', subtitle: 'Gradient magnitude · optimization stability', color: '#9acb87' },
};

const LIGHT_META: Record<MetricKey, { title: string; subtitle: string; color: string }> = {
  loss: { ...META.loss, color: '#a3401d' },
  lr: { ...META.lr, color: '#2d6991' },
  gradNorm: { ...META.gradNorm, color: '#28683b' },
};

const DARK_CHART_PALETTE = {
  axisText: '#a7a297', axisLine: '#45433e', gridLine: '#35332f',
  tooltipBg: '#171716', tooltipBorder: '#3c3a36', tooltipText: '#f5f2ec', crosshair: '#a7a297',
  sliderBg: '#201f1c', sliderBorder: '#35332f', sliderLine: '#8b8378', sliderArea: '#3c3934',
  spike: '#ffe0a3', spikeBorder: '#171716',
} as const;

const LIGHT_CHART_PALETTE = {
  axisText: '#6b665c', axisLine: '#b8b2a7', gridLine: '#e0dcd3',
  tooltipBg: '#fffefa', tooltipBorder: '#cfc9bd', tooltipText: '#24221e', crosshair: '#706b61',
  sliderBg: '#f0ede5', sliderBorder: '#cfc9bd', sliderLine: '#8a8377', sliderArea: '#d3cec2',
  spike: '#80520d', spikeBorder: '#fffefa',
} as const;

interface AccessiblePoint {
  label: string;
  step: number;
  value: number;
  sourceIndex: number;
}

export function MetricChart({ series, normalized, metric, isLight }: {
  series: TrainingSeries; normalized: NormalizedSeries; metric: MetricKey; isLight: boolean;
}) {
  const meta = (isLight ? LIGHT_META : META)[metric];
  const axisNames = CHART_AXIS_NAMES[metric];
  const palette = isLight ? LIGHT_CHART_PALETTE : DARK_CHART_PALETTE;
  const summaryId = useId();
  const [range, setRange] = useState<[number, number]>([normalized.minStep, normalized.maxStep]);
  const [pixelWidth, setPixelWidth] = useState(900);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setRange([normalized.minStep, normalized.maxStep]);
  }, [series, normalized.minStep, normalized.maxStep]);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const update = () => setPixelWidth(Math.max(320, element.clientWidth - 42));
    update();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', update);
      return () => window.removeEventListener('resize', update);
    }
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const result = useMemo(() => downsampleMetric(series, normalized, metric, {
    startStep: range[0], endStep: range[1], pixelWidth, pointsPerPixel: 2,
  }), [series, normalized, metric, range, pixelWidth]);

  const duplicateByStep = useMemo(() => {
    const map = new Map<number, typeof result.duplicates>();
    for (const item of result.duplicates) map.set(item.step, [...(map.get(item.step) ?? []), item]);
    return map;
  }, [result.duplicates]);
  const invalidByStep = useMemo(() => {
    const map = new Map<number, typeof result.invalids>();
    for (const item of result.invalids) map.set(item.step, [...(map.get(item.step) ?? []), item]);
    return map;
  }, [result.invalids]);

  const accessiblePoints = useMemo<AccessiblePoint[]>(() => {
    const finite = result.line.filter((point) => point.kind === 'value' && point.value !== null && Number.isFinite(point.value));
    if (finite.length === 0) return [];
    const first = finite[0];
    const last = finite[finite.length - 1];
    const minimum = finite.reduce((best, point) => point.value! < best.value! ? point : best, finite[0]);
    const maximum = finite.reduce((best, point) => point.value! > best.value! ? point : best, finite[0]);
    const selected = new Map<number, AccessiblePoint>();
    const add = (label: string, point: typeof first) => selected.set(point.sourceIndex, {
      label, step: point.step, value: point.value!, sourceIndex: point.sourceIndex,
    });
    add('First visible finite point', first);
    add('Minimum visible finite point', minimum);
    add('Maximum visible finite point', maximum);
    add('Last visible finite point', last);
    if (metric === 'loss' && series.spikeIndex !== undefined) {
      const spikeStep = series.step[series.spikeIndex];
      if (spikeStep >= range[0] && spikeStep <= range[1]) {
        selected.set(series.spikeIndex, {
          label: 'Known planted spike', step: spikeStep,
          value: series.loss[series.spikeIndex], sourceIndex: series.spikeIndex,
        });
      }
    }
    return [...selected.values()].sort((a, b) => a.step - b.step || a.sourceIndex - b.sourceIndex);
  }, [metric, range, result.line, series]);

  const handleDataZoom = useCallback((event: unknown) => {
    // User Timing measures are visible in Chrome Performance's User Timing track.
    markInteractionToNextPaint('zoom');
    const payload = event as { batch?: Array<Record<string, number>>; startValue?: number; endValue?: number; start?: number; end?: number };
    const zoom = payload.batch?.[0] ?? payload;
    let nextStart = zoom.startValue;
    let nextEnd = zoom.endValue;
    if ((!Number.isFinite(nextStart) || !Number.isFinite(nextEnd)) && Number.isFinite(zoom.start) && Number.isFinite(zoom.end)) {
      const width = range[1] - range[0];
      nextStart = range[0] + width * (zoom.start! / 100);
      nextEnd = range[0] + width * (zoom.end! / 100);
    }
    if (Number.isFinite(nextStart) && Number.isFinite(nextEnd) && nextEnd! > nextStart!) {
      const min = Math.max(normalized.minStep, nextStart!);
      const max = Math.min(normalized.maxStep, nextEnd!);
      if (max > min && (Math.abs(min - range[0]) > 0.5 || Math.abs(max - range[1]) > 0.5)) setRange([min, max]);
    }
  }, [normalized.minStep, normalized.maxStep, range]);

  const hoverMeasurePending = useRef(false);
  const handleChartMouseMove = useCallback(() => {
    if (hoverMeasurePending.current) return;
    hoverMeasurePending.current = true;
    markInteractionToNextPaint('hover');
    requestAnimationFrame(() => requestAnimationFrame(() => { hoverMeasurePending.current = false; }));
  }, []);

  const zoomBy = (factor: number) => {
    const center = (range[0] + range[1]) / 2;
    const fullRange = Math.max(1, normalized.maxStep - normalized.minStep);
    const half = Math.max(fullRange / 1_000_000, (range[1] - range[0]) / factor / 2);
    const nextStart = Math.max(normalized.minStep, center - half);
    const nextEnd = Math.min(normalized.maxStep, center + half);
    if (nextEnd > nextStart) setRange([nextStart, nextEnd]);
  };
  const resetZoom = () => setRange([normalized.minStep, normalized.maxStep]);

  const option = useMemo<EChartsOption>(() => {
    // Third and fourth dimensions retain the exact source provenance for tooltips.
    const lineData = result.line.map((point) => [point.step, point.value, point.sourceIndex, point.kind]);
    const duplicateData = buildFiniteDuplicateScatterData(result.duplicates);
    const invalidMarkLines = result.invalids.slice(0, 100).map((point) => ({
      xAxis: point.step,
      name: formatTooltipValue(point.value),
    }));
    const spikeMarkPoint = metric === 'loss' && series.spikeIndex !== undefined
      && series.step[series.spikeIndex] >= range[0] && series.step[series.spikeIndex] <= range[1]
      ? [{ coord: [series.step[series.spikeIndex], series.loss[series.spikeIndex]], name: 'Known planted spike' }]
      : [];

    return {
      animation: false,
      aria: {
        enabled: true,
        description: `${meta.title} metric plotted against training step. Source values are not smoothed. Non-finite values, duplicate observations and missing ranges are shown as breaks or separate markers.`,
      },
      backgroundColor: 'transparent',
      grid: { left: 64, right: 22, top: 28, bottom: 62 },
      tooltip: {
        trigger: 'axis',
        confine: true,
        backgroundColor: palette.tooltipBg,
        borderColor: palette.tooltipBorder,
        textStyle: { color: palette.tooltipText, fontFamily: 'DM Mono, monospace', fontSize: 11 },
        axisPointer: { type: 'cross', lineStyle: { color: palette.crosshair, type: 'dashed' } },
        formatter: (params: unknown) => {
          const list = Array.isArray(params) ? params as Array<{ value?: unknown; data?: unknown }> : [];
          const primary = list.find((item) => Array.isArray(item.value)) ?? list[0];
          const raw = primary?.value as Array<number | string | null> | undefined;
          if (!raw || !Number.isFinite(Number(raw[0]))) return '';
          const step = Number(raw[0]);
          const duplicateRows = duplicateByStep.get(step) ?? [];
          const invalidRows = invalidByStep.get(step) ?? [];
          const duplicateSourceIndices = new Set(duplicateRows.map((item) => item.sourceIndex));
          const rows = [
            ...duplicateRows.map((item) => `<div class="tip-row"><span>duplicate${Number.isFinite(item.value) ? '' : ' · invalid'} · source[${item.sourceIndex}]</span><b>${formatTooltipValue(item.value)}</b></div>`),
            ...invalidRows.filter((item) => !duplicateSourceIndices.has(item.sourceIndex)).map((item) => `<div class="tip-row"><span>invalid · source[${item.sourceIndex}]</span><b>${formatTooltipValue(item.value)}</b></div>`),
          ];
          const sourceIndex = typeof raw[2] === 'number' ? raw[2] : undefined;
          const pointKind = raw[3];
          if (rows.length === 0 && raw[1] !== null && raw[1] !== undefined && Number.isFinite(Number(raw[1]))) {
            rows.push(`<div class="tip-row"><span>${meta.title}${sourceIndex === undefined ? '' : ` · source[${sourceIndex}]`}</span><b>${formatTooltipValue(Number(raw[1]))}</b></div>`);
          }
          if (rows.length === 0 && raw[1] === null) {
            rows.push(`<div class="tip-row"><span>integrity break</span><b>${pointKind === 'gap-break' ? 'missing range' : 'no plotted value'}</b></div>`);
          }
          return `<div class="tip-title">STEP ${formatTooltipValue(step)}</div>${rows.join('')}`;
        },
      },
      xAxis: {
        type: CHART_INTEGRITY_POLICY.axisType, min: range[0], max: range[1], name: axisNames.x, nameLocation: 'middle', nameGap: 34,
        axisLine: { lineStyle: { color: palette.axisLine } }, axisTick: { show: false },
        axisLabel: { color: palette.axisText, fontFamily: 'DM Mono, monospace', fontSize: 10, formatter: (value: number) => formatAxisTick(value) },
        splitLine: { show: false }, nameTextStyle: { color: palette.axisText, fontFamily: 'DM Mono, monospace', fontSize: 9 },
      },
      yAxis: {
        type: CHART_INTEGRITY_POLICY.axisType, scale: true, name: axisNames.y, nameLocation: 'middle', nameGap: 48,
        axisLine: { show: false }, axisTick: { show: false },
        axisLabel: { color: palette.axisText, fontFamily: 'DM Mono, monospace', fontSize: 10, formatter: (value: number) => formatAxisTick(value) },
        nameTextStyle: { color: palette.axisText, fontFamily: 'DM Mono, monospace', fontSize: 9 },
        splitLine: { lineStyle: { color: palette.gridLine, type: 'dashed' } },
      },
      dataZoom: [
        { type: 'inside', xAxisIndex: 0, filterMode: 'none', startValue: range[0], endValue: range[1], zoomOnMouseWheel: true, moveOnMouseMove: true },
        { type: 'slider', xAxisIndex: 0, filterMode: 'none', height: 16, bottom: 8, startValue: range[0], endValue: range[1], borderColor: palette.sliderBorder, backgroundColor: palette.sliderBg, fillerColor: 'rgba(244,123,72,.16)', handleStyle: { color: meta.color, borderColor: meta.color }, textStyle: { color: palette.axisText, fontSize: 9 }, dataBackground: { lineStyle: { color: palette.sliderLine }, areaStyle: { color: palette.sliderArea } } },
      ],
      series: [
        {
          name: meta.title, type: 'line', data: lineData, encode: { x: 0, y: 1 }, showSymbol: false, ...CHART_INTEGRITY_POLICY.lineSeries,
          lineStyle: { color: meta.color, width: 1.7 }, itemStyle: { color: meta.color }, // Intentionally omit ECharts' `sampling` option; source reduction is handled by our tested Min-Max reducer.
          emphasis: { focus: 'series', lineStyle: { width: 2.5 } },
          markLine: invalidMarkLines.length ? { symbol: ['none', 'none'], silent: true, lineStyle: { color: '#e8a04f', type: 'dashed', width: 1 }, label: { show: false }, data: invalidMarkLines } : undefined,
          markPoint: spikeMarkPoint.length ? {
            symbol: 'diamond', symbolSize: 12,
            itemStyle: { color: palette.spike, borderColor: palette.spikeBorder, borderWidth: 1 },
            label: { show: true, formatter: 'SPIKE', color: palette.spike, fontSize: 9, position: 'top' },
            data: spikeMarkPoint,
          } : undefined,
        },
        ...(duplicateData.length ? [{ name: 'Duplicate readings', type: 'scatter' as const, data: duplicateData, encode: { x: 0, y: 1 }, symbolSize: 7, itemStyle: { color: '#e5ad50', borderColor: '#171716', borderWidth: 1 }, z: 5 }] : []),
      ],
    };
  }, [axisNames, duplicateByStep, invalidByStep, meta, metric, palette, range, result, series]);

  const invalidCount = normalized.invalidByMetric[metric].filter((index) => series.step[index] >= range[0] && series.step[index] <= range[1]).length;

  return (
    <section className="panel chart-panel" aria-labelledby={`${summaryId}-title`}>
      <div className="chart-panel-head">
        <div>
          <div className="chart-title-row">
            <span className="chart-color-dot" style={{ background: meta.color }} />
            <h3 id={`${summaryId}-title`}>{meta.title}</h3>
            {metric === 'loss' && result.spikePreserved && <span className="spike-chip"><AlertTriangle size={11} /> SPIKE PRESERVED</span>}
          </div>
          <p>{meta.subtitle}</p>
        </div>
        <div className="chart-actions" aria-label={`${meta.title} chart controls`}>
          <button type="button" onClick={() => zoomBy(2)} title="Zoom in" aria-label={`Zoom in ${meta.title}`}><Plus size={14} /></button>
          <button type="button" onClick={() => zoomBy(0.5)} title="Zoom out" aria-label={`Zoom out ${meta.title}`}><Minus size={14} /></button>
          <button type="button" onClick={resetZoom} title="Reset zoom" aria-label={`Reset zoom for ${meta.title}`}><RotateCcw size={13} /></button>
        </div>
      </div>
      <div className="chart-stats">
        <span>{result.sourcePointCount.toLocaleString()} SOURCE POINTS IN VIEW</span>
        <span>{result.renderedPointCount.toLocaleString()} DRAWN</span>
        {invalidCount > 0 && <span className="chart-warning-text">{invalidCount} INVALID</span>}
        {result.duplicates.length > 0 && <span className="chart-warning-text">{result.duplicates.length} DUPLICATE READINGS</span>}
      </div>
      <div
        ref={containerRef}
        role="img"
        aria-label={`${meta.title} chart. ${result.sourcePointCount.toLocaleString()} source points in the selected viewport; ${result.renderedPointCount.toLocaleString()} rendered points.`}
        aria-describedby={summaryId}
      >
        <ReactECharts option={option} onEvents={{ datazoom: handleDataZoom, mousemove: handleChartMouseMove }} notMerge lazyUpdate style={{ height: 248, width: '100%' }} opts={{ renderer: 'canvas', devicePixelRatio: 1 }} />
      </div>
      <p id={summaryId} className="sr-only">{meta.title}: {result.sourcePointCount} source observations in the visible range, {result.renderedPointCount} rendered points, {invalidCount} invalid metric values and {result.duplicates.length} duplicate observations. A structured summary of source-derived points is available below.</p>
      <p className="chart-footnote"><span>● {meta.title} · original values</span><span>Scroll / drag slider to zoom · {formatAxisTick(range[0])} — {formatAxisTick(range[1])}</span></p>
      <details className="chart-accessible-data">
        <summary>Accessible data summary</summary>
        <p>Source-derived observations from the current viewport. This is a summary, not a replacement for the original series. The full source arrays remain unchanged; invalid and duplicate observations are listed in Raw issue records below.</p>
        <div className="table-scroll">
          <table className="runs-table accessible-summary-table">
            <thead><tr><th scope="col">OBSERVATION</th><th scope="col">STEP</th><th scope="col">{meta.title.toUpperCase()}</th><th scope="col">SOURCE INDEX</th></tr></thead>
            <tbody>
              {accessiblePoints.length ? accessiblePoints.map((point) => <tr key={`${point.label}-${point.sourceIndex}`}><td>{point.label}</td><td className="mono">{formatTooltipValue(point.step)}</td><td className="mono">{formatTooltipValue(point.value)}</td><td className="mono">{point.sourceIndex.toLocaleString()}</td></tr>) : <tr><td colSpan={4}>No finite observations in this viewport.</td></tr>}
            </tbody>
          </table>
        </div>
        {invalidCount > 0 && <p className="chart-accessible-note">{invalidCount} invalid source value(s) are preserved as gaps, not zeros. See Raw issue records for their original values.</p>}
      </details>
    </section>
  );
}


let interactionSequence = 0;

/** Measure interaction callback to the next completed paint opportunity.
 * This is a repeatable User Timing proxy, not a replacement for a DevTools trace.
 */
function markInteractionToNextPaint(kind: 'zoom' | 'hover'): void {
  if (typeof performance === 'undefined' || typeof requestAnimationFrame === 'undefined') return;
  const id = ++interactionSequence;
  const start = `soup:${kind}:start:${id}`;
  const end = `soup:${kind}:end:${id}`;
  performance.mark(start);
  requestAnimationFrame(() => requestAnimationFrame(() => {
    performance.mark(end);
    const measureName = `soup:${kind}:event-to-next-paint`;
    // Bound the User Timing buffer during long hover sessions.
    if (performance.getEntriesByName(measureName, 'measure').length >= 200) performance.clearMeasures(measureName);
    performance.measure(measureName, start, end);
    performance.clearMarks(start);
    performance.clearMarks(end);
  }));
}
