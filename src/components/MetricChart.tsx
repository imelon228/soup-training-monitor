import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import { AlertTriangle, Maximize2, Minus, Plus, RotateCcw } from 'lucide-react';
import { downsampleMetric } from '../domain/downsampling';
import { formatAxisTick, formatTooltipValue } from '../domain/formatters';
import type { MetricKey, NormalizedSeries, TrainingSeries } from '../domain/types';

const META: Record<MetricKey, { title: string; subtitle: string; color: string; unit: string }> = {
  loss: { title: 'Loss', subtitle: 'Objective function · lower is generally better', color: '#f47b48', unit: '' },
  lr: { title: 'Learning rate', subtitle: 'Optimizer step size · scheduler behaviour', color: '#77b7e8', unit: '' },
  gradNorm: { title: 'Gradient norm', subtitle: 'Gradient magnitude · optimization stability', color: '#9acb87', unit: '' },
};

export function MetricChart({ series, normalized, metric }: {
  series: TrainingSeries; normalized: NormalizedSeries; metric: MetricKey;
}) {
  const meta = META[metric];
  const [range, setRange] = useState<[number, number]>([normalized.minStep, normalized.maxStep]);
  const [pixelWidth, setPixelWidth] = useState(900);
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const update = () => setPixelWidth(Math.max(320, element.clientWidth - 42));
    update();
    if (typeof ResizeObserver === 'undefined') { window.addEventListener('resize', update); return () => window.removeEventListener('resize', update); }
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const result = useMemo(() => downsampleMetric(series, normalized, metric, {
    startStep: range[0], endStep: range[1], pixelWidth, pointsPerPixel: 2,
  }), [series, normalized, metric, range, pixelWidth]);

  const handleDataZoom = useCallback((event: unknown) => {
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

  const zoomBy = (factor: number) => {
    const center = (range[0] + range[1]) / 2;
    const half = Math.max((normalized.maxStep - normalized.minStep) / 1_000_000, (range[1] - range[0]) / factor / 2);
    setRange([Math.max(normalized.minStep, center - half), Math.min(normalized.maxStep, center + half)]);
  };
  const resetZoom = () => setRange([normalized.minStep, normalized.maxStep]);

  const option = useMemo<EChartsOption>(() => {
    const lineData = result.line.map((point) => [point.step, point.value]);
    const duplicateData = result.duplicates.map((point) => [point.step, point.value, point.sourceIndex]);
    const invalidMarkLines = result.invalids.slice(0, 100).map((point) => ({ xAxis: point.step, name: Number.isNaN(point.value) ? 'NaN' : 'Infinity' }));
    return {
      animation: false,
      aria: { enabled: true, description: `${meta.title} metric plotted against training step. Values are original source readings; gaps and invalid readings are shown as breaks.` },
      backgroundColor: 'transparent',
      grid: { left: 58, right: 22, top: 22, bottom: 62 },
      tooltip: {
        trigger: 'axis',
        confine: true,
        backgroundColor: '#171716',
        borderColor: '#3c3a36',
        textStyle: { color: '#f5f2ec', fontFamily: 'DM Mono, monospace', fontSize: 11 },
        axisPointer: { type: 'cross', lineStyle: { color: '#77736b', type: 'dashed' } },
        formatter: (params: unknown) => {
          const list = Array.isArray(params) ? params as Array<{ seriesName?: string; value?: unknown; data?: unknown; marker?: string }> : [];
          const first = list[0];
          const raw = first?.value as number[] | undefined;
          if (!raw || !Number.isFinite(raw[0])) return '';
          const duplicateAtStep = result.duplicates.filter((item) => item.step === raw[0]);
          const rows = duplicateAtStep.length
            ? duplicateAtStep.map((item) => `<div class="tip-row"><span>source[${item.sourceIndex}]</span><b>${formatTooltipValue(item.value)}</b></div>`).join('')
            : `<div class="tip-row"><span>${meta.title}</span><b>${raw[1] === null ? 'gap / invalid' : formatTooltipValue(Number(raw[1]))}</b></div>`;
          return `<div class="tip-title">STEP ${formatTooltipValue(Number(raw[0]))}</div>${rows}`;
        },
      },
      xAxis: {
        type: 'value', min: range[0], max: range[1], name: 'STEP', nameLocation: 'middle', nameGap: 34,
        axisLine: { lineStyle: { color: '#45433e' } }, axisTick: { show: false },
        axisLabel: { color: '#8f8b82', fontFamily: 'DM Mono, monospace', fontSize: 10, formatter: (value: number) => formatAxisTick(value) },
        splitLine: { show: false }, nameTextStyle: { color: '#77736b', fontFamily: 'DM Mono, monospace', fontSize: 9 },
      },
      yAxis: {
        type: 'value', scale: true,
        axisLine: { show: false }, axisTick: { show: false },
        axisLabel: { color: '#8f8b82', fontFamily: 'DM Mono, monospace', fontSize: 10, formatter: (value: number) => formatAxisTick(value) },
        splitLine: { lineStyle: { color: '#282724', type: 'dashed' } },
      },
      dataZoom: [
        { type: 'inside', xAxisIndex: 0, filterMode: 'none', startValue: range[0], endValue: range[1], zoomOnMouseWheel: true, moveOnMouseMove: true },
        { type: 'slider', xAxisIndex: 0, filterMode: 'none', height: 16, bottom: 8, startValue: range[0], endValue: range[1], borderColor: '#35332f', backgroundColor: '#201f1c', fillerColor: 'rgba(244,123,72,.16)', handleStyle: { color: '#f47b48', borderColor: '#f47b48' }, textStyle: { color: '#8f8b82', fontSize: 9 }, dataBackground: { lineStyle: { color: '#615b51' }, areaStyle: { color: '#3c3934' } } },
      ],
      series: [
        {
          name: meta.title, type: 'line', data: lineData, showSymbol: false, connectNulls: false,
          lineStyle: { color: meta.color, width: 1.7 }, itemStyle: { color: meta.color }, sampling: 'none',
          emphasis: { focus: 'series', lineStyle: { width: 2.5 } },
          markLine: invalidMarkLines.length ? { symbol: ['none', 'none'], silent: true, lineStyle: { color: '#e8a04f', type: 'dashed', width: 1 }, label: { show: false }, data: invalidMarkLines } : undefined,
        },
        ...(duplicateData.length ? [{ name: 'Duplicate readings', type: 'scatter' as const, data: duplicateData, symbolSize: 7, itemStyle: { color: '#e5ad50', borderColor: '#171716', borderWidth: 1 }, z: 5 }] : []),
      ],
    };
  }, [meta, range, result]);

  const invalidCount = normalized.invalidByMetric[metric].filter((index) => series.step[index] >= range[0] && series.step[index] <= range[1]).length;

  return (
    <section className="panel chart-panel">
      <div className="chart-panel-head">
        <div><div className="chart-title-row"><span className="chart-color-dot" style={{ background: meta.color }} /><h3>{meta.title}</h3>{metric === 'loss' && result.spikePreserved && <span className="spike-chip"><AlertTriangle size={11} /> SPIKE PRESERVED</span>}</div><p>{meta.subtitle}</p></div>
        <div className="chart-actions"><button onClick={() => zoomBy(2)} title="Zoom in" aria-label="Zoom in"><Plus size={14} /></button><button onClick={() => zoomBy(0.5)} title="Zoom out" aria-label="Zoom out"><Minus size={14} /></button><button onClick={resetZoom} title="Reset zoom" aria-label="Reset zoom"><RotateCcw size={13} /></button><span className="chart-action-divider" /><button title="Chart fills available panel" aria-label="Chart display information"><Maximize2 size={13} /></button></div>
      </div>
      <div className="chart-stats"><span>{result.sourcePointCount.toLocaleString()} SOURCE POINTS IN VIEW</span><span>{result.renderedPointCount.toLocaleString()} DRAWN</span>{invalidCount > 0 && <span className="chart-warning-text">{invalidCount} INVALID</span>}{result.duplicates.length > 0 && <span className="chart-warning-text">{result.duplicates.length} DUPLICATE READINGS</span>}</div>
      <div ref={containerRef} role="img" aria-label={`${meta.title} chart. ${result.sourcePointCount.toLocaleString()} source points in the selected viewport; ${result.renderedPointCount.toLocaleString()} rendered points.`}><ReactECharts option={option} onEvents={{ datazoom: handleDataZoom }} notMerge lazyUpdate style={{ height: 248, width: '100%' }} opts={{ renderer: 'canvas', devicePixelRatio: 1 }} /></div>
      <div className="chart-footnote"><span>● {meta.title} · original values</span><span>Scroll / drag slider to zoom · {formatAxisTick(range[0])} — {formatAxisTick(range[1])}</span></div>
    </section>
  );
}
