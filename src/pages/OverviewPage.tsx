import { Activity, AlertTriangle, ArrowUpRight, Cpu, Gauge, Play, Waves } from 'lucide-react';
import { RUNS } from '../data/manifest';
import { RunTable } from '../components/RunTable';
import { SummaryCard } from '../components/SummaryCard';

export function OverviewPage() {
  const running = RUNS.filter((run) => run.status === 'running').length;
  const attention = RUNS.filter((run) => run.flags.length > 0).length;
  const completed = RUNS.filter((run) => run.status === 'completed').length;
  const totalSteps = RUNS.reduce((sum, run) => sum + run.totalSteps, 0);

  return (
    <div className="page-content">
      <section className="page-heading">
        <div><div className="eyebrow"><span className="eyebrow-line" /> RUN OBSERVABILITY <span className="eyebrow-version">/ 01</span></div><h1>Training runs<span className="heading-period">.</span></h1><p className="page-lead">A clear view of every experiment. No smoothed-over surprises.</p></div>
        <div className="heading-status"><span className="heading-status-dot" /> SYSTEM NOMINAL <span className="heading-status-sep">·</span><span className="mono">LOCAL DATASET</span></div>
      </section>

      <section className="summary-grid" aria-label="Run summary">
        <SummaryCard label="TOTAL RUNS" value={RUNS.length.toString().padStart(2, '0')} detail="Across all experiments" icon={<Activity size={16} />} />
        <SummaryCard label="RUNNING NOW" value={running.toString().padStart(2, '0')} detail={`${completed} completed`} icon={<Play size={15} />} tone="green" />
        <SummaryCard label="NEEDS ATTENTION" value={attention.toString().padStart(2, '0')} detail="Integrity flags detected" icon={<AlertTriangle size={16} />} tone="orange" />
        <SummaryCard label="STEPS PROCESSED" value={`${(totalSteps / 1_000_000).toFixed(2)}M`} detail="One run contains 1M points" icon={<Gauge size={16} />} />
      </section>

      <section className="callout-strip">
        <div className="callout-icon"><Waves size={18} /></div>
        <div className="callout-copy"><strong>Trust the signal, not the smoothing.</strong><span>Integrity checks are active. Runs with invalid values, duplicate steps, gaps or outliers are explicitly flagged.</span></div>
        <div className="callout-tag"><Cpu size={13} /> SYNTHETIC DATA / SEEDED</div>
      </section>

      <RunTable runs={RUNS} />

      <footer className="page-footer"><span>SOUP TRAINING MONITOR <span className="footer-sep">/</span> FRONTEND TAKE-HOME</span><span>DECISION QUALITY OVER CHART DECORATION <ArrowUpRight size={12} /></span></footer>
    </div>
  );
}
