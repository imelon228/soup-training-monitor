export type RunStatus = 'running' | 'completed' | 'warning' | 'failed';
export type MetricKey = 'loss' | 'lr' | 'gradNorm';
export type DataIssue = 'invalid' | 'duplicates' | 'gaps' | 'unsorted' | 'outlier' | 'large';

export interface RunSummary {
  id: string;
  name: string;
  model: string;
  status: RunStatus;
  createdAt: string;
  durationSeconds: number;
  totalSteps: number;
  dataKind: 'standard' | 'million';
  flags: DataIssue[];
  lastLoss: number | null;
  lastLr: number | null;
  lastGradNorm: number | null;
  description: string;
}

export interface TrainingSeries {
  step: Float64Array;
  loss: Float64Array;
  lr: Float64Array;
  gradNorm: Float64Array;
  expectedStepInterval: number;
  spikeIndex?: number;
}

export interface DuplicateGroup {
  step: number;
  sourceIndices: number[];
  values: number[];
}

export interface GapRange {
  fromStep: number;
  toStep: number;
  missingCount: number;
  leftSourceIndex: number;
  rightSourceIndex: number;
}

export interface NormalizedSeries {
  order: Uint32Array | null;
  isSorted: boolean;
  invalidByMetric: Record<MetricKey, number[]>;
  duplicateGroups: DuplicateGroup[];
  gaps: GapRange[];
  minStep: number;
  maxStep: number;
  pointCount: number;
}

export interface RenderPoint {
  step: number;
  value: number | null;
  sourceIndex: number;
  kind: 'value' | 'invalid' | 'duplicate-break' | 'gap-break';
  rawValue?: number;
}

export interface DownsampleResult {
  line: RenderPoint[];
  duplicates: Array<{ step: number; value: number; sourceIndex: number }>;
  invalids: Array<{ step: number; value: number; sourceIndex: number }>;
  sourcePointCount: number;
  renderedPointCount: number;
  spikePreserved: boolean;
}

export interface RunDataResponse {
  id: string;
  series: TrainingSeries;
}
