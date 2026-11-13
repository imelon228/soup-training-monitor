import type { RunDataResponse } from '../domain/types';

let requestSequence = 0;

function finishWorkerMeasure(startMark: string, outcome: 'message' | 'error' | 'aborted'): void {
  if (typeof performance === 'undefined' || typeof performance.mark !== 'function' || typeof performance.measure !== 'function') return;
  const endMark = `${startMark}:end`;
  performance.mark(endMark);
  const measureName = `soup:worker:request-to-${outcome}`;
  // Keep the User Timing buffer bounded during repeated route changes.
  if (performance.getEntriesByName(measureName, 'measure').length >= 200) {
    performance.clearMeasures(measureName);
  }
  performance.measure(measureName, startMark, endMark);
  performance.clearMarks(startMark);
  performance.clearMarks(endMark);
}

export function loadRunData(id: string, signal?: AbortSignal): Promise<RunDataResponse> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('The operation was aborted.', 'AbortError'));
      return;
    }

    const requestId = ++requestSequence;
    const startMark = `soup:worker:${requestId}:start`;
    if (typeof performance !== 'undefined' && typeof performance.mark === 'function') performance.mark(startMark);

    let worker: Worker;
    try {
      worker = new Worker(new URL('../workers/runData.worker.ts', import.meta.url), { type: 'module' });
    } catch (error) {
      finishWorkerMeasure(startMark, 'error');
      reject(error instanceof Error ? error : new Error('Unable to create the data worker.'));
      return;
    }

    let settled = false;
    const cleanup = () => {
      worker.terminate();
      signal?.removeEventListener('abort', abort);
    };
    const settleOnce = (callback: () => void) => {
      if (settled) return;
      settled = true;
      callback();
    };
    const abort = () => settleOnce(() => {
      finishWorkerMeasure(startMark, 'aborted');
      cleanup();
      reject(new DOMException('The operation was aborted.', 'AbortError'));
    });

    signal?.addEventListener('abort', abort, { once: true });
    worker.onmessage = (event: MessageEvent) => settleOnce(() => {
      finishWorkerMeasure(startMark, 'message');
      cleanup();
      if (event.data.error) reject(new Error(String(event.data.error)));
      else resolve(event.data as RunDataResponse);
    });
    worker.onerror = (event) => settleOnce(() => {
      finishWorkerMeasure(startMark, 'error');
      cleanup();
      reject(new Error(event.message || 'Failed to generate training run data.'));
    });

    try {
      worker.postMessage({ id });
    } catch (error) {
      settleOnce(() => {
        finishWorkerMeasure(startMark, 'error');
        cleanup();
        reject(error instanceof Error ? error : new Error('Unable to request run data.'));
      });
    }
  });
}
