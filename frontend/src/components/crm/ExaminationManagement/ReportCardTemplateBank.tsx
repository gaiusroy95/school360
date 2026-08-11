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
    description: 'Activity & grade remarks card for early years.',
  },
  {
    id: 'PRIMARY',
    label: 'Primary',
    classes: 'Class 1 – 4',
    description: 'Subject marks, grades and teacher remarks.',
  },
  {
    id: 'MIDDLE',
    label: 'Middle',
    classes: 'Class 6 – 7',
    description: 'Marks, GPA, class rank and performance band.',
  },
  {
    id: 'UPPER',
    label: 'Upper Secondary',
    classes: 'Class 9 & 11',
    description: 'CGPA, aggregate summary and subject performance.',
  },
  {
    id: 'BOARD',
    label: 'Board Exam',
    classes: 'Class 5, 8, 10, 12',
    description: 'Government board marksheet notice — upload official sheet separately.',
  },
];

const SAMPLE_SUBJECTS = [
  { name: 'English', obtained: 78, max: 100, grade: 'B+' },
  { name: 'Mathematics', obtained: 92, max: 100, grade: 'A+' },
  { name: 'Science', obtained: 85, max: 100, grade: 'A' },
  { name: 'Social Studies', obtained: 74, max: 100, grade: 'B' },
  { name: 'Hindi', obtained: 88, max: 100, grade: 'A' },
];

const PRE_PRIMARY_AREAS = [
  { area: 'Language & Literacy', grade: 'Excellent' },
  { area: 'Numeracy', grade: 'Good' },
  { area: 'Motor Skills', grade: 'Excellent' },
  { area: 'Social Skills', grade: 'Satisfactory' },
  { area: 'Creativity', grade: 'Good' },
];

type PreviewAssets = {
  logoDataUrl?: string | null;
  principalSignatureDataUrl?: string | null;
  teacherSignatureDataUrl?: string | null;
  sealDataUrl?: string | null;
};

type PreviewProps = {
  templateId: ReportCardTemplate;
  schoolName: string;
  schoolAddress: string;
  principalName: string;
  footerNote: string;
  boardExamNotice: string;
  assets?: PreviewAssets;
};

function toDataUrl(raw?: string | null) {
  if (!raw) return null;
  if (raw.startsWith('data:')) return raw;
  const isJpeg = raw.startsWith('/9j');
  return `data:image/${isJpeg ? 'jpeg' : 'png'};base64,${raw}`;
}

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <tr className="border-b border-slate-400">
      <td className="w-[32%] border-r border-slate-400 bg-slate-50 px-1.5 py-1 text-[8px] font-semibold text-slate-700">
        {label}
      </td>
      <td className="px-1.5 py-1 text-[8px] font-medium text-slate-900">{value}</td>
    </tr>
  );
}

function SignatureBox({
  label,
  sub,
  imageUrl,
}: {
  label: string;
  sub?: string;
  imageUrl?: string | null;
}) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="mb-1 flex h-12 w-full max-w-[90px] items-end justify-center border-b border-slate-500 pb-0.5">
        {imageUrl ? (
          <img src={imageUrl} alt={label} className="max-h-10 max-w-full object-contain" />
        ) : (
          <span className="text-[7px] italic text-slate-300">sign</span>
        )}
      </div>
      <p className="text-[8px] font-bold text-slate-800">{label}</p>
      {sub ? <p className="text-[7px] text-slate-500">{sub}</p> : null}
    </div>
  );
}

/**
 * Formal A4-style report card preview (same document language as admission application forms).
 */
export function ReportCardTemplateLivePreview({
  templateId,
  schoolName,
  schoolAddress,
  principalName,
  footerNote,
  boardExamNotice,
  assets,
}: PreviewProps) {
  const colors = TEMPLATE_PREVIEW_COLORS[templateId];
  const primary = `rgb(${colors.primary.join(',')})`;
  const item = REPORT_CARD_TEMPLATE_BANK.find((t) => t.id === templateId);
  const logo = toDataUrl(assets?.logoDataUrl);
  const principalSig = toDataUrl(assets?.principalSignatureDataUrl);
  const teacherSig = toDataUrl(assets?.teacherSignatureDataUrl);
  const seal = toDataUrl(assets?.sealDataUrl);

  const classLabel =
    templateId === 'PRE_PRIMARY' ? 'UKG — A'
      : templateId === 'PRIMARY' ? '3 — B'
        : templateId === 'MIDDLE' ? '7 — A'
          : templateId === 'UPPER' ? '11 — Science'
            : '10 — A';

  const totalObt = SAMPLE_SUBJECTS.reduce((s, x) => s + x.obtained, 0);
  const totalMax = SAMPLE_SUBJECTS.reduce((s, x) => s + x.max, 0);
  const pct = ((totalObt / totalMax) * 100).toFixed(1);

  return (
    <div
      className="mx-auto w-full max-w-[460px] origin-top bg-white text-slate-900 shadow-lg"
      style={{
        border: `2px solid ${primary}`,
        aspectRatio: '210 / 297',
        minHeight: 620,
      }}
    >
      <div className="flex h-full flex-col p-3">
        {/* Header — admission-form style */}
        <div className="mb-2 border-b-2 pb-2" style={{ borderColor: primary }}>
          <div className="flex items-start gap-2">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden border-2 border-slate-300 bg-white">
              {logo ? (
                <img src={logo} alt="School logo" className="max-h-full max-w-full object-contain" />
              ) : (
                <span className="px-1 text-center text-[8px] font-bold text-slate-400">SCHOOL<br />LOGO</span>
              )}
            </div>
            <div className="min-w-0 flex-1 text-center">
              <h2 className="text-[13px] font-black uppercase leading-tight tracking-wide" style={{ color: primary }}>
                {schoolName || 'School Name'}
              </h2>
              <p className="mt-0.5 text-[8px] leading-snug text-slate-600">
                {schoolAddress || 'School Address, City, State — PIN'}
              </p>
              <p className="mt-1.5 text-[11px] font-black uppercase tracking-wider" style={{ color: primary }}>
                {templateId === 'BOARD' ? 'Board Marksheet Notice' : 'Student Report Card'}
              </p>
              <p className="text-[8px] text-slate-500">
                {item?.label} · Academic Year 2025-26 · Sample Preview
              </p>
            </div>
            <div className="flex h-14 w-12 shrink-0 items-center justify-center overflow-hidden border border-slate-300 bg-slate-50">
              {seal ? (
                <img src={seal} alt="Seal" className="max-h-full max-w-full object-contain opacity-80" />
              ) : (
                <span className="text-[7px] font-bold text-slate-300">SEAL</span>
              )}
            </div>
          </div>
        </div>

        {/* Student particulars */}
        <table className="mb-2 w-full border border-slate-400 text-left">
          <tbody>
            <InfoCell label="Student Name" value="Aarav Sharma" />
            <InfoCell label="Admission No." value="ADM-2025-0142" />
            <InfoCell label="Class / Section" value={classLabel} />
            <InfoCell label="Examination" value="Term 2 Final" />
            <InfoCell label="Father / Mother" value="Rajesh Sharma / Priya Sharma" />
          </tbody>
        </table>

        {/* Body by template */}
        {templateId === 'BOARD' ? (
          <div className="mb-2 flex-1 rounded border border-amber-300 bg-amber-50 p-3">
            <p className="mb-1 text-[10px] font-black uppercase text-amber-900">
              Class 5, 8, 10, 12 — Government board marksheet
            </p>
            <p className="text-[9px] leading-relaxed text-amber-950">
              {boardExamNotice
                || 'Marksheet for this class is issued by the Board of Education as per government rules. Upload the official board marksheet from the Board Exam tab. This school report card is not generated for board classes.'}
            </p>
          </div>
        ) : templateId === 'PRE_PRIMARY' ? (
          <div className="mb-2 flex-1">
            <p className="mb-1 text-[9px] font-bold uppercase text-slate-700">Developmental assessment</p>
            <table className="w-full border border-slate-400 text-left">
              <thead>
                <tr className="bg-slate-800 text-white">
                  <th className="border-r border-slate-500 px-1.5 py-1 text-[8px] font-semibold">Learning Area</th>
                  <th className="px-1.5 py-1 text-[8px] font-semibold">Grade</th>
                </tr>
              </thead>
              <tbody>
                {PRE_PRIMARY_AREAS.map((row) => (
                  <tr key={row.area} className="border-t border-slate-300">
                    <td className="border-r border-slate-300 px-1.5 py-1 text-[8px]">{row.area}</td>
                    <td className="px-1.5 py-1 text-[8px] font-bold" style={{ color: primary }}>{row.grade}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 border border-slate-300 bg-slate-50 p-2 text-[8px] italic text-slate-700">
              Teacher remark: “Aarav participates actively and shows curiosity in learning activities.”
            </p>
          </div>
        ) : (
          <div className="mb-2 flex-1">
            <p className="mb-1 text-[9px] font-bold uppercase text-slate-700">Scholastic performance</p>
            <table className="w-full border border-slate-400 text-left">
              <thead>
                <tr style={{ backgroundColor: primary }} className="text-white">
                  <th className="border-r border-white/30 px-1.5 py-1 text-[8px] font-semibold">Subject</th>
                  <th className="border-r border-white/30 px-1.5 py-1 text-[8px] font-semibold">Max</th>
                  <th className="border-r border-white/30 px-1.5 py-1 text-[8px] font-semibold">Obtained</th>
                  <th className="px-1.5 py-1 text-[8px] font-semibold">Grade</th>
                </tr>
              </thead>
              <tbody>
                {SAMPLE_SUBJECTS.map((s) => (
                  <tr key={s.name} className="border-t border-slate-300">
                    <td className="border-r border-slate-300 px-1.5 py-1 text-[8px] font-medium">{s.name}</td>
                    <td className="border-r border-slate-300 px-1.5 py-1 text-[8px]">{s.max}</td>
                    <td className="border-r border-slate-300 px-1.5 py-1 text-[8px]">{s.obtained}</td>
                    <td className="px-1.5 py-1 text-[8px] font-bold" style={{ color: primary }}>{s.grade}</td>
                  </tr>
                ))}
                <tr className="border-t-2 border-slate-500 bg-slate-50 font-bold">
                  <td className="border-r border-slate-300 px-1.5 py-1 text-[8px]">Total</td>
                  <td className="border-r border-slate-300 px-1.5 py-1 text-[8px]">{totalMax}</td>
                  <td className="border-r border-slate-300 px-1.5 py-1 text-[8px]">{totalObt}</td>
                  <td className="px-1.5 py-1 text-[8px]">{pct}%</td>
                </tr>
              </tbody>
            </table>

            {(templateId === 'MIDDLE' || templateId === 'UPPER') && (
              <table className="mt-2 w-full border border-slate-400">
                <tbody>
                  <tr>
                    <td className="border-r border-slate-300 bg-slate-50 px-1.5 py-1 text-center text-[8px]">
                      <span className="text-slate-500">{templateId === 'UPPER' ? 'CGPA' : 'GPA'}</span>
                      <br /><strong style={{ color: primary }}>8.7</strong>
                    </td>
                    <td className="border-r border-slate-300 bg-slate-50 px-1.5 py-1 text-center text-[8px]">
                      <span className="text-slate-500">Percentage</span>
                      <br /><strong style={{ color: primary }}>{pct}%</strong>
                    </td>
                    <td className="bg-slate-50 px-1.5 py-1 text-center text-[8px]">
                      <span className="text-slate-500">Class Rank</span>
                      <br /><strong style={{ color: primary }}>05</strong>
                    </td>
                  </tr>
                </tbody>
              </table>
            )}

            <p className="mt-2 border border-slate-300 bg-slate-50 p-2 text-[8px] text-slate-700">
              <strong>Overall:</strong> Very Good · <strong>Remark:</strong> Consistent performer with strong aptitude in Mathematics.
            </p>
          </div>
        )}

        {/* Signatures */}
        <div className="mt-auto grid grid-cols-3 gap-2 border-t border-slate-400 pt-3">
          <SignatureBox label="Class Teacher" imageUrl={teacherSig} />
          <SignatureBox label="Principal" sub={principalName || undefined} imageUrl={principalSig} />
          <SignatureBox label="School Seal" imageUrl={seal} />
        </div>

        <p className="mt-2 text-center text-[7px] italic text-slate-500">
          {footerNote || 'This is a computer-generated report card. Parent signature acknowledging receipt is required.'}
        </p>
      </div>
    </div>
  );
}
