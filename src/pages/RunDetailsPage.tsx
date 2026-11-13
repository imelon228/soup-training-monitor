import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, ArrowUpRight, CheckCircle2, ChevronDown, CircleHelp, Clock3, Database, Download, Info, ShieldAlert, Sparkles } from 'lucide-react';
import { RUNS } from '../data/manifest';
import { useRunDetails } from '../hooks/useRunDetails';
import { MetricChart } from '../components/MetricChart';
import { SummaryCard } from '../components/SummaryCard';
import { StatusBadge } from '../components/StatusBadge';
import { formatRawValue } from '../domain/normalizeData';
import type { MetricKey } from '../domain/types';


interface RawIssueRecord {
  sortStep: number;
  step: string;
  sourceIndex: string;
  field: string;
  value: string;
  issue: string;
}

const csvCell = (value: string) => `"${value.replaceAll('"', '""')}"`;
const formatMetric = (value: number | null) => value === null ? 'N/A' : formatRawValue(value);
const duration = (seconds: number) => `${Math.floor(seconds / 60)}m ${seconds % 60}s`;

export function RunDetailsPage({ isLight }: { isLight: boolean }) {
  const { runId = '' } = useParams();
  const run = RUNS.find((item) => item.id === runId);
  const { series, loading, error, normalized, metrics } = useRunDetails(runId);
  const [showRecords, setShowRecords] = useState(false);

  const issueRecords = useMemo<RawIssueRecord[]>(() => {
    if (!series || !normalized) return [];
    const rows: RawIssueRecord[] = [];
    for (const metric of ['loss', 'lr', 'gradNorm'] as MetricKey[]) {
      const field = metric === 'gradNorm' ? 'grad_norm' : metric;
      for (const sourceIndex of normalized.invalidByMetric[metric]) {
        rows.push({
          sortStep: series.step[sourceIndex], step: formatRawValue(series.step[sourceIndex]),
          sourceIndex: String(sourceIndex), field,
          value: formatRawValue(series[metric][sourceIndex]), issue: 'Non-finite value',
        });
      }
      for (const group of normalized.duplicateGroups) {
        for (const sourceIndex of group.sourceIndices) {
          rows.push({
            sortStep: group.step, step: formatRawValue(group.step), sourceIndex: String(sourceIndex), field,
            value: formatRawValue(series[metric][sourceIndex]), issue: 'Duplicate step',
          });
        }
      }
    }
    for (const gap of normalized.gaps) {
      rows.push({
        sortStep: gap.fromStep, step: `${formatRawValue(gap.fromStep)} → ${formatRawValue(gap.toStep)}`,
        sourceIndex: `${gap.leftSourceIndex} → ${gap.rightSourceIndex}`, field: 'step',
        value: `${gap.missingCount} expected step(s) missing`, issue: 'Missing range',
      });
    }
    if (!normalized.isSorted) {
      rows.push({ sortStep: Number.NEGATIVE_INFINITY, step: '—', sourceIndex: '—', field: 'step', value: 'Stable sorted view applied; source order unchanged', issue: 'Unsorted source order' });
    }
    if (series.spikeIndex !== undefined) {
      const sourceIndex = series.spikeIndex;
      rows.push({
        sortStep: series.step[sourceIndex], step: formatRawValue(series.step[sourceIndex]),
        sourceIndex: String(sourceIndex), field: 'loss', value: formatRawValue(series.loss[sourceIndex]),
        issue: 'Known planted outlier',
      });
    }
    return rows.sort((a, b) => a.sortStep - b.sortStep || a.sourceIndex.localeCompare(b.sourceIndex));
  }, [series, normalized]);

  const downloadIssueRecords = () => {
    if (!issueRecords.length || !run) return;
    const headers = ['step', 'source_index', 'field', 'raw_value', 'issue'];
    const rows = issueRecords.map((record) => [record.step, record.sourceIndex, record.field, record.value, record.issue]);
    const csv = [headers, ...rows].map((row) => row.map((cell) => csvCell(cell)).join(',')).join('\r\n');
    const blobUrl = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = blobUrl;
    anchor.download = `${run.id}-data-issues.csv`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(blobUrl), 0);
  };

  if (!run) return <div className="page-content"><div className="not-found panel"><h2>Run not found</h2><p>This run ID is not present in the local dataset.</p><Link className="button-primary" to="/">Back to overview</Link></div></div>;

  if (loading) return <div className="page-content"><div className="page-heading compact-heading"><div><div className="eyebrow">RUN DETAILS / {run.id}</div><h1>Loading run<span className="heading-period">.</span></h1></div></div><div className="loading-panel panel"><div className="loading-bar" /><div className="loading-bar short" /><div className="loading-grid"><div /><div /><div /></div><div className="loading-chart" /><p>Generating deterministic run data in a background worker…</p></div></div>;
  if (error || !series || !normalized || !metrics) return <div className="page-content"><div className="error-panel panel"><AlertTriangle size={22} /><h2>Unable to load run data</h2><p>{error ?? 'The data worker returned an empty response.'}</p><Link to="/" className="button-secondary">Return to overview</Link></div></div>;

  const invalidTotal = metrics.invalidValues;
  const integrityIssues = (metrics.invalidValues > 0 ? 1 : 0)
    + (normalized.duplicateGroups.length > 0 ? 1 : 0)
    + (normalized.gaps.length > 0 ? 1 : 0)
    + (!normalized.isSorted ? 1 : 0)
    + (series.spikeIndex !== undefined ? 1 : 0);

  return (
    <div className="page-content detail-page">
      <div className="back-row"><Link to="/" className="back-link"><ArrowLeft size={15} /> ALL TRAINING RUNS</Link><span className="back-divider">/</span><span className="mono">{run.id}</span></div>
      <section className="detail-heading">
        <div><div className="eyebrow"><span className="eyebrow-line" /> EXPERIMENT DETAIL <span className="eyebrow-version">/ {run.id.toUpperCase()}</span></div><div className="detail-title-row"><h1>{run.name}<span className="heading-period">.</span></h1><StatusBadge status={run.status} /></div><p className="page-lead">{run.model} <span className="lead-divider">·</span> {run.description}</p></div>
        <div className="detail-heading-meta"><span><Clock3 size={14} /> {duration(run.durationSeconds)}</span><span><Database size={14} /> {series.step.length.toLocaleString()} points</span><span><span className="heading-status-dot" /> LOCAL DATA</span></div>
      </section>

      <section className="integrity-banner">
        <div className="integrity-banner-icon"><ShieldAlert size={19} /></div>
        <div className="integrity-banner-copy"><strong>{integrityIssues === 0 ? 'No integrity issues detected' : `${integrityIssues} integrity ${integrityIssues === 1 ? 'category' : 'categories'} require attention`}</strong><span>{invalidTotal > 0 ? `${invalidTotal} non-finite metric values were preserved in the source and rendered as line breaks.` : 'Source values are preserved; chart reduction only selects points for display.'}</span></div>
        <div className={`integrity-count ${integrityIssues ? 'attention' : 'clean'}`}>{integrityIssues.toString().padStart(2, '0')} <small>FLAGS</small></div>
      </section>

      <section className="summary-grid detail-summary-grid" aria-label="Run metrics">
        <SummaryCard label="INITIAL LOSS" value={formatMetric(metrics.initialLoss)} detail="First finite value by step" />
        <SummaryCard label="LAST FINITE LOSS" value={formatMetric(metrics.lastFiniteLoss)} detail="Not the same as final record" tone={invalidTotal ? 'orange' : 'neutral'} />
        <SummaryCard label="MINIMUM LOSS" value={formatMetric(metrics.minLoss)} detail="Minimum finite observation" tone="green" />
        <SummaryCard label="LAST FINITE LR" value={formatMetric(metrics.currentLr)} detail="Last finite reading by step" />
        <SummaryCard label="LAST FINITE GRAD NORM" value={formatMetric(metrics.currentGradNorm)} detail="Last finite reading by step" />
        <SummaryCard label="VALID / INVALID" value={`${metrics.validPoints.toLocaleString()} / ${metrics.invalidPoints.toLocaleString()}`} detail="Rows with finite metrics / rows containing non-finite values" />
      </section>

      <div className="section-heading"><div><div className="panel-kicker">METRIC TELEMETRY</div><h2>Training curves</h2></div><div className="chart-legend-note"><span className="legend-line" /> Original values <span className="legend-dash" /> Integrity break</div></div>
      <div className="charts-grid">
        <MetricChart series={series} normalized={normalized} metric="loss" isLight={isLight} />
        <MetricChart series={series} normalized={normalized} metric="lr" isLight={isLight} />
        <MetricChart series={series} normalized={normalized} metric="gradNorm" isLight={isLight} />
      </div>

      <div className="detail-bottom-grid">
        <section className="panel integrity-panel">
          <div className="panel-header"><div><div className="panel-kicker">SOURCE VALIDATION</div><h2>Data integrity</h2></div><span className="integrity-pill"><Info size={12} /> RAW DATA PRESERVED</span></div>
          <div className="integrity-list">
            <div className="integrity-row"><div className="integrity-row-icon orange"><AlertTriangle size={15} /></div><div><strong>Non-finite values</strong><span>NaN / Infinity are not coerced to zero. Line breaks keep the discontinuity visible.</span></div><b>{invalidTotal}</b></div>
            <div className="integrity-row"><div className="integrity-row-icon amber"><Database size={15} /></div><div><strong>Duplicate steps</strong><span>Duplicate observations stay available as independent markers and source records.</span></div><b>{normalized.duplicateGroups.length}</b></div>
            <div className="integrity-row"><div className="integrity-row-icon blue"><ActivityIcon /></div><div><strong>Missing step ranges</strong><span>Gaps are not interpolated; line segments are separated across missing ranges.</span></div><b>{normalized.gaps.reduce((sum, gap) => sum + gap.missingCount, 0)}</b></div>
            <div className="integrity-row"><div className="integrity-row-icon green"><CheckCircle2 size={15} /></div><div><strong>Step ordering</strong><span>{normalized.isSorted ? 'Input sequence was already sorted.' : 'A stable sorted view is used; the source array remains unchanged.'}</span></div><b>{normalized.isSorted ? 'OK' : 'FIXED'}</b></div>
            <div className="integrity-row"><div className="integrity-row-icon orange"><Sparkles size={15} /></div><div><strong>Known anomaly</strong><span>{series.spikeIndex !== undefined ? `Planted spike at source index ${series.spikeIndex.toLocaleString()}; preserved in each in-range viewport.` : 'No planted spike in this run.'}</span></div><b>{series.spikeIndex !== undefined ? '1' : '—'}</b></div>
          </div>
        </section>

        <section className="panel decision-panel">
          <div className="panel-kicker">DECISION SUPPORT</div><div className="decision-title">Don't let a chart make the call<span>.</span></div>
          <p>This monitor surfaces evidence. It does not automatically decide whether a run should stop. Review the raw anomaly context, training objective and evaluation metrics before acting.</p>
          <div className="decision-readout"><span>RUN REVIEW</span><strong>{integrityIssues > 0 ? 'INVESTIGATE' : 'NO FLAGS'}</strong></div>
          <div className="decision-foot"><CircleHelp size={13} /> Data quality is necessary, not sufficient, for a ship decision.</div>
        </section>
      </div>

      <section className="panel records-panel" id="raw-records">
        <button className="records-toggle" onClick={() => setShowRecords((value) => !value)} aria-expanded={showRecords} aria-controls="raw-issue-table">
          <div><div className="panel-kicker">TRACEABILITY</div><h2>Raw issue records <span className="inline-count">{issueRecords.length}</span></h2><p>Original non-finite values, duplicate observations, missing ranges, ordering issues and the known anomaly.</p></div>
          <ChevronDown size={18} className={showRecords ? 'chevron-open' : ''} />
        </button>
        <div id="raw-issue-table" className="issue-table-wrap" hidden={!showRecords}>
        {showRecords && <>
          <div className="issue-table-toolbar"><span>Showing {Math.min(50, issueRecords.length)} of {issueRecords.length} records. CSV export contains every detected issue.</span><button type="button" className="button-secondary" onClick={downloadIssueRecords} disabled={issueRecords.length === 0}><Download size={13} /> Export all CSV</button></div>
          <div className="table-scroll"><table className="runs-table issue-table"><thead><tr><th scope="col">STEP / RANGE</th><th scope="col">SOURCE INDEX</th><th scope="col">FIELD</th><th scope="col">RAW VALUE / DETAIL</th><th scope="col">ISSUE</th></tr></thead><tbody>{issueRecords.length ? issueRecords.slice(0, 50).map((record, index) => <tr key={`${record.issue}-${record.sourceIndex}-${record.field}-${index}`}><td className="mono">{record.step}</td><td className="mono">{record.sourceIndex}</td><td>{record.field}</td><td className="mono metric-invalid">{record.value}</td><td><span className="issue-tag">{record.issue}</span></td></tr>) : <tr><td colSpan={5}>No raw issue records for this run.</td></tr>}</tbody></table></div>
        </>}
        </div>
      </section>

      <div className="detail-actions"><span><Info size={13} /> Values are synthetic and deterministic. No model training is performed.</span><button className="button-secondary" onClick={() => setShowRecords(true)}><Download size={14} /> Inspect records</button><a className="button-primary" href="https://trysoup.dev" target="_blank" rel="noreferrer">About Soup <ArrowUpRight size={14} /></a></div>
      <footer className="page-footer"><span>RUN {run.id.toUpperCase()} <span className="footer-sep">/</span> {series.step.length.toLocaleString()} SOURCE RECORDS</span><span>DATA TRUTHFULNESS IS A FEATURE</span></footer>
    </div>
  );
}

function ActivityIcon() {
  return <span className="activity-glyph">↗</span>;
}
