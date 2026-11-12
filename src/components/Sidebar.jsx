import React from 'react';
import { NavLink } from 'react-router-dom';
import { Camera, History, BarChart2, Settings } from 'lucide-react';

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <svg width="28" height="28" viewBox="0 0 512 512" fill="none">
          <path d="M 60 110 L 330 65 L 340 95 L 70 140 Z" fill="#B8F53C" />
          <rect x="75" y="145" width="250" height="20" rx="4" fill="#B8F53C" />
          <path d="M 90 175 L 115 350 Q 118 365 135 365 L 265 365 Q 282 365 285 350 L 310 175 Z" fill="#17211B" stroke="#B8F53C" strokeWidth="16" />
          <path d="M 50 260 L 120 260 L 145 220 L 175 300 L 205 240 L 225 270 L 255 260 L 350 260" stroke="#B8F53C" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '18px', color: 'var(--sprout)' }}>
            TERRA
          </div>
          <div style={{ fontSize: '11px', color: 'var(--lichen)', letterSpacing: '0.04em' }}>
            DUSTBIN ESTIMATOR
          </div>
        </div>
      </div>

      <nav className="sidebar-nav">
        <NavLink
          to="/"
          className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
          end
        >
          <Camera size={18} />
          <span>Analyze</span>
        </NavLink>

        <NavLink
          to="/history"
          className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
        >
          <History size={18} />
          <span>History</span>
        </NavLink>

        <NavLink
          to="/dashboard"
          className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
        >
          <BarChart2 size={18} />
          <span>Dashboard</span>
        </NavLink>

        <NavLink
          to="/settings"
          className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
        >
          <Settings size={18} />
          <span>Settings</span>
        </NavLink>
      </nav>

      <div style={{ marginTop: 'auto', padding: '12px', background: 'var(--soil-800)', border: '1px solid var(--line)', borderRadius: 'var(--radius)' }}>
        <div style={{ fontSize: '11px', color: 'var(--sprout)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
          OFFLINE-FIRST PWA
        </div>
        <div style={{ fontSize: '11px', color: 'var(--lichen)', marginTop: '4px' }}>
          On-device analysis. No internet needed.
        </div>
      </div>
    </aside>
  );
}

