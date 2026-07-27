import type { ReactNode } from 'react';
import { AcademicLoading, FeeMessage } from '../FeeFinanceManagement/FeeFinanceUi';

export const cs = {
  page: 'flex flex-col h-full space-y-4',
  header: 'flex flex-col sm:flex-row sm:items-center justify-between gap-3',
  title: 'text-xl font-bold text-slate-800 tracking-tight',
  subtitle: 'text-xs text-slate-500 mt-0.5',
  card: 'bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3',
  label: 'text-[10px] font-semibold text-slate-600 block mb-1',
  input: 'w-full text-xs border border-slate-200 rounded-lg px-2 py-1.5',
  btnPrimary: 'px-4 py-2 text-xs font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50',
  btnSecondary: 'px-3 py-2 text-xs font-medium border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50',
  table: 'w-full text-xs',
  th: 'text-left px-3 py-2 font-bold text-slate-600 bg-slate-50 border-b border-slate-100',
  td: 'px-3 py-2 text-slate-700 border-b border-slate-50',
};

export function CoreSystemsPage({
  title,
  objective,
  loading,
  message,
  messageType = 'info',
  children,
  actions,
}: {
  title: string;
  objective: string;
  loading?: boolean;
  message?: string;
  messageType?: 'success' | 'error' | 'info';
  children: ReactNode;
  actions?: ReactNode;
}) {
  if (loading) return <AcademicLoading label={`Loading ${title.toLowerCase()}…`} />;

  return (
    <div className={cs.page}>
      <div className={cs.header}>
        <div>
          <h2 className={cs.title}>{title}</h2>
          <p className={cs.subtitle}>{objective}</p>
        </div>
        {actions}
      </div>
      {message && <FeeMessage message={message} type={messageType} />}
      {children}
    </div>
  );
}

export function Field({
  label,
  children,
  required,
}: {
  label: string;
  children: ReactNode;
  required?: boolean;
}) {
  return (
    <div>
      <label className={cs.label}>
        {label}
        {required ? ' *' : ''}
      </label>
      {children}
    </div>
  );
}
