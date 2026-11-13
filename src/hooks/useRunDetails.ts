import { useEffect, useMemo, useRef, useState } from 'react';
import { loadRunData } from '../data/mockDataService';
import { normalizeSeries } from '../domain/normalizeData';
import { calculateRunMetrics } from '../domain/metrics';
import { LatestRequestGate } from '../domain/asyncGate';
import type { NormalizedSeries, RunMetrics, TrainingSeries } from '../domain/types';

interface RunDetailsState {
  series: TrainingSeries | null;
  loading: boolean;
  error: string | null;
}

export function useRunDetails(runId: string) {
  const [state, setState] = useState<RunDetailsState>({ series: null, loading: true, error: null });
  const gate = useRef(new LatestRequestGate());

  useEffect(() => {
    const controller = new AbortController();
    const requestId = gate.current.next();
    setState({ series: null, loading: true, error: null });
    loadRunData(runId, controller.signal)
      .then((response) => {
        if (gate.current.isCurrent(requestId)) setState({ series: response.series, loading: false, error: null });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted || !gate.current.isCurrent(requestId)) return;
        setState({ series: null, loading: false, error: error instanceof Error ? error.message : 'Unable to load this run.' });
      });
    return () => {
      controller.abort();
      gate.current.invalidate();
    };
  }, [runId]);

  const normalized = useMemo<NormalizedSeries | null>(() => state.series ? normalizeSeries(state.series) : null, [state.series]);
  const metrics = useMemo<RunMetrics | null>(
    () => state.series && normalized ? calculateRunMetrics(state.series, normalized) : null,
    [state.series, normalized],
  );
  return { ...state, normalized, metrics };
}
