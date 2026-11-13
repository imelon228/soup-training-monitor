import { describe, expect, it } from 'vitest';
import { formatAxisTick, formatTooltipValue } from '../src/domain/formatters';

describe('metric formatters', () => {
  it('formats axis ticks without changing the underlying metric value', () => {
    expect(formatAxisTick(1_000_000)).toBe('1.0M');
    expect(formatAxisTick(12_500)).toBe('13k');
    expect(formatAxisTick(0.00024)).toBe('2.4e-4');
  });

  it('uses a round-trippable decimal string for tooltip values', () => {
    const value = 0.12345678912345678;
    expect(formatTooltipValue(value)).toBe(value.toString());
    expect(Number(formatTooltipValue(value))).toBe(value);
  });

  it('renders NaN and infinities explicitly', () => {
    expect(formatTooltipValue(Number.NaN)).toBe('NaN');
    expect(formatTooltipValue(Number.POSITIVE_INFINITY)).toBe('+Infinity');
    expect(formatTooltipValue(Number.NEGATIVE_INFINITY)).toBe('-Infinity');
  });
});
