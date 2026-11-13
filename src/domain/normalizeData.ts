import type { DuplicateGroup, GapRange, MetricKey, NormalizedSeries, TrainingSeries } from './types';

const METRICS: MetricKey[] = ['loss', 'lr', 'gradNorm'];

/**
 * Validate invariants required for an honest X/Y plot. Non-finite metric values
 * are allowed and reported; non-finite steps and misaligned arrays are not,
 * because they make the X coordinate or row relationship undefined.
 */
export function assertSeriesShape(series: TrainingSeries): void {
  const pointCount = series.step.length;
  for (const metric of METRICS) {
    if (series[metric].length !== pointCount) {
      throw new RangeError(`Metric "${metric}" has ${series[metric].length} values, but step has ${pointCount}.`);
    }
  }
  if (!Number.isFinite(series.expectedStepInterval) || series.expectedStepInterval <= 0) {
    throw new RangeError('expectedStepInterval must be a finite positive number.');
  }
  for (let index = 0; index < pointCount; index += 1) {
    if (!Number.isFinite(series.step[index])) {
      throw new RangeError(`Step at source index ${index} must be finite.`);
    }
  }
}

export function valueArray(series: TrainingSeries, metric: MetricKey): Float64Array {
  return series[metric];
}

export function sourceIndexAt(normalized: NormalizedSeries, sortedPosition: number): number {
  return normalized.order ? normalized.order[sortedPosition] : sortedPosition;
}

export function stepAt(series: TrainingSeries, normalized: NormalizedSeries, sortedPosition: number): number {
  return series.step[sourceIndexAt(normalized, sortedPosition)];
}

export function normalizeSeries(series: TrainingSeries): NormalizedSeries {
  assertSeriesShape(series);
  const pointCount = series.step.length;
  if (pointCount === 0) {
    return {
      order: null,
      isSorted: true,
      invalidByMetric: { loss: [], lr: [], gradNorm: [] },
      duplicateGroups: [],
      gaps: [],
      minStep: 0,
      maxStep: 0,
      pointCount: 0,
    };
  }

  let isSorted = true;
  for (let i = 1; i < pointCount; i += 1) {
    if (series.step[i] < series.step[i - 1]) {
      isSorted = false;
      break;
    }
  }

  let order: Uint32Array | null = null;
  if (!isSorted) {
    const indices = Array.from({ length: pointCount }, (_, index) => index);
    indices.sort((a, b) => series.step[a] - series.step[b] || a - b);
    order = Uint32Array.from(indices);
  }

  const sortedIndex = (position: number) => order ? order[position] : position;
  const invalidByMetric = { loss: [] as number[], lr: [] as number[], gradNorm: [] as number[] };
  for (const metric of METRICS) {
    const values = valueArray(series, metric);
    for (let i = 0; i < values.length; i += 1) {
      if (!Number.isFinite(values[i])) invalidByMetric[metric].push(i);
    }
  }

  const duplicateGroups: DuplicateGroup[] = [];
  const gaps: GapRange[] = [];
  const expected = series.expectedStepInterval;
  let minStep = Number.POSITIVE_INFINITY;
  let maxStep = Number.NEGATIVE_INFINITY;
  for (let position = 0; position < pointCount;) {
    const sourceIndex = sortedIndex(position);
    const step = series.step[sourceIndex];
    minStep = Math.min(minStep, step);
    maxStep = Math.max(maxStep, step);
    let next = position + 1;
    while (next < pointCount && series.step[sortedIndex(next)] === step) next += 1;
    if (next - position > 1) {
      const sourceIndices: number[] = [];
      const values: number[] = [];
      for (let p = position; p < next; p += 1) {
        const index = sortedIndex(p);
        sourceIndices.push(index);
        values.push(series.loss[index]);
      }
      duplicateGroups.push({ step, sourceIndices, values });
    }
    if (next < pointCount) {
      const nextIndex = sortedIndex(next);
      const nextStep = series.step[nextIndex];
      const delta = nextStep - step;
      if (delta > expected * 1.5) {
        gaps.push({
          fromStep: step,
          toStep: nextStep,
          missingCount: Math.max(1, Math.round(delta / expected) - 1),
          leftSourceIndex: sortedIndex(next - 1),
          rightSourceIndex: nextIndex,
        });
      }
    }
    position = next;
  }

  return { order, isSorted, invalidByMetric, duplicateGroups, gaps, minStep, maxStep, pointCount };
}

export function formatRawValue(value: number): string {
  if (Number.isNaN(value)) return 'NaN';
  if (value === Number.POSITIVE_INFINITY) return '+Infinity';
  if (value === Number.NEGATIVE_INFINITY) return '-Infinity';
  // Number#toString returns the shortest decimal that round-trips to the same IEEE-754 value.
  return value.toString();
}
