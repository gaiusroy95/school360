import { useCallback, useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { fetchMainDashboard, type MainDashboardData } from '../../lib/dashboardServices';
import { KPICards } from './KPICards';
import { ChartsRow } from './ChartsRow';
import { QuickAccess } from './QuickAccess';
import { BottomRow } from './BottomRow';
import { QuickActionMenu } from '../shared/QuickActionMenu';

interface DashboardPageProps {
  onNavigate?: (view: string) => void;
}

export function DashboardPage({ onNavigate }: DashboardPageProps) {
  const { user } = useAuth();
  const [data, setData] = useState<MainDashboardData | null>(null);
  const [academicYear, setAcademicYear] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async (year?: string) => {
    setLoading(true);
    setError('');
    try {
      const dashboard = await fetchMainDashboard(year || undefined);
      setData(dashboard);
      setAcademicYear(dashboard.academicYear);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleYearChange = (year: string) => {
    setAcademicYear(year);
    void load(year);
  };

  const displayName = user?.displayName || user?.email?.split('@')[0] || 'Admin';

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">
            Welcome Back, {displayName}! <span className="text-xl">👋</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Real-time insights for{' '}
            <span className="font-bold">{data?.institutionName || 'your institution'}</span>
            {data?.generatedAt && (
              <span className="text-slate-400"> · Updated {new Date(data.generatedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            className="bg-white border border-slate-200 text-xs px-3 py-2 rounded focus:outline-none text-slate-700 shadow-sm"
            value={academicYear}
            onChange={(e) => handleYearChange(e.target.value)}
            disabled={loading || !data}
          >
            {(data?.academicYears ?? [academicYear || '2025-26']).map((y) => (
              <option key={y} value={y}>Academic Year: {y}</option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => void load(academicYear)}
            disabled={loading}
            className="bg-white border border-slate-200 text-slate-700 font-semibold text-xs px-3 py-2 rounded flex items-center gap-2 shadow-sm hover:bg-slate-50 transition-colors"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>

          {onNavigate && (
            <QuickActionMenu
              onNavigate={onNavigate}
              label="Add New"
              triggerClassName="bg-amber-400 hover:bg-amber-500 text-slate-900 font-bold text-xs px-4 py-2 rounded flex items-center gap-2 shadow-sm transition-colors uppercase"
            />
          )}
        </div>
      </div>

      {error && (
        <div className="px-4 py-2 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200">
          {error}
        </div>
      )}

      {loading && !data ? (
        <div className="flex items-center justify-center py-24 text-slate-500 text-sm">
          Loading dashboard…
        </div>
      ) : data ? (
        <>
          <KPICards kpis={data.kpis} />
          <ChartsRow
            feesChart={data.feesChart}
            attendanceTrend={data.attendanceTrend}
            alerts={data.alerts}
          />
          <QuickAccess onNavigate={onNavigate} />
          <BottomRow
            admission={data.admission}
            topClasses={data.topClasses}
            staffAttendance={data.staffAttendance}
          />
        </>
      ) : null}
    </>
  );
}
