import { useCallback, useEffect, useState } from 'react';
import { Plus, Trash2, RefreshCw, FileText, Layers } from 'lucide-react';
import {
  createCustomReport,
  deleteCustomReport,
  fetchCustomReports,
  seedReportsAnalytics,
  type RaCustomReport,
} from '../../../lib/reportsAnalyticsServices';
import { AcademicLoading, FeeMessage } from '../FeeFinanceManagement/FeeFinanceUi';

const MODULE_OPTIONS = [
  'student', 'academic', 'attendance', 'examination', 'finance',
  'hr', 'library', 'transport', 'hostel', 'inventory',
];

export function CustomReportsView() {
  const [reports, setReports] = useState<RaCustomReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    modules: ['student', 'attendance'] as string[],
    columns: ['module', 'kpi', 'value'] as string[],
    academicYear: '2025-26',
  });

  const load = useCallback(async (seed = false) => {
    setLoading(true);
    try {
      if (seed) await seedReportsAnalytics('2025-26');
      const result = await fetchCustomReports();
      setReports(result.reports);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(true); }, []);

  const flash = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(''), 6000);
  };

  const handleCreate = async () => {
    if (!form.name.trim()) {
      flash('Report name is required', 'error');
      return;
    }
    try {
      await createCustomReport(form);
      flash('Custom report created', 'success');
      setShowForm(false);
      setForm({ name: '', description: '', modules: ['student'], columns: ['module', 'kpi', 'value'], academicYear: '2025-26' });
      void load();
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Create failed', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteCustomReport(id);
      flash('Report deleted', 'success');
      void load();
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Delete failed', 'error');
    }
  };

  const toggleModule = (mod: string) => {
    setForm((f) => ({
      ...f,
      modules: f.modules.includes(mod) ? f.modules.filter((m) => m !== mod) : [...f.modules, mod],
    }));
  };

  if (loading && reports.length === 0) return <AcademicLoading label="Loading Custom Reports..." />;

  return (
    <div className="flex flex-col space-y-4 h-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">Custom Reports</h2>
          <p className="text-xs text-slate-500 mt-0.5">Build cross-module reports combining data from multiple ERP tabs</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void load()}
            className="bg-white border border-slate-200 text-slate-600 text-xs font-bold px-3 py-1.5 rounded shadow-sm hover:bg-slate-50 flex items-center gap-1.5"
          >
            <RefreshCw size={12} /> Refresh
          </button>
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-1.5 rounded flex items-center gap-1.5"
          >
            <Plus size={14} /> New Custom Report
          </button>
        </div>
      </div>

      {message && <FeeMessage message={message} type={messageType} />}

      {showForm && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 space-y-3">
          <h3 className="text-[11px] font-bold text-slate-800">Create Custom Report</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-[8px] font-bold text-slate-600 block mb-1">Report Name</label>
              <input
                className="w-full text-xs bg-white border border-slate-200 rounded px-3 py-2"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Monthly Institution Summary"
              />
            </div>
            <div>
              <label className="text-[8px] font-bold text-slate-600 block mb-1">Academic Year</label>
              <input
                className="w-full text-xs bg-white border border-slate-200 rounded px-3 py-2"
                value={form.academicYear}
                onChange={(e) => setForm((f) => ({ ...f, academicYear: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <label className="text-[8px] font-bold text-slate-600 block mb-1">Description</label>
            <textarea
              className="w-full text-xs bg-white border border-slate-200 rounded px-3 py-2"
              rows={2}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-[8px] font-bold text-slate-600 block mb-1">Source Modules</label>
            <div className="flex flex-wrap gap-2">
              {MODULE_OPTIONS.map((mod) => (
                <button
                  key={mod}
                  type="button"
                  onClick={() => toggleModule(mod)}
                  className={`text-[9px] font-bold px-2 py-1 rounded capitalize ${
                    form.modules.includes(mod) ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-600'
                  }`}
                >
                  {mod}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => void handleCreate()} className="bg-blue-600 text-white text-xs font-bold px-4 py-2 rounded">
              Save Report
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="bg-white border border-slate-200 text-xs font-bold px-4 py-2 rounded">
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {reports.map((report) => (
          <div key={report.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center">
                  <Layers size={14} />
                </div>
                <div>
                  <h3 className="text-[11px] font-bold text-slate-800">{report.name}</h3>
                  <span className="text-[8px] font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded">{report.status}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => void handleDelete(report.id)}
                className="text-red-400 hover:text-red-600 p-1"
              >
                <Trash2 size={14} />
              </button>
            </div>
            <p className="text-[9px] text-slate-500 flex-1 mb-3">{report.description || 'No description'}</p>
            <div className="flex flex-wrap gap-1 mb-2">
              {(Array.isArray(report.modules) ? report.modules as string[] : []).map((m) => (
                <span key={m} className="text-[7px] font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded capitalize">{m}</span>
              ))}
            </div>
            <div className="text-[8px] text-slate-400 border-t border-slate-100 pt-2 flex justify-between">
              <span>By {report.createdBy}</span>
              <span>{report.academicYear}</span>
            </div>
          </div>
        ))}
        {reports.length === 0 && (
          <div className="col-span-full text-center py-12 text-slate-400">
            <FileText size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">No custom reports yet. Create one to combine module data.</p>
          </div>
        )}
      </div>
    </div>
  );
}
