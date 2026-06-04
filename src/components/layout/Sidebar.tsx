import { useEffect, useState } from 'react';
import { useSimulator } from '../../context/SimulatorContext';
import { 
  LayoutDashboard, 
  Calculator, 
  Sliders, 
  Wallet,
  Moon
} from 'lucide-react';
import './layout.css';

export function Sidebar() {
  const { activeMainTab, setActiveMainTab } = useSimulator();
  const [isDark, setIsDark] = useState(() => {
    const stored = localStorage.getItem('theme');
    if (stored) return stored === 'dark';
    return true; 
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark-theme');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark-theme');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  const menuItems = [
    { id: 'parametros', label: 'Parâmetros', icon: Sliders },
    { id: 'visao_geral', label: 'Visão geral', icon: LayoutDashboard },
    { id: 'simulacao', label: 'Simulação & Estratégias', icon: Calculator },
  ] as const;

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-logo" style={{ fontSize: '1.05rem', lineHeight: 1.2 }}>
          <Wallet size={22} className="logo-icon" style={{ flexShrink: 0 }} />
          <span>Amortização Antecipada</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        <ul>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeMainTab === item.id;
            return (
              <li key={item.id}>
                <button
                  className={`sidebar-nav-btn ${isActive ? 'active' : ''}`}
                  onClick={() => setActiveMainTab(item.id)}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="sidebar-footer">
        <div className="theme-toggle-row">
          <div className="theme-label-col">
            <Moon size={16} className="text-secondary" />
            <span className="text-sm">Tema escuro</span>
          </div>
          <label className="switch-toggle" htmlFor="theme-checkbox">
            <input
              id="theme-checkbox"
              type="checkbox"
              checked={isDark}
              onChange={(e) => setIsDark(e.target.checked)}
            />
            <span className="slider round"></span>
          </label>
        </div>

        <div className="sync-status">
          <span className="status-dot"></span>
          <span className="text-3xs text-secondary">Dados atualizados há 2 min</span>
        </div>
      </div>
    </aside>
  );
}
