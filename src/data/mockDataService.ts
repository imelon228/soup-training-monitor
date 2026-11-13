import type { RunDataResponse } from '../domain/types';

export function loadRunData(id: string, signal?: AbortSignal): Promise<RunDataResponse> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('The operation was aborted.', 'AbortError'));
      return;
    }
    const worker = new Worker(new URL('../workers/runData.worker.ts', import.meta.url), { type: 'module' });
    const cleanup = () => {
      worker.terminate();
      signal?.removeEventListener('abort', abort);
    };
    const abort = () => {
      cleanup();
      reject(new DOMException('The operation was aborted.', 'AbortError'));
    };
    signal?.addEventListener('abort', abort, { once: true });
    worker.onmessage = (event: MessageEvent) => {
      cleanup();
      if (event.data.error) reject(new Error(event.data.error));
      else resolve(event.data as RunDataResponse);
    };
    worker.onerror = (event) => {
      cleanup();
      reject(new Error(event.message || 'Failed to generate training run data.'));
    };
    worker.postMessage({ id });
  });
}
