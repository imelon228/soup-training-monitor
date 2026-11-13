import { describe, expect, it } from 'vitest';
import { formatAxisTick, formatLocalDateTime, formatTooltipValue } from '../src/domain/formatters';

describe('metric formatters', () => {
  it('formats axis ticks without changing the underlying metric value', () => {
    expect(formatAxisTick(1_000_000)).toBe('1.0M');
    expect(formatAxisTick(12_500)).toBe('12.5k');
    expect(formatAxisTick(1_234_567)).toBe('1.2346M');
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


describe('locale and timezone formatting', () => {
  it('formats the same UTC instant in the explicitly requested timezone', () => {
    const instant = '2026-11-13T06:00:00.000Z';
    const utc = formatLocalDateTime(instant, 'en-US', 'UTC');
    const almaty = formatLocalDateTime(instant, 'en-US', 'Asia/Almaty');
    expect(utc).toContain('06:00 AM');
    expect(almaty).toContain('11:00 AM');
    expect(utc).not.toBe(almaty);
  });

  it('returns an explicit fallback for invalid timestamps', () => {
    expect(formatLocalDateTime('not-a-timestamp', 'en-US', 'UTC')).toBe('Invalid date');
  });
});
