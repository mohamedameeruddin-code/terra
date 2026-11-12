import React, { useEffect } from 'react';
import { Routes, Route, HashRouter } from 'react-router-dom';
import TopBar from './components/TopBar';
import Sidebar from './components/Sidebar';
import BottomNav from './components/BottomNav';
import Analyze from './pages/Analyze';
import History from './pages/History';
import Dashboard from './pages/Dashboard';
import Settings from './pages/Settings';
import { initPwaInstall } from './lib/pwaInstall';
import { requestPersistence } from './lib/storage';

export default function App() {
  useEffect(() => {
    initPwaInstall();
    requestPersistence();
  }, []);

  return (
    <HashRouter>
      <div className="app-container">
        {/* Desktop Sidebar (>=720px) */}
        <Sidebar />

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          {/* Top Header */}
          <TopBar />

          {/* Main Routed Content */}
          <main className="main-content">
            <Routes>
              <Route path="/" element={<Analyze />} />
              <Route path="/history" element={<History />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </main>
        </div>

        {/* Mobile Bottom Navigation (<720px) */}
        <BottomNav />
      </div>
    </HashRouter>
  );
}

