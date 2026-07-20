import { useEffect, useMemo, useRef, useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { fetchInstitutionSetup } from '../../../lib/institutionApi';
import { IdCardByTemplate } from './IdCardFaces';
import {
  DEMO_ID_CARD_STUDENTS,
  ID_CARD_TEMPLATES,
  uniqueClasses,
  type IdCardSchool,
  type IdCardStudent,
  type IdCardTemplateId,
} from './idCardTypes';

type Props = {
  selectedTemplate: string;
  onSelectTemplate: (templateName: string) => void;
};

const DEFAULT_SCHOOL: IdCardSchool = {
  name: '360 School ERP Academy',
  address: 'Main Campus Road',
  phone: '0000000000',
  session: '2025-26',
};

function templateIdFromName(name: string): IdCardTemplateId {
  const found = ID_CARD_TEMPLATES.find((t) => t.name === name);
  return found?.id || 'saiJyoti';
}

function schoolFromSetup(setup: Record<string, unknown> | null): IdCardSchool {
  const basic = setup?.basicInformation as
    | { sections?: Record<string, Record<string, string>> }
    | undefined;
  const profile = basic?.sections?.['Institution Profile'] || {};
  const address = basic?.sections?.['Address & Contact'] || {};
  const session = setup?.sessionTermSetup as
    | { sections?: Record<string, Record<string, string>> }
    | undefined;
  const sessionInfo = session?.sections?.['Academic Session'] || session?.sections?.['Session'] || {};

  const name = profile.institutionName || profile.shortName || DEFAULT_SCHOOL.name;
  const addr = [address.addressLine1, address.city, address.state].filter(Boolean).join(', ') || DEFAULT_SCHOOL.address;
  const phone = address.phone || DEFAULT_SCHOOL.phone;
  const sessionLabel =
    sessionInfo.sessionName || sessionInfo.currentSession || sessionInfo.academicYear || DEFAULT_SCHOOL.session;

  return {
    name,
    address: addr,
    phone,
    session: sessionLabel,
    logoUrl: basic?.sections?.['Logo & Branding']?.logoUrl || undefined,
  };
}

function classesFromSetup(setup: Record<string, unknown> | null): string[] {
  const tile = setup?.classesSections as { records?: Record<string, string>[] } | undefined;
  const fromRecords = (tile?.records || [])
    .map((r) => (r.className || '').trim())
    .filter(Boolean);
  if (fromRecords.length) return [...new Set(fromRecords)].sort();
  return uniqueClasses(DEMO_ID_CARD_STUDENTS);
}

export function IdCardTemplatesView({ selectedTemplate, onSelectTemplate }: Props) {
  const [school, setSchool] = useState<IdCardSchool>(DEFAULT_SCHOOL);
  const [classOptions, setClassOptions] = useState<string[]>(uniqueClasses(DEMO_ID_CARD_STUDENTS));
  const [selectedClass, setSelectedClass] = useState('');
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const printRef = useRef<HTMLDivElement>(null);

  const templateId = templateIdFromName(selectedTemplate || ID_CARD_TEMPLATES[0].name);

  const studentsForClass = useMemo(() => {
    const cls = selectedClass || classOptions[0] || '';
    const matched = DEMO_ID_CARD_STUDENTS.filter((s) => s.className === cls);
    if (matched.length) return matched;
    // Fallback demo rows for classes that exist in master list but not in demo set
    return buildPlaceholderStudents(cls);
  }, [selectedClass, classOptions]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { setup } = await fetchInstitutionSetup();
        if (cancelled) return;
        setSchool(schoolFromSetup(setup as Record<string, unknown>));
        const classes = classesFromSetup(setup as Record<string, unknown>);
        setClassOptions(classes);
        setSelectedClass((prev) => prev || classes[0] || '');
      } catch {
        if (!cancelled) {
          setSelectedClass(uniqueClasses(DEMO_ID_CARD_STUDENTS)[0] || '');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedTemplate) {
      onSelectTemplate(ID_CARD_TEMPLATES[0].name);
    }
  }, [selectedTemplate, onSelectTemplate]);

  const downloadPdf = async () => {
    if (!printRef.current || !studentsForClass.length) return;
    setGenerating(true);
    setError('');
    setMessage('');
    try {
      const nodes = Array.from(printRef.current.querySelectorAll<HTMLElement>('[data-id-card]'));
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const gap = 6;
      const cardW = (pageW - margin * 2 - gap) / 2;
      const cardH = (pageH - margin * 2 - gap) / 2;

      for (let i = 0; i < nodes.length; i++) {
        const canvas = await html2canvas(nodes[i], {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff',
          logging: false,
        });
        const img = canvas.toDataURL('image/png');
        const col = i % 2;
        const row = Math.floor(i / 2) % 2;
        if (i > 0 && i % 4 === 0) pdf.addPage();
        const x = margin + col * (cardW + gap);
        const y = margin + row * (cardH + gap);
        pdf.addImage(img, 'PNG', x, y, cardW, cardH);
      }

      const safeClass = (selectedClass || 'Class').replace(/[^a-zA-Z0-9]+/g, '_');
      pdf.save(`ID_Cards_${safeClass}.pdf`);
      setMessage(`Downloaded ${studentsForClass.length} ID card(s) for ${selectedClass}.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate PDF');
    } finally {
      setGenerating(false);
    }
  };

  const previewStudent = studentsForClass[0] || buildPlaceholderStudents(selectedClass || 'Class 1')[0];

  return (
    <div className="space-y-4">
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-800">ID Card Templates</h2>
            <p className="text-xs text-slate-500 mt-1">
              Choose a template, pick a class, then download a printable PDF of student ID cards.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
          {ID_CARD_TEMPLATES.map((tpl) => {
            const active = templateId === tpl.id;
            return (
              <button
                key={tpl.id}
                type="button"
                onClick={() => onSelectTemplate(tpl.name)}
                className={`text-left rounded-xl border-2 p-3 transition-colors ${
                  active ? 'border-indigo-500 bg-indigo-50/50' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex justify-center mb-2 overflow-hidden rounded-lg bg-slate-50 py-2">
                  <IdCardByTemplate
                    templateId={tpl.id}
                    student={previewStudent}
                    school={school}
                    scale={0.42}
                  />
                </div>
                <p className="text-xs font-bold text-slate-800">{tpl.name}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">{tpl.description}</p>
              </button>
            );
          })}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
          <div className="flex-1 space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">Class (for bulk PDF)</label>
            <select
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
            >
              {classOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            disabled={generating || !studentsForClass.length}
            onClick={() => void downloadPdf()}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2"
          >
            {generating ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            {generating ? 'Generating PDF…' : 'Download Class ID Cards PDF'}
          </button>
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mt-3">{error}</p>
        )}
        {message && (
          <p className="text-sm text-green-700 bg-green-50 border border-green-100 rounded-lg px-3 py-2 mt-3">
            {message}
          </p>
        )}
        <p className="text-[10px] text-slate-400 mt-3">
          PDF uses students for the selected class (demo roster until Student Management is connected). School name and
          address are taken from Basic Information when available. Save configuration to keep the selected template.
        </p>
      </div>

      {/* Off-screen render target for PDF capture */}
      <div
        ref={printRef}
        aria-hidden
        style={{ position: 'fixed', left: -10000, top: 0, pointerEvents: 'none' }}
      >
        <div className="flex flex-wrap gap-4 p-4 bg-white">
          {studentsForClass.map((student) => (
            <div key={student.id} data-id-card>
              <IdCardByTemplate templateId={templateId} student={student} school={school} scale={1} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function buildPlaceholderStudents(className: string): IdCardStudent[] {
  const base = className || 'Class 1';
  return [1, 2, 3, 4].map((n) => ({
    id: `${base}-${n}`,
    name: `Student ${n}`,
    className: base,
    section: 'A',
    rollNo: String(100 + n),
    dob: '01-01-2015',
    fatherName: `Parent ${n}`,
    phone: '9000000000',
    address: 'School Campus Area',
    aadhaar: '0000000000',
    course: base,
    batch: '2025-26',
  }));
}
