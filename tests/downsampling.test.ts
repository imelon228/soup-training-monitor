import { describe, expect, it } from 'vitest';
import { downsampleMetric } from '../src/domain/downsampling';
import { normalizeSeries } from '../src/domain/normalizeData';
import { generateRunSeries } from '../src/data/generator';
import type { TrainingSeries } from '../src/domain/types';

function seriesFrom(values: number[]): TrainingSeries {
  return {
    step: Float64Array.from(values.map((_, index) => index)),
    loss: Float64Array.from(values),
    lr: Float64Array.from(values.map(() => .0001)),
    gradNorm: Float64Array.from(values.map(() => 1)),
    expectedStepInterval: 1,
  };
}

describe('downsampleMetric', () => {
  it('preserves an isolated maximum spike in a million-point dataset across viewports containing it', () => {
    const series = generateRunSeries('run-020');
    const normalized = normalizeSeries(series);
    const spikeIndex = series.spikeIndex!;
    const spikeStep = series.step[spikeIndex];
    const ranges: Array<[number, number]> = [
      [0, series.step[series.step.length - 1]],
      [spikeStep - 100_000, spikeStep + 100_000],
      [spikeStep - 100, spikeStep + 100],
      [spikeStep - 5, spikeStep + 5],
      [spikeStep, spikeStep],
    ];
    for (const [startStep, endStep] of ranges) {
      const result = downsampleMetric(series, normalized, 'loss', { startStep, endStep, pixelWidth: 180 + (endStep - startStep) % 1_000, pointsPerPixel: 1 });
      expect(result.spikePreserved).toBe(true);
      expect(result.line.some((point) => point.sourceIndex === spikeIndex && point.value === series.loss[spikeIndex])).toBe(true);
    }
  });

  it('does not turn invalid values into zero and keeps line breaks', () => {
    const series = seriesFrom([1, .8, Number.NaN, .4, Number.POSITIVE_INFINITY, .2]);
    const normalized = normalizeSeries(series);
    const result = downsampleMetric(series, normalized, 'loss', { pixelWidth: 300 });
    expect(result.invalids).toHaveLength(2);
    expect(result.line.some((point) => point.kind === 'invalid' && point.value === null)).toBe(true);
    expect(result.line.some((point) => point.value === 0)).toBe(false);
  });

  it('preserves duplicate source readings as separate observations', () => {
    const series = { ...seriesFrom([1, .8, .7, .5]), step: Float64Array.from([0, 1, 1, 2]) };
    const result = downsampleMetric(series, normalizeSeries(series), 'loss', { pixelWidth: 300 });
    expect(result.duplicates).toHaveLength(2);
    expect(result.duplicates.map((point) => point.value)).toEqual([.8, .7]);
  });


  it('keeps a line break at a detected gap and does not synthesize missing records', () => {
    const series = { ...seriesFrom([1, .9, .8, .7, .6]), step: Float64Array.from([0, 1, 2, 8, 9]) };
    const result = downsampleMetric(series, normalizeSeries(series), 'loss', { pixelWidth: 300 });
    expect(result.line.some((point) => point.kind === 'gap-break' && point.value === null)).toBe(true);
    expect(series.step).toHaveLength(5);
  });

  it('does not mutate original source arrays during downsampling', () => {
    const series = seriesFrom([1, .8, .7, .6, .5]);
    const before = Array.from(series.loss);
    downsampleMetric(series, normalizeSeries(series), 'loss', { pixelWidth: 80 });
    expect(Array.from(series.loss)).toEqual(before);
  });

  it('returns no fabricated points for an empty viewport', () => {
    const series = seriesFrom([1, .8, .7]);
    const result = downsampleMetric(series, normalizeSeries(series), 'loss', { startStep: 20, endStep: 30 });
    expect(result.line).toHaveLength(0);
  });
});
