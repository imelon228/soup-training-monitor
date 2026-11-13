import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadRunData } from '../src/data/mockDataService';
import type { RunDataResponse, TrainingSeries } from '../src/domain/types';

class MockWorker {
  static instance!: MockWorker;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  terminated = false;
  posted?: unknown;

  constructor() { MockWorker.instance = this; }
  postMessage(payload: unknown) { this.posted = payload; }
  terminate() { this.terminated = true; }
  emitMessage(data: unknown) { this.onmessage?.({ data } as MessageEvent); }
  emitError(message: string) { this.onerror?.({ message } as ErrorEvent); }
}

const series: TrainingSeries = {
  step: Float64Array.from([0, 1]),
  loss: Float64Array.from([1, 0.5]),
  lr: Float64Array.from([0.01, 0.005]),
  gradNorm: Float64Array.from([1, 0.8]),
  expectedStepInterval: 1,
};

afterEach(() => vi.unstubAllGlobals());

describe('worker-backed run data service', () => {
  it('posts the selected run, resolves the response and terminates the worker', async () => {
    vi.stubGlobal('Worker', MockWorker as unknown as typeof Worker);
    const promise = loadRunData('run-001');
    const worker = MockWorker.instance;
    expect(worker.posted).toEqual({ id: 'run-001' });

    const response: RunDataResponse = { id: 'run-001', series };
    worker.emitMessage(response);

    await expect(promise).resolves.toEqual(response);
    expect(worker.terminated).toBe(true);
  });

  it('rejects an aborted request and terminates the worker', async () => {
    vi.stubGlobal('Worker', MockWorker as unknown as typeof Worker);
    const controller = new AbortController();
    const promise = loadRunData('run-020', controller.signal);
    const worker = MockWorker.instance;

    controller.abort();

    await expect(promise).rejects.toMatchObject({ name: 'AbortError' });
    expect(worker.terminated).toBe(true);
  });

  it('rejects worker failures and still terminates the worker', async () => {
    vi.stubGlobal('Worker', MockWorker as unknown as typeof Worker);
    const promise = loadRunData('run-001');
    const worker = MockWorker.instance;

    worker.emitError('worker crashed');

    await expect(promise).rejects.toThrow('worker crashed');
    expect(worker.terminated).toBe(true);
  });
});
