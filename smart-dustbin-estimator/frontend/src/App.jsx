import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import Dashboard from './pages/Dashboard';
import ImageAnalysis from './pages/ImageAnalysis';
import Collection from './pages/Collection';
import BinDetail from './pages/BinDetail';
import Alerts from './pages/Alerts';
import Bins from './pages/Bins';
import History from './pages/History';
import Settings from './pages/Settings';
import { useLiveStream } from './hooks/useLiveStream';
import './styles/tokens.css';
import './styles/base.css';
import './styles/components.css';

function App() {
  const { liveData, isConnected } = useLiveStream();

  return (
    <BrowserRouter>
      <div className="app-shell">
        <Sidebar isLiveConnected={isConnected} />

        <div className="main-content-area">
          <TopBar isConnected={isConnected} />

          <main style={{ flex: 1, paddingBottom: '40px' }}>
            <Routes>
              <Route path="/" element={<Dashboard liveData={liveData} />} />
              <Route path="/analysis" element={<ImageAnalysis />} />
              <Route path="/collection" element={<Collection />} />
              <Route path="/bins" element={<Bins />} />
              <Route path="/bins/:id" element={<BinDetail />} />
              <Route path="/alerts" element={<Alerts />} />
              <Route path="/history" element={<History />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </main>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;

