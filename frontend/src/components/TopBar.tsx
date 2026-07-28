import { useEffect, useMemo, useRef, useState } from 'react';
import { Menu, Search, Bell, Zap, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { buildSearchIndex, searchRoutes } from '../lib/appNavigation';
import { fetchMainDashboard } from '../lib/dashboardServices';
import { menuItems } from './Sidebar';
import { LiveClock } from './shared/LiveClock';
import { QuickActionMenu } from './shared/QuickActionMenu';

interface TopBarProps {
  onMenuClick: () => void;
  onNavigate?: (view: string) => void;
}

export function TopBar({ onMenuClick, onNavigate }: TopBarProps) {
  const { user, logout } = useAuth();
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [alerts, setAlerts] = useState<{ id: string; title: string; desc: string }[]>([]);
  const searchRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const searchIndex = useMemo(() => buildSearchIndex(menuItems), []);
  const results = useMemo(() => searchRoutes(searchIndex, query), [searchIndex, query]);

  useEffect(() => {
    void fetchMainDashboard()
      .then((d) => setAlerts(d.alerts.map((a) => ({ id: a.id, title: a.title, desc: a.desc }))))
      .catch(() => setAlerts([]));
  }, []);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const go = (view: string) => {
    onNavigate?.(view);
    setQuery('');
    setSearchOpen(false);
    setNotifOpen(false);
  };

  return (
    <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-10 shrink-0">
      <div className="flex items-center gap-4 flex-1">
        <button
          type="button"
          onClick={onMenuClick}
          className="text-slate-400 hover:text-slate-600 lg:hidden"
        >
          <Menu size={24} />
        </button>

        <div className="hidden md:block relative w-full max-w-sm" ref={searchRef}>
          <div className="flex items-center bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200">
            <Search className="text-slate-400 shrink-0" size={14} />
            <input
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSearchOpen(true);
              }}
              onFocus={() => setSearchOpen(true)}
              placeholder="Search modules, pages…"
              className="bg-transparent border-none focus:outline-none text-xs ml-2 w-full text-slate-700 placeholder-slate-400"
            />
          </div>
          {searchOpen && query.trim() && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-50 py-1 max-h-64 overflow-y-auto">
              {results.length > 0 ? results.map((r) => (
                <button
                  key={r.view}
                  type="button"
                  onClick={() => go(r.view)}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 text-slate-700"
                >
                  <span className="font-semibold block">{r.label}</span>
                </button>
              )) : (
                <p className="px-3 py-2 text-xs text-slate-400">No matching pages</p>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-5">
        {onNavigate && (
          <QuickActionMenu
            onNavigate={go}
            icon={<Zap size={14} />}
            label="Quick Access"
          />
        )}

        <LiveClock />

        <div className="relative" ref={notifRef}>
          <button
            type="button"
            onClick={() => setNotifOpen((o) => !o)}
            className="relative text-slate-400 hover:text-slate-600 transition-colors"
            aria-label="Notifications"
          >
            <Bell size={20} />
            {alerts.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] px-1 rounded-full border border-white min-w-[16px] text-center">
                {alerts.length > 9 ? '9+' : alerts.length}
              </span>
            )}
          </button>
          {notifOpen && (
            <div className="absolute right-0 top-full mt-1 w-72 bg-white border border-slate-200 rounded-lg shadow-lg z-50 py-2">
              <p className="px-3 py-1 text-[10px] font-bold text-slate-500 uppercase">Alerts</p>
              {alerts.length > 0 ? alerts.map((a) => (
                <div key={a.id} className="px-3 py-2 border-t border-slate-50">
                  <p className="text-xs font-bold text-slate-800">{a.title}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{a.desc}</p>
                </div>
              )) : (
                <p className="px-3 py-4 text-xs text-slate-400 text-center">No active alerts</p>
              )}
              {onNavigate && alerts.length > 0 && (
                <button
                  type="button"
                  onClick={() => go('System Administration::Admin Dashboard')}
                  className="w-full text-center text-[10px] font-bold text-blue-600 py-2 hover:bg-slate-50 border-t border-slate-100 mt-1"
                >
                  Open Admin Dashboard
                </button>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 border-l border-slate-200 pl-4">
          <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center font-bold text-slate-500 text-xs overflow-hidden">
            {user?.displayName?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'SA'}
          </div>
          <div className="hidden sm:flex flex-col leading-none">
            <p className="text-xs font-bold text-slate-800">{user?.displayName || 'Super Admin'}</p>
            <p className="text-[9px] text-slate-400">{user?.email || 'Administrator'}</p>
          </div>
          <button type="button" onClick={logout} className="ml-2 text-slate-400 hover:text-red-500 transition-colors" title="Logout">
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </header>
  );
}
