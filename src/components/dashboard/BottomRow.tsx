import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

const staffAttendanceData = [
  { name: 'Present', value: 301, color: '#22c55e' },
  { name: 'Absent', value: 18, color: '#ef4444' },
  { name: 'On Leave', value: 7, color: '#94a3b8' },
];

const topClasses = [
  { name: 'Class 10-A', score: 96.2, color: 'bg-amber-400' },
  { name: 'Class 9-B', score: 94.8, color: 'bg-slate-800' },
  { name: 'Class 8-A', score: 93.1, color: 'bg-emerald-500' },
  { name: 'Class 11-C', score: 91.4, color: 'bg-indigo-500' },
];

export function BottomRow() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-4">
      {/* Admission Overview */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xs font-bold text-slate-700 uppercase">Admission Overview</h3>
          <span className="text-[10px] text-slate-400">2025-26</span>
        </div>
        <div className="flex flex-col gap-3 text-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div className="flex items-center gap-2 text-slate-600">
              <span className="text-[10px]">📋</span> Total Inquiries
            </div>
            <span className="font-bold text-slate-800">1,256</span>
          </div>
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div className="flex items-center gap-2 text-slate-600">
              <span className="text-[10px]">📝</span> Applications
            </div>
            <span className="font-bold text-slate-800">842</span>
          </div>
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div className="flex items-center gap-2 text-slate-600">
              <span className="text-[10px]">✅</span> Admitted
            </div>
            <span className="font-bold text-slate-800">412</span>
          </div>
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2 text-slate-600">
              <span className="text-[10px]">📈</span> Conversion Rate
            </div>
            <span className="font-bold text-slate-800 text-sm">49.0%</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1">
            <div className="bg-amber-400 h-1.5 rounded-full" style={{ width: '49%' }}></div>
          </div>
        </div>
      </div>

      {/* Top Performing Classes */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xs font-bold text-slate-700 uppercase">Top Classes</h3>
          <span className="text-[10px] text-slate-400">This Term</span>
        </div>
        <div className="flex flex-col gap-3.5 mt-2">
          {topClasses.map((cls, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="flex-1">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] font-bold text-slate-700">{cls.name}</span>
                  <span className="text-[10px] font-bold text-slate-900">{cls.score}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5">
                  <div className={`${cls.color} h-1.5 rounded-full`} style={{ width: `${cls.score}%` }}></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Staff Attendance */}
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
                  data={staffAttendanceData}
                  cx="50%"
                  cy="50%"
                  innerRadius={25}
                  outerRadius={40}
                  paddingAngle={2}
                  dataKey="value"
                  stroke="none"
                >
                  {staffAttendanceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[8px] text-slate-400 uppercase">Total</span>
              <span className="text-sm font-bold text-slate-800 leading-none">326</span>
            </div>
          </div>
          
          <div className="flex-1 ml-4 flex flex-col gap-2">
            {staffAttendanceData.map((item, i) => (
              <div key={i} className="flex items-center justify-between text-[10px]">
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.color }}></div>
                  <span className="text-slate-600">{item.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-800">{item.value}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
