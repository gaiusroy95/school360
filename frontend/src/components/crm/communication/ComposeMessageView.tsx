import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Users, Send, Mail, MessageCircle, Smartphone, Clock, Paperclip,
  RefreshCw, ChevronRight, ChevronDown, CheckCircle2, AlertTriangle,
  Eye, Calendar, Languages, Shield, FileText, X,
} from 'lucide-react';
import {
  fetchComposeMessageManagement,
  previewComposeMessage,
  submitComposeMessage,
  approveComposeMessage,
  type ComposeMessageManagement,
  type AudienceNode,
  type ComposePreviewResult,
} from '../../../lib/communicationServices';
import { AcademicLoading, FeeMessage } from '../FeeFinanceManagement/FeeFinanceUi';

const ROLE_OPTIONS = ['Principal', 'Super Admin', 'Teacher', 'Class Teacher', 'Communication Manager'];
const CHANNEL_ICONS = {
  SMS: Smartphone,
  EMAIL: Mail,
  WHATSAPP: MessageCircle,
};

function AudienceTreeNode({
  node,
  depth,
  selected,
  onToggle,
  expanded,
  onExpand,
}: {
  node: AudienceNode;
  depth: number;
  selected: Set<string>;
  onToggle: (key: string) => void;
  expanded: Set<string>;
  onExpand: (key: string) => void;
}) {
  const hasChildren = (node.children?.length ?? 0) > 0;
  const isExpanded = expanded.has(node.key);
  const isLeaf = !hasChildren || node.type === 'section' || node.type === 'filter' || node.type === 'group' || node.type === 'hostel' || node.type === 'route';

  return (
    <div>
      <div
        className={`flex items-center gap-1 py-1 px-1 rounded text-xs cursor-pointer hover:bg-slate-50 ${node.disabled ? 'opacity-50 pointer-events-none' : ''}`}
        style={{ paddingLeft: `${depth * 12 + 4}px` }}
      >
        {hasChildren && !isLeaf ? (
          <button type="button" onClick={() => onExpand(node.key)} className="p-0.5 text-slate-400">
            {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          </button>
        ) : (
          <span className="w-4" />
        )}
        {(isLeaf || node.type === 'section' || node.type === 'filter' || node.type === 'group') && node.key !== 'roles' && node.key !== 'classes' && node.key !== 'hostels' && node.key !== 'transport' && node.key !== 'filters' ? (
          <input
            type="checkbox"
            checked={selected.has(node.key)}
            onChange={() => onToggle(node.key)}
            disabled={node.disabled}
            className="rounded border-slate-300"
          />
        ) : null}
        <span className="flex-1 truncate text-slate-700" onClick={hasChildren && !isLeaf ? () => onExpand(node.key) : undefined}>
          {node.label}
        </span>
        {node.count != null && node.count > 0 && (
          <span className="text-[10px] text-slate-400 shrink-0">{node.count}</span>
        )}
      </div>
      {hasChildren && isExpanded && node.children?.map((child) => (
        <AudienceTreeNode
          key={child.key}
          node={child}
          depth={depth + 1}
          selected={selected}
          onToggle={onToggle}
          expanded={expanded}
          onExpand={onExpand}
        />
      ))}
    </div>
  );
}

function DevicePreview({
  channel,
  subject,
  body,
  schoolName,
}: {
  channel: string;
  subject: string;
  body: string;
  schoolName: string;
}) {
  if (channel === 'EMAIL') {
    return (
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden text-xs">
        <div className="bg-slate-100 px-3 py-2 border-b border-slate-200">
          <div className="font-semibold text-slate-700 truncate">{subject || '(No subject)'}</div>
          <div className="text-slate-400 text-[10px] mt-0.5">From: {schoolName}</div>
        </div>
        <div className="p-3 text-slate-600 whitespace-pre-wrap min-h-[120px]">{body || 'Email body preview…'}</div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-[200px]">
      <div className="bg-slate-800 rounded-[24px] p-2 shadow-xl">
        <div className="bg-slate-100 rounded-[18px] overflow-hidden min-h-[280px] flex flex-col">
          <div className="bg-slate-200 px-3 py-1.5 text-[9px] text-slate-500 text-center">
            {channel === 'WHATSAPP' ? 'WhatsApp' : 'SMS'} · {schoolName}
          </div>
          <div className="flex-1 p-3 flex flex-col justify-end">
            <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-[11px] leading-relaxed shadow-sm ${
              channel === 'WHATSAPP' ? 'bg-[#dcf8c6] text-slate-800' : 'bg-white text-slate-800 border border-slate-200'
            }`}>
              {body || 'Message preview…'}
            </div>
            <div className="text-[9px] text-slate-400 mt-1 text-right">Now</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ComposeMessageView() {
  const [data, setData] = useState<ComposeMessageManagement | null>(null);
  const [loading, setLoading] = useState(true);
  const [academicYear, setAcademicYear] = useState('2025-26');
  const [userRole, setUserRole] = useState('Principal');
  const [classScope, setClassScope] = useState('10-A');
  const [channel, setChannel] = useState<'SMS' | 'EMAIL' | 'WHATSAPP'>('SMS');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Set<string>>(new Set(['classes', 'roles', 'filters']));
  const [defaultersOnly, setDefaultersOnly] = useState(false);
  const [minFeeDue, setMinFeeDue] = useState('');
  const [translateEnabled, setTranslateEnabled] = useState(false);
  const [targetLanguage, setTargetLanguage] = useState('hi');
  const [scheduleAt, setScheduleAt] = useState('');
  const [attachments, setAttachments] = useState<{ fileName: string; fileSize: number; mimeType: string }[]>([]);
  const [preview, setPreview] = useState<ComposePreviewResult | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async (seed = false) => {
    setLoading(true);
    try {
      const result = await fetchComposeMessageManagement(seed, academicYear, { role: userRole, classScope });
      setData(result);
    } finally {
      setLoading(false);
    }
  }, [academicYear, userRole, classScope]);

  useEffect(() => { void load(); }, [load]);

  const flash = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(''), 7000);
  };

  const payload = useMemo(() => ({
    channel,
    subject,
    bodyPlain: body,
    recipientKeys: [...selectedKeys],
    audienceFilters: {
      ...(defaultersOnly ? { defaultersOnly: true } : {}),
      ...(minFeeDue ? { minFeeDue: Number(minFeeDue) } : {}),
    },
    attachments,
    translateEnabled,
    targetLanguage: translateEnabled ? targetLanguage : '',
    scheduleAt: scheduleAt || null,
    userRole,
    classScope,
    academicYear,
    createdBy: userRole,
  }), [channel, subject, body, selectedKeys, defaultersOnly, minFeeDue, attachments, translateEnabled, targetLanguage, scheduleAt, userRole, classScope, academicYear]);

  const smsLimit = data?.validationRules.smsMaxChars ?? 160;
  const charCount = body.length;
  const smsOverLimit = channel === 'SMS' && charCount > smsLimit;

  const toggleKey = (key: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
    setPreview(null);
  };

  const applyTemplate = (code: string) => {
    const tpl = data?.templates.find((t) => t.code === code);
    if (!tpl) return;
    setChannel(tpl.channel as 'SMS' | 'EMAIL' | 'WHATSAPP');
    setSubject(tpl.subject);
    setBody(tpl.body);
    setPreview(null);
  };

  const insertTag = (tag: string) => {
    setBody((b) => b + tag);
    setPreview(null);
  };

  const handlePreview = async () => {
    setPreviewing(true);
    try {
      const result = await previewComposeMessage(payload);
      setPreview(result);
      if (result.validation.errors.length) {
        flash(result.validation.errors.join(' '), 'error');
      }
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Preview failed', 'error');
    } finally {
      setPreviewing(false);
    }
  };

  const handleSubmit = async (sendNow: boolean) => {
    setSubmitting(true);
    try {
      const result = await submitComposeMessage({ ...payload, sendNow });
      setData(result.data);
      flash(result.message, 'success');
      setPreview(null);
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Submit failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      const result = await approveComposeMessage(id, userRole);
      setData(result.data);
      flash(result.message, 'success');
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Approval failed', 'error');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const maxBytes = channel === 'WHATSAPP'
      ? (data?.validationRules.whatsappMaxAttachmentMb ?? 16) * 1024 * 1024
      : channel === 'EMAIL'
        ? (data?.validationRules.emailMaxAttachmentMb ?? 5) * 1024 * 1024
        : 0;

    const added = Array.from(files).map((f) => ({
      fileName: f.name,
      fileSize: f.size,
      mimeType: f.type,
    })).filter((f) => {
      if (maxBytes > 0 && f.fileSize > maxBytes) {
        flash(`"${f.fileName}" exceeds attachment limit`, 'error');
        return false;
      }
      return true;
    });

    setAttachments((prev) => [...prev, ...added]);
    if (fileRef.current) fileRef.current.value = '';
  };

  if (loading && !data) return <AcademicLoading label="Loading compose message…" />;

  const previewBody = preview?.preview.body ?? body;
  const needsApproval = data?.permissions.smsNeedsApproval && channel === 'SMS';

  return (
    <div className="flex flex-col h-full space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">Compose Message</h2>
          <p className="text-xs text-slate-500 mt-0.5">Omni-channel dispatch — SMS, Email &amp; WhatsApp</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select value={academicYear} onChange={(e) => setAcademicYear(e.target.value)}
            className="text-xs border border-slate-200 rounded px-2 py-1.5 bg-white">
            {(data?.academicYears ?? ['2025-26']).map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <select value={userRole} onChange={(e) => setUserRole(e.target.value)} title="RBAC role"
            className="text-xs border border-slate-200 rounded px-2 py-1.5 bg-white">
            {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          {(userRole === 'Teacher' || userRole === 'Class Teacher') && (
            <input value={classScope} onChange={(e) => setClassScope(e.target.value)}
              placeholder="Class scope e.g. 10-A"
              className="text-xs border border-slate-200 rounded px-2 py-1.5 w-24" />
          )}
          <button type="button" onClick={() => void load(false)}
            className="p-1.5 border border-slate-200 rounded hover:bg-slate-50">
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {message && <FeeMessage message={message} type={messageType} />}

      {needsApproval && (
        <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
          <Shield size={14} />
          SMS messages require Principal approval (cost control).
        </div>
      )}

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3 min-h-0">
        {/* Left — Audience Builder */}
        <div className="lg:col-span-3 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col min-h-[320px] lg:min-h-0">
          <div className="px-3 py-2 border-b border-slate-100 flex items-center gap-2">
            <Users size={14} className="text-blue-600" />
            <span className="text-xs font-bold text-slate-700">Audience Builder</span>
            <span className="ml-auto text-[10px] text-slate-400">{selectedKeys.size} selected</span>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {data?.audienceTree.map((node) => (
              <AudienceTreeNode
                key={node.key}
                node={node}
                depth={0}
                selected={selectedKeys}
                onToggle={toggleKey}
                expanded={expanded}
                onExpand={(k) => setExpanded((prev) => {
                  const next = new Set(prev);
                  if (next.has(k)) next.delete(k);
                  else next.add(k);
                  return next;
                })}
              />
            ))}
          </div>
          <div className="p-2 border-t border-slate-100 space-y-2">
            <label className="flex items-center gap-2 text-[11px] text-slate-600">
              <input type="checkbox" checked={defaultersOnly} onChange={(e) => setDefaultersOnly(e.target.checked)} />
              Fee defaulters only
            </label>
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-slate-500 shrink-0">Min due ₹</span>
              <input type="number" value={minFeeDue} onChange={(e) => setMinFeeDue(e.target.value)}
                placeholder="500" className="flex-1 text-xs border border-slate-200 rounded px-2 py-1" />
            </div>
          </div>
        </div>

        {/* Center — Editor */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col min-h-[400px] lg:min-h-0">
          <div className="px-3 py-2 border-b border-slate-100">
            <div className="flex gap-1 mb-2">
              {(['SMS', 'EMAIL', 'WHATSAPP'] as const).map((ch) => {
                const Icon = CHANNEL_ICONS[ch];
                return (
                  <button key={ch} type="button" onClick={() => { setChannel(ch); setPreview(null); }}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      channel === ch ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}>
                    <Icon size={12} /> {ch === 'EMAIL' ? 'Email' : ch === 'WHATSAPP' ? 'WhatsApp' : 'SMS'}
                  </button>
                );
              })}
            </div>
            <div className="flex flex-wrap gap-1">
              <select onChange={(e) => e.target.value && applyTemplate(e.target.value)} defaultValue=""
                className="text-[10px] border border-slate-200 rounded px-2 py-1 bg-white">
                <option value="">Use template…</option>
                {data?.templates.filter((t) => t.channel === channel || !t.channel).map((t) => (
                  <option key={t.code} value={t.code}>{t.name}</option>
                ))}
              </select>
              {data?.mergeTags.map((m) => (
                <button key={m.tag} type="button" onClick={() => insertTag(m.tag)}
                  className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded hover:bg-blue-50 hover:text-blue-700 font-mono">
                  {m.tag}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 p-3 flex flex-col gap-2 overflow-y-auto">
            {channel === 'EMAIL' && (
              <input value={subject} onChange={(e) => setSubject(e.target.value)}
                placeholder="Email subject"
                className="text-sm border border-slate-200 rounded-lg px-3 py-2" />
            )}
            <textarea
              value={body}
              onChange={(e) => { setBody(e.target.value); setPreview(null); }}
              placeholder={channel === 'EMAIL' ? 'Write your email content…' : 'Type your message…'}
              rows={channel === 'EMAIL' ? 12 : 8}
              className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-2 resize-none font-mono leading-relaxed"
            />
            <div className="flex items-center justify-between text-[10px] text-slate-500">
              <span className={smsOverLimit ? 'text-red-600 font-semibold' : ''}>
                {channel === 'SMS' ? `${charCount} / ${smsLimit} chars` : `${charCount} chars`}
              </span>
              <label className="flex items-center gap-1 cursor-pointer">
                <Languages size={12} />
                <input type="checkbox" checked={translateEnabled} onChange={(e) => setTranslateEnabled(e.target.checked)} />
                Auto-translate
                {translateEnabled && (
                  <select value={targetLanguage} onChange={(e) => setTargetLanguage(e.target.value)}
                    className="ml-1 border border-slate-200 rounded px-1">
                    {data?.languages.filter((l) => l.code !== 'en').map((l) => (
                      <option key={l.code} value={l.code}>{l.label}</option>
                    ))}
                  </select>
                )}
              </label>
            </div>

            {channel !== 'SMS' && (
              <div>
                <input ref={fileRef} type="file" multiple className="hidden" onChange={handleFileChange} />
                <button type="button" onClick={() => fileRef.current?.click()}
                  className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800">
                  <Paperclip size={12} /> Attach files
                  <span className="text-slate-400">
                    (max {channel === 'WHATSAPP' ? '16' : '5'}MB)
                  </span>
                </button>
                {attachments.length > 0 && (
                  <div className="mt-1 space-y-1">
                    {attachments.map((a, i) => (
                      <div key={i} className="flex items-center gap-2 text-[10px] bg-slate-50 rounded px-2 py-1">
                        <FileText size={10} />
                        <span className="flex-1 truncate">{a.fileName}</span>
                        <span className="text-slate-400">{(a.fileSize / 1024).toFixed(0)}KB</span>
                        <button type="button" onClick={() => setAttachments((p) => p.filter((_, j) => j !== i))}>
                          <X size={10} className="text-red-500" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="p-3 border-t border-slate-100 flex flex-wrap gap-2">
            <button type="button" onClick={() => void handlePreview()} disabled={previewing}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold border border-slate-200 rounded-lg hover:bg-slate-50">
              <Eye size={12} /> {previewing ? 'Validating…' : 'Preview & Validate'}
            </button>
            {needsApproval ? (
              <button type="button" onClick={() => void handleSubmit(false)} disabled={submitting}
                className="flex items-center gap-1 px-4 py-1.5 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-lg">
                <Send size={12} /> Submit for Approval
              </button>
            ) : (
              <>
                <button type="button" onClick={() => void handleSubmit(true)} disabled={submitting}
                  className="flex items-center gap-1 px-4 py-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg">
                  <Send size={12} /> Send Now
                </button>
                {scheduleAt && (
                  <button type="button" onClick={() => void handleSubmit(false)} disabled={submitting}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold border border-blue-200 text-blue-700 rounded-lg hover:bg-blue-50">
                    <Clock size={12} /> Schedule
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Right — Preview & Schedule */}
        <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col min-h-[320px] lg:min-h-0">
          <div className="px-3 py-2 border-b border-slate-100 flex items-center gap-2">
            <Smartphone size={14} className="text-emerald-600" />
            <span className="text-xs font-bold text-slate-700">Preview &amp; Schedule</span>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            <DevicePreview
              channel={channel}
              subject={preview?.preview.subject ?? subject}
              body={previewBody}
              schoolName={data?.schoolName ?? 'School'}
            />

            {preview && (
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2">
                  <span className="text-slate-600">Recipients</span>
                  <span className="font-bold text-slate-800">{preview.effectiveRecipients}</span>
                </div>
                {preview.validation.dndSkipped > 0 && (
                  <div className="flex items-center gap-1 text-amber-700 bg-amber-50 rounded px-2 py-1.5">
                    <AlertTriangle size={12} />
                    {preview.validation.dndSkipped} DND numbers scrubbed
                  </div>
                )}
                {preview.validation.warnings.map((w) => (
                  <div key={w} className="text-amber-600 flex items-center gap-1">
                    <AlertTriangle size={10} /> {w}
                  </div>
                ))}
                {preview.validation.errors.map((e) => (
                  <div key={e} className="text-red-600 flex items-center gap-1">
                    <AlertTriangle size={10} /> {e}
                  </div>
                ))}
                {preview.validation.errors.length === 0 && (
                  <div className="flex items-center gap-1 text-green-700">
                    <CheckCircle2 size={12} /> Merge tags validated
                  </div>
                )}
                {preview.preview.sampleRecipient && (
                  <div className="text-[10px] text-slate-500 border-t border-slate-100 pt-2">
                    Sample: {preview.preview.sampleRecipient.name}
                    {preview.preview.sampleRecipient.mobile && ` · ${preview.preview.sampleRecipient.mobile}`}
                  </div>
                )}
              </div>
            )}

            <div className="border-t border-slate-100 pt-3">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 mb-2">
                <Calendar size={12} /> Schedule dispatch
              </label>
              <input
                type="datetime-local"
                value={scheduleAt}
                onChange={(e) => setScheduleAt(e.target.value)}
                min={new Date().toISOString().slice(0, 16)}
                className="w-full text-xs border border-slate-200 rounded-lg px-2 py-1.5"
              />
              <p className="text-[10px] text-slate-400 mt-1">Leave empty to send immediately</p>
            </div>

            <div className="text-[10px] text-slate-400 flex items-center gap-1">
              Queue: {data?.queueProviders.join(' / ')}
            </div>
          </div>

          {(data?.pendingApprovals.length ?? 0) > 0 && data?.canBypassApproval && (
            <div className="border-t border-slate-100 p-3">
              <div className="text-xs font-bold text-slate-700 mb-2">Pending Approvals</div>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {data.pendingApprovals.map((m) => (
                  <div key={m.id} className="flex items-start gap-2 bg-amber-50 rounded-lg p-2 text-[10px]">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-slate-700">{m.code}</div>
                      <div className="text-slate-500 truncate">{m.preview}</div>
                      <div className="text-slate-400">{m.createdBy} · {m.recipientCount} recipients</div>
                    </div>
                    <button type="button" onClick={() => void handleApprove(m.id)}
                      className="shrink-0 px-2 py-1 bg-green-600 text-white rounded font-semibold hover:bg-green-700">
                      Approve
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
