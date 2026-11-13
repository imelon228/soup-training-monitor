import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadRunData } from '../src/data/mockDataService';
import { useRunDetails } from '../src/hooks/useRunDetails';
import type { RunDataResponse, TrainingSeries } from '../src/domain/types';

vi.mock('../src/data/mockDataService', () => ({
  loadRunData: vi.fn(),
}));

const loadRunDataMock = vi.mocked(loadRunData);

function makeSeries(finalLoss: number): TrainingSeries {
  return {
    step: Float64Array.from([0, 1, 2]),
    loss: Float64Array.from([1, 0.7, finalLoss]),
    lr: Float64Array.from([0.01, 0.005, 0.001]),
    gradNorm: Float64Array.from([1.1, 0.9, 0.7]),
    expectedStepInterval: 1,
  };
}

describe('useRunDetails request ordering', () => {
  beforeEach(() => loadRunDataMock.mockReset());

  it('does not let an older run response overwrite the latest selected run', async () => {
    const pending = new Map<string, {
      resolve: (response: RunDataResponse) => void;
      signal?: AbortSignal;
    }>();

    loadRunDataMock.mockImplementation((id, signal) => new Promise<RunDataResponse>((resolve) => {
      // Deliberately ignore abort in this mock so the test can simulate a late
      // response from a service that cannot cancel work already in flight.
      pending.set(id, { resolve, signal });
    }));

    const { result, rerender } = renderHook(
      ({ runId }: { runId: string }) => useRunDetails(runId),
      { initialProps: { runId: 'run-001' } },
    );

    await waitFor(() => expect(pending.has('run-001')).toBe(true));
    rerender({ runId: 'run-002' });
    await waitFor(() => expect(pending.has('run-002')).toBe(true));

    const first = pending.get('run-001')!;
    const second = pending.get('run-002')!;
    expect(first.signal?.aborted).toBe(true);

    const secondSeries = makeSeries(0.25);
    act(() => second.resolve({ id: 'run-002', series: secondSeries }));
    await waitFor(() => expect(result.current.series).toBe(secondSeries));

    // The aborted request now resolves anyway; the hook must ignore it.
    const firstSeries = makeSeries(0.99);
    await act(async () => {
      first.resolve({ id: 'run-001', series: firstSeries });
      await Promise.resolve();
    });

    expect(result.current.series).toBe(secondSeries);
    expect(result.current.metrics?.lastFiniteLoss).toBe(0.25);
  });
});
