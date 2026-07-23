import type { ReactNode } from 'react';
export {
  am,
  AcademicPageShell,
  AcademicPageHeader,
  AcademicLoading,
  AcademicModal,
} from '../AcademicManagement/AcademicManagementUi';

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-800',
  INACTIVE: 'bg-slate-100 text-slate-600',
  DRAFT: 'bg-slate-100 text-slate-600',
  PENDING: 'bg-amber-100 text-amber-800',
  PENDING_APPROVAL: 'bg-amber-100 text-amber-800',
  PARTIAL: 'bg-blue-100 text-blue-800',
  PAID: 'bg-green-100 text-green-800',
  OVERDUE: 'bg-red-100 text-red-800',
  CANCELLED: 'bg-slate-100 text-slate-500',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  PROCESSED: 'bg-indigo-100 text-indigo-800',
  CLOSED: 'bg-slate-100 text-slate-600',
  EXPIRED: 'bg-orange-100 text-orange-800',
  WAIVED: 'bg-purple-100 text-purple-800',
  EMPANELLED: 'bg-teal-100 text-teal-800',
  GENERATED: 'bg-indigo-100 text-indigo-800',
  OPEN: 'bg-purple-100 text-purple-800',
  COMPLETED: 'bg-blue-100 text-blue-800',
  DUE: 'bg-red-100 text-red-800',
  DAY_CLOSING_COMPLETED: 'bg-teal-100 text-teal-800',
  FROZEN: 'bg-cyan-100 text-cyan-800',
  RETURNED: 'bg-orange-100 text-orange-800',
};

export function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_COLORS[status] || 'bg-slate-100 text-slate-600';
  return (
    <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${cls}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}

export function FeeMessage({ message, type = 'info' }: { message: string; type?: 'info' | 'error' | 'success' }) {
  if (!message) return null;
  const cls =
    type === 'error'
      ? 'bg-red-50 border-red-200 text-red-700'
      : type === 'success'
        ? 'bg-green-50 border-green-200 text-green-700'
        : 'bg-indigo-50 border-indigo-100 text-indigo-700';
  return <div className={`text-xs font-medium border rounded-lg px-3 py-2 ${cls}`}>{message}</div>;
}

export function FeeTabs({ tabs, active, onChange }: {
  tabs: string[];
  active: string;
  onChange: (tab: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1 border-b border-slate-200 pb-px">
      {tabs.map((tab) => (
        <button
          key={tab}
          type="button"
          onClick={() => onChange(tab)}
          className={`px-3 py-2 text-xs font-semibold rounded-t-lg transition-colors ${
            active === tab
              ? 'bg-white border border-b-white border-slate-200 text-amber-700 -mb-px'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="text-sm text-slate-400 text-center py-10">{children}</p>;
}
