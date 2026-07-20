const quickModules = [
  { name: '+ Student', icon: '🧑‍🎓', color: 'blue' },
  { name: '+ Staff', icon: '👩‍🏫', color: 'purple' },
  { name: 'Fee Col.', icon: '💳', color: 'amber' },
  { name: 'Attend.', icon: '✅', color: 'green' },
  { name: 'Time Table', icon: '🗓️', color: 'rose' },
  { name: 'Exams', icon: '📝', color: 'cyan' },
  { name: 'Transport', icon: '🚌', color: 'orange' },
  { name: 'Library', icon: '📚', color: 'indigo' },
  { name: 'Hostel', icon: '🏨', color: 'teal' },
  { name: 'Reports', icon: '📊', color: 'slate' },
];

export function QuickAccess() {
  return (
    <div className="grid grid-cols-5 lg:grid-cols-10 gap-3">
      {quickModules.map((mod, i) => {
        // Tailwind classes safely mapped
        const colorMaps: Record<string, string> = {
          blue: 'bg-blue-50 border-blue-100 hover:bg-blue-100 text-blue-600',
          purple: 'bg-purple-50 border-purple-100 hover:bg-purple-100 text-purple-600',
          amber: 'bg-amber-50 border-amber-100 hover:bg-amber-100 text-amber-600',
          green: 'bg-green-50 border-green-100 hover:bg-green-100 text-green-600',
          rose: 'bg-rose-50 border-rose-100 hover:bg-rose-100 text-rose-600',
          cyan: 'bg-cyan-50 border-cyan-100 hover:bg-cyan-100 text-cyan-600',
          orange: 'bg-orange-50 border-orange-100 hover:bg-orange-100 text-orange-600',
          indigo: 'bg-indigo-50 border-indigo-100 hover:bg-indigo-100 text-indigo-600',
          teal: 'bg-teal-50 border-teal-100 hover:bg-teal-100 text-teal-600',
          slate: 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-600',
        };

        return (
          <div 
            key={i} 
            className={`aspect-square flex flex-col items-center justify-center rounded-lg border cursor-pointer transition-colors ${colorMaps[mod.color]}`}
          >
            <span className="text-lg mb-1">{mod.icon}</span>
            <p className={`text-[8px] font-bold`}>
              {mod.name}
            </p>
          </div>
        )
      })}
    </div>
  );
}
