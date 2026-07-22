import { useCallback, useEffect, useState } from 'react';
import { Phone, Mail, Calendar, CreditCard, MessageSquare, Search, User } from 'lucide-react';
import {
  fetchParentDetail, fetchParents, getParentProfileKey,
  type ParentDetail, type ParentListItem,
} from '../../../lib/parentServices';
import { fetchStudents, fetchStudentsMeta } from '../../../lib/studentServices';
import { ParentLoading, ParentPageHeader, ParentPageShell, pm } from './ParentManagementUi';

export function ParentProfilesView() {
  const [parentKey, setParentKey] = useState(getParentProfileKey() || '');
  const [detail, setDetail] = useState<ParentDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ParentListItem[]>([]);
  const [searching, setSearching] = useState(false);

  const [classOptions, setClassOptions] = useState<string[]>([]);
  const [sectionOptions, setSectionOptions] = useState<string[]>([]);
  const [childClass, setChildClass] = useState('');
  const [childSection, setChildSection] = useState('');
  const [childStudents, setChildStudents] = useState<{ id: string; fullName: string; classGroup: string }[]>([]);
  const [selectedChildId, setSelectedChildId] = useState('');

  useEffect(() => {
    void fetchStudentsMeta().then((r) => setClassOptions(r.filters.classes));
    const stored = getParentProfileKey();
    if (stored) {
      setParentKey(stored);
      return;
    }
    void fetchParents().then((r) => {
      if (r.parents[0]) setParentKey(r.parents[0].parentKey);
    });
  }, []);

  useEffect(() => {
    if (!childClass) {
      setSectionOptions([]);
      setChildSection('');
      setChildStudents([]);
      setSelectedChildId('');
      return;
    }
    void fetchStudentsMeta().then((r) => {
      setSectionOptions(r.filters.sectionsByClass[childClass] || []);
      setChildSection('');
      setSelectedChildId('');
    });
  }, [childClass]);

  useEffect(() => {
    if (!childClass) return;
    void fetchStudents({
      className: childClass,
      sectionName: childSection || undefined,
      viewAll: true,
      pageSize: 500,
    }).then((r) => {
      setChildStudents(r.students.map((s) => ({
        id: s.id,
        fullName: s.fullName,
        classGroup: s.classSection || `${s.className}-${s.sectionName}`,
      })));
    });
  }, [childClass, childSection]);

  const loadDetail = useCallback(async () => {
    if (!parentKey) return;
    setLoading(true);
    try {
      setDetail(await fetchParentDetail(parentKey));
    } finally {
      setLoading(false);
    }
  }, [parentKey]);

  useEffect(() => { void loadDetail(); }, [loadDetail]);

  const selectParent = (key: string) => {
    setParentKey(key);
    setSearchResults([]);
  };

  const searchParents = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const res = await fetchParents({ q: searchQuery.trim() });
      setSearchResults(res.parents);
      if (res.parents.length === 1) selectParent(res.parents[0].parentKey);
    } finally {
      setSearching(false);
    }
  };

  const selectChild = async (studentId: string) => {
    setSelectedChildId(studentId);
    if (!studentId) return;

    const student = childStudents.find((s) => s.id === studentId);
    if (!student) return;

    const res = await fetchParents({ q: student.fullName });
    const match = res.parents.find((p) => p.students.some((s) => s.studentId === studentId));
    if (match) {
      selectParent(match.parentKey);
    }
  };

  if (loading && !detail) return <ParentLoading label="Loading parent profile…" />;

  return (
    <ParentPageShell>
      <ParentPageHeader
        breadcrumb="Parent Management › Parent Profiles"
        title="Parent Profiles"
        subtitle="Unified view of contact details, children, fees, and activity timeline."
      />

      <div className={pm.content}>
        <div className={`${pm.card} ${pm.cardPad} space-y-4`}>
          <div className="flex flex-col lg:flex-row gap-3">
            <div className="flex flex-1 flex-col sm:flex-row gap-2 min-w-0">
              <input
                type="text"
                placeholder="Search parent name or mobile number…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') void searchParents(); }}
                className={`${pm.input} flex-1`}
              />
              <button type="button" onClick={() => void searchParents()} disabled={searching} className={`${pm.btnSecondary} shrink-0`}>
                <Search size={14} /> {searching ? 'Searching…' : 'Search'}
              </button>
            </div>

            <div className="hidden lg:block w-px bg-slate-200 self-stretch" />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 flex-1 min-w-0">
              <select value={childClass} onChange={(e) => setChildClass(e.target.value)} className={pm.selectFull}>
                <option value="">Class</option>
                {classOptions.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <select
                value={childSection}
                onChange={(e) => setChildSection(e.target.value)}
                disabled={!childClass}
                className={pm.selectFull}
              >
                <option value="">Section</option>
                {sectionOptions.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <select
                value={selectedChildId}
                onChange={(e) => void selectChild(e.target.value)}
                disabled={!childClass || childStudents.length === 0}
                className={pm.selectFull}
              >
                <option value="">Child name</option>
                {childStudents.map((s) => (
                  <option key={s.id} value={s.id}>{s.fullName}</option>
                ))}
              </select>
            </div>
          </div>

          {searchResults.length > 1 && (
            <div className="flex flex-wrap gap-2 pt-1 border-t border-slate-100">
              <p className="w-full text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                <User size={11} /> {searchResults.length} parents found — select one:
              </p>
              {searchResults.map((p) => (
                <button
                  key={p.parentKey}
                  type="button"
                  onClick={() => selectParent(p.parentKey)}
                  className={`text-left px-3 py-2 rounded-lg border text-xs transition-colors ${parentKey === p.parentKey ? 'border-indigo-400 bg-indigo-50 text-indigo-900' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'}`}
                >
                  <span className="font-semibold">{p.name}</span>
                  <span className="text-slate-500 ml-1.5">· {p.mobile}</span>
                </button>
              ))}
            </div>
          )}

          {detail && (
            <div className="flex items-center gap-2 pt-1 border-t border-slate-100 text-xs text-slate-500">
              <span className="font-semibold text-slate-700">Viewing:</span>
              <span className={`${pm.badge} ${pm.badgeBlue}`}>{detail.parent.name}</span>
              <span>{detail.parent.mobile}</span>
              <span>· {detail.parent.relationship}</span>
            </div>
          )}
        </div>

        {detail && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className={`${pm.card} ${pm.cardPad} lg:col-span-1`}>
              <div className="text-center mb-5 pb-5 border-b border-slate-100">
                <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-3xl font-bold text-slate-600 ring-4 ring-white shadow-inner">
                  {detail.parent.name.charAt(0)}
                </div>
                <h2 className="text-lg font-bold text-slate-900 mt-3">{detail.parent.name}</h2>
                <p className="text-sm text-slate-500">{detail.parent.relationship}</p>
              </div>
              <div className="space-y-2.5 text-sm text-slate-700">
                <p className="flex items-center gap-2"><Phone size={14} className="text-slate-400" /> {detail.parent.mobile}</p>
                <p className="flex items-center gap-2"><Mail size={14} className="text-slate-400" /> {detail.parent.email || '—'}</p>
                <p className="text-slate-600 leading-relaxed">{detail.profile.address}</p>
                <p><span className="font-semibold text-slate-800">Joined:</span> {detail.profile.joinedOn}</p>
                <p><span className="font-semibold text-slate-800">Category:</span> {detail.profile.category}</p>
              </div>
              {detail.engagementScore && (
                <div className="mt-5 p-4 bg-slate-50 rounded-xl border border-slate-200/60">
                  <p className="text-xs font-bold text-slate-500 uppercase">Engagement Score</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{detail.engagementScore.score}/100</p>
                  {detail.engagementScore.flags.length > 0 && (
                    <ul className="mt-2 text-xs text-red-600 list-disc pl-4 space-y-0.5">
                      {detail.engagementScore.flags.map((f, i) => <li key={i}>{f}</li>)}
                    </ul>
                  )}
                </div>
              )}
            </div>

            <div className="lg:col-span-2 space-y-5">
              <div className={`${pm.card} ${pm.cardPad}`}>
                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><CreditCard size={16} className="text-indigo-500" /> Children &amp; Fees</h3>
                <div className="grid gap-3">
                  {detail.children.map((c) => (
                    <div key={c.studentId} className="p-4 bg-slate-50/80 rounded-xl border border-slate-200/60 flex justify-between gap-4">
                      <div>
                        <p className="font-bold text-slate-800">{c.name}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{c.classGroup}</p>
                      </div>
                      <div className="text-right text-xs shrink-0">
                        <p className="text-emerald-700 font-bold">Paid: ₹{(c.feePaidTotal ?? 0).toLocaleString('en-IN')}</p>
                        <p className="text-orange-600 font-medium mt-0.5">Due: ₹{(c.feeDueAmount ?? 0).toLocaleString('en-IN')}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-slate-500 mt-3 pt-3 border-t border-slate-100">
                  Total paid: ₹{detail.fees.paid.toLocaleString('en-IN')} · Due: ₹{detail.fees.due.toLocaleString('en-IN')}
                </p>
              </div>

              <div className={`${pm.card} ${pm.cardPad}`}>
                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><MessageSquare size={16} className="text-indigo-500" /> Timeline</h3>
                <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                  {detail.recentActivities.length === 0 ? (
                    <p className="text-sm text-slate-400">No activity yet</p>
                  ) : detail.recentActivities.map((a, i) => (
                    <div key={i} className="flex gap-3 text-sm pl-3 border-l-2 border-indigo-200/80 py-1">
                      <div>
                        <p className="font-semibold text-slate-800">{a.title}</p>
                        <p className="text-slate-500 text-xs mt-0.5">{a.desc}</p>
                        <p className="text-slate-400 text-[10px] mt-1">{a.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className={`${pm.card} ${pm.cardPad}`}>
                  <h3 className="font-bold text-sm text-slate-800 flex items-center gap-1.5"><Calendar size={14} className="text-slate-400" /> Engagements ({detail.engagements.length})</h3>
                  <p className="text-xs text-slate-500 mt-2">{detail.engagements.length} recorded</p>
                </div>
                <div className={`${pm.card} ${pm.cardPad}`}>
                  <h3 className="font-bold text-sm text-slate-800">PTM Meetings ({detail.meetings.length})</h3>
                  <p className="text-xs text-slate-500 mt-2">{detail.meetings.length} recorded</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ParentPageShell>
  );
}
