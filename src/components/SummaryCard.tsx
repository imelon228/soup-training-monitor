import type { ReactNode } from 'react';

export function SummaryCard({ label, value, suffix, detail, icon, tone = 'neutral' }: {
  label: string; value: string | number; suffix?: string; detail?: string; icon?: ReactNode; tone?: 'neutral' | 'orange' | 'green' | 'red';
}) {
  return (
    <article className={`summary-card tone-${tone}`}>
      <div className="summary-card-top"><span>{label}</span><span className="summary-icon">{icon}</span></div>
      <div className="summary-value">{value}{suffix && <span>{suffix}</span>}</div>
      {detail && <div className="summary-detail">{detail}</div>}
    </article>
  );
}
