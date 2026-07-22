import type { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

/** Shared design tokens for Parent Management CRM */
export const pm = {
  page: 'flex flex-col h-full min-h-0 bg-gradient-to-b from-slate-50 via-slate-50 to-slate-100/90 overflow-hidden',
  header: 'px-4 md:px-6 py-4 md:py-5 bg-white border-b border-slate-200/90 shrink-0 shadow-[0_1px_0_rgba(15,23,42,0.04)]',
  headerInner: 'flex flex-col sm:flex-row sm:items-start justify-between gap-3',
  content: 'flex-1 overflow-y-auto px-4 md:px-6 py-4 md:py-5 space-y-5',
  contentFlush: 'flex flex-col flex-1 min-h-0 overflow-hidden',
  breadcrumb: 'text-[10px] font-semibold text-slate-400 uppercase tracking-wider',
  title: 'text-xl md:text-2xl font-bold text-slate-900 tracking-tight mt-0.5',
  subtitle: 'text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed',
  actions: 'flex flex-wrap gap-2 self-start',

  card: 'bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_4px_12px_rgba(15,23,42,0.03)]',
  cardHover: 'bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_4px_12px_rgba(15,23,42,0.03)] hover:shadow-md hover:border-slate-300/80 transition-all duration-200',
  cardPad: 'p-4 md:p-5',
  cardHeader: 'px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between gap-2',
  cardTitle: 'text-sm font-bold text-slate-800',

  kpiGrid: 'grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4',
  kpiCard: 'bg-white rounded-xl border border-slate-200/80 p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]',
  kpiLabel: 'text-[10px] font-bold text-slate-500 uppercase tracking-wide',
  kpiValue: 'text-2xl font-bold text-slate-900 mt-1 tabular-nums',

  tableWrap: 'bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.04)] overflow-hidden',
  table: 'w-full text-left border-collapse',
  tableHead: 'bg-slate-50/95 border-b border-slate-200/80',
  th: 'px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500',
  thSm: 'px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500',
  tbody: 'divide-y divide-slate-100',
  trHover: 'hover:bg-slate-50/80 transition-colors',
  td: 'px-4 py-3 text-sm text-slate-700',
  tdSm: 'px-3 py-2.5 text-[11px] text-slate-700',
  tableFoot: 'px-4 py-2.5 border-t border-slate-100 bg-slate-50/40 text-[11px] text-slate-500',

  input:
    'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white text-slate-800 placeholder:text-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-400/25 focus:border-amber-400/60 transition-shadow',
  select:
    'border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-400/25 focus:border-amber-400/60 transition-shadow',
  selectFull: 'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-400/25 focus:border-amber-400/60',

  btnPrimary:
    'inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-amber-400 hover:bg-amber-500 text-slate-900 rounded-lg text-sm font-bold shadow-sm transition-colors',
  btnSecondary:
    'inline-flex items-center justify-center gap-1.5 px-3 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-sm font-semibold shadow-sm transition-colors',
  btnDark:
    'inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold shadow-sm transition-colors',
  btnGhost: 'inline-flex items-center justify-center gap-1 p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors',
  btnCancel: 'px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors',
  btnSave: 'px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold shadow-sm transition-colors',

  modalOverlay: 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/45 backdrop-blur-[3px]',
  modal: 'bg-white rounded-2xl border border-slate-200/90 shadow-2xl w-full max-w-md p-6 space-y-4 max-h-[90vh] overflow-y-auto',
  modalLg: 'bg-white rounded-2xl border border-slate-200/90 shadow-2xl w-full max-w-lg p-6 space-y-4 max-h-[85vh] overflow-y-auto',
  modalTitle: 'text-lg font-bold text-slate-900',

  badge: 'inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border',
  badgeGreen: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
  badgeAmber: 'bg-amber-50 text-amber-800 border-amber-200/80',
  badgeRed: 'bg-red-50 text-red-700 border-red-200/80',
  badgeBlue: 'bg-blue-50 text-blue-700 border-blue-200/80',
  badgeSlate: 'bg-slate-50 text-slate-600 border-slate-200/80',

  alertDanger: 'rounded-xl border border-red-200/70 bg-gradient-to-br from-red-50/90 to-white p-4 md:p-5 shadow-sm',
  alertSuccess: 'rounded-xl border border-emerald-200/70 bg-gradient-to-br from-emerald-50/90 to-white p-4 md:p-5 shadow-sm',
  alertInner: 'overflow-x-auto bg-white rounded-lg border border-slate-200/60 shadow-inner',

  tabs: 'flex border-b border-slate-200/80 px-2 overflow-x-auto gap-0.5',
  tab: 'px-3 py-2.5 whitespace-nowrap text-[11px] font-medium text-slate-500 border-b-2 border-transparent hover:text-slate-700 transition-colors',
  tabActive: 'px-3 py-2.5 whitespace-nowrap text-[11px] font-bold text-indigo-600 border-b-2 border-indigo-600',

  message: 'text-xs font-medium text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2',
  filterBar: 'flex flex-wrap items-center gap-2 p-3 bg-white rounded-xl border border-slate-200/80 shadow-sm',

  stickyPanel: 'bg-white rounded-xl border border-slate-200/80 shadow-[0_4px_20px_rgba(15,23,42,0.06)] p-4 md:p-5 sticky top-4',
};

export function ParentPageShell({ children, flush }: { children: ReactNode; flush?: boolean }) {
  return <div className={pm.page}>{children}</div>;
}

export function ParentPageHeader({
  breadcrumb,
  title,
  subtitle,
  actions,
}: {
  breadcrumb: string;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className={pm.header}>
      <div className={pm.headerInner}>
        <div>
          <p className={pm.breadcrumb}>{breadcrumb}</p>
          <h1 className={pm.title}>{title}</h1>
          {subtitle && <p className={pm.subtitle}>{subtitle}</p>}
        </div>
        {actions && <div className={pm.actions}>{actions}</div>}
      </div>
    </div>
  );
}

export function ParentKpiGrid({ children }: { children: ReactNode }) {
  return <div className={pm.kpiGrid}>{children}</div>;
}

export function ParentKpiCard({
  label,
  value,
  valueClassName = 'text-slate-900',
}: {
  label: string;
  value: string | number;
  valueClassName?: string;
}) {
  return (
    <div className={pm.kpiCard}>
      <p className={pm.kpiLabel}>{label}</p>
      <p className={`${pm.kpiValue} ${valueClassName}`}>
        {typeof value === 'number' ? value.toLocaleString('en-IN') : value}
      </p>
    </div>
  );
}

export function ParentTableCard({
  title,
  actions,
  children,
  footer,
}: {
  title?: string;
  actions?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className={pm.tableWrap}>
      {(title || actions) && (
        <div className={pm.cardHeader}>
          {title && <h3 className={pm.cardTitle}>{title}</h3>}
          {actions}
        </div>
      )}
      <div className="overflow-x-auto">{children}</div>
      {footer && <div className={pm.tableFoot}>{footer}</div>}
    </div>
  );
}

export function ParentModal({
  open,
  onClose,
  title,
  children,
  large,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  large?: boolean;
}) {
  if (!open) return null;
  return (
    <div className={pm.modalOverlay} onClick={onClose} role="presentation">
      <div
        className={large ? pm.modalLg : pm.modal}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal
      >
        <h3 className={pm.modalTitle}>{title}</h3>
        {children}
      </div>
    </div>
  );
}

export function ParentLoading({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-slate-500 gap-3">
      <Loader2 className="animate-spin text-indigo-500" size={28} />
      <p className="text-sm font-medium">{label}</p>
    </div>
  );
}

export function ParentModalActions({
  onCancel,
  onConfirm,
  confirmLabel = 'Save',
  cancelLabel = 'Cancel',
}: {
  onCancel: () => void;
  onConfirm: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
}) {
  return (
    <div className="flex gap-2 justify-end pt-2">
      <button type="button" onClick={onCancel} className={pm.btnCancel}>
        {cancelLabel}
      </button>
      <button type="button" onClick={onConfirm} className={pm.btnSave}>
        {confirmLabel}
      </button>
    </div>
  );
}
