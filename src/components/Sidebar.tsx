import { Activity, ArrowUpRight, CircleHelp, Command, Github, LayoutDashboard, Settings2, TerminalSquare } from 'lucide-react';
import { NavLink } from 'react-router-dom';

export function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="brand-lockup">
        <div className="brand-mark">s<span>.</span></div>
        <div><div className="brand-name">soup<span className="brand-slash">/</span></div><div className="brand-product">TRAINING MONITOR</div></div>
      </div>
      <div className="workspace-chip"><span className="workspace-pulse" />LOCAL WORKSPACE <span className="mono">v0.1</span></div>
      <div className="sidebar-label">WORKSPACE</div>
      <nav className="side-nav" aria-label="Main navigation">
        <NavLink to="/" end className={({ isActive }) => `side-link ${isActive ? 'active' : ''}`}><LayoutDashboard size={17} />Overview<span className="nav-count">20</span></NavLink>
        <div className="side-link side-link-muted"><Activity size={17} />Training runs</div>
      </nav>
      <div className="sidebar-label sidebar-label-gap">TOOLS</div>
      <div className="side-link side-link-muted"><TerminalSquare size={17} />CLI reference<ArrowUpRight size={13} className="side-external" /></div>
      <div className="side-link side-link-muted"><Settings2 size={17} />Preferences</div>
      <div className="sidebar-bottom">
        <div className="cli-card">
          <div className="cli-card-head"><Command size={14} /> QUICK START</div>
          <code><span>$</span> soup train --config soup.yaml</code>
          <div className="cli-card-foot">Local demo data · no GPU required</div>
        </div>
        <a className="sidebar-footer-link" href="https://trysoup.dev" target="_blank" rel="noreferrer"><CircleHelp size={15} />Soup project <ArrowUpRight size={12} /></a>
        <a className="sidebar-footer-link" href="https://github.com" target="_blank" rel="noreferrer"><Github size={15} />Source code <ArrowUpRight size={12} /></a>
      </div>
    </aside>
  );
}
