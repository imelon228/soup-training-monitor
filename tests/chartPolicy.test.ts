import { describe, expect, it } from 'vitest';
import { buildFiniteDuplicateScatterData, CHART_AXIS_NAMES, CHART_INTEGRITY_POLICY } from '../src/domain/chartPolicy';

describe('chart data-integrity policy', () => {
  it('does not enable ECharts sampling and prevents smoothing or connecting across nulls', () => {
    expect(CHART_INTEGRITY_POLICY.samplingEnabled).toBe(false);
    expect(CHART_INTEGRITY_POLICY.lineSeries).toEqual({ smooth: false, connectNulls: false });
    expect(CHART_INTEGRITY_POLICY.lineSeries).not.toHaveProperty('sampling');
  });

  it('uses a linear value axis so zero and negative values remain representable', () => {
    expect(CHART_INTEGRITY_POLICY.axisType).toBe('value');
  });

  it('keeps non-finite duplicate readings out of ECharts scatter coordinates without discarding source records', () => {
    const sourceDuplicates = [
      { step: 1, value: 0.8, sourceIndex: 10 },
      { step: 1, value: Number.NaN, sourceIndex: 11 },
      { step: 2, value: Number.POSITIVE_INFINITY, sourceIndex: 12 },
    ];
    expect(buildFiniteDuplicateScatterData(sourceDuplicates)).toEqual([[1, 0.8, 10]]);
    expect(sourceDuplicates).toHaveLength(3);
  });

  it('labels X and Y axes explicitly for every metric', () => {
    expect(CHART_AXIS_NAMES.loss).toEqual({ x: 'TRAINING STEP', y: 'LOSS' });
    expect(CHART_AXIS_NAMES.lr).toEqual({ x: 'TRAINING STEP', y: 'LEARNING RATE' });
    expect(CHART_AXIS_NAMES.gradNorm).toEqual({ x: 'TRAINING STEP', y: 'GRADIENT NORM' });
  });
});
