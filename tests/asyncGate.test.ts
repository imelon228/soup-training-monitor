import { describe, expect, it } from 'vitest';
import { LatestRequestGate } from '../src/domain/asyncGate';

describe('LatestRequestGate', () => {
  it('does not allow an older async request to overwrite a newer selection', async () => {
    const gate = new LatestRequestGate();
    let rendered = '';
    const olderId = gate.next();
    const older = new Promise<string>((resolve) => setTimeout(() => resolve('run-A'), 25))
      .then((value) => { if (gate.isCurrent(olderId)) rendered = value; });
    const newerId = gate.next();
    const newer = Promise.resolve('run-B')
      .then((value) => { if (gate.isCurrent(newerId)) rendered = value; });
    await Promise.all([older, newer]);
    expect(rendered).toBe('run-B');
  });

  it('invalidates pending requests on unmount or route change', () => {
    const gate = new LatestRequestGate();
    const request = gate.next();
    gate.invalidate();
    expect(gate.isCurrent(request)).toBe(false);
  });
});
