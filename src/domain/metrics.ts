import type { MetricKey, NormalizedSeries, TrainingSeries } from './types';
import { sourceIndexAt } from './normalizeData';

export interface RunMetrics {
  initialLoss: number | null;
  lastFiniteLoss: number | null;
  minLoss: number | null;
  currentLr: number | null;
  currentGradNorm: number | null;
  validPoints: number;
  invalidPoints: number;
  invalidValues: number;
  totalPoints: number;
  duplicateSteps: number;
  missingSteps: number;
}

function firstFinite(series: TrainingSeries, normalized: NormalizedSeries, metric: MetricKey): number | null {
  const values = series[metric];
  for (let position = 0; position < normalized.pointCount; position += 1) {
    const value = values[sourceIndexAt(normalized, position)];
    if (Number.isFinite(value)) return value;
  }
  return null;
}

function lastFinite(series: TrainingSeries, normalized: NormalizedSeries, metric: MetricKey): number | null {
  const values = series[metric];
  for (let position = normalized.pointCount - 1; position >= 0; position -= 1) {
    const value = values[sourceIndexAt(normalized, position)];
    if (Number.isFinite(value)) return value;
  }
  return null;
}

function minimumFinite(series: TrainingSeries, metric: MetricKey): number | null {
  let minimum = Number.POSITIVE_INFINITY;
  for (const value of series[metric]) if (Number.isFinite(value)) minimum = Math.min(minimum, value);
  return Number.isFinite(minimum) ? minimum : null;
}

export function calculateRunMetrics(series: TrainingSeries, normalized: NormalizedSeries): RunMetrics {
  const invalidValues = normalized.invalidByMetric.loss.length
    + normalized.invalidByMetric.lr.length
    + normalized.invalidByMetric.gradNorm.length;
  const invalidIndices = new Set<number>([
    ...normalized.invalidByMetric.loss,
    ...normalized.invalidByMetric.lr,
    ...normalized.invalidByMetric.gradNorm,
  ]);
  return {
    initialLoss: firstFinite(series, normalized, 'loss'),
    lastFiniteLoss: lastFinite(series, normalized, 'loss'),
    minLoss: minimumFinite(series, 'loss'),
    currentLr: lastFinite(series, normalized, 'lr'),
    currentGradNorm: lastFinite(series, normalized, 'gradNorm'),
    validPoints: Math.max(0, series.step.length - invalidIndices.size),
    invalidPoints: invalidIndices.size,
    invalidValues,
    totalPoints: series.step.length,
    duplicateSteps: normalized.duplicateGroups.length,
    missingSteps: normalized.gaps.reduce((total, gap) => total + gap.missingCount, 0),
  };
}
