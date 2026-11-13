import type { RunStatus } from '../domain/types';

const LABELS: Record<RunStatus, string> = {
  running: 'RUNNING',
  completed: 'COMPLETED',
  warning: 'WARNING',
  failed: 'FAILED',
};

export function StatusBadge({ status }: { status: RunStatus }) {
  return <span className={`status-badge status-${status}`}><span className="status-dot" />{LABELS[status]}</span>;
}
