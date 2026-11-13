import { Moon, Sun, Terminal } from 'lucide-react';

export function Topbar({ title, onToggleTheme, isLight }: { title: string; onToggleTheme: () => void; isLight: boolean }) {
  return (
    <header className="topbar">
      <div className="topbar-title"><span className="breadcrumb-muted">SOUP</span><span className="breadcrumb-sep">/</span>{title}</div>
      <div className="topbar-actions">
        <span className="local-mode"><span className="local-mode-dot" /> LOCAL DEMO</span>
        <button className="icon-button" onClick={onToggleTheme} aria-label={isLight ? 'Switch to dark theme' : 'Switch to light theme'} title="Toggle theme">{isLight ? <Moon size={16} /> : <Sun size={16} />}</button>
        <a className="topbar-docs" href="https://trysoup.dev" target="_blank" rel="noreferrer"><Terminal size={15} />Docs</a>
      </div>
    </header>
  );
}
