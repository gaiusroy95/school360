import { useCallback, useEffect, useState } from 'react';
import { Phone, Mail, Calendar, CreditCard, MessageSquare } from 'lucide-react';
import { fetchParentDetail, getParentProfileKey, type ParentDetail } from '../../../lib/parentServices';
import { fetchParents } from '../../../lib/parentServices';
import { ParentLoading, ParentPageHeader, ParentPageShell, pm } from './ParentManagementUi';

export function ParentProfilesView() {
  const [parentKey, setParentKey] = useState(getParentProfileKey() || '');
  const [detail, setDetail] = useState<ParentDetail | null>(null);
  const [parents, setParents] = useState<{ parentKey: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetchParents().then((r) => {
      setParents(r.parents.map((p) => ({ parentKey: p.parentKey, name: p.name })));
      if (!parentKey && r.parents[0]) setParentKey(r.parents[0].parentKey);
    });
  }, []);

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

  if (loading && !detail) return <ParentLoading label="Loading parent profile…" />;

  return (
    <ParentPageShell>
      <ParentPageHeader
        breadcrumb="Parent Management › Parent Profiles"
        title="Parent Profiles"
        subtitle="Unified view of contact details, children, fees, and activity timeline."
      />

      <div className={pm.content}>
        <div className={pm.filterBar}>
          <select value={parentKey} onChange={(e) => setParentKey(e.target.value)} className={`${pm.select} max-w-md`}>
            {parents.map((p) => <option key={p.parentKey} value={p.parentKey}>{p.name}</option>)}
          </select>
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
