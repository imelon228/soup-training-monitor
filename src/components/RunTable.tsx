import { ArrowDown, ArrowUp, ArrowUpDown, ChevronRight, Search, SlidersHorizontal, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { RunStatus, RunSummary } from '../domain/types';
import { StatusBadge } from './StatusBadge';

const numberFormatter = new Intl.NumberFormat(undefined, { maximumSignificantDigits: 6 });
const formatNumber = (value: number | null, deferred = false) => value === null ? (deferred ? 'DEFERRED' : 'N/A') : numberFormatter.format(value);
const dateFormatter = new Intl.DateTimeFormat(undefined, { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' });

type SortKey = 'id' | 'model' | 'status' | 'lastLoss' | 'lastLr' | 'lastGradNorm' | 'totalSteps' | 'createdAt';

export function RunTable({ runs }: { runs: RunSummary[] }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<RunStatus | 'all'>('all');
  const [sortKey, setSortKey] = useState<SortKey>('createdAt');
  const [direction, setDirection] = useState<'asc' | 'desc'>('desc');
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onShortcut);
    return () => window.removeEventListener('keydown', onShortcut);
  }, []);

  const filteredRuns = useMemo(() => runs
    .filter((run) => filter === 'all' || run.status === filter)
    .filter((run) => `${run.id} ${run.name} ${run.model}`.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => {
      const av = a[sortKey] ?? '';
      const bv = b[sortKey] ?? '';
      const result = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv));
      return direction === 'asc' ? result : -result;
    }), [runs, filter, query, sortKey, direction]);

  const sort = (key: SortKey) => {
    if (sortKey === key) setDirection((value) => value === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setDirection('asc'); }
  };
  const sortIcon = (key: SortKey) => sortKey !== key ? <ArrowUpDown size={12} /> : direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />;

  return (
    <section className="panel runs-panel">
      <div className="panel-header runs-panel-header">
        <div><div className="panel-kicker">EXPERIMENT REGISTRY</div><h2>Training runs <span className="inline-count">{filteredRuns.length}</span></h2></div>
        <div className="table-tools">
          <label className="search-field"><Search size={15} /><input ref={searchRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search runs..." aria-label="Search training runs" />{query && <button onClick={() => setQuery('')} aria-label="Clear search"><X size={13} /></button>}<kbd>⌘ K</kbd></label>
          <label className="filter-select"><SlidersHorizontal size={14} /><select value={filter} onChange={(event) => setFilter(event.target.value as RunStatus | 'all')} aria-label="Filter by status"><option value="all">All status</option><option value="running">Running</option><option value="completed">Completed</option><option value="warning">Warning</option><option value="failed">Failed</option></select></label>
        </div>
      </div>
      <div className="table-scroll">
        <table className="runs-table">
          <thead><tr>
            <th><button onClick={() => sort('id')}>RUN <span>{sortIcon('id')}</span></button></th>
            <th><button onClick={() => sort('model')}>MODEL <span>{sortIcon('model')}</span></button></th>
            <th><button onClick={() => sort('status')}>STATUS <span>{sortIcon('status')}</span></button></th>
            <th><button onClick={() => sort('lastLoss')}>LOSS <span>{sortIcon('lastLoss')}</span></button></th>
            <th><button onClick={() => sort('lastLr')}>LR <span>{sortIcon('lastLr')}</span></button></th><th><button onClick={() => sort('lastGradNorm')}>GRAD NORM <span>{sortIcon('lastGradNorm')}</span></button></th>
            <th><button onClick={() => sort('totalSteps')}>STEPS <span>{sortIcon('totalSteps')}</span></button></th>
            <th><button onClick={() => sort('createdAt')}>CREATED <span>{sortIcon('createdAt')}</span></button></th>
            <th />
          </tr></thead>
          <tbody>
            {filteredRuns.map((run) => (
              <tr key={run.id} tabIndex={0} onClick={() => navigate(`/runs/${run.id}`)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); navigate(`/runs/${run.id}`); } }}>
                <td><div className="run-id"><span className="run-id-mark">{run.dataKind === 'million' ? '∞' : '↗'}</span><div><strong>{run.id}</strong><small>{run.name}</small></div></div></td>
                <td className="model-cell">{run.model}</td>
                <td><StatusBadge status={run.status} /></td>
                <td><span className={`table-metric ${run.lastLoss === null ? 'metric-invalid' : ''}`}>{formatNumber(run.lastLoss, run.dataKind === 'million')}</span>{run.flags.includes('invalid') && <span className="tiny-alert" title="Contains invalid values">!</span>}</td>
                <td className="mono table-muted">{formatNumber(run.lastLr, run.dataKind === 'million')}</td>
                <td className="mono table-muted">{formatNumber(run.lastGradNorm, run.dataKind === 'million')}</td>
                <td className="mono table-muted">{run.totalSteps.toLocaleString()}</td>
                <td className="created-cell">{dateFormatter.format(new Date(run.createdAt))}</td>
                <td><ChevronRight size={15} className="row-chevron" /></td>
              </tr>
            ))}
            {filteredRuns.length === 0 && <tr><td colSpan={9}><div className="empty-state"><div className="empty-state-icon">⌕</div><strong>No runs found</strong><span>Try changing the search or filter.</span><button className="text-button" onClick={() => { setQuery(''); setFilter('all'); }}>Reset filters</button></div></td></tr>}
          </tbody>
        </table>
      </div>
      <div className="table-footer"><span>Showing <strong>{filteredRuns.length}</strong> of {runs.length} runs</span><span className="table-footer-note"><span className="status-dot status-dot-green" /> Data generated locally · deterministic seed</span></div>
    </section>
  );
}
