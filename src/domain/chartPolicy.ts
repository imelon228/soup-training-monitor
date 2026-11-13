import type { DownsampleResult, MetricKey } from './types';

/** Non-negotiable chart settings for preserving source-data semantics. */
export const CHART_INTEGRITY_POLICY = {
  // ECharts enables built-in reduction only when a sampling mode is selected.
  // Do not add a `sampling` property: the viewport-aware Min-Max reducer owns reduction.
  samplingEnabled: false,
  lineSeries: {
    smooth: false,
    connectNulls: false,
  },
  axisType: 'value',
} as const;

export const CHART_AXIS_NAMES: Record<MetricKey, { x: string; y: string }> = {
  loss: { x: 'TRAINING STEP', y: 'LOSS' },
  lr: { x: 'TRAINING STEP', y: 'LEARNING RATE' },
  gradNorm: { x: 'TRAINING STEP', y: 'GRADIENT NORM' },
};


/** Scatter layers must contain finite coordinates only. The source duplicate
 * observations (including NaN/Infinity) remain in DownsampleResult for issue
 * inspection and tooltips, but must never be passed to the chart renderer.
 */
export function buildFiniteDuplicateScatterData(
  duplicates: DownsampleResult['duplicates'],
): Array<[number, number, number]> {
  return duplicates
    .filter((point) => Number.isFinite(point.step) && Number.isFinite(point.value))
    .map((point) => [point.step, point.value, point.sourceIndex]);
}
