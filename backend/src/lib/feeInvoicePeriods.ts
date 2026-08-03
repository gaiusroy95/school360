/** Fee invoice billing period helpers (Month / Quarterly / Half-yearly / Year). */

export type FeePeriodType = 'MONTHLY' | 'QUARTERLY' | 'HALF_YEARLY' | 'YEARLY';

export const MONTH_OPTIONS = [
  { id: 'APR', label: 'April', monthIndex: 3 },
  { id: 'MAY', label: 'May', monthIndex: 4 },
  { id: 'JUN', label: 'June', monthIndex: 5 },
  { id: 'JUL', label: 'July', monthIndex: 6 },
  { id: 'AUG', label: 'August', monthIndex: 7 },
  { id: 'SEP', label: 'September', monthIndex: 8 },
  { id: 'OCT', label: 'October', monthIndex: 9 },
  { id: 'NOV', label: 'November', monthIndex: 10 },
  { id: 'DEC', label: 'December', monthIndex: 11 },
  { id: 'JAN', label: 'January', monthIndex: 0 },
  { id: 'FEB', label: 'February', monthIndex: 1 },
  { id: 'MAR', label: 'March', monthIndex: 2 },
] as const;

export const QUARTER_OPTIONS = [
  { id: 'AMJ', label: 'AMJ (Apr–Jun)', months: 'April–June' },
  { id: 'JAS', label: 'JAS (Jul–Sep)', months: 'July–September' },
  { id: 'OND', label: 'OND (Oct–Dec)', months: 'October–December' },
  { id: 'JFM', label: 'JFM (Jan–Mar)', months: 'January–March' },
] as const;

export const HALF_YEAR_OPTIONS = [
  { id: 'A-S', label: 'A–S (Apr–Sep)', months: 'April–September' },
  { id: 'O-M', label: 'O–M (Oct–Mar)', months: 'October–March' },
] as const;

export const PERIOD_TYPE_OPTIONS: { id: FeePeriodType; label: string }[] = [
  { id: 'MONTHLY', label: '1 — Month / Month Name' },
  { id: 'QUARTERLY', label: '2 — Quarterly (AMJ / JAS / OND / JFM)' },
  { id: 'HALF_YEARLY', label: '3 — Half yearly (A–S / O–M)' },
  { id: 'YEARLY', label: '4 — Year (FY)' },
];

/** Convert academic year like 2025-26 → FY 2025-2026 */
export function academicYearToFyLabel(academicYear: string) {
  const m = academicYear.trim().match(/^(\d{4})\s*[-–/]\s*(\d{2}|\d{4})$/);
  if (!m) return `FY ${academicYear}`;
  const start = m[1];
  const endRaw = m[2];
  const end = endRaw.length === 2 ? `${start.slice(0, 2)}${endRaw}` : endRaw;
  return `FY ${start}-${end}`;
}

export function formatFeePeriod(opts: {
  periodType: FeePeriodType;
  periodValue: string;
  academicYear: string;
}) {
  const { periodType, periodValue, academicYear } = opts;
  const fy = academicYearToFyLabel(academicYear);

  if (periodType === 'YEARLY') {
    return fy;
  }
  if (periodType === 'MONTHLY') {
    const month = MONTH_OPTIONS.find((m) => m.id === periodValue || m.label.toUpperCase() === periodValue.toUpperCase());
    return month ? `${month.label} · ${fy}` : `${periodValue} · ${fy}`;
  }
  if (periodType === 'QUARTERLY') {
    const q = QUARTER_OPTIONS.find((x) => x.id === periodValue);
    return q ? `${q.id} (${q.months}) · ${fy}` : `${periodValue} · ${fy}`;
  }
  if (periodType === 'HALF_YEARLY') {
    const h = HALF_YEAR_OPTIONS.find((x) => x.id === periodValue);
    return h ? `${h.id} (${h.months}) · ${fy}` : `${periodValue} · ${fy}`;
  }
  return fy;
}

export function defaultPeriodValue(periodType: FeePeriodType, now = new Date()): string {
  const month = now.getMonth(); // 0=Jan
  if (periodType === 'YEARLY') return 'FY';
  if (periodType === 'MONTHLY') {
    const map = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    return map[month] || 'APR';
  }
  if (periodType === 'QUARTERLY') {
    if (month >= 3 && month <= 5) return 'AMJ';
    if (month >= 6 && month <= 8) return 'JAS';
    if (month >= 9 && month <= 11) return 'OND';
    return 'JFM';
  }
  // HALF_YEARLY
  if (month >= 3 && month <= 8) return 'A-S';
  return 'O-M';
}

export function getInvoicePeriodMeta(academicYear: string) {
  return {
    periodTypes: PERIOD_TYPE_OPTIONS,
    months: MONTH_OPTIONS.map((m) => ({ id: m.id, label: m.label })),
    quarters: QUARTER_OPTIONS.map((q) => ({ id: q.id, label: q.label })),
    halfYears: HALF_YEAR_OPTIONS.map((h) => ({ id: h.id, label: h.label })),
    yearOption: { id: 'FY', label: academicYearToFyLabel(academicYear) },
    defaults: {
      MONTHLY: defaultPeriodValue('MONTHLY'),
      QUARTERLY: defaultPeriodValue('QUARTERLY'),
      HALF_YEARLY: defaultPeriodValue('HALF_YEARLY'),
      YEARLY: 'FY',
    },
  };
}

export function inferFeePeriodFromDate(date: Date, academicYear: string) {
  return formatFeePeriod({
    periodType: 'MONTHLY',
    periodValue: defaultPeriodValue('MONTHLY', date),
    academicYear,
  });
}
