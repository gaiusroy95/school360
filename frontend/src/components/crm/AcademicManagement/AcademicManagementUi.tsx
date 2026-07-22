import type { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

export const am = {
  page: 'flex flex-col h-full min-h-0 bg-gradient-to-b from-slate-50 via-slate-50 to-slate-100/90 overflow-hidden',
  content: 'flex-1 overflow-y-auto px-4 md:px-6 py-4 md:py-5 space-y-5',
  breadcrumb: 'text-[10px] font-semibold text-slate-400 uppercase tracking-wider',
  title: 'text-xl md:text-2xl font-bold text-slate-900 tracking-tight mt-0.5',
  subtitle: 'text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed',
  card: 'bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_4px_12px_rgba(15,23,42,0.03)]',
  cardPad: 'p-4 md:p-5',
  input: 'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-400/25 focus:border-amber-400/60',
  select: 'border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-400/25',
  btnPrimary: 'inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-amber-400 hover:bg-amber-500 text-slate-900 rounded-lg text-sm font-bold shadow-sm transition-colors',
  btnSecondary: 'inline-flex items-center justify-center gap-1.5 px-3 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-sm font-semibold shadow-sm transition-colors',
  btnDark: 'inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold shadow-sm transition-colors',
  tableWrap: 'bg-white rounded-xl border border-slate-200/80 overflow-hidden',
  th: 'px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500 bg-slate-50/95 border-b border-slate-200/80',
  td: 'px-4 py-3 text-sm text-slate-700 border-b border-slate-100',
  message: 'text-xs font-medium text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2',
  filterBar: 'flex flex-wrap items-center gap-2 p-3 bg-white rounded-xl border border-slate-200/80 shadow-sm',
};

export function AcademicPageShell({ children }: { children: ReactNode }) {
  return <div className={am.page}>{children}</div>;
}

export function AcademicPageHeader({
  breadcrumb, title, subtitle, actions,
}: { breadcrumb: string; title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="px-4 md:px-6 py-4 md:py-5 bg-white border-b border-slate-200/90 shrink-0">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <p className={am.breadcrumb}>{breadcrumb}</p>
          <h1 className={am.title}>{title}</h1>
          {subtitle && <p className={am.subtitle}>{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </div>
  );
}

export function AcademicLoading({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-slate-500 gap-3">
      <Loader2 className="animate-spin" size={28} />
      <p className="text-sm">{label}</p>
    </div>
  );
}

export function AcademicModal({
  open, onClose, title, children, large,
}: { open: boolean; onClose: () => void; title: string; children: ReactNode; large?: boolean }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/45 backdrop-blur-[3px]" onClick={onClose}>
      <div className={`bg-white rounded-2xl border border-slate-200/90 shadow-2xl w-full ${large ? 'max-w-lg' : 'max-w-md'} p-6 space-y-4 max-h-[85vh] overflow-y-auto`} onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-slate-900">{title}</h3>
        {children}
      </div>
    </div>
  );
}

export function AcademicYearTermFilters({
  academicYear, term, years, terms, onYear, onTerm, className, sectionName, classes, sections, onClass, onSection,
}: {
  academicYear: string; term: string; years: string[]; terms: string[];
  onYear: (v: string) => void; onTerm: (v: string) => void;
  className?: string; sectionName?: string; classes?: string[]; sections?: string[];
  onClass?: (v: string) => void; onSection?: (v: string) => void;
}) {
  return (
    <div className={am.filterBar}>
      <select value={academicYear} onChange={(e) => onYear(e.target.value)} className={am.select}>
        {years.map((y) => <option key={y} value={y}>{y}</option>)}
      </select>
      <select value={term} onChange={(e) => onTerm(e.target.value)} className={am.select}>
        {terms.map((t) => <option key={t} value={t}>{t}</option>)}
      </select>
      {classes && onClass && (
        <select value={className || ''} onChange={(e) => onClass(e.target.value)} className={am.select}>
          <option value="">All Classes</option>
          {classes.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      )}
      {sections && onSection && (
        <select value={sectionName || ''} onChange={(e) => onSection(e.target.value)} className={am.select}>
          <option value="">All Sections</option>
          {sections.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      )}
    </div>
  );
}
