import React from 'react';
import { NavLink } from 'react-router-dom';
import { Camera, History, BarChart2, Settings } from 'lucide-react';

export default function BottomNav() {
  return (
    <nav className="bottom-nav">
      <NavLink
        to="/"
        className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        end
      >
        <Camera size={20} />
        <span>Analyze</span>
      </NavLink>

      <NavLink
        to="/history"
        className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
      >
        <History size={20} />
        <span>History</span>
      </NavLink>

      <NavLink
        to="/dashboard"
        className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
      >
        <BarChart2 size={20} />
        <span>Dashboard</span>
      </NavLink>

      <NavLink
        to="/settings"
        className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
      >
        <Settings size={20} />
        <span>Settings</span>
      </NavLink>
    </nav>
  );
}
