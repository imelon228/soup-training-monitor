import type { DownsampleResult, MetricKey, NormalizedSeries, RenderPoint, TrainingSeries } from './types';
import { sourceIndexAt, stepAt, valueArray } from './normalizeData';

export interface DownsampleOptions {
  startStep?: number;
  endStep?: number;
  pixelWidth?: number;
  pointsPerPixel?: number;
}

function lowerBound(series: TrainingSeries, normalized: NormalizedSeries, target: number): number {
  let low = 0;
  let high = normalized.pointCount;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if (stepAt(series, normalized, middle) < target) low = middle + 1;
    else high = middle;
  }
  return low;
}

function upperBound(series: TrainingSeries, normalized: NormalizedSeries, target: number): number {
  let low = 0;
  let high = normalized.pointCount;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if (stepAt(series, normalized, middle) <= target) low = middle + 1;
    else high = middle;
  }
  return low;
}

export function downsampleMetric(
  series: TrainingSeries,
  normalized: NormalizedSeries,
  metric: MetricKey,
  options: DownsampleOptions = {},
): DownsampleResult {
  const { pixelWidth = 1_000, pointsPerPixel = 2 } = options;
  if (!Number.isFinite(pixelWidth) || pixelWidth <= 0) {
    throw new RangeError('pixelWidth must be a finite positive number.');
  }
  if (!Number.isFinite(pointsPerPixel) || pointsPerPixel <= 0) {
    throw new RangeError('pointsPerPixel must be a finite positive number.');
  }
  if (normalized.pointCount === 0) {
    return { line: [], duplicates: [], invalids: [], sourcePointCount: 0, renderedPointCount: 0, spikePreserved: false };
  }

  const requestedStart = options.startStep ?? normalized.minStep;
  const requestedEnd = options.endStep ?? normalized.maxStep;
  if (!Number.isFinite(requestedStart) || !Number.isFinite(requestedEnd)) {
    throw new RangeError('Viewport startStep and endStep must be finite numbers.');
  }
  const start = Math.max(normalized.minStep, requestedStart);
  const end = Math.min(normalized.maxStep, requestedEnd);
  if (start > end) {
    return { line: [], duplicates: [], invalids: [], sourcePointCount: 0, renderedPointCount: 0, spikePreserved: false };
  }

  const fromPosition = lowerBound(series, normalized, start);
  const toPosition = upperBound(series, normalized, end);
  if (fromPosition >= toPosition) {
    return { line: [], duplicates: [], invalids: [], sourcePointCount: 0, renderedPointCount: 0, spikePreserved: false };
  }

  const metricValues = valueArray(series, metric);
  const visibleCount = toPosition - fromPosition;
  const bucketCount = Math.max(1, Math.min(visibleCount, Math.floor(Math.max(80, pixelWidth) * pointsPerPixel / 2)));
  const selected = new Set<number>();
  const duplicateMask = new Uint8Array(normalized.pointCount);
  const invalidSourceIndices = new Set(normalized.invalidByMetric[metric]);
  for (const group of normalized.duplicateGroups) {
    for (const sourceIndex of group.sourceIndices) duplicateMask[sourceIndex] = 1;
  }
  const gapBreakAfter = new Map<number, number>();

  selected.add(sourceIndexAt(normalized, fromPosition));
  selected.add(sourceIndexAt(normalized, toPosition - 1));

  // Keep per-bucket extrema; this preserves isolated spikes that naive stride sampling can lose.
  for (let bucket = 0; bucket < bucketCount; bucket += 1) {
    const bucketStart = fromPosition + Math.floor((visibleCount * bucket) / bucketCount);
    const bucketEnd = fromPosition + Math.floor((visibleCount * (bucket + 1)) / bucketCount);
    let minIndex = -1;
    let maxIndex = -1;
    let minValue = Number.POSITIVE_INFINITY;
    let maxValue = Number.NEGATIVE_INFINITY;
    for (let position = bucketStart; position < Math.max(bucketStart + 1, bucketEnd); position += 1) {
      if (position >= toPosition) break;
      const sourceIndex = sourceIndexAt(normalized, position);
      if (invalidSourceIndices.has(sourceIndex)) continue;
      if (duplicateMask[sourceIndex] === 1) continue;
      const value = metricValues[sourceIndex];
      if (!Number.isFinite(value)) continue;
      if (value < minValue) { minValue = value; minIndex = sourceIndex; }
      if (value > maxValue) { maxValue = value; maxIndex = sourceIndex; }
    }
    if (minIndex >= 0) selected.add(minIndex);
    if (maxIndex >= 0) selected.add(maxIndex);
  }

  // Integrity events are not disposable data: preserve them explicitly in the visible viewport.
  for (const sourceIndex of invalidSourceIndices) {
    const step = series.step[sourceIndex];
    if (step >= start && step <= end) selected.add(sourceIndex);
  }
  for (const group of normalized.duplicateGroups) {
    if (group.step >= start && group.step <= end) {
      for (const sourceIndex of group.sourceIndices) {
        selected.add(sourceIndex);
      }
    }
  }
  for (const gap of normalized.gaps) {
    if (gap.toStep >= start && gap.fromStep <= end) {
      gapBreakAfter.set(gap.leftSourceIndex, (gap.fromStep + gap.toStep) / 2);
      selected.add(gap.leftSourceIndex);
      selected.add(gap.rightSourceIndex);
    }
  }
  if (series.spikeIndex !== undefined) {
    const spikeStep = series.step[series.spikeIndex];
    if (spikeStep >= start && spikeStep <= end) selected.add(series.spikeIndex);
  }

  const sortedSelected = [...selected].sort((a, b) => series.step[a] - series.step[b] || a - b);
  const duplicates: DownsampleResult['duplicates'] = [];
  const invalids: DownsampleResult['invalids'] = [];
  const line: RenderPoint[] = [];
  const emittedDuplicateBreaks = new Set<number>();
  for (const sourceIndex of sortedSelected) {
    const step = series.step[sourceIndex];
    const rawValue = metricValues[sourceIndex];
    if (duplicateMask[sourceIndex] === 1) {
      duplicates.push({ step, value: rawValue, sourceIndex });
      if (invalidSourceIndices.has(sourceIndex) || !Number.isFinite(rawValue)) {
        invalids.push({ step, value: rawValue, sourceIndex });
      }
      // One null at the duplicate X coordinate breaks the line; every original
      // observation remains separately available in `duplicates`.
      if (!emittedDuplicateBreaks.has(step)) {
        line.push({ step, value: null, sourceIndex, kind: 'duplicate-break' });
        emittedDuplicateBreaks.add(step);
      }
    } else if (invalidSourceIndices.has(sourceIndex) || !Number.isFinite(rawValue)) {
      invalids.push({ step, value: rawValue, sourceIndex });
      line.push({ step, value: null, sourceIndex, kind: 'invalid', rawValue });
    } else {
      line.push({ step, value: rawValue, sourceIndex, kind: 'value', rawValue });
    }
    const gapMidpoint = gapBreakAfter.get(sourceIndex);
    if (gapMidpoint !== undefined) {
      line.push({ step: gapMidpoint, value: null, sourceIndex, kind: 'gap-break' });
    }
  }

  const spikePreserved = metric === 'loss'
    && series.spikeIndex !== undefined
    && series.step[series.spikeIndex] >= start
    && series.step[series.spikeIndex] <= end
    && selected.has(series.spikeIndex);

  return {
    line,
    duplicates,
    invalids,
    sourcePointCount: visibleCount,
    renderedPointCount: line.length,
    spikePreserved,
  };
}
