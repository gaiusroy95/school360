const kpis = [
  { title: 'Students', value: '5,248', trend: '▲ 8.5%', trendType: 'up' },
  { title: 'Teachers', value: '326', trend: '▲ 5.2%', trendType: 'up' },
  { title: 'Parents', value: '4,897', trend: '▲ 6.1%', trendType: 'up' },
  { title: 'Classes', value: '182', trend: '- 0%', trendType: 'neutral' },
  { title: 'Fees Collection', value: '₹48.6L', trend: '▲ 12.6%', trendType: 'up', highlight: true },
  { title: 'Attendance', value: '92.6%', trend: 'Today', trendType: 'neutral', highlightVal: true },
];

export function KPICards() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {kpis.map((kpi, i) => (
        <div key={i} className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">{kpi.title}</p>
          <div className="flex items-end justify-between mt-1">
            <p className={`text-xl font-bold ${kpi.highlight ? 'text-amber-600 font-mono' : ''} ${kpi.highlightVal ? 'text-green-600' : 'text-slate-900'}`}>
              {kpi.value}
            </p>
            <span className={`text-[9px] font-bold ${kpi.trendType === 'up' ? 'text-green-500' : 'text-slate-400'}`}>
              {kpi.trend}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
