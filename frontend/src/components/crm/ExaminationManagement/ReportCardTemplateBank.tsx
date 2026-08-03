import type { ReportCardTemplate } from '../../../lib/examinationServices';
import { TEMPLATE_PREVIEW_COLORS } from '../../../lib/reportCardPdf';

export type TemplateBankItem = {
  id: ReportCardTemplate;
  label: string;
  classes: string;
  description: string;
};

export const REPORT_CARD_TEMPLATE_BANK: TemplateBankItem[] = [
  {
    id: 'PRE_PRIMARY',
    label: 'Pre-Primary',
    classes: 'Nursery · LKG · UKG',
    description: 'Colourful grade-based card with activity remarks — ideal for early years.',
  },
  {
    id: 'PRIMARY',
    label: 'Primary',
    classes: 'Class 1 – 4',
    description: 'Subject marks table with grades and teacher remarks.',
  },
  {
    id: 'MIDDLE',
    label: 'Middle',
    classes: 'Class 6 – 7',
    description: 'Marks, GPA, class rank and overall performance band.',
  },
  {
    id: 'UPPER',
    label: 'Upper Secondary',
    classes: 'Class 9 & 11',
    description: 'CGPA, aggregate summary and subject-wise performance.',
  },
  {
    id: 'BOARD',
    label: 'Board Exam',
    classes: 'Class 5, 8, 10, 12',
    description: 'Government board marksheet notice — official sheet uploaded separately.',
  },
];

const SAMPLE_SUBJECTS = [
  { name: 'English', obtained: 78, max: 100, grade: 'B+' },
  { name: 'Mathematics', obtained: 92, max: 100, grade: 'A+' },
  { name: 'Science', obtained: 85, max: 100, grade: 'A' },
  { name: 'Social Studies', obtained: 74, max: 100, grade: 'B' },
  { name: 'Hindi', obtained: 88, max: 100, grade: 'A' },
];

type PreviewProps = {
  templateId: ReportCardTemplate;
  schoolName: string;
  schoolAddress: string;
  principalName: string;
  footerNote: string;
  boardExamNotice: string;
};

/** Lightweight on-screen preview of a report card template (no PDF generation). */
export function ReportCardTemplateLivePreview({
  templateId,
  schoolName,
  schoolAddress,
  principalName,
  footerNote,
  boardExamNotice,
}: PreviewProps) {
  const colors = TEMPLATE_PREVIEW_COLORS[templateId];
  const primary = `rgb(${colors.primary.join(',')})`;
  const accent = `rgb(${colors.accent.join(',')})`;
  const bg = `rgb(${colors.bg.join(',')})`;
  const item = REPORT_CARD_TEMPLATE_BANK.find((t) => t.id === templateId);

  return (
    <div
      className="mx-auto w-full max-w-[420px] overflow-hidden rounded-xl border-2 bg-white shadow-md"
      style={{ borderColor: primary }}
    >
      <div className="px-4 py-3 text-center" style={{ backgroundColor: bg }}>
        <div className="mb-2 flex items-center justify-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-dashed text-[9px] font-bold text-slate-400"
            style={{ borderColor: accent, backgroundColor: 'white' }}
          >
            LOGO
          </div>
          <div className="min-w-0 flex-1 text-left">
            <p className="truncate text-sm font-bold" style={{ color: primary }}>
              {schoolName || 'School Name'}
            </p>
            <p className="truncate text-[9px] text-slate-500">{schoolAddress || 'School Address'}</p>
          </div>
        </div>
        <p className="text-[11px] font-black tracking-wide" style={{ color: primary }}>
          {templateId === 'BOARD' ? 'BOARD MARKSHEET NOTICE' : 'REPORT CARD'}
        </p>
        <p className="text-[9px] text-slate-500">
          {item?.label} · Sample Preview · Academic Year 2025-26
        </p>
      </div>

      <div className="space-y-3 px-4 py-3 text-[10px]">
        <div className="grid grid-cols-2 gap-x-3 gap-y-1 rounded-lg bg-slate-50 p-2.5">
          <p><span className="text-slate-400">Student:</span> <strong>Aarav Sharma</strong></p>
          <p><span className="text-slate-400">Adm No:</span> <strong>ADM-2025-0142</strong></p>
          <p><span className="text-slate-400">Class:</span> <strong>
            {templateId === 'PRE_PRIMARY' ? 'UKG — A'
              : templateId === 'PRIMARY' ? '3 — B'
                : templateId === 'MIDDLE' ? '7 — A'
                  : templateId === 'UPPER' ? '11 — Science'
                    : '10 — A'}
          </strong></p>
          <p><span className="text-slate-400">Exam:</span> <strong>Term 2 Final</strong></p>
        </div>

        {templateId === 'BOARD' ? (
          <div className="rounded-lg border p-3" style={{ backgroundColor: bg, borderColor: accent }}>
            <p className="mb-1 text-[11px] font-bold" style={{ color: primary }}>
              Class 5, 8, 10, 12 — Govt. board marksheet
            </p>
            <p className="text-[9px] leading-relaxed text-slate-600">
              {boardExamNotice
                || 'Marksheet for this class is issued by the Board of Education as per government rules. Upload the official board marksheet from the Board Exam tab.'}
            </p>
          </div>
        ) : templateId === 'PRE_PRIMARY' ? (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-1.5">
              {['Excellent', 'Good', 'Satisfactory'].map((g) => (
                <span
                  key={g}
                  className="rounded-full px-2 py-0.5 text-[9px] font-bold text-white"
                  style={{ backgroundColor: g === 'Excellent' ? primary : accent }}
                >
                  {g}
                </span>
              ))}
            </div>
            <p className="rounded-lg bg-slate-50 p-2 italic text-slate-600">
              “Aarav participates actively and shows curiosity in learning activities.”
            </p>
          </div>
        ) : (
          <table className="w-full overflow-hidden rounded-lg border border-slate-200 text-left">
            <thead>
              <tr style={{ backgroundColor: primary, color: 'white' }}>
                <th className="px-2 py-1.5 font-semibold">Subject</th>
                <th className="px-2 py-1.5 font-semibold">Obtained</th>
                <th className="px-2 py-1.5 font-semibold">Max</th>
                <th className="px-2 py-1.5 font-semibold">Grade</th>
              </tr>
            </thead>
            <tbody>
              {SAMPLE_SUBJECTS.map((s) => (
                <tr key={s.name} className="border-t border-slate-100">
                  <td className="px-2 py-1 font-medium text-slate-700">{s.name}</td>
                  <td className="px-2 py-1">{s.obtained}</td>
                  <td className="px-2 py-1">{s.max}</td>
                  <td className="px-2 py-1 font-bold" style={{ color: primary }}>{s.grade}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {(templateId === 'MIDDLE' || templateId === 'UPPER') && (
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              { label: templateId === 'UPPER' ? 'CGPA' : 'GPA', value: '8.7' },
              { label: 'Percentage', value: '83.4%' },
              { label: 'Rank', value: '05' },
            ].map((k) => (
              <div key={k.label} className="rounded-lg border border-slate-100 bg-slate-50 py-2">
                <p className="text-[8px] uppercase text-slate-400">{k.label}</p>
                <p className="text-sm font-black" style={{ color: primary }}>{k.value}</p>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-3 gap-2 border-t border-dashed border-slate-200 pt-3 text-center">
          {['Class Teacher', 'Principal', 'School Seal'].map((label) => (
            <div key={label}>
              <div className="mx-auto mb-1 h-8 w-16 rounded border border-dashed border-slate-300 bg-slate-50" />
              <p className="text-[8px] text-slate-400">
                {label === 'Principal' && principalName ? principalName : label}
              </p>
            </div>
          ))}
        </div>

        {footerNote && (
          <p className="text-center text-[8px] italic text-slate-400">{footerNote}</p>
        )}
      </div>
    </div>
  );
}
