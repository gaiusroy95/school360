import { useCallback, useEffect, useRef, useState } from 'react';
import {
  BookOpen, RefreshCw, Upload, Link2, Shield, Eye, Download,
  Trash2, FileText, Globe, BarChart3, Lock, Monitor,
} from 'lucide-react';
import {
  fetchLibraryEResources,
  createEResource,
  updateEResourceAccess,
  updateEResourceUrl,
  deleteEResource,
  openEResourceReader,
  recordEResourceAccess,
  type LibraryEResources,
  type EResourceRow,
  type EResourceReader,
} from '../../../lib/libraryServices';
import { AcademicLoading, AcademicModal, StatusBadge, FeeMessage, FeeTabs } from '../FeeFinanceManagement/FeeFinanceUi';

const FORMAT_ICONS: Record<string, typeof FileText> = {
  PDF: FileText,
  EPUB: BookOpen,
  URL: Globe,
};

export function EResourcesView() {
  const [data, setData] = useState<LibraryEResources | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('Digital OPAC');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');
  const [academicYear, setAcademicYear] = useState('2025-26');
  const [branchId, setBranchId] = useState('');
  const [search, setSearch] = useState('');
  const [uploadModal, setUploadModal] = useState(false);
  const [urlModal, setUrlModal] = useState(false);
  const [accessModal, setAccessModal] = useState<EResourceRow | null>(null);
  const [reader, setReader] = useState<EResourceReader | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [uploadForm, setUploadForm] = useState({
    title: '', format: 'PDF', accessLevel: 'ALL', source: 'LOCAL', resourceType: 'E_BOOK',
    author: '', description: '', accessClasses: [] as string[], syllabusLinked: false,
    drmEnabled: true, fileName: '', mimeType: '', fileBase64: '',
  });
  const [urlForm, setUrlForm] = useState({
    title: '', externalUrl: '', source: 'IEEE', accessLevel: 'ALL', resourceType: 'JOURNAL',
    expiryDate: '', accessClasses: [] as string[],
  });
  const [accessForm, setAccessForm] = useState({ accessLevel: 'ALL', accessClasses: [] as string[], accessRoles: ['STUDENT', 'TEACHER', 'STAFF'] });

  const load = useCallback(async (seed = false) => {
    setLoading(true);
    try {
      const result = await fetchLibraryEResources(seed, academicYear, branchId || undefined);
      setData(result);
      if (!branchId && result.branches[0]) setBranchId(result.branches[0].id);
    } finally {
      setLoading(false);
    }
  }, [academicYear, branchId]);

  useEffect(() => { void load(true); }, [academicYear]);

  const flash = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(''), 6000);
  };

  const filteredOpac = (data?.opacCatalog ?? []).filter((r) =>
    !search || r.title.toLowerCase().includes(search.toLowerCase())
    || r.author.toLowerCase().includes(search.toLowerCase())
    || r.subjectTags.some((t) => t.toLowerCase().includes(search.toLowerCase())),
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split('.').pop()?.toUpperCase() ?? 'PDF';
    const format = ext === 'EPUB' ? 'EPUB' : 'PDF';
    const maxMb = data?.settings.maxUploadMb ?? 50;
    if (file.size > maxMb * 1024 * 1024) {
      flash(`File exceeds ${maxMb}MB limit`, 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1] ?? '';
      setUploadForm((f) => ({
        ...f,
        format,
        fileName: file.name,
        mimeType: file.type,
        fileBase64: base64,
        title: f.title || file.name.replace(/\.[^.]+$/, ''),
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!uploadForm.title || !uploadForm.fileBase64) {
      flash('Title and file are required', 'error');
      return;
    }
    try {
      const result = await createEResource({ ...uploadForm, academicYear, branchId: branchId || undefined });
      setData(result.data);
      setUploadModal(false);
      setUploadForm({
        title: '', format: 'PDF', accessLevel: 'ALL', source: 'LOCAL', resourceType: 'E_BOOK',
        author: '', description: '', accessClasses: [], syllabusLinked: false,
        drmEnabled: true, fileName: '', mimeType: '', fileBase64: '',
      });
      flash(result.message, 'success');
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Upload failed', 'error');
    }
  };

  const handleUrlCreate = async () => {
    if (!urlForm.title || !urlForm.externalUrl) {
      flash('Title and URL are required', 'error');
      return;
    }
    try {
      const result = await createEResource({
        ...urlForm,
        format: 'URL',
        academicYear,
        branchId: branchId || undefined,
        drmEnabled: false,
      });
      setData(result.data);
      setUrlModal(false);
      setUrlForm({ title: '', externalUrl: '', source: 'IEEE', accessLevel: 'ALL', resourceType: 'JOURNAL', expiryDate: '', accessClasses: [] });
      flash(result.message, 'success');
    } catch (e) {
      flash(e instanceof Error ? e.message : 'URL create failed', 'error');
    }
  };

  const handleAccessUpdate = async () => {
    if (!accessModal) return;
    try {
      const result = await updateEResourceAccess(accessModal.id, accessForm);
      setData(result.data);
      setAccessModal(null);
      flash(result.message, 'success');
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Access update failed', 'error');
    }
  };

  const handleOpenReader = async (resource: EResourceRow) => {
    try {
      const result = await openEResourceReader(resource.id);
      setReader(result);
      setTab('E-Reader');
      const refreshed = await fetchLibraryEResources(false, academicYear, branchId || undefined);
      setData(refreshed);
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Cannot open reader', 'error');
    }
  };

  const handleDownload = async (resource: EResourceRow) => {
    if (resource.drmEnabled) {
      flash('Download disabled — DRM protected resource', 'error');
      return;
    }
    try {
      const result = await recordEResourceAccess(resource.id, { accessType: 'DOWNLOAD', deviceType: 'WEB' });
      setData(result.data);
      flash('Download logged', 'success');
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Download failed', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const result = await deleteEResource(id);
      setData(result.data);
      flash(result.message, 'info');
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Delete failed', 'error');
    }
  };

  const toggleClass = (cls: string, form: 'upload' | 'url') => {
    const setter = form === 'upload' ? setUploadForm : setUrlForm;
    setter((f) => {
      const classes = 'accessClasses' in f ? f.accessClasses : [];
      const next = classes.includes(cls) ? classes.filter((c) => c !== cls) : [...classes, cls];
      return { ...f, accessClasses: next };
    });
  };

  if (loading && !data) return <AcademicLoading />;

  return (
    <div className="flex flex-col space-y-4 h-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">E-Resources</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Digital library · E-books, journals, research papers & video lectures with DRM
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} className="text-xs border rounded px-2 py-1.5">
            {(data?.academicYears ?? ['2025-26']).map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <button type="button" onClick={() => setUploadModal(true)} className="px-3 py-1.5 text-xs bg-indigo-600 text-white rounded-lg font-semibold flex items-center gap-1">
            <Upload size={12} /> Upload File
          </button>
          <button type="button" onClick={() => setUrlModal(true)} className="px-3 py-1.5 text-xs border border-indigo-200 text-indigo-700 rounded-lg font-semibold flex items-center gap-1">
            <Link2 size={12} /> Add URL
          </button>
          <button type="button" onClick={() => void load()} className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50">
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {message && <FeeMessage message={message} type={messageType} />}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Total Resources', value: data?.kpis.totalResources ?? 0, icon: <BookOpen size={16} /> },
          { label: 'Active in OPAC', value: data?.kpis.activeInOpac ?? 0, icon: <Globe size={16} /> },
          { label: 'Total Views', value: data?.kpis.totalViews ?? 0, icon: <Eye size={16} /> },
          { label: 'Downloads', value: data?.kpis.totalDownloads ?? 0, icon: <Download size={16} /> },
          { label: 'Bandwidth (Month)', value: data?.kpis.monthlyBandwidth ?? '0 B', icon: <BarChart3 size={16} />, small: true },
        ].map((k) => (
          <div key={k.label} className="bg-white border border-slate-200 rounded-xl p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">{k.icon}</div>
            <div>
              <p className="text-[9px] text-slate-500">{k.label}</p>
              <p className={`font-bold text-slate-900 ${k.small ? 'text-sm' : 'text-lg'}`}>{k.value}</p>
            </div>
          </div>
        ))}
      </div>

      <FeeTabs tabs={['Digital OPAC', 'Manage', 'Access Matrix', 'E-Reader', 'Reports']} active={tab} onChange={setTab} />

      {tab === 'Digital OPAC' && (
        <div className="space-y-4">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search e-resources by title, author, subject..."
            className="w-full text-sm border rounded-lg px-4 py-2"
          />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredOpac.map((r) => {
              const Icon = FORMAT_ICONS[r.format] ?? FileText;
              return (
                <div key={r.id} className="bg-white border border-slate-200 rounded-xl p-4 hover:border-indigo-200 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                      <Icon size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-slate-800 truncate">{r.title}</p>
                      <p className="text-[10px] text-slate-500">{r.author || r.source} · {r.format} · {r.resourceType.replace('_', ' ')}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {r.subjectTags.slice(0, 3).map((t) => (
                          <span key={t} className="text-[9px] bg-slate-100 px-1.5 py-0.5 rounded">{t}</span>
                        ))}
                        {r.drmEnabled && <span className="text-[9px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded flex items-center gap-0.5"><Lock size={8} /> DRM</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-50">
                    <span className="text-[10px] text-slate-400">{r.viewCount} views · {r.accessLevel.replace('_', ' ')}</span>
                    <div className="flex gap-1">
                      <button type="button" onClick={() => void handleOpenReader(r)} className="px-2 py-1 text-[10px] bg-indigo-600 text-white rounded font-semibold flex items-center gap-0.5">
                        <Eye size={10} /> Read
                      </button>
                      {!r.drmEnabled && r.format !== 'URL' && (
                        <button type="button" onClick={() => void handleDownload(r)} className="px-2 py-1 text-[10px] border rounded font-semibold">
                          <Download size={10} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {!filteredOpac.length && (
              <p className="col-span-full text-center text-slate-400 py-12">No e-resources in OPAC</p>
            )}
          </div>
        </div>
      )}

      {tab === 'Manage' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
          <table className="w-full text-xs min-w-[800px]">
            <thead>
              <tr className="text-slate-500 border-b">
                <th className="text-left py-2 px-3">Resource</th>
                <th className="text-left">Format</th>
                <th className="text-left">Source</th>
                <th className="text-left">Access</th>
                <th className="text-left">Expiry</th>
                <th className="text-center">Status</th>
                <th className="text-center">Views</th>
                <th className="text-right px-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(data?.resources ?? []).map((r) => (
                <tr key={r.id} className="border-b border-slate-50">
                  <td className="py-2 px-3">
                    <p className="font-medium">{r.title}</p>
                    <p className="text-[10px] text-slate-400 font-mono">{r.resourceCode}</p>
                  </td>
                  <td>{r.format}</td>
                  <td>{r.source}</td>
                  <td>{r.accessLevel}</td>
                  <td>{r.expiryDate ?? '—'}</td>
                  <td className="text-center">
                    <StatusBadge status={r.status === 'ACTIVE' ? 'ACTIVE' : r.status === 'EXPIRED' ? 'OVERDUE' : 'PENDING'} />
                  </td>
                  <td className="text-center">{r.viewCount}</td>
                  <td className="text-right px-3 space-x-2">
                    <button type="button" onClick={() => { setAccessModal(r); setAccessForm({ accessLevel: r.accessLevel, accessClasses: r.accessClasses, accessRoles: r.accessRoles }); }} className="text-indigo-600 font-semibold">Access</button>
                    <button type="button" onClick={() => void handleDelete(r.id)} className="text-red-600"><Trash2 size={12} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'Access Matrix' && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 overflow-x-auto">
          <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
            <Shield size={16} className="text-indigo-600" /> Access Control Matrix
          </h3>
          <table className="w-full text-xs min-w-[600px]">
            <thead>
              <tr className="text-slate-500 border-b">
                <th className="text-left py-2">Class / Group</th>
                <th className="text-left">Accessible Resources</th>
                <th className="text-right">Count</th>
              </tr>
            </thead>
            <tbody>
              {(data?.accessMatrix ?? []).map((row) => (
                <tr key={row.className} className="border-b border-slate-50">
                  <td className="py-2 font-semibold">{row.className}</td>
                  <td className="py-2 text-slate-600">{row.resources.join(', ') || '—'}</td>
                  <td className="py-2 text-right font-semibold">{row.resources.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-[10px] text-slate-400 mt-3">
            Access levels: ALL · CLASS (specific classes) · STAFF_ONLY · TEACHER_ONLY
          </p>
        </div>
      )}

      {tab === 'E-Reader' && (
        <div className="bg-slate-900 rounded-xl overflow-hidden min-h-[400px] flex flex-col">
          {reader ? (
            <>
              <div className="flex items-center justify-between px-4 py-2 bg-slate-800 text-white text-xs">
                <div className="flex items-center gap-2">
                  <Monitor size={14} />
                  <span className="font-semibold">{reader.resource.title}</span>
                  {reader.viewer.drmEnabled && (
                    <span className="bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded flex items-center gap-1">
                      <Lock size={10} /> DRM Protected
                    </span>
                  )}
                </div>
                <button type="button" onClick={() => setReader(null)} className="text-slate-400 hover:text-white">Close</button>
              </div>
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                {reader.viewer.format === 'URL' ? (
                  <div className="space-y-4">
                    <Globe size={48} className="text-indigo-400 mx-auto" />
                    <p className="text-slate-300 text-sm">External subscription resource</p>
                    <a href={reader.viewer.url} target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold">
                      Open in Secure Browser
                    </a>
                  </div>
                ) : (
                  <div className="space-y-4 max-w-md">
                    <FileText size={48} className="text-indigo-400 mx-auto" />
                    <p className="text-white font-semibold">{reader.resource.title}</p>
                    <p className="text-slate-400 text-xs">{reader.viewer.message}</p>
                    {reader.viewer.watermark && (
                      <p className="text-amber-400/60 text-[10px] border border-amber-400/20 rounded px-3 py-2">{reader.viewer.watermark}</p>
                    )}
                    <p className="text-slate-500 text-[10px]">
                      {reader.viewer.preventScreenCapture ? 'Screen recording blocked on mobile app' : 'Standard viewing mode'}
                    </p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 p-8">
              <BookOpen size={48} className="mb-4 opacity-30" />
              <p className="text-sm">Select a resource from Digital OPAC and click Read</p>
              <p className="text-xs mt-1">Secure viewer with DRM — prevents unauthorized downloading</p>
            </div>
          )}
        </div>
      )}

      {tab === 'Reports' && (
        <div className="grid lg:grid-cols-2 gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <h3 className="text-sm font-bold text-slate-800 mb-3">Most Viewed E-Resources</h3>
            <div className="space-y-1">
              {(data?.reports.mostViewed ?? []).map((r) => (
                <div key={r.resourceCode} className="flex justify-between text-xs py-1 border-b border-slate-50">
                  <span className="truncate pr-2">{r.title}</span>
                  <span className="font-semibold shrink-0">{r.views} views · {r.downloads} dl</span>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <h3 className="text-sm font-bold text-slate-800 mb-3">Bandwidth / Download Usage</h3>
            <div className="space-y-2 text-xs">
              <p><span className="text-slate-500">Monthly bandwidth:</span> <span className="font-bold">{data?.reports.bandwidthUsage.totalFormatted}</span></p>
              <p><span className="text-slate-500">Views this month:</span> {data?.reports.bandwidthUsage.views}</p>
              <p><span className="text-slate-500">Downloads this month:</span> {data?.reports.bandwidthUsage.downloads}</p>
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <h3 className="text-sm font-bold text-slate-800 mb-3">Subscription ROI</h3>
            <div className="space-y-2 text-xs">
              <p>Active: {data?.reports.subscriptionRoi.activeSubscriptions} / {data?.reports.subscriptionRoi.totalSubscriptions}</p>
              <p>Total subscription views: {data?.reports.subscriptionRoi.totalViews}</p>
              <p className="font-semibold text-indigo-700">{data?.reports.subscriptionRoi.estimatedValue}</p>
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <h3 className="text-sm font-bold text-slate-800 mb-3">Recent Access Logs</h3>
            <div className="max-h-[200px] overflow-y-auto space-y-1">
              {(data?.recentAccessLogs ?? []).slice(0, 10).map((l) => (
                <div key={l.id} className="flex justify-between text-[10px] py-1 border-b border-slate-50">
                  <span>{l.memberName} · {l.resourceTitle}</span>
                  <span className="text-slate-400">{l.accessType}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="lg:col-span-2 bg-indigo-50 border border-indigo-100 rounded-xl p-4 text-xs text-indigo-900 space-y-1">
            <p className="font-semibold">Integration</p>
            <p>{data?.erpIntegration.dms}</p>
            <p>{data?.erpIntegration.academic}</p>
            <ul className="mt-2">{(data?.automationRules ?? []).map((r) => <li key={r}>· {r}</li>)}</ul>
          </div>
        </div>
      )}

      <AcademicModal open={uploadModal} onClose={() => setUploadModal(false)} title="Upload E-Resource">
        <div className="space-y-3">
          <input ref={fileRef} type="file" accept=".pdf,.epub" className="hidden" onChange={handleFileSelect} />
          <button type="button" onClick={() => fileRef.current?.click()} className="w-full py-8 border-2 border-dashed border-indigo-200 rounded-xl text-sm text-indigo-600 font-semibold hover:bg-indigo-50">
            {uploadForm.fileName || `Choose PDF or EPUB (max ${data?.settings.maxUploadMb ?? 50}MB)`}
          </button>
          <input value={uploadForm.title} onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })} placeholder="Title *" className="w-full text-sm border rounded-lg px-3 py-2" />
          <input value={uploadForm.author} onChange={(e) => setUploadForm({ ...uploadForm, author: e.target.value })} placeholder="Author" className="w-full text-sm border rounded-lg px-3 py-2" />
          <div className="grid grid-cols-2 gap-2">
            <select value={uploadForm.accessLevel} onChange={(e) => setUploadForm({ ...uploadForm, accessLevel: e.target.value })} className="text-sm border rounded-lg px-3 py-2">
              {(data?.accessLevels ?? []).map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
            <select value={uploadForm.resourceType} onChange={(e) => setUploadForm({ ...uploadForm, resourceType: e.target.value })} className="text-sm border rounded-lg px-3 py-2">
              {(data?.resourceTypes ?? []).map((t) => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
            </select>
          </div>
          {uploadForm.accessLevel === 'CLASS' && (
            <div className="flex flex-wrap gap-1">
              {['6', '7', '8', '9', '10', '11', '12'].map((cls) => (
                <button key={cls} type="button" onClick={() => toggleClass(cls, 'upload')} className={`px-2 py-1 text-[10px] rounded border ${uploadForm.accessClasses.includes(cls) ? 'bg-indigo-600 text-white' : ''}`}>
                  Class {cls}
                </button>
              ))}
            </div>
          )}
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" checked={uploadForm.syllabusLinked} onChange={(e) => setUploadForm({ ...uploadForm, syllabusLinked: e.target.checked })} />
            Syllabus-linked (notify relevant classes)
          </label>
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" checked={uploadForm.drmEnabled} onChange={(e) => setUploadForm({ ...uploadForm, drmEnabled: e.target.checked })} />
            Enable DRM protection
          </label>
          <button type="button" onClick={() => void handleUpload()} className="w-full py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg">
            Upload & Publish
          </button>
        </div>
      </AcademicModal>

      <AcademicModal open={urlModal} onClose={() => setUrlModal(false)} title="Add Subscription URL">
        <div className="space-y-3">
          <input value={urlForm.title} onChange={(e) => setUrlForm({ ...urlForm, title: e.target.value })} placeholder="Title *" className="w-full text-sm border rounded-lg px-3 py-2" />
          <input value={urlForm.externalUrl} onChange={(e) => setUrlForm({ ...urlForm, externalUrl: e.target.value })} placeholder="URL * (e.g. https://ieeexplore.ieee.org)" className="w-full text-sm border rounded-lg px-3 py-2 font-mono" />
          <div className="grid grid-cols-2 gap-2">
            <select value={urlForm.source} onChange={(e) => setUrlForm({ ...urlForm, source: e.target.value })} className="text-sm border rounded-lg px-3 py-2">
              {(data?.sources ?? []).map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <input type="date" value={urlForm.expiryDate} onChange={(e) => setUrlForm({ ...urlForm, expiryDate: e.target.value })} className="text-sm border rounded-lg px-3 py-2" placeholder="Expiry" />
          </div>
          <select value={urlForm.accessLevel} onChange={(e) => setUrlForm({ ...urlForm, accessLevel: e.target.value })} className="w-full text-sm border rounded-lg px-3 py-2">
            {(data?.accessLevels ?? []).map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
          <button type="button" onClick={() => void handleUrlCreate()} className="w-full py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg">
            Add Subscription Link
          </button>
        </div>
      </AcademicModal>

      <AcademicModal open={!!accessModal} onClose={() => setAccessModal(null)} title={`Access Control — ${accessModal?.title ?? ''}`}>
        <div className="space-y-3">
          <select value={accessForm.accessLevel} onChange={(e) => setAccessForm({ ...accessForm, accessLevel: e.target.value })} className="w-full text-sm border rounded-lg px-3 py-2">
            {(data?.accessLevels ?? []).map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
          {accessForm.accessLevel === 'CLASS' && (
            <div className="flex flex-wrap gap-1">
              {['6', '7', '8', '9', '10', '11', '12'].map((cls) => (
                <button key={cls} type="button" onClick={() => setAccessForm((f) => ({ ...f, accessClasses: f.accessClasses.includes(cls) ? f.accessClasses.filter((c) => c !== cls) : [...f.accessClasses, cls] }))} className={`px-2 py-1 text-[10px] rounded border ${accessForm.accessClasses.includes(cls) ? 'bg-indigo-600 text-white' : ''}`}>
                  Class {cls}
                </button>
              ))}
            </div>
          )}
          <button type="button" onClick={() => void handleAccessUpdate()} className="w-full py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg">
            Save Access Rights
          </button>
        </div>
      </AcademicModal>
    </div>
  );
}
