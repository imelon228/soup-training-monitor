import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronRight,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { useNavigate } from 'react-router-dom';
import type { RunStatus, RunSummary } from '../domain/types';
import { formatLocalDateTime } from '../domain/formatters';
import { StatusBadge } from './StatusBadge';

const numberFormatter = new Intl.NumberFormat(undefined, {
  maximumSignificantDigits: 6,
});

function formatNumber(value: number | null, deferred = false): string {
  if (value === null) return deferred ? 'DEFERRED' : 'N/A';
  if (!Number.isFinite(value)) return 'INVALID';
  return numberFormatter.format(value);
}

type SortKey =
  | 'id'
  | 'model'
  | 'status'
  | 'lastLoss'
  | 'lastLr'
  | 'lastGradNorm'
  | 'totalSteps'
  | 'createdAt';

type SortDirection = 'asc' | 'desc';

const SORT_HEADERS: Array<{ key: SortKey; label: string }> = [
  { key: 'id', label: 'RUN' },
  { key: 'model', label: 'MODEL' },
  { key: 'status', label: 'STATUS' },
  { key: 'lastLoss', label: 'LOSS' },
  { key: 'lastLr', label: 'LR' },
  { key: 'lastGradNorm', label: 'GRAD NORM' },
  { key: 'totalSteps', label: 'STEPS' },
  { key: 'createdAt', label: 'CREATED' },
];

function compareRunValues(
  left: RunSummary[SortKey],
  right: RunSummary[SortKey],
): number {
  // Missing metrics remain at the bottom in either sort direction. They are
  // not coerced to zero, because zero is a real measurement.
  const leftMissing = left === null || left === undefined || left === '';
  const rightMissing = right === null || right === undefined || right === '';

  if (leftMissing && rightMissing) return 0;
  if (leftMissing) return 1;
  if (rightMissing) return -1;

  if (typeof left === 'number' && typeof right === 'number') {
    return left - right;
  }

  return String(left).localeCompare(String(right), undefined, {
    numeric: true,
    sensitivity: 'base',
  });
}

export function RunTable({ runs }: { runs: RunSummary[] }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<RunStatus | 'all'>('all');
  const [sortKey, setSortKey] = useState<SortKey>('createdAt');
  const [direction, setDirection] = useState<SortDirection>('desc');
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Listen on window (not document): this also works when the shortcut is
    // dispatched globally by the browser or by keyboard-shortcut test tools.
    const onShortcut = (event: KeyboardEvent) => {
      const isSearchShortcut =
        (event.ctrlKey || event.metaKey) &&
        event.key.toLowerCase() === 'k' &&
        !event.altKey &&
        !event.isComposing;

      if (!isSearchShortcut) return;

      event.preventDefault();
      searchRef.current?.focus();
    };

    window.addEventListener('keydown', onShortcut, true);
    return () => window.removeEventListener('keydown', onShortcut, true);
  }, []);

  const filteredRuns = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();

    return runs
      .filter((run) => filter === 'all' || run.status === filter)
      .filter((run) => {
        if (!normalizedQuery) return true;
        return `${run.id} ${run.name} ${run.model}`
          .toLocaleLowerCase()
          .includes(normalizedQuery);
      })
      .sort((left, right) => {
        const result = compareRunValues(left[sortKey], right[sortKey]);
        return direction === 'asc' ? result : -result;
      });
  }, [runs, filter, query, sortKey, direction]);

  const sort = (key: SortKey) => {
    if (sortKey === key) {
      setDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSortKey(key);
    setDirection('asc');
  };

  const sortIcon = (key: SortKey) => {
    if (sortKey !== key) {
      return <ArrowUpDown size={12} aria-hidden="true" />;
    }

    return direction === 'asc' ? (
      <ArrowUp size={12} aria-hidden="true" />
    ) : (
      <ArrowDown size={12} aria-hidden="true" />
    );
  };

  const openRun = (runId: string) => {
    navigate(`/runs/${runId}`);
  };

  const onRunRowKeyDown = (
    event: ReactKeyboardEvent<HTMLTableRowElement>,
    runId: string,
  ) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;

    // Do not steal keyboard events from interactive controls nested in a row.
    // Comparing with currentTarget avoids relying on a global HTMLElement
    // constructor (which can differ across browser/JS-DOM realms).
    const target = event.target;
    if (
      target !== event.currentTarget &&
      target instanceof Element &&
      target.closest('button, a, input, select, textarea, [contenteditable="true"]')
    ) {
      return;
    }

    event.preventDefault();
    openRun(runId);
  };

  return (
    <section className="panel runs-panel" aria-labelledby="training-runs-heading">
      <div className="panel-header runs-panel-header">
        <div>
          <div className="panel-kicker">EXPERIMENT REGISTRY</div>
          <h2 id="training-runs-heading">
            Training runs <span className="inline-count">{filteredRuns.length}</span>
          </h2>
        </div>

        <div className="table-tools">
          <label className="search-field">
            <Search size={15} aria-hidden="true" />
            <input
              ref={searchRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search runs..."
              aria-label="Search training runs"
              aria-keyshortcuts="Control+K Meta+K"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label="Clear search"
              >
                <X size={13} aria-hidden="true" />
              </button>
            )}
            <kbd aria-hidden="true">Ctrl K</kbd>
          </label>

          <label className="filter-select">
            <SlidersHorizontal size={14} aria-hidden="true" />
            <select
              value={filter}
              onChange={(event) =>
                setFilter(event.target.value as RunStatus | 'all')
              }
              aria-label="Filter by status"
            >
              <option value="all">All status</option>
              <option value="running">Running</option>
              <option value="completed">Completed</option>
              <option value="warning">Warning</option>
              <option value="failed">Failed</option>
            </select>
          </label>
        </div>
      </div>

      <div className="table-scroll">
        <table className="runs-table" aria-label="Training runs">
          <caption className="sr-only">
            Training runs. Activate a column heading to change sorting. Focus a
            run row and press Enter or Space to open it.
          </caption>
          <thead>
            <tr>
              {SORT_HEADERS.map(({ key, label }) => (
                <th
                  key={key}
                  scope="col"
                  aria-label={label}
                  aria-sort={
                    sortKey === key
                      ? direction === 'asc'
                        ? 'ascending'
                        : 'descending'
                      : undefined
                  }
                >
                  <button
                    type="button"
                    aria-label={`Sort by ${key}`}
                    aria-pressed={sortKey === key}
                    onClick={() => sort(key)}
                  >
                    {label} <span>{sortIcon(key)}</span>
                  </button>
                </th>
              ))}
              <th scope="col" aria-label="Open run details">
                <span className="sr-only">Open run details</span>
              </th>
            </tr>
          </thead>

          <tbody>
            {filteredRuns.map((run) => (
              <tr
                key={run.id}
                tabIndex={0}
                aria-label={`Open run ${run.id}, ${run.name}`}
                aria-keyshortcuts="Enter Space"
                onClick={() => openRun(run.id)}
                onKeyDown={(event) => onRunRowKeyDown(event, run.id)}
              >
                <td>
                  <div className="run-id">
                    <span className="run-id-mark" aria-hidden="true">
                      {run.dataKind === 'million' ? '∞' : '↗'}
                    </span>
                    <div>
                      <strong>{run.id}</strong>
                      <small>{run.name}</small>
                    </div>
                  </div>
                </td>
                <td className="model-cell">{run.model}</td>
                <td><StatusBadge status={run.status} /></td>
                <td>
                  <span
                    className={`table-metric ${run.lastLoss === null ? 'metric-invalid' : ''}`}
                  >
                    {formatNumber(run.lastLoss, run.dataKind === 'million')}
                  </span>
                  {run.flags.includes('invalid') && (
                    <span className="tiny-alert" title="Contains invalid values">
                      !
                    </span>
                  )}
                </td>
                <td className="mono table-muted">
                  {formatNumber(run.lastLr, run.dataKind === 'million')}
                </td>
                <td className="mono table-muted">
                  {formatNumber(run.lastGradNorm, run.dataKind === 'million')}
                </td>
                <td className="mono table-muted">
                  {run.totalSteps.toLocaleString()}
                </td>
                <td
                  className="created-cell"
                  title={new Date(run.createdAt).toISOString()}
                >
                  {formatLocalDateTime(run.createdAt)}
                </td>
                <td>
                  <ChevronRight size={15} className="row-chevron" aria-hidden="true" />
                </td>
              </tr>
            ))}

            {filteredRuns.length === 0 && (
              <tr>
                <td colSpan={9}>
                  <div className="empty-state">
                    <div className="empty-state-icon" aria-hidden="true">⌕</div>
                    <strong>No runs found</strong>
                    <span>Try changing the search or filter.</span>
                    <button
                      type="button"
                      className="text-button"
                      onClick={() => {
                        setQuery('');
                        setFilter('all');
                      }}
                    >
                      Reset filters
                    </button>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="table-footer">
        <span>
          Showing <strong>{filteredRuns.length}</strong> of {runs.length} runs
        </span>
        <span className="table-footer-note">
          <span className="status-dot status-dot-green" aria-hidden="true" />
          Data generated locally · deterministic seed
        </span>
      </div>
    </section>
  );
}
