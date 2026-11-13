import { describe, expect, it } from 'vitest';
import { downsampleMetric } from '../src/domain/downsampling';
import { normalizeSeries } from '../src/domain/normalizeData';
import { generateRunSeries } from '../src/data/generator';
import type { TrainingSeries } from '../src/domain/types';

function makeSeries(step: number[], loss: number[], lr = loss, gradNorm = loss): TrainingSeries {
  return {
    step: Float64Array.from(step),
    loss: Float64Array.from(loss),
    lr: Float64Array.from(lr),
    gradNorm: Float64Array.from(gradNorm),
    expectedStepInterval: 1,
  };
}

describe('data truthfulness contract', () => {
  it('preserves the planted 1M-point spike for viewport widths and zoom levels', () => {
    const series = generateRunSeries('run-020');
    const normalized = normalizeSeries(series);
    const spikeIndex = series.spikeIndex!;
    const spikeStep = series.step[spikeIndex];
    const maximumStep = series.step[series.step.length - 1];
    const widths = [320, 375, 768, 1_024, 1_440, 1_920];
    const spans = [maximumStep, 500_000, 100_000, 10_000, 1_000, 100, 10, 1];

    for (const pixelWidth of widths) {
      for (const span of spans) {
        const startStep = Math.max(0, spikeStep - span / 2);
        const endStep = Math.min(maximumStep, spikeStep + span / 2);
        const result = downsampleMetric(series, normalized, 'loss', {
          startStep, endStep, pixelWidth, pointsPerPixel: 2,
        });
        expect(result.spikePreserved, `spike should survive ${span}-step viewport at ${pixelWidth}px`).toBe(true);
        expect(result.line.some((point) => point.sourceIndex === spikeIndex && point.value === 7.25)).toBe(true);
      }
    }
  });

  it('keeps each bucket minimum and maximum instead of stride-sampling through them', () => {
    const count = 10_000;
    const values = Array.from({ length: count }, (_, index) => 0.5 + (index % 13) / 100);
    const series = makeSeries(Array.from({ length: count }, (_, index) => index), values);
    const normalized = normalizeSeries(series);
    const pixelWidth = 100;
    const result = downsampleMetric(series, normalized, 'loss', { pixelWidth, pointsPerPixel: 2 });
    const retained = new Set(result.line.map((point) => point.sourceIndex));
    const bucketCount = 100;

    for (let bucket = 0; bucket < bucketCount; bucket += 1) {
      const from = Math.floor((count * bucket) / bucketCount);
      const to = Math.floor((count * (bucket + 1)) / bucketCount);
      let minIndex = from;
      let maxIndex = from;
      for (let index = from + 1; index < to; index += 1) {
        if (series.loss[index] < series.loss[minIndex]) minIndex = index;
        if (series.loss[index] > series.loss[maxIndex]) maxIndex = index;
      }
      expect(retained.has(minIndex)).toBe(true);
      expect(retained.has(maxIndex)).toBe(true);
    }
  });

  it('does not smooth, average or replace non-finite metric readings', () => {
    const series = makeSeries(
      [0, 1, 2, 3, 4, 5],
      [1, Number.NaN, 0.7, Number.POSITIVE_INFINITY, 0.4, Number.NEGATIVE_INFINITY],
    );
    const original = Array.from(series.loss);
    const normalized = normalizeSeries(series);
    const result = downsampleMetric(series, normalized, 'loss');

    expect(result.invalids.map((item) => item.value)).toEqual([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]);
    expect(result.line.filter((point) => point.kind === 'invalid')).toHaveLength(3);
    expect(result.line.some((point) => point.value === 0)).toBe(false);
    expect(Array.from(series.loss)).toEqual(original);
    expect(result.line.filter((point) => point.kind === 'value').map((point) => point.value)).toEqual([1, 0.7, 0.4]);
  });

  it('reports an invalid reading even when that source row is also a duplicate', () => {
    const series = makeSeries([0, 1, 1, 2], [1, 0.8, Number.NaN, 0.5]);
    const result = downsampleMetric(series, normalizeSeries(series), 'loss');
    expect(result.duplicates.map((point) => point.sourceIndex)).toEqual([1, 2]);
    expect(result.invalids).toEqual([expect.objectContaining({ sourceIndex: 2, step: 1, value: Number.NaN })]);
  });

  it('keeps non-finite values independently for Loss, LR and Gradient Norm', () => {
    const series = makeSeries(
      [0, 1, 2, 3],
      [1, Number.NaN, 0.7, 0.6],
      [0.01, 0.008, Number.POSITIVE_INFINITY, 0.004],
      [1, 0.9, 0.8, Number.NEGATIVE_INFINITY],
    );
    const normalized = normalizeSeries(series);
    expect(downsampleMetric(series, normalized, 'loss').invalids[0].value).toBeNaN();
    expect(downsampleMetric(series, normalized, 'lr').invalids[0].value).toBe(Number.POSITIVE_INFINITY);
    expect(downsampleMetric(series, normalized, 'gradNorm').invalids[0].value).toBe(Number.NEGATIVE_INFINITY);
  });

  it('keeps duplicate readings separately and inserts one break at the true duplicate step', () => {
    const series = makeSeries([0, 1, 1, 2], [1, 0.8, 0.7, 0.5]);
    const result = downsampleMetric(series, normalizeSeries(series), 'loss');
    const duplicateBreaks = result.line.filter((point) => point.kind === 'duplicate-break');

    expect(result.duplicates.map((point) => [point.sourceIndex, point.step, point.value])).toEqual([
      [1, 1, 0.8], [2, 1, 0.7],
    ]);
    expect(duplicateBreaks).toHaveLength(1);
    expect(duplicateBreaks[0].step).toBe(1);
    expect(result.line.some((point) => point.step === 1.000001)).toBe(false);
  });

  it('sorts plotted points by step while preserving original source indices', () => {
    const series = makeSeries([3, 0, 2, 1], [0.3, 1, 0.5, 0.7]);
    const normalized = normalizeSeries(series);
    const result = downsampleMetric(series, normalized, 'loss');
    const values = result.line.filter((point) => point.kind === 'value');

    expect(values.map((point) => point.step)).toEqual([0, 1, 2, 3]);
    expect(values.map((point) => point.sourceIndex)).toEqual([1, 3, 2, 0]);
    expect(values.map((point) => point.value)).toEqual([1, 0.7, 0.5, 0.3]);
  });

  it('keeps gaps as null break markers and never creates finite synthetic readings', () => {
    const series = makeSeries([0, 1, 2, 8, 9], [1, 0.9, 0.8, 0.7, 0.6]);
    const normalized = normalizeSeries(series);
    const result = downsampleMetric(series, normalized, 'loss');
    const breaks = result.line.filter((point) => point.kind === 'gap-break');

    expect(breaks).toHaveLength(1);
    expect(breaks[0].step).toBe(5);
    expect(breaks[0].value).toBeNull();
    expect(result.line.filter((point) => point.kind === 'value')).toHaveLength(5);
    expect(series.step).toHaveLength(5);
  });

  it('rejects non-finite X coordinates and misaligned metric arrays', () => {
    const nonFiniteStep = makeSeries([0, Number.NaN], [1, 0.5]);
    expect(() => normalizeSeries(nonFiniteStep)).toThrow(/Step at source index 1 must be finite/);

    const misaligned = makeSeries([0, 1], [1, 0.5]);
    misaligned.lr = Float64Array.from([0.01]);
    expect(() => normalizeSeries(misaligned)).toThrow(/Metric "lr" has 1 values, but step has 2/);
  });

  it('rejects an invalid expected step interval instead of guessing a gap policy', () => {
    const series = makeSeries([0, 1], [1, 0.5]);
    series.expectedStepInterval = 0;
    expect(() => normalizeSeries(series)).toThrow(/expectedStepInterval must be a finite positive number/);
  });
  it('reports zero source observations when the requested viewport is empty or outside the data', () => {
    const series = makeSeries([0, 1, 2], [1, 0.8, 0.6]);
    const normalized = normalizeSeries(series);
    const reversed = downsampleMetric(series, normalized, 'loss', { startStep: 2, endStep: 1 });
    const outside = downsampleMetric(series, normalized, 'loss', { startStep: 10, endStep: 20 });
    expect(reversed.sourcePointCount).toBe(0);
    expect(outside.sourcePointCount).toBe(0);
    expect(reversed.renderedPointCount).toBe(0);
    expect(outside.renderedPointCount).toBe(0);
  });

  it('rejects non-finite viewports and invalid pixel sampling settings', () => {
    const series = makeSeries([0, 1, 2], [1, 0.8, 0.6]);
    const normalized = normalizeSeries(series);
    expect(() => downsampleMetric(series, normalized, 'loss', { startStep: Number.NaN })).toThrow(/Viewport startStep and endStep must be finite/);
    expect(() => downsampleMetric(series, normalized, 'loss', { pixelWidth: Number.POSITIVE_INFINITY })).toThrow(/pixelWidth must be a finite positive number/);
    expect(() => downsampleMetric(series, normalized, 'loss', { pointsPerPixel: 0 })).toThrow(/pointsPerPixel must be a finite positive number/);
  });

  it('does not mutate any source typed array during normalization or downsampling', () => {
    const series = makeSeries(
      [0, 1, 2, 3, 4, 5],
      [1, 0.9, Number.NaN, 0.7, 0.6, 0.5],
      [0.01, 0.009, 0.008, 0.007, 0.006, 0.005],
      [1, 0.95, 0.9, 0.85, 0.8, 0.75],
    );
    const snapshots = {
      step: Array.from(series.step), loss: Array.from(series.loss),
      lr: Array.from(series.lr), gradNorm: Array.from(series.gradNorm),
    };
    const normalized = normalizeSeries(series);
    for (const metric of ['loss', 'lr', 'gradNorm'] as const) {
      downsampleMetric(series, normalized, metric, { pixelWidth: 320 });
    }
    expect(Array.from(series.step)).toEqual(snapshots.step);
    expect(Array.from(series.loss)).toEqual(snapshots.loss);
    expect(Array.from(series.lr)).toEqual(snapshots.lr);
    expect(Array.from(series.gradNorm)).toEqual(snapshots.gradNorm);
  });

});
