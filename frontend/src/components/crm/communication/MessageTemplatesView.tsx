import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Plus, RefreshCw, Send, CheckCircle2, XCircle, Clock,
  Shield, Lock, Edit2, Trash2, Power, PowerOff, Cloud, AlertTriangle,
} from 'lucide-react';
import {
  fetchMessageTemplates,
  createMessageTemplate,
  updateMessageTemplate,
  submitTemplateToGateway,
  activateMessageTemplate,
  deactivateMessageTemplate,
  deleteMessageTemplate,
  syncTemplatesWithGateway,
  type MessageTemplatesManagement,
  type CommTemplate,
  type TemplateFormPayload,
} from '../../../lib/communicationServices';
import { AcademicLoading, AcademicModal, FeeMessage } from '../FeeFinanceManagement/FeeFinanceUi';

const ROLE_OPTIONS = ['Super Admin', 'Principal', 'Teacher', 'Class Teacher', 'Communication Manager'];

const CHANNEL_STYLE: Record<string, string> = {
  SMS: 'bg-purple-100 text-purple-800 border-purple-200',
  EMAIL: 'bg-blue-100 text-blue-800 border-blue-200',
  WHATSAPP: 'bg-emerald-100 text-emerald-800 border-emerald-200',
};

const STATUS_STYLE: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-700',
  PENDING: 'bg-amber-100 text-amber-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-700',
};

const CATEGORY_STYLE: Record<string, string> = {
  TRANSACTIONAL: 'bg-cyan-50 text-cyan-800 border-cyan-200',
  PROMOTIONAL: 'bg-orange-50 text-orange-800 border-orange-200',
};

const EMPTY_FORM: TemplateFormPayload = {
  templateName: '',
  channel: 'SMS',
  category: 'TRANSACTIONAL',
  subject: '',
  body: '',
  headerText: '',
  footerText: '',
  language: 'en',
  dltEntityId: '',
  dltHeaderId: '',
  variables: [],
};

function extractVars(body: string, header = '', footer = '') {
  const text = `${header} ${body} ${footer}`;
  const matches = text.match(/\{#([a-zA-Z0-9_]+)#\}/g) ?? [];
  return [...new Set(matches)].map((m, i) => ({
    variableKey: m.replace(/[{}#]/g, ''),
    variableLabel: m.replace(/[{}#]/g, '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    placeholder: m,
    sampleValue: '',
    isLocked: true,
    sortOrder: i,
  }));
}

function previewBody(tpl: { body: string; headerText: string; footerText: string; variables: { placeholder: string; sampleValue: string }[] }) {
  let out = [tpl.headerText, tpl.body, tpl.footerText].filter(Boolean).join('\n');
  for (const v of tpl.variables) {
    if (v.placeholder && v.sampleValue) out = out.split(v.placeholder).join(v.sampleValue);
  }
  return out;
}

export function MessageTemplatesView() {
  const [data, setData] = useState<MessageTemplatesManagement | null>(null);
  const [loading, setLoading] = useState(true);
  const [academicYear, setAcademicYear] = useState('2025-26');
  const [userRole, setUserRole] = useState('Super Admin');
  const [channelFilter, setChannelFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CommTemplate | null>(null);
  const [form, setForm] = useState<TemplateFormPayload>(EMPTY_FORM);
  const [viewTpl, setViewTpl] = useState<CommTemplate | null>(null);

  const load = useCallback(async (seed = false) => {
    setLoading(true);
    try {
      const result = await fetchMessageTemplates(seed, academicYear, {
        role: userRole,
        channel: channelFilter || undefined,
        status: statusFilter || undefined,
        category: categoryFilter || undefined,
      });
      setData(result);
    } finally {
      setLoading(false);
    }
  }, [academicYear, userRole, channelFilter, statusFilter, categoryFilter]);

  useEffect(() => { void load(true); }, [load]);

  const flash = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(''), 7000);
  };

  const canManage = data?.permissions.canCreate ?? false;

  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM, academicYear, createdBy: userRole, userRole });
    setModalOpen(true);
  };

  const openEdit = (tpl: CommTemplate) => {
    if (!canManage || tpl.isLocked) return;
    setEditing(tpl);
    setForm({
      templateName: tpl.name,
      channel: tpl.channel as TemplateFormPayload['channel'],
      category: tpl.category as TemplateFormPayload['category'],
      subject: tpl.subject,
      body: tpl.body,
      headerText: tpl.headerText,
      footerText: tpl.footerText,
      language: tpl.language,
      dltEntityId: tpl.dltEntityId,
      dltHeaderId: tpl.dltHeaderId,
      variables: tpl.variables.map((v) => ({
        variableKey: v.key,
        variableLabel: v.label,
        placeholder: v.placeholder,
        sampleValue: v.sampleValue,
        isLocked: v.isLocked,
        sortOrder: v.sortOrder,
      })),
      academicYear,
      userRole,
      createdBy: userRole,
    });
    setModalOpen(true);
  };

  const formPreview = useMemo(() => {
    const vars = form.variables?.length
      ? form.variables.map((v) => ({ placeholder: v.placeholder || `{#${v.variableKey}#}`, sampleValue: v.sampleValue ?? '' }))
      : extractVars(form.body, form.headerText, form.footerText).map((v) => ({ placeholder: v.placeholder, sampleValue: v.sampleValue }));
    return previewBody({ body: form.body, headerText: form.headerText ?? '', footerText: form.footerText ?? '', variables: vars });
  }, [form]);

  const syncVarsFromBody = () => {
    const vars = extractVars(form.body, form.headerText, form.footerText);
    setForm((f) => ({ ...f, variables: vars }));
  };

  const handleSave = async () => {
    try {
      const payload = { ...form, academicYear, userRole, createdBy: userRole };
      if (!payload.variables?.length) payload.variables = extractVars(form.body, form.headerText, form.footerText);
      const result = editing
        ? await updateMessageTemplate(editing.id, payload)
        : await createMessageTemplate(payload);
      setData(result.data);
      flash(result.message, 'success');
      setModalOpen(false);
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Save failed', 'error');
    }
  };

  const runAction = async (fn: () => Promise<{ message: string; data: MessageTemplatesManagement }>) => {
    try {
      const result = await fn();
      setData(result.data);
      flash(result.message, 'success');
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Action failed', 'error');
    }
  };

  if (loading && !data) return <AcademicLoading label="Loading message templates…" />;

  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">Message Templates</h2>
          <p className="text-xs text-slate-500 mt-0.5">DLT &amp; WhatsApp compliant template repository</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select value={academicYear} onChange={(e) => setAcademicYear(e.target.value)}
            className="text-xs border border-slate-200 rounded px-2 py-1.5 bg-white">
            {(data?.academicYears ?? ['2025-26']).map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <select value={userRole} onChange={(e) => setUserRole(e.target.value)}
            className="text-xs border border-slate-200 rounded px-2 py-1.5 bg-white">
            {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <select value={channelFilter} onChange={(e) => setChannelFilter(e.target.value)}
            className="text-xs border border-slate-200 rounded px-2 py-1.5 bg-white">
            <option value="">All Channels</option>
            {data?.channels.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs border border-slate-200 rounded px-2 py-1.5 bg-white">
            <option value="">All Status</option>
            {data?.gatewayStatuses.map((s) => <option key={s.code} value={s.code}>{s.label}</option>)}
          </select>
          <button type="button" onClick={() => void load(false)} className="p-1.5 border border-slate-200 rounded hover:bg-slate-50">
            <RefreshCw size={14} />
          </button>
          {data?.permissions.canSyncGateway && (
            <button type="button" onClick={() => void runAction(() => syncTemplatesWithGateway(userRole))}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold border border-slate-200 rounded-lg hover:bg-slate-50">
              <Cloud size={12} /> Sync Gateway
            </button>
          )}
          {canManage && (
            <button type="button" onClick={openCreate}
              className="flex items-center gap-1 px-4 py-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg">
              <Plus size={12} /> New Template
            </button>
          )}
        </div>
      </div>

      {message && <FeeMessage message={message} type={messageType} />}

      {data?.permissions.canViewOnly && (
        <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600">
          <Lock size={14} /> View &amp; use only — template variables are locked and cannot be altered.
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        {[
          { label: 'Draft', value: data?.statusCounts.draft ?? 0, color: 'text-slate-600' },
          { label: 'Pending', value: data?.statusCounts.pending ?? 0, color: 'text-amber-600' },
          { label: 'Approved', value: data?.statusCounts.approved ?? 0, color: 'text-green-600' },
          { label: 'Rejected', value: data?.statusCounts.rejected ?? 0, color: 'text-red-600' },
          { label: 'Active', value: data?.statusCounts.active ?? 0, color: 'text-blue-600' },
        ].map((k) => (
          <div key={k.label} className="bg-white rounded-lg border border-slate-200 p-2 text-center">
            <div className={`text-lg font-bold ${k.color}`}>{k.value}</div>
            <div className="text-[10px] text-slate-500">{k.label}</div>
          </div>
        ))}
      </div>

      <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-0">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
              <tr>
                <th className="text-left px-3 py-2 font-bold text-slate-600">Template Name</th>
                <th className="text-left px-3 py-2 font-bold text-slate-600">Channel</th>
                <th className="text-left px-3 py-2 font-bold text-slate-600">Category</th>
                <th className="text-left px-3 py-2 font-bold text-slate-600">Gateway Status</th>
                <th className="text-left px-3 py-2 font-bold text-slate-600">Active</th>
                <th className="text-left px-3 py-2 font-bold text-slate-600">Variables</th>
                {canManage && <th className="text-right px-3 py-2 font-bold text-slate-600">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {(data?.templates ?? []).map((tpl) => (
                <tr key={tpl.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                  <td className="px-3 py-2">
                    <button type="button" onClick={() => setViewTpl(tpl)} className="text-left hover:text-blue-600">
                      <div className="font-semibold text-slate-800">{tpl.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{tpl.code}</div>
                    </button>
                  </td>
                  <td className="px-3 py-2">
                    <span className={`inline-flex px-2 py-0.5 rounded border text-[10px] font-semibold ${CHANNEL_STYLE[tpl.channel] ?? ''}`}>
                      {tpl.channel}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <span className={`inline-flex px-2 py-0.5 rounded border text-[10px] font-semibold ${CATEGORY_STYLE[tpl.category] ?? ''}`}>
                      {tpl.category}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold ${STATUS_STYLE[tpl.gatewayStatus] ?? ''}`}>
                      {tpl.gatewayStatus === 'PENDING' && <Clock size={10} />}
                      {tpl.gatewayStatus === 'APPROVED' && <CheckCircle2 size={10} />}
                      {tpl.gatewayStatus === 'REJECTED' && <XCircle size={10} />}
                      {tpl.gatewayStatus}
                    </span>
                    {tpl.rejectionReason && (
                      <div className="text-[9px] text-red-500 mt-0.5 max-w-[140px] truncate" title={tpl.rejectionReason}>
                        {tpl.rejectionReason}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {tpl.isActive ? (
                      <span className="text-green-600 font-semibold flex items-center gap-1"><Power size={10} /> Yes</span>
                    ) : (
                      <span className="text-slate-400 flex items-center gap-1"><PowerOff size={10} /> No</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-0.5">
                      {tpl.variables.slice(0, 3).map((v) => (
                        <span key={v.key} className="text-[9px] font-mono bg-slate-100 px-1 rounded">{v.placeholder}</span>
                      ))}
                      {tpl.variables.length > 3 && <span className="text-[9px] text-slate-400">+{tpl.variables.length - 3}</span>}
                    </div>
                  </td>
                  {canManage && (
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-end gap-1">
                        {tpl.gatewayStatus === 'DRAFT' && (
                          <>
                            <button type="button" onClick={() => openEdit(tpl)} title="Edit"
                              className="p-1 hover:bg-slate-100 rounded text-slate-600">
                              <Edit2 size={12} />
                            </button>
                            {(tpl.channel === 'SMS' || tpl.channel === 'WHATSAPP') && (
                              <button type="button" title="Submit to Gateway"
                                onClick={() => void runAction(() => submitTemplateToGateway(tpl.id, userRole, userRole))}
                                className="p-1 hover:bg-blue-50 rounded text-blue-600">
                                <Send size={12} />
                              </button>
                            )}
                          </>
                        )}
                        {tpl.gatewayStatus === 'APPROVED' && !tpl.isActive && (
                          <button type="button" title="Activate"
                            onClick={() => void runAction(() => activateMessageTemplate(tpl.id, userRole, userRole))}
                            className="p-1 hover:bg-green-50 rounded text-green-600">
                            <Power size={12} />
                          </button>
                        )}
                        {tpl.isActive && (
                          <button type="button" title="Deactivate"
                            onClick={() => void runAction(() => deactivateMessageTemplate(tpl.id, userRole, userRole))}
                            className="p-1 hover:bg-amber-50 rounded text-amber-600">
                            <PowerOff size={12} />
                          </button>
                        )}
                        {!tpl.isActive && tpl.gatewayStatus !== 'PENDING' && (
                          <button type="button" title="Delete"
                            onClick={() => void runAction(() => deleteMessageTemplate(tpl.id, userRole))}
                            className="p-1 hover:bg-red-50 rounded text-red-600">
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {(data?.templates.length ?? 0) === 0 && (
                <tr>
                  <td colSpan={canManage ? 7 : 6} className="px-3 py-8 text-center text-slate-400">
                    No templates found. {canManage ? 'Create your first template.' : 'Contact admin for approved templates.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="bg-white rounded-xl border border-slate-200 p-3">
          <h3 className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1">
            <Shield size={12} /> Approval Workflow
          </h3>
          <ol className="text-[10px] text-slate-600 space-y-1 list-decimal list-inside">
            {(data?.workflowSteps ?? []).map((s) => <li key={s}>{s}</li>)}
          </ol>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-3">
          <h3 className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1">
            <AlertTriangle size={12} /> Compliance Notes
          </h3>
          <ul className="text-[10px] text-slate-600 space-y-1">
            {(data?.complianceNotes ?? []).map((n) => <li key={n}>• {n}</li>)}
          </ul>
        </div>
      </div>

      <AcademicModal open={modalOpen} title={editing ? 'Edit Template' : 'New Template'} onClose={() => setModalOpen(false)} wide>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-bold text-slate-600">Template Name *</label>
                <input value={form.templateName} onChange={(e) => setForm((f) => ({ ...f, templateName: e.target.value }))}
                  className="w-full text-xs border border-slate-200 rounded px-2 py-1.5 mt-0.5" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-600">Channel</label>
                  <select value={form.channel} onChange={(e) => setForm((f) => ({ ...f, channel: e.target.value as TemplateFormPayload['channel'] }))}
                    className="w-full text-xs border border-slate-200 rounded px-2 py-1.5 mt-0.5">
                    <option value="SMS">SMS (DLT)</option>
                    <option value="WHATSAPP">WhatsApp (Meta)</option>
                    <option value="EMAIL">Email</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-600">Category</label>
                  <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as TemplateFormPayload['category'] }))}
                    className="w-full text-xs border border-slate-200 rounded px-2 py-1.5 mt-0.5">
                    <option value="TRANSACTIONAL">Transactional</option>
                    <option value="PROMOTIONAL">Promotional</option>
                  </select>
                </div>
              </div>
              {form.channel === 'SMS' && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-600">DLT Entity ID</label>
                    <input value={form.dltEntityId} onChange={(e) => setForm((f) => ({ ...f, dltEntityId: e.target.value }))}
                      placeholder="DLT-ENT-..." className="w-full text-xs border border-slate-200 rounded px-2 py-1.5 mt-0.5 font-mono" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-600">DLT Header ID</label>
                    <input value={form.dltHeaderId} onChange={(e) => setForm((f) => ({ ...f, dltHeaderId: e.target.value }))}
                      placeholder="DLT-HDR-..." className="w-full text-xs border border-slate-200 rounded px-2 py-1.5 mt-0.5 font-mono" />
                  </div>
                </div>
              )}
              {form.channel === 'EMAIL' && (
                <div>
                  <label className="text-[10px] font-bold text-slate-600">Subject</label>
                  <input value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                    className="w-full text-xs border border-slate-200 rounded px-2 py-1.5 mt-0.5" />
                </div>
              )}
              <div>
                <label className="text-[10px] font-bold text-slate-600">Header Text</label>
                <input value={form.headerText} onChange={(e) => setForm((f) => ({ ...f, headerText: e.target.value }))}
                  placeholder="Optional header (DLT registered)"
                  className="w-full text-xs border border-slate-200 rounded px-2 py-1.5 mt-0.5" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-600">Body * <span className="font-normal text-slate-400">Use {'{#variable_name#}'}</span></label>
                <textarea value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                  onBlur={syncVarsFromBody} rows={5}
                  placeholder="Dear Parent, fee of {#fee_amount#} for {#student_name#} is due."
                  className="w-full text-xs border border-slate-200 rounded px-2 py-1.5 mt-0.5 font-mono" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-600">Footer Text</label>
                <input value={form.footerText} onChange={(e) => setForm((f) => ({ ...f, footerText: e.target.value }))}
                  onBlur={syncVarsFromBody}
                  placeholder="- {#school_name#}"
                  className="w-full text-xs border border-slate-200 rounded px-2 py-1.5 mt-0.5" />
              </div>
              <button type="button" onClick={syncVarsFromBody}
                className="text-[10px] text-blue-600 hover:underline">
                Sync variables from body
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-bold text-slate-600 mb-1 block">Variables (locked for staff)</label>
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-[10px]">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="text-left px-2 py-1">Placeholder</th>
                        <th className="text-left px-2 py-1">Label</th>
                        <th className="text-left px-2 py-1">Sample</th>
                        <th className="px-2 py-1"><Lock size={10} /></th>
                      </tr>
                    </thead>
                    <tbody>
                      {(form.variables ?? []).map((v, i) => (
                        <tr key={v.variableKey} className="border-t border-slate-100">
                          <td className="px-2 py-1 font-mono text-blue-700">{v.placeholder || `{#${v.variableKey}#}`}</td>
                          <td className="px-2 py-1">
                            <input value={v.variableLabel} onChange={(e) => {
                              const vars = [...(form.variables ?? [])];
                              vars[i] = { ...vars[i], variableLabel: e.target.value };
                              setForm((f) => ({ ...f, variables: vars }));
                            }} className="w-full border border-slate-100 rounded px-1" />
                          </td>
                          <td className="px-2 py-1">
                            <input value={v.sampleValue} onChange={(e) => {
                              const vars = [...(form.variables ?? [])];
                              vars[i] = { ...vars[i], sampleValue: e.target.value };
                              setForm((f) => ({ ...f, variables: vars }));
                            }} className="w-full border border-slate-100 rounded px-1" placeholder="Preview value" />
                          </td>
                          <td className="px-2 py-1 text-center">
                            <input type="checkbox" checked={v.isLocked ?? true} readOnly className="rounded" />
                          </td>
                        </tr>
                      ))}
                      {(form.variables ?? []).length === 0 && (
                        <tr><td colSpan={4} className="px-2 py-3 text-center text-slate-400">Add {'{#var#}'} placeholders in body</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-600 mb-1 block">Live Preview</label>
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-700 whitespace-pre-wrap min-h-[100px] font-mono">
                  {formPreview || 'Preview will appear here…'}
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setModalOpen(false)}
                  className="flex-1 px-3 py-2 text-xs border border-slate-200 rounded-lg hover:bg-slate-50">Cancel</button>
                <button type="button" onClick={() => void handleSave()}
                  className="flex-1 px-3 py-2 text-xs font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  {editing ? 'Update Template' : 'Save Draft'}
                </button>
              </div>
            </div>
          </div>
        </AcademicModal>

      <AcademicModal open={!!viewTpl} title={viewTpl?.name ?? ''} onClose={() => setViewTpl(null)}>
        {viewTpl && (
          <div className="space-y-3 text-xs">
            <div className="flex flex-wrap gap-2">
              <span className={`inline-flex px-2 py-0.5 rounded border text-[10px] font-semibold ${CHANNEL_STYLE[viewTpl.channel] ?? ''}`}>{viewTpl.channel}</span>
              <span className={`inline-flex px-2 py-0.5 rounded border text-[10px] font-semibold ${CATEGORY_STYLE[viewTpl.category] ?? ''}`}>{viewTpl.category}</span>
              <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-semibold ${STATUS_STYLE[viewTpl.gatewayStatus] ?? ''}`}>{viewTpl.gatewayStatus}</span>
              {viewTpl.isActive && <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-semibold bg-green-100 text-green-800">Active</span>}
              {viewTpl.isLocked && <span className="flex items-center gap-1 text-slate-500"><Lock size={10} /> Locked</span>}
            </div>
            {viewTpl.gatewayTemplateId && (
              <div className="text-slate-500">Gateway ID: <span className="font-mono">{viewTpl.gatewayTemplateId}</span></div>
            )}
            <div className="bg-slate-50 rounded-lg p-3 font-mono whitespace-pre-wrap">
              {previewBody({
                body: viewTpl.body,
                headerText: viewTpl.headerText,
                footerText: viewTpl.footerText,
                variables: viewTpl.variables.map((v) => ({ placeholder: v.placeholder, sampleValue: v.sampleValue })),
              })}
            </div>
            <div className="flex flex-wrap gap-1">
              {viewTpl.variables.map((v) => (
                <span key={v.key} className="text-[10px] font-mono bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-100">
                  {v.placeholder} → {v.label}
                </span>
              ))}
            </div>
          </div>
        )}
      </AcademicModal>
    </div>
  );
}
