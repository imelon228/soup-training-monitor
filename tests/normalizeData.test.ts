import { describe, expect, it } from 'vitest';
import { assertSeriesShape, normalizeSeries, sourceIndexAt } from '../src/domain/normalizeData';
import type { TrainingSeries } from '../src/domain/types';

function fixture(overrides: Partial<TrainingSeries> = {}): TrainingSeries {
  return {
    step: Float64Array.from([0, 1, 2, 3, 4]),
    loss: Float64Array.from([1, 0.8, 0.6, 0.4, 0.2]),
    lr: Float64Array.from([0.01, 0.01, 0.008, 0.006, 0.004]),
    gradNorm: Float64Array.from([1, 1.1, 0.9, 1.2, 1]),
    expectedStepInterval: 1,
    ...overrides,
  };
}

describe('normalizeSeries', () => {
  it('keeps NaN and infinities as invalid source indices rather than coercing them', () => {
    const series = fixture({ loss: Float64Array.from([1, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, 0.2]) });
    const normalized = normalizeSeries(series);
    expect(normalized.invalidByMetric.loss).toEqual([1, 2, 3]);
    expect(series.loss[1]).toBeNaN();
    expect(series.loss[2]).toBe(Number.POSITIVE_INFINITY);
    expect(series.loss[3]).toBe(Number.NEGATIVE_INFINITY);
  });

  it('stable-sorts unsorted steps without mutating the source arrays', () => {
    const series = fixture({ step: Float64Array.from([10, 12, 11, 14, 13]) });
    const original = Array.from(series.step);
    const normalized = normalizeSeries(series);
    expect(normalized.isSorted).toBe(false);
    expect(Array.from({ length: 5 }, (_, index) => series.step[sourceIndexAt(normalized, index)])).toEqual([10, 11, 12, 13, 14]);
    expect(Array.from(series.step)).toEqual(original);
    expect(normalized.order?.[1]).toBe(2);
  });

  it('detects duplicate steps and preserves all source indices', () => {
    const series = fixture({ step: Float64Array.from([0, 1, 1, 2, 3]), loss: Float64Array.from([1, .8, .7, .6, .5]) });
    const normalized = normalizeSeries(series);
    expect(normalized.duplicateGroups).toHaveLength(1);
    expect(normalized.duplicateGroups[0].step).toBe(1);
    expect(normalized.duplicateGroups[0].sourceIndices).toEqual([1, 2]);
    expect(normalized.duplicateGroups[0].values).toEqual([.8, .7]);
  });

  it('detects gaps using expectedStepInterval and does not fill them', () => {
    const series = fixture({ step: Float64Array.from([0, 1, 2, 7, 8]), expectedStepInterval: 1 });
    const normalized = normalizeSeries(series);
    expect(normalized.gaps).toEqual([expect.objectContaining({ fromStep: 2, toStep: 7, missingCount: 4 })]);
    expect(series.step.length).toBe(5);
  });

  it('rejects mismatched metric lengths and non-finite step coordinates', () => {
    const mismatched = fixture({ lr: Float64Array.from([0.01]) });
    expect(() => assertSeriesShape(mismatched)).toThrow(/Metric \"lr\"/);
    const invalidStep = fixture({ step: Float64Array.from([0, 1, Number.POSITIVE_INFINITY, 3, 4]) });
    expect(() => normalizeSeries(invalidStep)).toThrow(/Step at source index 2 must be finite/);
  });

  it('rejects non-positive expected step intervals', () => {
    const invalidInterval = fixture({ expectedStepInterval: -1 });
    expect(() => normalizeSeries(invalidInterval)).toThrow(/expectedStepInterval must be a finite positive number/);
  });

  it('handles an empty dataset', () => {
    const normalized = normalizeSeries(fixture({ step: new Float64Array(), loss: new Float64Array(), lr: new Float64Array(), gradNorm: new Float64Array() }));
    expect(normalized.pointCount).toBe(0);
    expect(normalized.minStep).toBe(0);
  });
});
