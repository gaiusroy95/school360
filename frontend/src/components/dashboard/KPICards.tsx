import type { DashboardKpi } from '../../lib/dashboardServices';

const FALLBACK_KPIS: DashboardKpi[] = [
  { title: 'Students', value: '—', trend: '—', trendType: 'neutral' },
  { title: 'Teachers', value: '—', trend: '—', trendType: 'neutral' },
  { title: 'Parents', value: '—', trend: '—', trendType: 'neutral' },
  { title: 'Classes', value: '—', trend: '—', trendType: 'neutral' },
  { title: 'Fees Collection', value: '—', trend: '—', trendType: 'neutral', highlight: true },
  { title: 'Attendance', value: '—', trend: '—', trendType: 'neutral', highlightVal: true },
];

export function KPICards({ kpis = FALLBACK_KPIS }: { kpis?: DashboardKpi[] }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {kpis.map((kpi) => (
        <div key={kpi.title} className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">{kpi.title}</p>
          <div className="flex items-end justify-between mt-1">
            <p className={`text-xl font-bold ${kpi.highlight ? 'text-amber-600 font-mono' : ''} ${kpi.highlightVal ? 'text-green-600' : !kpi.highlight ? 'text-slate-900' : ''}`}>
              {kpi.value}
            </p>
            <span className={`text-[9px] font-bold ${kpi.trendType === 'up' ? 'text-green-500' : kpi.trendType === 'down' ? 'text-red-500' : 'text-slate-400'}`}>
              {kpi.trend}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
