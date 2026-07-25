import { useCallback, useEffect, useRef, useState } from 'react';
import {
  MessageCircle, RefreshCw, Send, Clock, Shield, CheckCheck,
  AlertTriangle, FileText, Image, Video, Lock, UserPlus,
} from 'lucide-react';
import {
  fetchWhatsAppManagement,
  fetchWaConversation,
  sendWhatsAppMessage,
  simulateWaInbound,
  registerWaOptIn,
  type WhatsAppManagement,
  type WaConversation,
} from '../../../lib/communicationServices';
import { AcademicLoading, FeeMessage } from '../FeeFinanceManagement/FeeFinanceUi';

const ROLE_OPTIONS = ['Super Admin', 'Principal', 'Helpdesk', 'Reception', 'Communication Manager'];

export function WhatsAppManagementView() {
  const [data, setData] = useState<WhatsAppManagement | null>(null);
  const [loading, setLoading] = useState(true);
  const [academicYear, setAcademicYear] = useState('2025-26');
  const [userRole, setUserRole] = useState('Helpdesk');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');

  const [selectedMobile, setSelectedMobile] = useState<string | null>(null);
  const [conversation, setConversation] = useState<WaConversation | null>(null);
  const [replyText, setReplyText] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [sending, setSending] = useState(false);
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaType, setMediaType] = useState<'IMAGE' | 'PDF' | 'VIDEO'>('IMAGE');
  const chatEndRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async (seed = false) => {
    setLoading(true);
    try {
      const result = await fetchWhatsAppManagement(seed, academicYear, userRole);
      setData(result);
      setSelectedMobile((prev) => prev ?? result.inbox[0]?.mobile ?? null);
    } finally {
      setLoading(false);
    }
  }, [academicYear, userRole]);

  const loadConversation = useCallback(async (mobile: string) => {
    try {
      const conv = await fetchWaConversation(mobile);
      setConversation(conv);
    } catch {
      setConversation(null);
    }
  }, []);

  useEffect(() => { void load(); }, [academicYear, userRole]);

  useEffect(() => {
    if (selectedMobile) void loadConversation(selectedMobile);
  }, [selectedMobile, loadConversation]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation?.messages]);

  const flash = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(''), 7000);
  };

  const canReply = data?.permissions.canReplyInbox ?? false;
  const windowOpen = conversation?.window.isWindowOpen ?? false;
  const requireTemplate = conversation?.window.requireTemplate ?? true;

  const handleSend = async () => {
    if (!selectedMobile) return;
    setSending(true);
    try {
      const payload: Parameters<typeof sendWhatsAppMessage>[0] = {
        mobile: selectedMobile,
        sentBy: userRole,
        userRole,
        academicYear,
      };

      if (mediaUrl.trim()) {
        payload.messageType = mediaType;
        payload.mediaUrl = mediaUrl;
        payload.body = replyText || `[${mediaType}]`;
        payload.mediaFileName = mediaUrl.split('/').pop() ?? 'file';
      } else if (selectedTemplate) {
        payload.messageType = 'TEMPLATE';
        payload.templateCode = selectedTemplate;
        const tpl = data?.approvedTemplates.find((t) => t.code === selectedTemplate);
        payload.body = tpl?.body ?? '';
      } else {
        payload.messageType = 'TEXT';
        payload.body = replyText;
      }

      const result = await sendWhatsAppMessage(payload);
      setData(result.data);
      setReplyText('');
      setSelectedTemplate('');
      setMediaUrl('');
      await loadConversation(selectedMobile);
      flash(result.message, 'success');
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Send failed', 'error');
    } finally {
      setSending(false);
    }
  };

  const handleSimulateInbound = async (mobile: string) => {
    try {
      const result = await simulateWaInbound(mobile, 'Hi, I need help with my child\'s fee receipt.', 'Parent');
      setData(result.data);
      if (selectedMobile === mobile) await loadConversation(mobile);
      flash('Inbound message simulated — 24h window opened.', 'success');
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Failed', 'error');
    }
  };

  if (loading && !data) return <AcademicLoading label="Loading WhatsApp management…" />;

  const selectedInbox = data?.inbox.find((i) => i.mobile === selectedMobile);

  return (
    <div className="flex flex-col h-full space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">WhatsApp Management</h2>
          <p className="text-xs text-slate-500 mt-0.5">Business API · 24h window · opt-in · open/click tracking</p>
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
          <button type="button" onClick={() => void load(false)} className="p-1.5 border border-slate-200 rounded hover:bg-slate-50">
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {message && <FeeMessage message={message} type={messageType} />}

      {data?.gateway?.lowCredits && (
        <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
          <AlertTriangle size={14} />
          WhatsApp credits low: {data.gateway.creditsBalance.toLocaleString('en-IN')} remaining
        </div>
      )}

      {/* KPI Dashboard */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-2 shrink-0">
        {[
          { label: 'WhatsApp Sent', value: data?.kpis.whatsappSent ?? 0, color: 'text-emerald-600' },
          { label: 'Delivered', value: data?.kpis.delivered ?? 0, color: 'text-blue-600' },
          { label: 'Read', value: data?.kpis.read ?? 0, color: 'text-purple-600' },
          { label: 'Read Rate', value: `${data?.kpis.readRate ?? 0}%`, color: 'text-indigo-600' },
          { label: 'Open Windows', value: data?.kpis.openWindows ?? 0, color: 'text-green-600' },
          { label: 'Opted In', value: data?.kpis.optedInContacts ?? 0, color: 'text-cyan-600' },
          { label: 'Failed', value: data?.kpis.failed ?? 0, color: 'text-red-600' },
          { label: 'Credits', value: data?.kpis.creditsBalance ?? 0, color: 'text-slate-600' },
        ].map((k) => (
          <div key={k.label} className="bg-white rounded-lg border border-slate-200 p-2 text-center">
            <div className={`text-lg font-bold ${k.color}`}>
              {typeof k.value === 'number' ? k.value.toLocaleString('en-IN') : k.value}
            </div>
            <div className="text-[10px] text-slate-500">{k.label}</div>
          </div>
        ))}
      </div>

      {/* Inbox + Chat */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3 min-h-[480px]">
        {/* Conversation list */}
        <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
          <div className="px-3 py-2 border-b border-slate-100 flex items-center gap-2">
            <MessageCircle size={14} className="text-emerald-600" />
            <span className="text-xs font-bold text-slate-700">Inbox</span>
            <span className="ml-auto text-[10px] text-slate-400">{data?.inbox.length ?? 0} chats</span>
          </div>
          <div className="flex-1 overflow-y-auto">
            {(data?.inbox ?? []).map((chat) => (
              <button
                key={chat.id}
                type="button"
                onClick={() => setSelectedMobile(chat.mobile)}
                className={`w-full text-left px-3 py-2.5 border-b border-slate-50 hover:bg-slate-50 transition-colors ${
                  selectedMobile === chat.mobile ? 'bg-emerald-50 border-l-2 border-l-emerald-500' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-semibold text-slate-800 truncate">{chat.contactName}</span>
                      {chat.unreadCount > 0 && (
                        <span className="bg-emerald-500 text-white text-[9px] px-1.5 rounded-full">{chat.unreadCount}</span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">{chat.maskedMobile}</div>
                    <div className="text-[10px] text-slate-500 truncate mt-0.5">{chat.lastMessagePreview}</div>
                  </div>
                  <div className="shrink-0 text-right">
                    {chat.isWindowOpen ? (
                      <span className="inline-flex items-center gap-0.5 text-[9px] text-green-700 bg-green-50 px-1.5 py-0.5 rounded">
                        <Clock size={8} /> {chat.hoursRemaining}h
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-0.5 text-[9px] text-red-600 bg-red-50 px-1.5 py-0.5 rounded">
                        <Lock size={8} /> expired
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))}
            {(data?.inbox.length ?? 0) === 0 && (
              <p className="text-xs text-slate-400 text-center py-8">No conversations yet.</p>
            )}
          </div>
        </div>

        {/* Chat panel */}
        <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
          {selectedInbox && conversation ? (
            <>
              <div className="px-4 py-2 border-b border-slate-100 flex items-center gap-3 bg-emerald-50/50">
                <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-bold">
                  {conversation.contactName[0] ?? 'P'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-slate-800">{conversation.contactName}</div>
                  <div className="text-[10px] text-slate-500 font-mono">{conversation.maskedMobile}</div>
                </div>
                <div className="text-right">
                  {windowOpen ? (
                    <span className="text-[10px] text-green-700 font-semibold flex items-center gap-1">
                      <Clock size={10} /> Window open · {conversation.window.hoursRemaining}h left
                    </span>
                  ) : (
                    <span className="text-[10px] text-red-600 font-semibold flex items-center gap-1">
                      <Lock size={10} /> 24h window expired — templates only
                    </span>
                  )}
                  <div className="text-[9px] text-slate-400 mt-0.5">
                    Opt-in: {conversation.optIn.optedIn ? '✓ Yes' : '✗ No'}
                  </div>
                </div>
                {canReply && (
                  <button type="button" onClick={() => void handleSimulateInbound(selectedInbox.mobile)}
                    className="text-[9px] px-2 py-1 border border-emerald-200 rounded text-emerald-700 hover:bg-emerald-50">
                    Simulate reply
                  </button>
                )}
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-[#e5ddd5]/30" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23d4cfc7\' fill-opacity=\'0.15\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }}>
                {conversation.messages.map((m) => (
                  <div key={m.id} className={`flex ${m.direction === 'OUTBOUND' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-xs shadow-sm ${
                      m.direction === 'OUTBOUND'
                        ? 'bg-[#dcf8c6] text-slate-800 rounded-br-sm'
                        : 'bg-white text-slate-800 rounded-bl-sm'
                    }`}>
                      {m.messageType !== 'TEXT' && (
                        <div className="flex items-center gap-1 text-[10px] text-slate-500 mb-1">
                          {m.messageType === 'IMAGE' && <Image size={10} />}
                          {m.messageType === 'PDF' && <FileText size={10} />}
                          {m.messageType === 'VIDEO' && <Video size={10} />}
                          {m.messageType}
                          {m.mediaFileName && ` · ${m.mediaFileName}`}
                        </div>
                      )}
                      {m.templateCode && (
                        <div className="text-[9px] font-mono text-blue-600 mb-1">Template: {m.templateCode}</div>
                      )}
                      <p className="whitespace-pre-wrap leading-relaxed">{m.body}</p>
                      <div className="flex items-center justify-end gap-1 mt-1">
                        <span className="text-[9px] text-slate-400">
                          {new Date(m.sentAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {m.direction === 'OUTBOUND' && (
                          <CheckCheck size={10} className={m.readAt ? 'text-blue-500' : 'text-slate-400'} />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>

              {/* Composer */}
              {canReply && (
                <div className="p-3 border-t border-slate-100 space-y-2 bg-white">
                  {!conversation.optIn.optedIn && (
                    <div className="flex items-center gap-2 text-[10px] text-red-600 bg-red-50 px-2 py-1.5 rounded">
                      <Shield size={10} /> Recipient not opted in — cannot send messages.
                    </div>
                  )}
                  {requireTemplate && conversation.optIn.optedIn && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-[10px] text-amber-700 bg-amber-50 px-2 py-1.5 rounded">
                        <Lock size={10} /> 24h window expired — select an approved template
                      </div>
                      <select value={selectedTemplate} onChange={(e) => setSelectedTemplate(e.target.value)}
                        className="w-full text-xs border border-slate-200 rounded px-2 py-1.5">
                        <option value="">Select approved template…</option>
                        {(data?.approvedTemplates ?? []).map((t) => (
                          <option key={t.code} value={t.code}>{t.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  {windowOpen && conversation.optIn.optedIn && (
                    <>
                      <textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Type a reply (freeform allowed within 24h window)…"
                        rows={2}
                        className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 resize-none"
                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void handleSend(); } }}
                      />
                      <div className="flex items-center gap-2">
                        <select value={mediaType} onChange={(e) => setMediaType(e.target.value as 'IMAGE' | 'PDF' | 'VIDEO')}
                          className="text-[10px] border border-slate-200 rounded px-2 py-1">
                          <option value="IMAGE">Image (5MB)</option>
                          <option value="PDF">PDF (16MB)</option>
                          <option value="VIDEO">Video (16MB)</option>
                        </select>
                        <input value={mediaUrl} onChange={(e) => setMediaUrl(e.target.value)}
                          placeholder="Media URL (optional)"
                          className="flex-1 text-[10px] border border-slate-200 rounded px-2 py-1" />
                      </div>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => void handleSend()}
                    disabled={sending || !conversation.optIn.optedIn || (!replyText.trim() && !selectedTemplate && !mediaUrl.trim())}
                    className="w-full flex items-center justify-center gap-1 py-2 text-xs font-bold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                  >
                    <Send size={12} /> {sending ? 'Sending…' : requireTemplate ? 'Send Template' : 'Send Reply'}
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
              Select a conversation to view messages
            </div>
          )}
        </div>
      </div>

      {/* Footer info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 shrink-0">
        <div className="bg-white rounded-xl border border-slate-200 p-3">
          <h3 className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1">
            <Shield size={12} /> Workflow
          </h3>
          <ol className="text-[10px] text-slate-600 space-y-1 list-decimal list-inside">
            {(data?.workflowSteps ?? []).map((s) => <li key={s}>{s}</li>)}
          </ol>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-3">
          <h3 className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1">
            <UserPlus size={12} /> Compliance
          </h3>
          <ul className="text-[10px] text-slate-600 space-y-1">
            {(data?.complianceNotes ?? []).map((n) => <li key={n}>• {n}</li>)}
          </ul>
        </div>
      </div>
    </div>
  );
}
