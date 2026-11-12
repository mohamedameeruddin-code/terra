import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Camera,
  Truck,
  Trash2,
  AlertCircle,
  History as HistoryIcon,
  Settings as SettingsIcon,
  Radio,
  Layers,
} from 'lucide-react';

const Sidebar = ({ isLiveConnected = true }) => {
  const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/analysis', label: 'Vision AI Scan', icon: Camera },
    { to: '/collection', label: 'Route Sheet', icon: Truck },
    { to: '/bins', label: 'Fleet Bins', icon: Trash2 },
    { to: '/alerts', label: 'Alerts', icon: AlertCircle },
    { to: '/history', label: 'Scan History', icon: HistoryIcon },
    { to: '/settings', label: 'Settings', icon: SettingsIcon },
  ];

  return (
    <aside
      style={{
        width: '260px',
        backgroundColor: 'var(--soil-900)',
        borderRight: '1px solid var(--line)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        flexShrink: 0,
        zIndex: 10,
      }}
    >
      {/* Top Header / Logo */}
      <div>
        <div
          style={{
            padding: '24px 20px 20px 20px',
            borderBottom: '1px solid var(--line)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          {/* Custom Stylized Dustbin Icon with Pulse */}
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: 'var(--radius)',
              backgroundColor: 'var(--soil-800)',
              border: '1px solid var(--line)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--sprout)',
              boxShadow: 'var(--glow-sprout)',
            }}
          >
            <Layers size={22} />
          </div>

          <div>
            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '18px',
                fontWeight: 800,
                letterSpacing: '0.04em',
                color: 'var(--bone)',
                lineHeight: 1.1,
              }}
            >
              TERRA
            </div>
            <div className="section-label" style={{ fontSize: '10px', color: 'var(--sprout)' }}>
              WASTE INTELLIGENCE
            </div>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav style={{ padding: '16px 12px' }}>
          <div
            className="section-label"
            style={{ padding: '0 12px 10px 12px', opacity: 0.6 }}
          >
            SYSTEM MODULES
          </div>

          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.to === '/'}
                    style={({ isActive }) => ({
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '10px 14px',
                      borderRadius: 'var(--radius)',
                      color: isActive ? 'var(--sprout)' : 'var(--lichen)',
                      backgroundColor: isActive ? 'var(--soil-800)' : 'transparent',
                      borderLeft: isActive ? '3px solid var(--sprout)' : '3px solid transparent',
                      textDecoration: 'none',
                      fontFamily: 'var(--font-body)',
                      fontSize: '14px',
                      fontWeight: isActive ? 600 : 500,
                      transition: 'all 160ms ease-out',
                    })}
                  >
                    <Icon size={18} />
                    <span>{item.label}</span>
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>

      {/* Bottom Telemetry Status Chip */}
      <div
        style={{
          padding: '16px 20px',
          borderTop: '1px solid var(--line)',
          backgroundColor: 'var(--soil-950)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: isLiveConnected ? 'var(--sprout)' : 'var(--ash)',
                boxShadow: isLiveConnected ? '0 0 8px var(--sprout)' : 'none',
              }}
            />
            <span className="mono" style={{ fontSize: '11px', color: 'var(--lichen)' }}>
              {isLiveConnected ? 'SSE TELEMETRY LIVE' : 'CONNECTING...'}
            </span>
          </div>
          <Radio size={14} style={{ color: isLiveConnected ? 'var(--sprout)' : 'var(--ash)' }} />
        </div>
        <div style={{ fontSize: '11px', color: 'var(--lichen)', marginTop: '4px', opacity: 0.7 }}>
          Soil & Signal v1.0 • OpenCV 4.9
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;

