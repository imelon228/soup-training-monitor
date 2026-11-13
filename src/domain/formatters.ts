import { formatRawValue } from './normalizeData';

/** Compact axis labels preserve substantially more precision than rounded k/M labels.
 * Tooltips must continue to use formatTooltipValue and therefore show raw values.
 */
export function formatAxisTick(value: number): string {
  if (!Number.isFinite(value)) return formatRawValue(value);
  const absolute = Math.abs(value);
  if (absolute >= 1_000_000) return `${formatScaled(value / 1_000_000)}M`;
  if (absolute >= 1_000) return `${formatScaled(value / 1_000)}k`;
  if (absolute !== 0 && absolute < 0.001) {
    const [mantissa, exponent] = value.toExponential(2).split('e');
    return `${Number(mantissa)}e${Number(exponent)}`;
  }
  return Number(value.toPrecision(5)).toString();
}

function formatScaled(value: number): string {
  const rounded = Number(value.toPrecision(5));
  const text = rounded.toString();
  return text.includes('.') || text.includes('e') ? text : `${text}.0`;
}

/** The shortest decimal representation that round-trips to the same JS number. */
export function formatTooltipValue(value: number): string {
  return formatRawValue(value);
}

/** Format an ISO timestamp in the viewer's locale and local timezone by default. */
export function formatLocalDateTime(
  isoTimestamp: string,
  locale?: string,
  timeZone?: string,
): string {
  const date = new Date(isoTimestamp);
  if (!Number.isFinite(date.getTime())) return 'Invalid date';
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric', month: 'short', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
    ...(timeZone ? { timeZone } : {}),
  }).format(date);
}
