import { useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { OverviewPage } from './pages/OverviewPage';
import { RunDetailsPage } from './pages/RunDetailsPage';

function AppShell() {
  const location = useLocation();
  const [isLight, setIsLight] = useState(false);
  const title = location.pathname.startsWith('/runs/') ? 'Run details' : 'Overview';

  useEffect(() => {
    document.documentElement.dataset.theme = isLight ? 'light' : 'dark';
  }, [isLight]);

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <Sidebar />
      <div className="main-shell">
        <Topbar title={title} isLight={isLight} onToggleTheme={() => setIsLight((value) => !value)} />
        <main id="main-content" className="main-content" tabIndex={-1}>
          <Routes>
            <Route path="/" element={<OverviewPage />} />
            <Route path="/runs/:runId" element={<RunDetailsPage isLight={isLight} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return <BrowserRouter><AppShell /></BrowserRouter>;
}
