import { describe, expect, it } from 'vitest';
import { calculateRunMetrics } from '../src/domain/metrics';
import { normalizeSeries } from '../src/domain/normalizeData';
import type { TrainingSeries } from '../src/domain/types';

const makeSeries = (loss: number[]): TrainingSeries => ({
  step: Float64Array.from(loss.map((_, index) => index)),
  loss: Float64Array.from(loss),
  lr: Float64Array.from([.01, .005, .001].slice(0, loss.length)),
  gradNorm: Float64Array.from([1.2, 1.1, .8].slice(0, loss.length)),
  expectedStepInterval: 1,
});

describe('calculateRunMetrics', () => {
  it('uses last finite loss when the last record is invalid', () => {
    const series = makeSeries([1, .5, Number.NaN]);
    const result = calculateRunMetrics(series, normalizeSeries(series));
    expect(result.initialLoss).toBe(1);
    expect(result.lastFiniteLoss).toBe(.5);
    expect(result.invalidValues).toBe(1);
    expect(result.invalidPoints).toBe(1);
  });

  it('does not invent values when all loss values are invalid', () => {
    const series = makeSeries([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]);
    const result = calculateRunMetrics(series, normalizeSeries(series));
    expect(result.initialLoss).toBeNull();
    expect(result.lastFiniteLoss).toBeNull();
    expect(result.minLoss).toBeNull();
  });

  it('handles an empty dataset', () => {
    const series = makeSeries([]);
    const result = calculateRunMetrics(series, normalizeSeries(series));
    expect(result.totalPoints).toBe(0);
    expect(result.validPoints).toBe(0);
  });
});
