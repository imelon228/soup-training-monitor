import { describe, expect, it } from 'vitest';
import { createRunManifest, generateRunSeries } from '../src/data/generator';

describe('synthetic run generator', () => {
  it('creates exactly 20 uniquely identified training runs', () => {
    const runs = createRunManifest();
    expect(runs).toHaveLength(20);
    expect(new Set(runs.map((run) => run.id)).size).toBe(20);
  });

  it('creates exactly one million points and plants one midpoint spike', () => {
    const series = generateRunSeries('run-020');
    expect(series.step).toHaveLength(1_000_000);
    expect(series.loss).toHaveLength(1_000_000);
    expect(series.spikeIndex).toBe(500_000);
    expect(series.loss[500_000]).toBe(7.25);
  });

  it('is deterministic for a given run ID', () => {
    const first = generateRunSeries('run-002', 256);
    const second = generateRunSeries('run-002', 256);
    expect(Array.from(first.loss)).toEqual(Array.from(second.loss));
    expect(Array.from(first.step)).toEqual(Array.from(second.step));
  });
});
