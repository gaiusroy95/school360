import { useCallback, useEffect, useState } from 'react';
import { Plus, Trash2, RefreshCw } from 'lucide-react';
import {
  createClassSection, deleteClassSection, fetchAcademicMeta, fetchClassSections,
  syncAcademicClasses, type ClassSection,
} from '../../../lib/academicServices';
import {
  AcademicLoading, AcademicModal, AcademicPageHeader, AcademicPageShell, AcademicYearTermFilters, am,
} from './AcademicManagementUi';

export function ClassSectionsView() {
  const [records, setRecords] = useState<ClassSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [academicYear, setAcademicYear] = useState('2025-26');
  const [years, setYears] = useState<string[]>(['2025-26']);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({ className: '', sectionName: '', capacity: 40, room: '', classTeacher: '', classTeacherPhone: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [meta, res] = await Promise.all([fetchAcademicMeta(), fetchClassSections(academicYear)]);
      setYears(meta.academicYears);
      setRecords(res.records);
    } finally {
      setLoading(false);
    }
  }, [academicYear]);

  useEffect(() => { void load(); }, [load]);

  const handleCreate = async () => {
    if (!form.className || !form.sectionName) return;
    await createClassSection({ ...form, academicYear });
    setShowForm(false);
    setForm({ className: '', sectionName: '', capacity: 40, room: '', classTeacher: '', classTeacherPhone: '' });
    void load();
  };

  const handleSync = async () => {
    const res = await syncAcademicClasses(academicYear);
    setMessage(`Synced ${res.created} class-section(s) from Institution Setup`);
    void load();
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this class-section?')) return;
    await deleteClassSection(id);
    void load();
  };

  if (loading) return <AcademicLoading label="Loading classes & sections…" />;

  return (
    <AcademicPageShell>
      <AcademicPageHeader
        breadcrumb="Academic Management › Class & Sections"
        title="Class & Sections"
        subtitle="Create and manage classes and sections — foundation for academic operations"
        actions={
          <>
            <button type="button" onClick={() => void handleSync()} className={am.btnSecondary}><RefreshCw size={14} /> Sync from Setup</button>
            <button type="button" onClick={() => setShowForm(true)} className={am.btnPrimary}><Plus size={14} /> Add Class-Section</button>
          </>
        }
      />
      <div className={am.content}>
        {message && <p className={am.message}>{message}</p>}
        <AcademicYearTermFilters academicYear={academicYear} term="Term 1" years={years} terms={['Term 1']} onYear={setAcademicYear} onTerm={() => {}} />
        <div className={am.tableWrap}>
          <table className="w-full">
            <thead><tr>
              <th className={am.th}>Class</th><th className={am.th}>Section</th><th className={am.th}>Capacity</th>
              <th className={am.th}>Room</th><th className={am.th}>Class Teacher</th><th className={am.th}>Actions</th>
            </tr></thead>
            <tbody>
              {records.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className={am.td}>{r.className}</td>
                  <td className={am.td}>{r.sectionName}</td>
                  <td className={am.td}>{r.capacity}</td>
                  <td className={am.td}>{r.room || '—'}</td>
                  <td className={am.td}>{r.classTeacher || '—'}</td>
                  <td className={am.td}>
                    <button type="button" onClick={() => void handleDelete(r.id)} className="text-red-600 hover:text-red-800"><Trash2 size={14} /></button>
                  </td>
                </tr>
              ))}
              {records.length === 0 && <tr><td colSpan={6} className={`${am.td} text-center text-slate-400`}>No class-sections yet. Add manually or sync from Institution Setup.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      <AcademicModal open={showForm} onClose={() => setShowForm(false)} title="Add Class & Section">
        <div className="space-y-3">
          <input placeholder="Class Name (e.g. Class 6)" value={form.className} onChange={(e) => setForm((f) => ({ ...f, className: e.target.value }))} className={am.input} />
          <input placeholder="Section (e.g. A)" value={form.sectionName} onChange={(e) => setForm((f) => ({ ...f, sectionName: e.target.value }))} className={am.input} />
          <input type="number" placeholder="Capacity" value={form.capacity} onChange={(e) => setForm((f) => ({ ...f, capacity: Number(e.target.value) }))} className={am.input} />
          <input placeholder="Room" value={form.room} onChange={(e) => setForm((f) => ({ ...f, room: e.target.value }))} className={am.input} />
          <input placeholder="Class Teacher" value={form.classTeacher} onChange={(e) => setForm((f) => ({ ...f, classTeacher: e.target.value }))} className={am.input} />
          <input placeholder="Teacher Phone" value={form.classTeacherPhone} onChange={(e) => setForm((f) => ({ ...f, classTeacherPhone: e.target.value }))} className={am.input} />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={() => setShowForm(false)} className={am.btnSecondary}>Cancel</button>
          <button type="button" onClick={() => void handleCreate()} className={am.btnPrimary}>Create</button>
        </div>
      </AcademicModal>
    </AcademicPageShell>
  );
}
