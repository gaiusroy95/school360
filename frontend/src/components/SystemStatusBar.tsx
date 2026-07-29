import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { fetchAdminDashboardOverview } from '../lib/settingsAdminDashboardServices';
import { BrandLogo } from './shared/BrandLogo';
import { APP_NAME } from '../lib/branding';

export function SystemStatusBar() {
  const { user } = useAuth();
  const [health, setHealth] = useState('Good');
  const [activeUsers, setActiveUsers] = useState<number | null>(null);
  const [securityScore, setSecurityScore] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchAdminDashboardOverview('24h')
      .then((data) => {
        if (cancelled) return;
        const kpis = data.metrics.kpis as {
          activeSessions?: number;
          securityScore?: number;
          failedLogins24h?: number;
        };
        setActiveUsers(kpis.activeSessions ?? null);
        setSecurityScore(kpis.securityScore ?? null);
        const failed = kpis.failedLogins24h ?? 0;
        setHealth(failed > 20 ? 'Degraded' : failed > 5 ? 'Fair' : 'Good');
      })
      .catch(() => {
        if (!cancelled) setHealth('Unknown');
      });
    return () => { cancelled = true; };
  }, []);

  const roleLabel = user?.role?.replace(/_/g, ' ') || 'ADMIN';

  return (
    <footer className="bg-white border-t border-slate-200 h-10 px-6 flex items-center justify-between shrink-0 hidden sm:flex">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <div className={`w-1.5 h-1.5 rounded-full ${health === 'Good' ? 'bg-green-500' : health === 'Fair' ? 'bg-amber-500' : 'bg-red-500'}`} />
          <p className="text-[10px] text-slate-500">System Health: <span className="font-bold text-slate-700">{health}</span></p>
        </div>
        {activeUsers != null && (
          <p className="text-[10px] text-slate-500">
            Active Sessions: <span className="text-slate-700 font-bold">{activeUsers}</span>
          </p>
        )}
        {securityScore != null && (
          <p className="text-[10px] text-slate-500">
            Security Score: <span className="text-slate-700 font-bold">{securityScore}/100</span>
          </p>
        )}
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
