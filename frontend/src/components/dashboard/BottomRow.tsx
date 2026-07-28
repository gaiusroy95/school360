import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import type { MainDashboardData } from '../../lib/dashboardServices';

type BottomRowProps = {
  admission?: MainDashboardData['admission'];
  topClasses?: MainDashboardData['topClasses'];
  staffAttendance?: MainDashboardData['staffAttendance'];
};

export function BottomRow({
  admission = { academicYear: '—', inquiries: 0, applications: 0, admitted: 0, conversionRate: 0 },
  topClasses = [],
  staffAttendance = { total: 0, present: 0, absent: 0, onLeave: 0, chart: [] },
}: BottomRowProps) {
  const staffChart = staffAttendance.chart.length
    ? staffAttendance.chart
    : [
        { name: 'Present', value: 0, color: '#22c55e' },
        { name: 'Absent', value: 0, color: '#ef4444' },
        { name: 'On Leave', value: 0, color: '#94a3b8' },
      ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-4">
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xs font-bold text-slate-700 uppercase">Admission Overview</h3>
          <span className="text-[10px] text-slate-400">{admission.academicYear}</span>
        </div>
        <div className="flex flex-col gap-3 text-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div className="flex items-center gap-2 text-slate-600">
              <span className="text-[10px]">📋</span> Total Inquiries
            </div>
            <span className="font-bold text-slate-800">{admission.inquiries.toLocaleString('en-IN')}</span>
          </div>
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div className="flex items-center gap-2 text-slate-600">
              <span className="text-[10px]">📝</span> Applications
            </div>
            <span className="font-bold text-slate-800">{admission.applications.toLocaleString('en-IN')}</span>
          </div>
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div className="flex items-center gap-2 text-slate-600">
              <span className="text-[10px]">✅</span> Admitted
            </div>
            <span className="font-bold text-slate-800">{admission.admitted.toLocaleString('en-IN')}</span>
          </div>
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2 text-slate-600">
              <span className="text-[10px]">📈</span> Conversion Rate
            </div>
            <span className="font-bold text-slate-800 text-sm">{admission.conversionRate}%</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1">
            <div className="bg-amber-400 h-1.5 rounded-full" style={{ width: `${Math.min(admission.conversionRate, 100)}%` }} />
          </div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xs font-bold text-slate-700 uppercase">Top Classes</h3>
          <span className="text-[10px] text-slate-400">Attendance %</span>
        </div>
        <div className="flex flex-col gap-3.5 mt-2">
          {topClasses.length > 0 ? topClasses.map((cls) => (
            <div key={cls.name} className="flex items-center gap-3">
              <div className="flex-1">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] font-bold text-slate-700">{cls.name}</span>
                  <span className="text-[10px] font-bold text-slate-900">{cls.score}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5">
                  <div className={`${cls.color} h-1.5 rounded-full`} style={{ width: `${Math.min(cls.score, 100)}%` }} />
                </div>
              </div>
            </div>
          )) : (
            <p className="text-[10px] text-slate-400">No class attendance data yet</p>
          )}
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-xs font-bold text-slate-700 uppercase">Staff Attendance</h3>
          <span className="text-[10px] text-slate-400">Today</span>
        </div>
        <div className="flex items-center h-full pb-4">
          <div className="w-24 h-24 relative shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={staffChart}
                  cx="50%"
                  cy="50%"
                  innerRadius={25}
                  outerRadius={40}
                  paddingAngle={2}
                  dataKey="value"
                  stroke="none"
                >
                  {staffChart.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[8px] text-slate-400 uppercase">Total</span>
              <span className="text-sm font-bold text-slate-800 leading-none">{staffAttendance.total}</span>
            </div>
          </div>

          <div className="flex-1 ml-4 flex flex-col gap-2">
            {staffChart.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-[10px]">
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-slate-600">{item.name}</span>
                </div>
                <span className="font-bold text-slate-800">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
