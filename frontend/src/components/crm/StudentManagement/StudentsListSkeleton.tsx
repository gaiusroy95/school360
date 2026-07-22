/** Skeleton layout matching the loaded Students List dashboard — no misleading zero counts. */

function Bone({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-slate-200/80 ${className}`} />;
}

function KpiSkeletonCard() {
  return (
    <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
      <div className="flex items-center gap-3 mb-2">
        <Bone className="w-10 h-10 rounded-full shrink-0" />
        <div className="flex-1 space-y-2">
          <Bone className="h-2.5 w-20" />
          <Bone className="h-5 w-12" />
        </div>
      </div>
      <Bone className="h-2 w-24" />
    </div>
  );
}

function FilterFieldSkeleton() {
  return (
    <div>
      <Bone className="h-2.5 w-16 mb-1" />
      <Bone className="h-8 w-full rounded" />
    </div>
  );
}

function TableRowSkeleton() {
  return (
    <tr>
      <td className="p-3"><Bone className="w-4 h-4 rounded" /></td>
      <td className="p-3"><Bone className="w-6 h-6 rounded-full" /></td>
      <td className="p-3"><Bone className="h-3 w-24" /></td>
      <td className="p-3"><Bone className="h-3 w-20" /></td>
      <td className="p-3"><Bone className="h-3 w-16" /></td>
      <td className="p-3"><Bone className="h-3 w-8" /></td>
      <td className="p-3"><Bone className="h-3 w-16" /></td>
      <td className="p-3"><Bone className="h-3 w-20" /></td>
      <td className="p-3"><Bone className="h-5 w-12 rounded" /></td>
      <td className="p-3"><Bone className="h-4 w-4 mx-auto rounded" /></td>
    </tr>
  );
}

function ChartSkeleton() {
  return (
    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
      <Bone className="h-3 w-28 mb-3" />
      <div className="flex items-center gap-3">
        <Bone className="w-20 h-20 rounded-full shrink-0" />
        <div className="flex-1 space-y-2">
          <Bone className="h-2 w-full" />
          <Bone className="h-2 w-4/5" />
          <Bone className="h-2 w-3/5" />
        </div>
      </div>
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
      <div className="flex justify-between mb-4">
        <Bone className="h-4 w-24" />
        <Bone className="h-3 w-20" />
      </div>
      <div className="flex items-center gap-3 mb-4">
        <Bone className="w-14 h-14 rounded-full shrink-0" />
        <div className="flex-1 space-y-2">
          <Bone className="h-4 w-32" />
          <Bone className="h-2.5 w-28" />
          <Bone className="h-2.5 w-20" />
        </div>
      </div>
      <div className="space-y-2.5">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="grid grid-cols-[80px_1fr] gap-2">
            <Bone className="h-2.5" />
            <Bone className="h-2.5" />
          </div>
        ))}
      </div>
    </div>
  );
}

const TAB_LABELS = ['All Students', 'Active', 'Inactive', 'Passout', 'Transferred'];

export function StudentsListSkeleton() {
  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <KpiSkeletonCard key={i} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 items-start">
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
            <Bone className="h-4 w-28 mb-1" />
            {Array.from({ length: 8 }).map((_, i) => (
              <FilterFieldSkeleton key={i} />
            ))}
            <Bone className="h-8 w-full rounded mt-2" />
            <Bone className="h-3 w-20 mx-auto" />
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <Bone className="h-4 w-20 mb-3" />
            <div className="space-y-2">
              {Array.from({ length: 7 }).map((_, i) => (
                <Bone key={i} className="h-7 w-full rounded" />
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-7 flex flex-col gap-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-3 border-b border-slate-200 flex justify-between">
              <Bone className="h-4 w-24" />
              <div className="flex gap-2">
                <Bone className="w-6 h-6 rounded" />
                <Bone className="w-6 h-6 rounded" />
                <Bone className="w-6 h-6 rounded" />
              </div>
            </div>
            <div className="flex border-b border-slate-200 px-3 gap-1 py-1">
              {TAB_LABELS.map((label) => (
                <div key={label} className="px-3 py-2 flex items-center gap-1.5">
                  <span className="text-[11px] text-slate-400 font-medium whitespace-nowrap">{label}</span>
                  <Bone className="h-3 w-6 rounded" />
                </div>
              ))}
            </div>
            <table className="w-full text-left min-w-[800px] text-[10px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  {['', '', '', '', '', '', '', '', '', ''].map((_, i) => (
                    <th key={i} className="p-3"><Bone className="h-2.5 w-12" /></th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <TableRowSkeleton key={i} />
                ))}
              </tbody>
            </table>
            <div className="p-2 border-t border-slate-200 flex justify-between">
              <Bone className="h-3 w-40" />
              <div className="flex gap-1">
                <Bone className="w-6 h-6 rounded" />
                <Bone className="w-6 h-6 rounded" />
                <Bone className="w-6 h-6 rounded" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <ChartSkeleton />
            <ChartSkeleton />
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center min-h-[140px]">
              <Bone className="h-3 w-32 mb-3" />
              <Bone className="h-8 w-16 mb-2" />
              <Bone className="h-2 w-24 mb-4" />
              <div className="flex gap-6">
                <Bone className="h-8 w-12" />
                <Bone className="h-8 w-12" />
                <Bone className="h-8 w-12" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <Bone className="h-3 w-28 mb-4" />
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex flex-col items-center gap-1">
                    <Bone className="w-8 h-8 rounded-lg" />
                    <Bone className="h-2 w-12" />
                    <Bone className="h-2 w-8" />
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <Bone className="h-3 w-36 mb-3" />
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex gap-3 py-2 border-b border-slate-50 last:border-0">
                  <Bone className="w-4 h-4 rounded-full shrink-0" />
                  <Bone className="h-3 flex-1" />
                  <Bone className="h-3 w-16" />
                  <Bone className="h-3 w-10" />
                </div>
              ))}
              <Bone className="h-3 w-28 mx-auto mt-3" />
            </div>
          </div>
        </div>

        <div className="lg:col-span-3">
          <ProfileSkeleton />
        </div>
      </div>
    </>
  );
}
