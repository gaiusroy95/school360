import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { API_URL } from '../lib/api';
import { BrandLogo } from './shared/BrandLogo';
import { APP_NAME } from '../lib/branding';

/** Lightweight footer — uses /health instead of heavy admin-dashboard overview. */
export function SystemStatusBar() {
  const { user } = useAuth();
  const [health, setHealth] = useState('…');

  useEffect(() => {
    let cancelled = false;
    if (!API_URL) {
      setHealth('Unknown');
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    void fetch(`${API_URL}/health`, { signal: controller.signal })
      .then((res) => {
        if (cancelled) return;
        setHealth(res.ok ? 'Good' : 'Degraded');
      })
      .catch(() => {
        if (!cancelled) setHealth('Offline');
      })
      .finally(() => clearTimeout(timer));
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  const roleLabel = user?.role?.replace(/_/g, ' ') || 'ADMIN';

  return (
    <footer className="bg-white border-t border-slate-200 h-10 px-6 flex items-center justify-between shrink-0 hidden sm:flex">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <div className={`w-1.5 h-1.5 rounded-full ${
            health === 'Good' ? 'bg-green-500'
              : health === '…' ? 'bg-slate-300'
                : health === 'Offline' ? 'bg-red-500'
                  : 'bg-amber-500'
          }`} />
          <p className="text-[10px] text-slate-500">System Health: <span className="font-bold text-slate-700">{health}</span></p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <BrandLogo className="h-5 w-auto object-contain" />
          <p className="text-[10px] text-slate-500">{APP_NAME}</p>
        </div>
        <p className="text-[10px] font-bold text-slate-900 px-2 py-0.5 bg-amber-100 rounded uppercase">{roleLabel}</p>
      </div>
    </footer>
  );
}
