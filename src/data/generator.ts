import type { RunSummary, TrainingSeries } from '../domain/types';

export function mulberry32(seed: number): () => number {
  return function next() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const MODELS = ['Llama-3.1-8B', 'Qwen2.5-7B', 'Mistral-7B', 'Phi-3-mini', 'Gemma-2B'];
const STATUS_BY_RUN: RunSummary['status'][] = ['completed', 'completed', 'warning', 'completed', 'warning', 'completed', 'warning', 'running', 'warning', 'failed', 'warning', 'completed', 'completed', 'completed', 'completed', 'running', 'completed', 'warning', 'failed', 'warning'];

export function createRunManifest(): RunSummary[] {
  const now = Date.UTC(2026, 10, 13, 6, 0, 0);
  return Array.from({ length: 20 }, (_, index) => {
    const n = index + 1;
    const flags: RunSummary['flags'] = [];
    if ([3, 5, 18].includes(n)) flags.push('invalid');
    if ([7, 18].includes(n)) flags.push('duplicates');
    if ([9, 18].includes(n)) flags.push('unsorted');
    if ([11, 18].includes(n)) flags.push('gaps');
    if (n === 20) flags.push('outlier', 'large');
    const status = STATUS_BY_RUN[index];
    const id = `run-${String(n).padStart(3, '0')}`;
    // Keep the overview table truthful without eagerly allocating the million-point run.
    const preview = n === 20 ? null : generateRunSeries(id);
    const lastFiniteAtHighestStep = (metric: 'loss' | 'lr' | 'gradNorm'): number | null => {
      if (!preview) return null;
      let highestStep = Number.NEGATIVE_INFINITY;
      let lastValue: number | null = null;
      for (let point = 0; point < preview.step.length; point += 1) {
        const value = preview[metric][point];
        if (Number.isFinite(value) && preview.step[point] >= highestStep) {
          highestStep = preview.step[point];
          lastValue = value;
        }
      }
      return lastValue;
    };
    return {
      id,
      name: n === 20 ? 'llama-8b-long-context' : `experiment-${String(n).padStart(2, '0')}`,
      model: MODELS[index % MODELS.length],
      status,
      createdAt: new Date(now - n * 1000 * 60 * 47).toISOString(),
      durationSeconds: 480 + n * 93,
      totalSteps: n === 20 ? 1_000_000 : preview!.step.length,
      dataKind: n === 20 ? 'million' : 'standard',
      flags,
      lastLoss: lastFiniteAtHighestStep('loss'),
      lastLr: lastFiniteAtHighestStep('lr'),
      lastGradNorm: lastFiniteAtHighestStep('gradNorm'),
      description: n === 20
        ? 'One-million-point run with a deliberately planted loss spike; metrics load on demand.'
        : `Synthetic ${MODELS[index % MODELS.length]} fine-tuning run.`,
    } satisfies RunSummary;
  });
}

export function generateRunSeries(runId: string, count?: number): TrainingSeries {
  const runNumber = Number(runId.split('-')[1]) || 1;
  const isMillion = runId === 'run-020';
  const size = count ?? (isMillion ? 1_000_000 : 4_200 + (runNumber % 6) * 620);
  const random = mulberry32(0x51f15e + runNumber * 7919);
  const step = new Float64Array(size);
  const loss = new Float64Array(size);
  const lr = new Float64Array(size);
  const gradNorm = new Float64Array(size);
  const expectedStepInterval = runId === 'run-011' || runId === 'run-018' ? 2 : 1;

  let currentLoss = 1.45 + runNumber * 0.028;
  for (let i = 0; i < size; i += 1) {
    const progress = i / Math.max(1, size - 1);
    step[i] = i * expectedStepInterval;
    const decay = Math.exp(-progress * (2.6 + (runNumber % 4) * 0.3));
    currentLoss = 0.00014 + (1.2 + runNumber * 0.025) * decay + (random() - 0.49) * (0.014 + 0.018 * (1 - progress));
    loss[i] = Math.max(0.00002, currentLoss);
    const warmup = Math.min(1, progress * 9);
    const cosine = 0.5 * (1 + Math.cos(Math.PI * progress));
    lr[i] = (0.00014 + (runNumber % 5) * 0.000018) * warmup * cosine;
    gradNorm[i] = Math.max(0.02, 0.82 + Math.sin(progress * 25 + runNumber) * 0.13 + (random() - 0.5) * 0.17);
  }

  if (runId === 'run-003' && size > 100) {
    loss[Math.floor(size * 0.22)] = Number.NaN;
    loss[Math.floor(size * 0.71)] = Number.NaN;
  }
  if (runId === 'run-005' && size > 100) {
    loss[Math.floor(size * 0.61)] = Number.POSITIVE_INFINITY;
  }
  if ((runId === 'run-007' || runId === 'run-018') && size > 100) {
    const i = Math.floor(size * 0.35);
    step[i + 1] = step[i];
    loss[i + 1] = loss[i] * 1.22;
  }
  if ((runId === 'run-009' || runId === 'run-018') && size > 100) {
    const a = Math.floor(size * 0.25);
    const b = Math.floor(size * 0.25) + 1;
    const c = Math.floor(size * 0.25) + 2;
    [step[a], step[b], step[c]] = [step[c], step[a], step[b]];
  }
  if ((runId === 'run-011' || runId === 'run-018') && size > 100) {
    const start = Math.floor(size * 0.48);
    for (let i = start; i < Math.min(size, start + 5); i += 1) step[i] += 8;
  }
  if (runId === 'run-018' && size > 100) {
    loss[Math.floor(size * 0.8)] = Number.NEGATIVE_INFINITY;
  }

  let spikeIndex: number | undefined;
  if (isMillion && size > 10) {
    spikeIndex = Math.floor(size / 2);
    loss[spikeIndex] = 7.25;
  }

  return { step, loss, lr, gradNorm, expectedStepInterval, spikeIndex };
}

export function generateAllSeriesForTests(): TrainingSeries[] {
  return createRunManifest().map((run) => generateRunSeries(run.id, run.dataKind === 'million' ? 1_000_000 : 256));
}
