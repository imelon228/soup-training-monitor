/// <reference lib="webworker" />
import { generateRunSeries } from '../data/generator';

interface WorkerRequest {
  id: string;
  count?: number;
}

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const { id, count } = event.data;
  try {
    const series = generateRunSeries(id, count);
    const transfer: Transferable[] = [series.step.buffer as ArrayBuffer, series.loss.buffer as ArrayBuffer, series.lr.buffer as ArrayBuffer, series.gradNorm.buffer as ArrayBuffer];
    self.postMessage({ id, series: {
      step: series.step,
      loss: series.loss,
      lr: series.lr,
      gradNorm: series.gradNorm,
      expectedStepInterval: series.expectedStepInterval,
      spikeIndex: series.spikeIndex,
    } }, transfer);
  } catch (error) {
    self.postMessage({ id, error: error instanceof Error ? error.message : 'Unknown worker error' });
  }
};
