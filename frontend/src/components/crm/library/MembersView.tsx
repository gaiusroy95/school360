import { useCallback, useEffect, useState } from 'react';
import {
  Users, RefreshCw, Search, User, CreditCard, AlertTriangle,
  BookOpen, IndianRupee, QrCode, Trash2, ChevronRight,
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import {
  fetchLibraryMembers,
  fetchLibraryMemberDetail,
  syncLibraryMembersErp,
  updateLibraryMemberCategory,
  issueLibraryMemberCard,
  deleteLibraryMember,
  type LibraryMembers,
  type LibraryMemberDetail,
} from '../../../lib/libraryServices';
import { AcademicLoading, AcademicModal, StatusBadge, FeeMessage } from '../FeeFinanceManagement/FeeFinanceUi';

export function MembersView() {
  const [data, setData] = useState<LibraryMembers | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [academicYear, setAcademicYear] = useState('2025-26');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<LibraryMemberDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');

  const load = useCallback(async (seed = false) => {
    setLoading(true);
    try {
      setData(await fetchLibraryMembers(seed, {
        academicYear,
        q: search || undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        memberType: typeFilter !== 'ALL' ? typeFilter : undefined,
        categoryId: categoryFilter !== 'ALL' ? categoryFilter : undefined,
      }));
    } finally {
      setLoading(false);
    }
  }, [academicYear, search, statusFilter, typeFilter, categoryFilter]);

  useEffect(() => { void load(true); }, [load]);

  const flash = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(''), 5000);
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const result = await syncLibraryMembersErp(academicYear);
      setData(result);
      flash(result.message, 'success');
    } catch (e) {
      flash(e instanceof Error ? e.message : 'ERP sync failed', 'error');
    } finally {
      setSyncing(false);
    }
  };

  const openDetail = async (id: string) => {
    setSelectedId(id);
    setDetailLoading(true);
    setDetail(null);
    try {
      setDetail(await fetchLibraryMemberDetail(id));
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCategoryChange = async (categoryId: string) => {
    if (!selectedId) return;
    try {
      setDetail(await updateLibraryMemberCategory(selectedId, categoryId));
      flash('Membership category updated', 'success');
      void load();
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Update failed', 'error');
    }
  };

  const handleIssueCard = async (cardType: 'VIRTUAL' | 'PHYSICAL') => {
    if (!selectedId) return;
    try {
      setDetail(await issueLibraryMemberCard(selectedId, cardType));
      flash(`${cardType} library card issued`, 'success');
      void load();
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Card issue failed', 'error');
    }
  };

  const handleDelete = async () => {
    if (!selectedId || !detail?.canDelete) return;
    if (!window.confirm(`Delete member ${detail.memberName}?`)) return;
    try {
      await deleteLibraryMember(selectedId);
      setSelectedId(null);
      setDetail(null);
      flash('Member deleted', 'success');
      void load();
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Delete failed', 'error');
    }
  };

  if (loading && !data) return <AcademicLoading />;

  return (
    <div className="flex flex-col space-y-4 h-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">Members</h2>
          <p className="text-xs text-slate-500 mt-0.5">ERP-synced library profiles — privileges, cards & activity tracking</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={academicYear}
            onChange={(e) => setAcademicYear(e.target.value)}
            className="text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded px-3 py-1.5 shadow-sm"
          >
            {(data?.academicYears ?? ['2025-26']).map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => void handleSync()}
            disabled={syncing}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg disabled:opacity-50"
          >
            <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'Syncing...' : 'Sync from ERP'}
          </button>
        </div>
      </div>

      {message && <FeeMessage message={message} type={messageType} />}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Members', value: data?.kpis.totalMembers ?? 0, color: 'text-blue-600 bg-blue-50' },
          { label: 'Active', value: data?.kpis.activeMembers ?? 0, color: 'text-green-600 bg-green-50' },
          { label: 'Inactive / Suspended', value: data?.kpis.inactiveMembers ?? 0, color: 'text-slate-600 bg-slate-50' },
          { label: 'Defaulters', value: data?.kpis.defaulters ?? 0, color: 'text-red-600 bg-red-50' },
        ].map((k) => (
          <div key={k.label} className="bg-white border border-slate-200 rounded-xl p-3">
            <p className="text-[9px] text-slate-500 font-medium">{k.label}</p>
            <p className={`text-xl font-bold ${k.color.split(' ')[0]}`}>{k.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-8 space-y-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1 relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') void load(); }}
                placeholder="Search name, code, barcode, email..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg"
              />
            </div>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="text-xs border border-slate-200 rounded-lg px-2 py-2">
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="SUSPENDED">Suspended</option>
              <option value="INACTIVE">Inactive</option>
            </select>
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="text-xs border border-slate-200 rounded-lg px-2 py-2">
              <option value="ALL">All Types</option>
              <option value="STUDENT">Student</option>
              <option value="TEACHER">Teacher</option>
              <option value="STAFF">Staff</option>
              <option value="OTHER">Other</option>
            </select>
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="text-xs border border-slate-200 rounded-lg px-2 py-2">
              <option value="ALL">All Categories</option>
              {(data?.categories ?? []).map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <button type="button" onClick={() => void load()} className="px-4 py-2 bg-slate-800 text-white text-xs font-bold rounded-lg">Search</button>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-[10px]">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr className="text-slate-500 text-left">
                  <th className="px-3 py-2.5 font-semibold">Member</th>
                  <th className="px-3 py-2.5 font-semibold">Code / Barcode</th>
                  <th className="px-3 py-2.5 font-semibold">Type</th>
                  <th className="px-3 py-2.5 font-semibold">Category</th>
                  <th className="px-3 py-2.5 font-semibold">Class</th>
                  <th className="px-3 py-2.5 font-semibold">Status</th>
                  <th className="px-3 py-2.5 font-semibold">Issues</th>
                  <th className="px-3 py-2.5 font-semibold text-right">Fines</th>
                  <th className="px-3 py-2.5 w-8" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(data?.members ?? []).map((m) => (
                  <tr
                    key={m.id}
                    onClick={() => void openDetail(m.id)}
                    className="hover:bg-purple-50/50 cursor-pointer transition-colors"
                  >
                    <td className="px-3 py-2.5">
                      <p className="font-bold text-slate-800">{m.memberName}</p>
                      <p className="text-slate-400 text-[9px]">{m.erpSource}</p>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-slate-600">{m.memberCode}</td>
                    <td className="px-3 py-2.5 text-slate-600">{m.memberType}</td>
                    <td className="px-3 py-2.5">
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-medium" style={{ backgroundColor: `${m.categoryColor}20`, color: m.categoryColor }}>
                        {m.category}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-slate-600">{m.classLabel}</td>
                    <td className="px-3 py-2.5"><StatusBadge status={m.status} /></td>
                    <td className="px-3 py-2.5 text-slate-600">{m.activeIssues}/{m.maxBooks}</td>
                    <td className="px-3 py-2.5 text-right font-bold text-red-600">
                      {m.pendingFines > 0 ? `₹${m.pendingFines}` : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-slate-400"><ChevronRight size={14} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(data?.members ?? []).length === 0 && (
              <p className="text-center py-8 text-sm text-slate-400">No members found — click Sync from ERP to import users</p>
            )}
          </div>
        </div>

        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <h3 className="text-xs font-bold text-slate-800 mb-3 flex items-center gap-1">
              <Users size={14} className="text-purple-600" /> Member Type Distribution
            </h3>
            <div className="flex items-center gap-4">
              <div className="w-24 h-24">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={data?.memberTypeDistribution ?? []} cx="50%" cy="50%" innerRadius={25} outerRadius={40} dataKey="value" stroke="none">
                      {(data?.memberTypeDistribution ?? []).map((e, i) => (
                        <Cell key={i} fill={e.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-1.5 text-[9px]">
                {(data?.memberTypeDistribution ?? []).map((item) => (
                  <div key={item.memberType} className="flex justify-between">
                    <span className="text-slate-600">{item.name}</span>
                    <span className="font-bold text-slate-800">{item.value} ({item.percent})</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <h3 className="text-xs font-bold text-slate-800 mb-3 flex items-center gap-1">
              <AlertTriangle size={14} className="text-red-600" /> Defaulter List
            </h3>
            <div className="space-y-2 max-h-[180px] overflow-y-auto">
              {(data?.defaulters ?? []).length === 0 ? (
                <p className="text-[10px] text-slate-400">No defaulters</p>
              ) : (
                (data?.defaulters ?? []).map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => void openDetail(d.id)}
                    className="w-full text-left p-2 rounded-lg border border-red-100 bg-red-50/50 hover:bg-red-50"
                  >
                    <p className="text-[10px] font-bold text-slate-800">{d.memberName}</p>
                    <p className="text-[9px] text-red-600">
                      {d.pendingFines > 0 && `Fines: ₹${d.pendingFines}`}
                      {d.pendingFines > 0 && d.activeIssues > 0 && ' · '}
                      {d.activeIssues > 0 && `${d.activeIssues} active issue(s)`}
                    </p>
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-[9px] text-slate-500 space-y-1">
            <p className="font-bold text-slate-700">ERP Integration</p>
            <p>{(data?.erpIntegration ?? []).join(' · ')}</p>
            <p className="text-amber-700 mt-2">Suspended students / resigned staff auto-suspended in library</p>
          </div>
        </div>
      </div>

      <AcademicModal
        open={!!selectedId}
        onClose={() => { setSelectedId(null); setDetail(null); }}
        title={detail?.memberName ?? 'Member Details'}
        large
      >
        {detailLoading ? (
          <p className="text-sm text-slate-500 py-6 text-center">Loading...</p>
        ) : detail ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-bold">
                    {detail.memberName.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">{detail.memberName}</h3>
                    <p className="text-xs text-slate-500">{detail.memberCode} · ERP: {detail.erpUserId}</p>
                    <div className="flex gap-2 mt-1 flex-wrap">
                      <StatusBadge status={detail.status} />
                      <span className="text-[9px] px-2 py-0.5 rounded bg-slate-100">{detail.memberType}</span>
                    </div>
                    {detail.suspendedReason && (
                      <p className="text-[10px] text-red-600 mt-1">{detail.suspendedReason}</p>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div><span className="text-slate-500">Mobile:</span> {detail.mobile || '—'}</div>
                  <div><span className="text-slate-500">Email:</span> {detail.email || '—'}</div>
                  <div><span className="text-slate-500">Class:</span> {detail.classLabel}</div>
                  <div><span className="text-slate-500">Branch:</span> {detail.branch}</div>
                  <div><span className="text-slate-500">Limits:</span> {detail.maxBooks} books / {detail.issueDays} days</div>
                  <div><span className="text-slate-500">Last Synced:</span> {detail.lastSyncedAt ?? '—'}</div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Membership Category</label>
                  <select
                    value={detail.categoryId ?? ''}
                    onChange={(e) => void handleCategoryChange(e.target.value)}
                    className="w-full mt-1 text-xs border border-slate-200 rounded-lg px-2 py-1.5"
                  >
                    {(data?.categories ?? []).map((c) => (
                      <option key={c.id} value={c.id}>{c.name} ({c.maxBooks} books, {c.issueDays}d)</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-600 to-indigo-700 rounded-xl p-4 text-white text-center">
                <CreditCard size={20} className="mx-auto mb-2 opacity-80" />
                <p className="text-[10px] font-bold uppercase tracking-wide opacity-80">Digital Library Card</p>
                <p className="text-lg font-bold mt-1">{detail.digitalCard.memberCode}</p>
                <div className="mt-3 bg-white/20 rounded-lg p-3 flex flex-col items-center">
                  <QrCode size={48} className="opacity-90" />
                  <p className="text-[8px] font-mono mt-2 opacity-80 break-all">{detail.digitalCard.qrPayload}</p>
                  <p className="text-[9px] mt-1 opacity-70">Barcode: {detail.digitalCard.barcodeUid}</p>
                </div>
                <p className="text-[9px] mt-2 opacity-70">{detail.cardType} Card · {detail.cardIssued ? `Issued ${detail.cardIssuedAt}` : 'Not issued'}</p>
                <div className="flex gap-2 mt-3">
                  <button type="button" onClick={() => void handleIssueCard('VIRTUAL')} className="flex-1 py-1.5 bg-white/20 rounded text-[9px] font-bold hover:bg-white/30">Virtual</button>
                  <button type="button" onClick={() => void handleIssueCard('PHYSICAL')} className="flex-1 py-1.5 bg-white/20 rounded text-[9px] font-bold hover:bg-white/30">Physical</button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
              <div className="bg-purple-50 rounded-lg p-2 border border-purple-100">
                <BookOpen size={14} className="mx-auto text-purple-600 mb-1" />
                <p className="font-bold text-purple-800">{detail.activeIssues}</p>
                <p className="text-slate-500">Active Issues</p>
              </div>
              <div className="bg-red-50 rounded-lg p-2 border border-red-100">
                <IndianRupee size={14} className="mx-auto text-red-600 mb-1" />
                <p className="font-bold text-red-800">₹{detail.pendingFines}</p>
                <p className="text-slate-500">Pending Fines</p>
              </div>
              <div className="bg-green-50 rounded-lg p-2 border border-green-100">
                <User size={14} className="mx-auto text-green-600 mb-1" />
                <p className="font-bold text-green-800">{detail.borrowingHistory.length}</p>
                <p className="text-slate-500">Total Borrows</p>
              </div>
            </div>

            <div>
              <h4 className="text-[10px] font-bold text-slate-700 uppercase mb-2">Borrowing History</h4>
              <div className="max-h-[120px] overflow-y-auto border border-slate-100 rounded-lg">
                <table className="w-full text-[9px]">
                  <thead className="bg-slate-50 sticky top-0">
                    <tr className="text-slate-500">
                      <th className="px-2 py-1 text-left">Book</th>
                      <th className="px-2 py-1">Issued</th>
                      <th className="px-2 py-1">Due</th>
                      <th className="px-2 py-1">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.borrowingHistory.map((h) => (
                      <tr key={h.id} className="border-t border-slate-50">
                        <td className="px-2 py-1 font-medium text-slate-800">{h.bookTitle}</td>
                        <td className="px-2 py-1 text-center text-slate-500">{h.issueDate}</td>
                        <td className="px-2 py-1 text-center text-slate-500">{h.dueDate}</td>
                        <td className="px-2 py-1 text-center"><StatusBadge status={h.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {detail.fineHistory.length > 0 && (
              <div>
                <h4 className="text-[10px] font-bold text-slate-700 uppercase mb-2">Fine History</h4>
                <div className="space-y-1">
                  {detail.fineHistory.map((f) => (
                    <div key={f.id} className="flex justify-between text-[9px] p-2 bg-slate-50 rounded">
                      <span className="text-slate-700">{f.description}</span>
                      <span className="font-bold text-red-600">₹{f.amount} · <StatusBadge status={f.status} /></span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-2 border-t border-slate-100">
              {detail.canDelete && (
                <button
                  type="button"
                  onClick={() => void handleDelete()}
                  className="flex items-center gap-1 px-3 py-2 text-[10px] font-bold text-red-600 border border-red-200 rounded-lg hover:bg-red-50"
                >
                  <Trash2 size={12} /> Delete Member
                </button>
              )}
              {!detail.canDelete && (
                <p className="text-[9px] text-amber-700 flex items-center gap-1">
                  <AlertTriangle size={12} /> Cannot delete — active books or pending fines
                </p>
              )}
            </div>
          </div>
        ) : null}
      </AcademicModal>
    </div>
  );
}
