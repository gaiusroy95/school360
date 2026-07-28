import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, Tooltip } from 'recharts';
import type { MainDashboardData } from '../../lib/dashboardServices';

type ChartsRowProps = {
  feesChart?: MainDashboardData['feesChart'];
  attendanceTrend?: MainDashboardData['attendanceTrend'];
  alerts?: MainDashboardData['alerts'];
};

const EMPTY_FEES = { total: 0, formattedTotal: '₹0', items: [] as MainDashboardData['feesChart']['items'] };
const EMPTY_TREND: MainDashboardData['attendanceTrend'] = [];

export function ChartsRow({
  feesChart = EMPTY_FEES,
  attendanceTrend = EMPTY_TREND,
  alerts = [],
}: ChartsRowProps) {
  const feesData = feesChart.items.length
    ? feesChart.items
    : [{ name: 'No collections', value: 0, color: '#e2e8f0', percentage: '0%' }];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      <div className="col-span-1 lg:col-span-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xs font-bold text-slate-700 uppercase">Fees Collection Overview</h3>
          <span className="text-[9px] text-slate-400">This month</span>
        </div>
        <div className="flex items-center justify-center relative h-32">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={feesData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={64}
                paddingAngle={2}
                dataKey="value"
                stroke="none"
              >
                {feesData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-lg font-bold text-slate-900">{feesChart.formattedTotal}</span>
            <span className="text-[8px] text-slate-400 uppercase">Total Collected</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 mt-4">
          {feesData.map((item) => (
            <div key={item.name} className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
              <p className="text-[9px] text-slate-500 truncate">{item.name.replace(' Fee', '')} ({item.percentage})</p>
            </div>
          ))}
        </div>
      </div>

      <div className="col-span-1 lg:col-span-5 bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col">
        <h3 className="text-xs font-bold text-slate-700 uppercase mb-4">Weekly Attendance Trends (%)</h3>
        <div className="h-32 w-full mt-auto">
          {attendanceTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={attendanceTrend} margin={{ top: 5, right: 5, left: 5, bottom: 0 }}>
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 8, fill: '#94a3b8' }} dy={5} />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '10px' }}
                  itemStyle={{ color: '#0f172a', fontWeight: 'bold' }}
                />
                <Line
                  type="monotone"
                  dataKey="percentage"
                  stroke="#fbbf24"
                  strokeWidth={3}
                  dot={{ r: 3, fill: '#fbbf24', strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 5, fill: '#fbbf24' }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-slate-400">No attendance data yet</div>
          )}
        </div>
      </div>

      <div className="col-span-1 lg:col-span-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col">
        <h3 className="text-xs font-bold text-slate-700 uppercase mb-3">System Alerts</h3>
        <div className="flex-1 flex flex-col gap-3 overflow-y-auto custom-scrollbar">
          {alerts.length > 0 ? alerts.map((alert) => (
            <div key={alert.id} className={`flex gap-3 border-l-2 ${alert.color} pl-2`}>
              <div className="text-xs mt-0.5">{alert.icon}</div>
              <div>
                <p className="text-[10px] font-bold text-slate-800">{alert.title}</p>
                <p className="text-[8px] text-slate-500 leading-tight mt-0.5">{alert.desc}</p>
              </div>
            </div>
          )) : (
            <p className="text-[10px] text-slate-400">No active alerts</p>
          )}
        </div>
      </div>
    </div>
  );
}
