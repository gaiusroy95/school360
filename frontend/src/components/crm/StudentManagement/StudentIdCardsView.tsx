import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  User, Download, Loader2, Search, Filter, Printer, CheckSquare, Square, FileStack,
} from 'lucide-react';
import { fetchStudents, fetchStudentsMeta, type Student } from '../../../lib/studentServices';
import { fetchInstitutionSetup } from '../../../lib/institutionApi';
import { toViewKey } from '../../../lib/navigation';
import {
  defaultStudentTemplateFromSetup,
  getProfileMeta,
  resolveStudentIdCardTemplate,
  schoolFromInstitutionSetup,
  studentToIdCardStudent,
} from '../../../lib/idCardUtils';
import {
  downloadBulkStudentIdCardsPdf,
  downloadClassWiseIdCardPdfs,
  downloadStudentIdCardPdf,
  type IdCardPdfItem,
} from '../../../lib/studentIdCardPdf';
import type { IdCardSchool } from '../InstitutionSetup/idCardTypes';

type Props = { onNavigate?: (view: string) => void };

function classKey(s: Student) {
  return s.className || 'Unspecified';
}

function sectionKey(s: Student) {
  return s.sectionName || '';
}

export function StudentIdCardsView({ onNavigate }: Props) {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [institutionSetup, setInstitutionSetup] = useState<Record<string, unknown> | null>(null);
  const [classOptions, setClassOptions] = useState<string[]>([]);
  const [sectionOptions, setSectionOptions] = useState<string[]>([]);
  const [yearOptions, setYearOptions] = useState<string[]>([]);
  const [filterClass, setFilterClass] = useState('');
  const [filterSection, setFilterSection] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState('');
  const [message, setMessage] = useState('');
  const [singleDownloading, setSingleDownloading] = useState<string | null>(null);

  const school = useMemo<IdCardSchool>(
    () => schoolFromInstitutionSetup(institutionSetup),
    [institutionSetup],
  );
  const defaultTemplate = useMemo(
    () => defaultStudentTemplateFromSetup(institutionSetup),
    [institutionSetup],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [meta, list, setupRes] = await Promise.all([
        fetchStudentsMeta(),
        fetchStudents({
          pageSize: 500,
          academicYear: filterYear || undefined,
          className: filterClass || undefined,
          sectionName: filterSection || undefined,
          q: search || undefined,
        }),
        fetchInstitutionSetup(),
      ]);
      setStudents(list.students);
      setClassOptions(meta.filters.classes);
      setYearOptions(meta.filters.academicYears);
      setInstitutionSetup(setupRes.setup);
      const year = filterYear || meta.filters.defaultAcademicYear;
      if (!filterYear) setFilterYear(year);

      const firstClass = filterClass || meta.filters.classes[0] || '';
      if (!filterClass && firstClass) setFilterClass(firstClass);
    } finally {
      setLoading(false);
    }
  }, [filterClass, filterSection, filterYear, search]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void fetchStudentsMeta().then((m) => {
      setSectionOptions(filterClass ? m.filters.sectionsByClass[filterClass] || [] : []);
    });
  }, [filterClass]);

  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      if (filterClass && s.className !== filterClass) return false;
      if (filterSection && s.sectionName !== filterSection) return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !s.fullName.toLowerCase().includes(q) &&
          !s.admissionNumber.toLowerCase().includes(q) &&
          !s.rollNumber.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [students, filterClass, filterSection, search]);

  // Default-select all students in the active class when class/section/year changes
  useEffect(() => {
    const inScope = students.filter((s) => {
      if (filterClass && s.className !== filterClass) return false;
      if (filterSection && s.sectionName !== filterSection) return false;
      return true;
    });
    setSelected(new Set(inScope.map((s) => s.id)));
  }, [filterClass, filterSection, filterYear, students]);

  const selectedStudents = useMemo(
    () => filteredStudents.filter((s) => selected.has(s.id)),
    [filteredStudents, selected],
  );

  const buildPdfItems = useCallback(
    (list: Student[]): IdCardPdfItem[] =>
      list.map((s) => {
        const profile = getProfileMeta(s);
        const templateId = resolveStudentIdCardTemplate(
          s,
          String(profile.idCardTemplate || ''),
          defaultTemplate,
        );
        return {
          templateId,
          student: studentToIdCardStudent(s),
          classLabel: s.sectionName ? `${s.className} — ${s.sectionName}` : s.className,
        };
      }),
    [defaultTemplate],
  );

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedStudents.length === filteredStudents.length && filteredStudents.every((s) => selected.has(s.id))) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filteredStudents.map((s) => s.id)));
    }
  };

  const allSelected =
    filteredStudents.length > 0 && filteredStudents.every((s) => selected.has(s.id));

  const handleSingleDownload = async (student: Student) => {
    setSingleDownloading(student.id);
    setMessage('');
    try {
      const items = buildPdfItems([student]);
      const safeName = student.fullName.replace(/[^a-zA-Z0-9]+/g, '_');
      await downloadStudentIdCardPdf(items[0].templateId, items[0].student, school, `ID_Card_${safeName}.pdf`);
      setMessage(`Downloaded ID card for ${student.fullName}.`);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Download failed');
    } finally {
      setSingleDownloading(null);
    }
  };

  const handleBulkClassPdf = async () => {
    if (selectedStudents.length === 0) {
      setMessage('Select at least one student for bulk PDF.');
      return;
    }
    setDownloading(true);
    setMessage('');
    const classLabel = filterSection
      ? `${filterClass} — ${filterSection}`
      : filterClass || 'Selected';
    const safeClass = classLabel.replace(/[^a-zA-Z0-9]+/g, '_');
    try {
      const items = buildPdfItems(selectedStudents);
      await downloadBulkStudentIdCardsPdf(
        items,
        school,
        `ID_Cards_Bulk_${safeClass}_${filterYear || '2025-26'}.pdf`,
        {
          coverTitle: `Student ID Cards — ${classLabel}`,
          coverSubtitle: `${items.length} card(s) · ${filterYear} · For printing shareholders`,
          onProgress: (cur, tot, name) =>
            setDownloadProgress(`Rendering ${cur}/${tot}${name ? ` — ${name}` : ''}…`),
        },
      );
      setMessage(`Bulk PDF downloaded: ${items.length} ID card(s) for ${classLabel}.`);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Bulk PDF failed');
    } finally {
      setDownloading(false);
      setDownloadProgress('');
    }
  };

  const handleAllClassesPdf = async () => {
    setDownloading(true);
    setMessage('');
    try {
      const all = await fetchStudents({ pageSize: 500, academicYear: filterYear || undefined });
      const byClass = new Map<string, IdCardPdfItem[]>();
      for (const s of all.students) {
        const key = sectionKey(s) ? `${classKey(s)} — ${sectionKey(s)}` : classKey(s);
        if (!byClass.has(key)) byClass.set(key, []);
        byClass.get(key)!.push(...buildPdfItems([s]));
      }
      await downloadClassWiseIdCardPdfs(
        byClass,
        school,
        filterYear || '2025-26',
        (cls, cur, tot) => setDownloadProgress(`Class ${cls}: ${cur}/${tot}…`),
      );
      setMessage(`Downloaded ${byClass.size} class-wise PDF file(s) for printing.`);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Class-wise download failed');
    } finally {
      setDownloading(false);
      setDownloadProgress('');
    }
  };

  const readyCount = selectedStudents.filter((s) => s.photoUrl).length;

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-hidden">
      <div className="p-4 md:p-6 bg-white border-b border-slate-200 shrink-0">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 mb-4">
          <div>
            <p className="text-[10px] text-slate-400 font-medium">Student Management &gt; Student ID Cards</p>
            <h1 className="text-xl md:text-2xl font-bold text-slate-800 mt-0.5">Student ID Cards</h1>
            <p className="text-xs text-slate-500 mt-1">
              Bulk class-wise PDF for printing shareholders · templates from Institution Setup
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onNavigate?.(toViewKey('Institution Setup', 'ID Card & Numbering'))}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm hover:bg-slate-50"
            >
              ID Card Templates
            </button>
            <button
              type="button"
              disabled={downloading || selectedStudents.length === 0}
              onClick={() => void handleBulkClassPdf()}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold flex items-center gap-1.5 hover:bg-indigo-700 disabled:opacity-50"
            >
              {downloading ? <Loader2 size={14} className="animate-spin" /> : <Printer size={14} />}
              Download Class PDF ({selectedStudents.length})
            </button>
            <button
              type="button"
              disabled={downloading}
              onClick={() => void handleAllClassesPdf()}
              className="px-4 py-2 bg-amber-500 text-slate-900 rounded-lg text-sm font-bold flex items-center gap-1.5 hover:bg-amber-400 disabled:opacity-50"
            >
              {downloading ? <Loader2 size={14} className="animate-spin" /> : <FileStack size={14} />}
              All Classes (separate PDFs)
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          {[
            { label: 'Students in Class', value: filteredStudents.length },
            { label: 'Selected', value: selectedStudents.length },
            { label: 'Photos Ready', value: readyCount },
            { label: 'Default Template', value: defaultTemplate.split(' ')[0] + '…' },
          ].map((k) => (
            <div key={k.label} className="bg-slate-50 border border-slate-200 rounded-xl p-3">
              <p className="text-[10px] font-bold text-slate-500 uppercase">{k.label}</p>
              <p className="text-lg font-bold text-slate-800 truncate">
                {typeof k.value === 'number' ? k.value.toLocaleString('en-IN') : k.value}
              </p>
            </div>
          ))}
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 text-xs text-amber-900">
          <strong>Class-wise bulk print:</strong> Select a class below — all students in that class are selected by default.
          Use <strong>Download Class PDF</strong> to generate a print-ready PDF (cover page + 2 cards per A4 sheet) for your printing vendor.
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1 max-w-md">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search students…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>
          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm flex items-center gap-1.5 hover:bg-slate-50"
          >
            <Filter size={14} /> Filters
          </button>
        </div>

        {showFilters && (
          <div className="flex flex-wrap gap-2 mt-3 p-3 bg-slate-50 rounded-lg border">
            <select
              value={filterClass}
              onChange={(e) => { setFilterClass(e.target.value); setFilterSection(''); }}
              className="border rounded-lg px-2 py-1.5 text-sm font-medium"
            >
              <option value="">All Classes</option>
              {classOptions.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select
              value={filterSection}
              onChange={(e) => setFilterSection(e.target.value)}
              className="border rounded-lg px-2 py-1.5 text-sm"
              disabled={!filterClass}
            >
              <option value="">All Sections</option>
              {sectionOptions.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <select
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
              className="border rounded-lg px-2 py-1.5 text-sm"
            >
              {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
            <button
              type="button"
              onClick={toggleAll}
              className="text-xs text-indigo-600 font-bold px-2 flex items-center gap-1"
            >
              {allSelected ? <CheckSquare size={14} /> : <Square size={14} />}
              {allSelected ? 'Deselect All' : 'Select All in Class'}
            </button>
          </div>
        )}

        {(message || downloadProgress) && (
          <p className="text-xs text-indigo-600 mt-2">
            {downloadProgress || message}
          </p>
        )}
      </div>

      <div className="flex-1 overflow-auto p-4 md:p-6">
        {loading ? (
          <div className="flex justify-center p-12"><Loader2 className="animate-spin text-slate-400" /></div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="p-3 w-10">
                    <button type="button" onClick={toggleAll} className="text-slate-500 hover:text-indigo-600">
                      {allSelected ? <CheckSquare size={16} /> : <Square size={16} />}
                    </button>
                  </th>
                  <th className="p-3 text-left text-xs font-bold text-slate-500">Student</th>
                  <th className="p-3 text-left text-xs font-bold text-slate-500">Admission No.</th>
                  <th className="p-3 text-left text-xs font-bold text-slate-500">Class / Section</th>
                  <th className="p-3 text-left text-xs font-bold text-slate-500 hidden sm:table-cell">Photo</th>
                  <th className="p-3 text-right text-xs font-bold text-slate-500">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((s) => {
                  const isSelected = selected.has(s.id);
                  return (
                    <tr
                      key={s.id}
                      className={`border-t hover:bg-slate-50 ${isSelected ? 'bg-indigo-50/40' : ''}`}
                    >
                      <td className="p-3">
                        <button type="button" onClick={() => toggleOne(s.id)} className="text-slate-500 hover:text-indigo-600">
                          {isSelected ? <CheckSquare size={16} className="text-indigo-600" /> : <Square size={16} />}
                        </button>
                      </td>
                      <td className="p-3 font-medium text-slate-800">
                        <div className="flex items-center gap-2">
                          <User size={14} className="text-slate-400 shrink-0" />
                          {s.fullName}
                        </div>
                      </td>
                      <td className="p-3 font-mono text-xs">{s.admissionNumber}</td>
                      <td className="p-3 text-slate-600">{s.classSection}</td>
                      <td className="p-3 hidden sm:table-cell">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${s.photoUrl ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                          {s.photoUrl ? 'Ready' : 'Missing'}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <button
                          type="button"
                          disabled={singleDownloading === s.id}
                          onClick={() => void handleSingleDownload(s)}
                          className="text-indigo-600 text-xs font-bold hover:underline flex items-center gap-1 ml-auto disabled:opacity-50"
                        >
                          {singleDownloading === s.id ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <Download size={12} />
                          )}
                          Print
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filteredStudents.length === 0 && (
              <p className="p-10 text-center text-slate-500 text-sm">
                No students found for the selected class. Add students or change filters.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
