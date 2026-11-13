import { formatRawValue } from './normalizeData';

export function formatAxisTick(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(0)}k`;
  if (Math.abs(value) < 0.001 && value !== 0) return value.toExponential(1);
  return Number(value.toPrecision(4)).toString();
}

export function formatTooltipValue(value: number): string {
  return formatRawValue(value);
}
