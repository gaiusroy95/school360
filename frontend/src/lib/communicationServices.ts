import { api } from './api';

function qs(params?: Record<string, string | undefined>) {
  if (!params) return '';
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v != null && v !== '') sp.set(k, v);
  }
  const s = sp.toString();
  return s ? `?${s}` : '';
}

export type CommunicationDashboard = {
  academicYear: string;
  academicYears: string[];
  userRole: string;
  scopeKey: string;
  canViewCosts: boolean;
  canViewPii: boolean;
  piiMasked: boolean;
  cacheRefreshMins: number;
  lastCacheRefresh: string | null;
  channels: { id: string; label: string }[];
  kpis: {
    totalMessagesSent: { value: number; subtitle: string };
    totalRecipients: { value: number; subtitle: string };
    smsSent: { value: number; subtitle: string };
    emailSent: { value: number; subtitle: string };
    whatsappSent: { value: number; subtitle: string };
    pushSent: { value: number; subtitle: string };
    totalCost: { value: string; subtitle: string; hidden?: boolean };
  };
  rates: {
    deliveryRate: number;
    readRate: number;
    failureRate: number;
    engagementRate: number;
    openRate: number;
    clickRate: number;
    replyRate: number;
  };
  deliveryOverview: { name: string; value: number; color: string; percent: string }[];
  channelPerformance: { name: string; channel: string; sent: number; delivered: number; read: number; failed: number; color: string }[];
  trendData: { day: string; rate: number; sent: number }[];
  recentCommunications: {
    id: string;
    title: string;
    description: string;
    channel: string;
    time: string;
    status: string;
    iconBg: string;
    sourceModule: string;
    recipientGroup: string;
  }[];
  scheduledMessages: {
    id: string;
    title: string;
    channel: string;
    date: string;
    time: string;
    recipients: string;
    status: string;
  }[];
  automations: { id: string; name: string; active: boolean; channel: string; sourceModule: string }[];
  recipientGroups: { id: string; name: string; count: number; scope: string }[];
  gatewayAlerts: { id: string; channel: string; message: string; severity: string; type: string }[];
  channelHealth: { code: string; name: string; provider: string; status: string; credits: number | null; lowCredits: boolean }[];
  templates: { name: string; type: string }[];
  surveys: {
    activeSurveys: number;
    totalResponses: number;
    responseRate: number;
    recentSurvey: { name: string; responses: number; target: number; percent: number };
  };
  quickActions: { label: string; target: string }[];
  keyBenefits: { title: string; desc: string }[];
  erpIntegrations: string[];
  liveUpdatesNote: string;
};

export async function fetchCommunicationDashboard(
  seed?: boolean,
  academicYear?: string,
  opts?: { channel?: string; role?: string; classScope?: string },
) {
  const params: Record<string, string | undefined> = {
    academicYear,
    channel: opts?.channel,
    role: opts?.role,
    classScope: opts?.classScope,
  };
  if (seed) params.seed = '1';
  return api<CommunicationDashboard>(`/api/communication/dashboard${qs(params)}`);
}

export type AudienceNode = {
  key: string;
  label: string;
  type: string;
  count?: number;
  disabled?: boolean;
  children?: AudienceNode[];
};

export type ComposeMessageManagement = {
  academicYear: string;
  academicYears: string[];
  userRole: string;
  classScope: string;
  schoolName: string;
  canBypassApproval: boolean;
  requiresSmsApproval: boolean;
  permissions: {
    canComposeToAll: boolean;
    canSendSms: boolean;
    smsNeedsApproval: boolean;
    canSchedule: boolean;
    canAttachFiles: boolean;
  };
  channels: { code: string; label: string; maxChars: number | null; maxAttachmentBytes: number | null }[];
  mergeTags: { tag: string; label: string; field: string }[];
  audienceTree: AudienceNode[];
  templates: {
    id: string;
    code: string;
    name: string;
    channel: string;
    subject: string;
    body: string;
    mergeTags: unknown;
  }[];
  recentMessages: {
    id: string;
    code: string;
    channel: string;
    status: string;
    recipientCount: number;
    createdAt: string;
    preview: string;
  }[];
  pendingApprovals: {
    id: string;
    code: string;
    channel: string;
    createdBy: string;
    recipientCount: number;
    preview: string;
    createdAt: string;
  }[];
  validationRules: {
    smsMaxChars: number;
    emailMaxAttachmentMb: number;
    whatsappMaxAttachmentMb: number;
    scheduleMustBeFuture: boolean;
    dndScrubEnabled: boolean;
  };
  queueProviders: string[];
  languages: { code: string; label: string }[];
};

export type ComposePreviewResult = {
  validation: {
    errors: string[];
    warnings: string[];
    mergeTagsFound: string[];
    charCount: number;
    dndSkipped: number;
    effectiveRecipients: number;
  };
  recipientCount: number;
  effectiveRecipients: number;
  preview: {
    subject: string;
    body: string;
    bodyHtml: string;
    sampleRecipient: { name: string; mobile: string; email: string } | null;
  };
  requiresApproval: boolean;
  canSendNow: boolean;
};

export type ComposeSubmitPayload = {
  channel: 'SMS' | 'EMAIL' | 'WHATSAPP';
  subject?: string;
  bodyPlain: string;
  bodyHtml?: string;
  recipientKeys: string[];
  audienceFilters?: {
    minFeeDue?: number;
    defaultersOnly?: boolean;
    parentType?: 'FATHER' | 'MOTHER' | 'BOTH';
  };
  attachments?: { fileName: string; fileUrl?: string; fileSize: number; mimeType?: string }[];
  translateEnabled?: boolean;
  targetLanguage?: string;
  scheduleAt?: string | null;
  sendNow?: boolean;
  templateCode?: string;
  createdBy?: string;
  userRole?: string;
  classScope?: string;
  academicYear?: string;
};

export async function fetchComposeMessageManagement(
  seed?: boolean,
  academicYear?: string,
  opts?: { role?: string; classScope?: string },
) {
  const params: Record<string, string | undefined> = {
    academicYear,
    role: opts?.role,
    classScope: opts?.classScope,
  };
  if (seed) params.seed = '1';
  return api<ComposeMessageManagement>(`/api/communication/compose${qs(params)}`);
}

export async function previewComposeMessage(payload: ComposeSubmitPayload) {
  return api<ComposePreviewResult>('/api/communication/compose/preview', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function submitComposeMessage(payload: ComposeSubmitPayload) {
  return api<{ message: string; messageId: string; messageCode: string; status: string; data: ComposeMessageManagement }>(
    '/api/communication/compose/submit',
    { method: 'POST', body: JSON.stringify(payload) },
  );
}

export async function approveComposeMessage(messageId: string, approvedBy?: string) {
  return api<{ message: string; status: string; data: ComposeMessageManagement }>(
    `/api/communication/compose/${messageId}/approve`,
    { method: 'POST', body: JSON.stringify({ approvedBy: approvedBy ?? 'Principal', sendNow: true }) },
  );
}

export type CommTemplateVariable = {
  id?: string;
  key: string;
  label: string;
  placeholder: string;
  sampleValue: string;
  isLocked: boolean;
  sortOrder: number;
};

export type CommTemplate = {
  id: string;
  code: string;
  name: string;
  channel: string;
  category: string;
  subject: string;
  body: string;
  headerText: string;
  footerText: string;
  gatewayStatus: string;
  gatewayProvider: string;
  gatewayTemplateId: string;
  dltEntityId: string;
  dltHeaderId: string;
  language: string;
  rejectionReason: string;
  isActive: boolean;
  isLocked: boolean;
  createdBy: string;
  academicYear: string;
  submittedAt: string | null;
  gatewayApprovedAt: string | null;
  createdAt: string;
  updatedAt: string;
  variables: CommTemplateVariable[];
};

export type MessageTemplatesManagement = {
  academicYear: string;
  academicYears: string[];
  userRole: string;
  permissions: {
    canCreate: boolean;
    canEdit: boolean;
    canDelete: boolean;
    canSubmitToGateway: boolean;
    canSyncGateway: boolean;
    canActivate: boolean;
    canViewOnly: boolean;
    enforceRigidTemplates: boolean;
  };
  channels: { code: string; label: string }[];
  categories: { code: string; label: string }[];
  gatewayStatuses: { code: string; label: string }[];
  statusCounts: { draft: number; pending: number; approved: number; rejected: number; active: number };
  templates: CommTemplate[];
  workflowSteps: string[];
  complianceNotes: string[];
};

export type TemplateFormPayload = {
  templateCode?: string;
  templateName: string;
  channel: 'SMS' | 'EMAIL' | 'WHATSAPP';
  category?: 'TRANSACTIONAL' | 'PROMOTIONAL';
  subject?: string;
  body: string;
  headerText?: string;
  footerText?: string;
  language?: string;
  dltEntityId?: string;
  dltHeaderId?: string;
  variables?: { variableKey: string; variableLabel: string; placeholder?: string; sampleValue?: string; isLocked?: boolean; sortOrder?: number }[];
  academicYear?: string;
  createdBy?: string;
  userRole?: string;
};

export async function fetchMessageTemplates(
  seed?: boolean,
  academicYear?: string,
  opts?: { role?: string; channel?: string; status?: string; category?: string },
) {
  const params: Record<string, string | undefined> = {
    academicYear,
    role: opts?.role,
    channel: opts?.channel,
    status: opts?.status,
    category: opts?.category,
  };
  if (seed) params.seed = '1';
  return api<MessageTemplatesManagement>(`/api/communication/templates${qs(params)}`);
}

export async function createMessageTemplate(payload: TemplateFormPayload) {
  return api<{ message: string; template: CommTemplate; data: MessageTemplatesManagement }>(
    '/api/communication/templates',
    { method: 'POST', body: JSON.stringify(payload) },
  );
}

export async function updateMessageTemplate(id: string, payload: TemplateFormPayload) {
  return api<{ message: string; data: MessageTemplatesManagement }>(
    `/api/communication/templates/${id}`,
    { method: 'PUT', body: JSON.stringify(payload) },
  );
}

export async function submitTemplateToGateway(id: string, submittedBy: string, userRole: string) {
  return api<{ message: string; gatewayTemplateId: string; data: MessageTemplatesManagement }>(
    `/api/communication/templates/${id}/submit-gateway`,
    { method: 'POST', body: JSON.stringify({ submittedBy, userRole }) },
  );
}

export async function activateMessageTemplate(id: string, activatedBy: string, userRole: string) {
  return api<{ message: string; data: MessageTemplatesManagement }>(
    `/api/communication/templates/${id}/activate`,
    { method: 'POST', body: JSON.stringify({ activatedBy, userRole }) },
  );
}

export async function deactivateMessageTemplate(id: string, deactivatedBy: string, userRole: string) {
  return api<{ message: string; data: MessageTemplatesManagement }>(
    `/api/communication/templates/${id}/deactivate`,
    { method: 'POST', body: JSON.stringify({ deactivatedBy, userRole }) },
  );
}

export async function deleteMessageTemplate(id: string, userRole: string) {
  return api<{ message: string; data: MessageTemplatesManagement }>(
    `/api/communication/templates/${id}?role=${encodeURIComponent(userRole)}`,
    { method: 'DELETE' },
  );
}

export async function syncTemplatesWithGateway(userRole: string) {
  return api<{ message: string; approved: number; rejected: number; data: MessageTemplatesManagement }>(
    '/api/communication/templates/sync-gateway',
    { method: 'POST', body: JSON.stringify({ userRole }) },
  );
}

export type SmsSegmentInfo = {
  encoding: 'GSM' | 'UNICODE';
  charCount: number;
  segmentCount: number;
  creditsRequired: number;
  charsPerSegment: number;
  singleSegmentLimit: number;
};

export type SmsManagement = {
  academicYear: string;
  academicYears: string[];
  userRole: string;
  permissions: {
    canManageGateways: boolean;
    canManageDnd: boolean;
    canSendTest: boolean;
    canProcessQueue: boolean;
  };
  segmentRules: { gsm: { single: number; concat: number }; unicode: { single: number; concat: number } };
  kpis: {
    activeGateways: number;
    totalCredits: number;
    dndEntries: number;
    queued: number;
    sent: number;
    failed: number;
    dndSkipped: number;
  };
  gateways: {
    id: string;
    code: string;
    name: string;
    provider: string;
    senderId: string;
    apiKeyMasked: string;
    priority: number;
    status: string;
    creditsBalance: number;
    creditAlertAt: number;
    costPerCredit: number;
    successRate: number;
    simulate503: boolean;
    lowCredits: boolean;
    lastHealthCheck: string | null;
  }[];
  lowCreditAlerts: { gateway: string; credits: number; alertAt: number }[];
  recentQueue: {
    id: string;
    mobile: string;
    message: string;
    encoding: string;
    segmentCount: number;
    creditsRequired: number;
    status: string;
    gateway: string;
    queuedAt: string;
    sentAt: string | null;
    lastError: string;
  }[];
  recentFailovers: {
    id: string;
    gatewayCode: string;
    httpStatus: number;
    status: string;
    response: string;
    attemptedAt: string;
  }[];
  failoverNote: string;
};

export async function fetchSmsManagement(seed?: boolean, academicYear?: string, role?: string) {
  const params: Record<string, string | undefined> = { academicYear, role };
  if (seed) params.seed = '1';
  return api<SmsManagement>(`/api/communication/sms${qs(params)}`);
}

export async function calculateSmsSegments(message: string) {
  return api<SmsSegmentInfo>('/api/communication/sms/calculate-segments', {
    method: 'POST',
    body: JSON.stringify({ message }),
  });
}

export async function scrubSmsDnd(mobiles: string[], messageType: 'TRANSACTIONAL' | 'PROMOTIONAL' = 'PROMOTIONAL') {
  return api<{ total: number; allowed: number; blocked: number; results: { mobile: string; onDnd: boolean; reason: string }[] }>(
    '/api/communication/sms/scrub-dnd',
    { method: 'POST', body: JSON.stringify({ mobiles, messageType }) },
  );
}

export async function enqueueSmsMessage(payload: {
  mobile: string;
  message: string;
  messageType?: 'TRANSACTIONAL' | 'PROMOTIONAL';
  academicYear?: string;
  processNow?: boolean;
}) {
  return api<{ message: string; queueItemId: string; status: string; segments?: SmsSegmentInfo; data: SmsManagement }>(
    '/api/communication/sms/enqueue',
    { method: 'POST', body: JSON.stringify(payload) },
  );
}

export async function processSmsQueue(academicYear?: string) {
  return api<{ processed: number; data: SmsManagement }>(
    '/api/communication/sms/process-queue',
    { method: 'POST', body: JSON.stringify({ academicYear }) },
  );
}

export async function createSmsGateway(payload: Record<string, unknown>) {
  return api<{ message: string; data: SmsManagement }>('/api/communication/sms/gateways', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateSmsGateway(id: string, payload: Record<string, unknown>) {
  return api<{ message: string; data: SmsManagement }>(`/api/communication/sms/gateways/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function addSmsDndEntry(mobile: string, category: string, notes: string, userRole: string) {
  return api<{ message: string; data: SmsManagement }>('/api/communication/sms/dnd', {
    method: 'POST',
    body: JSON.stringify({ mobile, category, notes, userRole }),
  });
}

export async function fetchSmsDndEntries(limit = 50) {
  return api<{ id: string; mobile: string; fullMobile: string; category: string; source: string; notes: string; registeredAt: string }[]>(
    `/api/communication/sms/dnd?limit=${limit}`,
  );
}

export type EmailManagement = {
  academicYear: string;
  academicYears: string[];
  userRole: string;
  permissions: {
    canManageGateways: boolean;
    canSendTest: boolean;
    canProcessQueue: boolean;
  };
  kpis: {
    activeGateways: number;
    sentToday: number;
    queued: number;
    sent: number;
    failed: number;
    totalOpens: number;
    totalClicks: number;
    openRate: number;
    clickRate: number;
  };
  gateways: {
    id: string;
    code: string;
    name: string;
    provider: string;
    smtpHost: string;
    smtpPort: number;
    fromEmail: string;
    fromName: string;
    apiKeyMasked: string;
    priority: number;
    status: string;
    dailyLimit: number;
    sentToday: number;
    costPerEmail: number;
    trackOpens: boolean;
    trackClicks: boolean;
    simulate503: boolean;
    utilizationPct: number;
    lastHealthCheck: string | null;
  }[];
  recentQueue: {
    id: string;
    toEmail: string;
    subject: string;
    campaignType: string;
    status: string;
    gateway: string;
    openCount: number;
    clickCount: number;
    trackingId: string;
    queuedAt: string;
    sentAt: string | null;
    lastError: string;
  }[];
  recentTrackingEvents: {
    id: string;
    eventType: string;
    subject: string;
    recipient: string;
    linkUrl: string;
    createdAt: string;
  }[];
  providers: { code: string; label: string }[];
  campaignTypes: { code: string; label: string }[];
  trackingNote: string;
  failoverNote: string;
};

export async function fetchEmailManagement(seed?: boolean, academicYear?: string, role?: string) {
  const params: Record<string, string | undefined> = { academicYear, role };
  if (seed) params.seed = '1';
  return api<EmailManagement>(`/api/communication/email${qs(params)}`);
}

export async function enqueueEmailMessage(payload: {
  toEmail: string;
  toName?: string;
  subject: string;
  bodyHtml: string;
  bodyPlain?: string;
  campaignType?: 'TRANSACTIONAL' | 'MARKETING';
  academicYear?: string;
  processNow?: boolean;
}) {
  return api<{ message: string; queueItemId: string; trackingId: string; status: string; data: EmailManagement }>(
    '/api/communication/email/enqueue',
    { method: 'POST', body: JSON.stringify(payload) },
  );
}

export async function processEmailQueue(academicYear?: string) {
  return api<{ processed: number; data: EmailManagement }>(
    '/api/communication/email/process-queue',
    { method: 'POST', body: JSON.stringify({ academicYear }) },
  );
}

export async function updateEmailGateway(id: string, payload: Record<string, unknown>) {
  return api<{ message: string; data: EmailManagement }>(`/api/communication/email/gateways/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function simulateEmailEngagement(trackingId: string) {
  return api<{ message: string; data: EmailManagement }>(
    `/api/communication/email/simulate-engagement/${trackingId}`,
    { method: 'POST', body: JSON.stringify({}) },
  );
}

export type WhatsAppManagement = {
  academicYear: string;
  academicYears: string[];
  userRole: string;
  permissions: { canManage: boolean; canReplyInbox: boolean; canManageOptIn: boolean };
  kpis: {
    whatsappSent: number;
    delivered: number;
    read: number;
    readRate: number;
    failed: number;
    openWindows: number;
    optedInContacts: number;
    creditsBalance: number;
    costPerMessage: number;
  };
  gateway: {
    code: string;
    name: string;
    provider: string;
    status: string;
    creditsBalance: number;
    creditAlertAt: number;
    lowCredits: boolean;
  } | null;
  inbox: {
    id: string;
    mobile: string;
    maskedMobile: string;
    contactName: string;
    lastMessagePreview: string;
    unreadCount: number;
    isWindowOpen: boolean;
    windowExpiresAt: string | null;
    hoursRemaining: number;
    lastInboundAt: string | null;
    assignedTo: string;
    updatedAt: string;
  }[];
  approvedTemplates: { code: string; name: string; body: string; category: string }[];
  recentWebhooks: { id: string; eventType: string; vendorMessageId: string; createdAt: string }[];
  mediaLimits: Record<string, string>;
  workflowSteps: string[];
  complianceNotes: string[];
};

export type WaConversation = {
  mobile: string;
  maskedMobile: string;
  contactName: string;
  window: {
    isWindowOpen: boolean;
    windowExpiresAt: string | null;
    hoursRemaining: number;
    allowFreeform: boolean;
    requireTemplate: boolean;
  };
  optIn: { optedIn: boolean; status: string };
  messages: {
    id: string;
    direction: string;
    messageType: string;
    body: string;
    templateCode: string;
    mediaUrl: string;
    mediaFileName: string;
    status: string;
    sentBy: string;
    sentAt: string;
    readAt: string | null;
  }[];
};

export async function fetchWhatsAppManagement(seed?: boolean, academicYear?: string, role?: string) {
  const params: Record<string, string | undefined> = { academicYear, role };
  if (seed) params.seed = '1';
  return api<WhatsAppManagement>(`/api/communication/whatsapp${qs(params)}`);
}

export async function fetchWaConversation(mobile: string) {
  return api<WaConversation>(`/api/communication/whatsapp/inbox/${encodeURIComponent(mobile)}/messages`);
}

export async function sendWhatsAppMessage(payload: {
  mobile: string;
  body?: string;
  messageType?: 'TEXT' | 'TEMPLATE' | 'IMAGE' | 'PDF' | 'VIDEO';
  templateCode?: string;
  mediaUrl?: string;
  mediaMimeType?: string;
  mediaFileName?: string;
  mediaSize?: number;
  sentBy?: string;
  userRole?: string;
  academicYear?: string;
}) {
  return api<{ message: string; data: WhatsAppManagement }>(
    '/api/communication/whatsapp/send',
    { method: 'POST', body: JSON.stringify(payload) },
  );
}

export async function simulateWaInbound(mobile: string, body: string, contactName?: string) {
  return api<{ data: WhatsAppManagement }>(
    '/api/communication/whatsapp/simulate-inbound',
    { method: 'POST', body: JSON.stringify({ mobile, body, contactName }) },
  );
}

export async function registerWaOptIn(mobile: string, contactName: string, userRole: string) {
  return api<{ message: string; data: WhatsAppManagement }>(
    '/api/communication/whatsapp/opt-in',
    { method: 'POST', body: JSON.stringify({ mobile, contactName, userRole }) },
  );
}

export type PushManagement = {
  academicYear: string;
  academicYears: string[];
  userRole: string;
  permissions: { canManage: boolean; canSend: boolean };
  kpis: {
    pushSent: number;
    delivered: number;
    read: number;
    readRate: number;
    failed: number;
    sentToday: number;
    registeredDevices: number;
    registeredAccounts: number;
    costPerPush: number;
  };
  gateways: {
    id: string;
    code: string;
    name: string;
    provider: string;
    bundleId: string;
    status: string;
    priority: number;
    sentToday: number;
    dailyLimit: number;
    serverKeyMasked: string;
  }[];
  deviceBreakdown: { platform: string; count: number }[];
  accountBreakdown: { role: string; count: number }[];
  campaigns: {
    id: string;
    title: string;
    body: string;
    audienceType: string;
    audienceLabel: string;
    status: string;
    recipientCount: number;
    sentCount: number;
    deliveredCount: number;
    readCount: number;
    failedCount: number;
    deviceCount: number;
    readRate: number;
    sentBy: string;
    sentAt: string;
    recipients: {
      id: string;
      accountName: string;
      accountRole: string;
      platform: string;
      status: string;
      readAt: string | null;
    }[];
  }[];
  audienceOptions: { value: string; label: string }[];
  workflowSteps: string[];
  complianceNotes: string[];
};

export async function fetchPushManagement(seed?: boolean, academicYear?: string, role?: string) {
  const params: Record<string, string | undefined> = { academicYear, role };
  if (seed) params.seed = '1';
  return api<PushManagement>(`/api/communication/push${qs(params)}`);
}

export async function sendPushNotification(payload: {
  title: string;
  body: string;
  audienceType?: string;
  classFilter?: string;
  deepLink?: string;
  category?: string;
  sentBy?: string;
  userRole?: string;
  academicYear?: string;
}) {
  return api<{ message: string; campaignId: string; status: string; data: PushManagement }>(
    '/api/communication/push/send',
    { method: 'POST', body: JSON.stringify(payload) },
  );
}

export async function simulatePushRead(recipientId: string) {
  return api<{ message: string; data: PushManagement }>(
    `/api/communication/push/simulate-read/${recipientId}`,
    { method: 'POST', body: JSON.stringify({}) },
  );
}

export async function updatePushGateway(id: string, payload: Record<string, unknown>) {
  return api<{ message: string; data: PushManagement }>(`/api/communication/push/gateways/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export type CircularsManagement = {
  academicYear: string;
  academicYears: string[];
  userRole: string;
  permissions: { canManage: boolean; canPublish: boolean };
  kpis: {
    total: number;
    published: number;
    drafts: number;
    avgAckRate: number;
    pendingAckTotal: number;
    requireAckCount: number;
  };
  circulars: {
    id: string;
    title: string;
    bodyPreview: string;
    status: string;
    pdfUrl: string;
    pdfFileName: string;
    requireAcknowledgment: boolean;
    requireESignature: boolean;
    audienceType: string;
    audienceLabel: string;
    targetCount: number;
    viewedCount: number;
    acknowledgedCount: number;
    acknowledgmentRate: number;
    pushSent: boolean;
    publishedBy: string;
    publishedDate: string | null;
    createdAt: string;
    updatedAt: string;
  }[];
  audienceOptions: { value: string; label: string }[];
  workflowSteps: string[];
  complianceNotes: string[];
};

export type CircularDetail = {
  circular: CircularsManagement['circulars'][0];
  detail: { body: string; pdfSize: number; classFilter: string; pushCampaignId: string };
  summary: {
    targetCount: number;
    viewedCount: number;
    acknowledgedCount: number;
    pendingCount: number;
    acknowledgmentRate: number;
  };
  acknowledged: {
    id: string;
    accountName: string;
    accountRole: string;
    status: string;
    viewedAt: string | null;
    acknowledgedAt: string | null;
    ipAddress: string;
    eSignature: string;
    reminderCount: number;
  }[];
  pending: {
    id: string;
    accountName: string;
    accountRole: string;
    status: string;
    viewedAt: string | null;
    reminderCount: number;
    lastReminderAt: string | null;
  }[];
};

export async function fetchCircularsManagement(seed?: boolean, academicYear?: string, role?: string) {
  const params: Record<string, string | undefined> = { academicYear, role };
  if (seed) params.seed = '1';
  return api<CircularsManagement>(`/api/communication/circulars${qs(params)}`);
}

export async function fetchCircularDetail(id: string) {
  return api<CircularDetail>(`/api/communication/circulars/${id}`);
}

export async function createCircularDraft(payload: Record<string, unknown>) {
  return api<{ message: string; circularId: string; data: CircularsManagement }>(
    '/api/communication/circulars',
    { method: 'POST', body: JSON.stringify(payload) },
  );
}

export async function updateCircularDraft(id: string, payload: Record<string, unknown>) {
  return api<{ message: string; data: CircularsManagement }>(
    `/api/communication/circulars/${id}`,
    { method: 'PUT', body: JSON.stringify(payload) },
  );
}

export async function publishCircular(id: string, payload: Record<string, unknown>) {
  return api<{ message: string; circularId: string; data: CircularsManagement }>(
    `/api/communication/circulars/${id}/publish`,
    { method: 'POST', body: JSON.stringify(payload) },
  );
}

export async function resendCircularReminders(id: string, userRole: string) {
  return api<{ message: string; reminded: number; detail: CircularDetail; data: CircularsManagement }>(
    `/api/communication/circulars/${id}/resend-reminders`,
    { method: 'POST', body: JSON.stringify({ userRole }) },
  );
}

export type EventInvitationsManagement = {
  academicYear: string;
  academicYears: string[];
  userRole: string;
  permissions: { canManage: boolean; canPublish: boolean };
  kpis: {
    totalEvents: number;
    published: number;
    upcoming: number;
    drafts: number;
    totalInvited: number;
    totalYes: number;
    avgRsvpRate: number;
    pendingRsvps: number;
  };
  events: {
    id: string;
    title: string;
    descriptionPreview: string;
    eventType: string;
    eventTypeLabel: string;
    venue: string;
    eventDate: string;
    eventTime: string;
    rsvpDeadline: string | null;
    status: string;
    audienceLabel: string;
    inviteCount: number;
    rsvpYesCount: number;
    rsvpNoCount: number;
    rsvpMaybeCount: number;
    rsvpPendingCount: number;
    rsvpResponseRate: number;
    allowGuests: boolean;
    autoRemindEnabled: boolean;
    remindDaysBefore: number;
    pushSent: boolean;
    createdBy: string;
    publishedAt: string | null;
    createdAt: string;
  }[];
  eventTypes: { value: string; label: string }[];
  audienceOptions: { value: string; label: string }[];
  workflowSteps: string[];
  complianceNotes: string[];
};

export type EventInvitationDetail = {
  event: EventInvitationsManagement['events'][0];
  detail: {
    description: string;
    classFilter: string;
    maxGuestsPerRsvp: number;
    pushCampaignId: string;
    lastReminderAt: string | null;
  };
  summary: {
    inviteCount: number;
    yesCount: number;
    noCount: number;
    maybeCount: number;
    pendingCount: number;
    totalGuests: number;
    expectedAttendance: number;
    rsvpResponseRate: number;
  };
  rsvps: {
    yes: { id: string; accountName: string; accountRole: string; response: string; guestCount: number; respondedAt: string | null; notes: string; reminderCount: number }[];
    no: { id: string; accountName: string; accountRole: string; response: string; respondedAt: string | null }[];
    maybe: { id: string; accountName: string; accountRole: string; response: string; guestCount: number; respondedAt: string | null }[];
    pending: { id: string; accountName: string; accountRole: string; response: string; reminderCount: number; lastReminderAt: string | null }[];
  };
};

export async function fetchEventInvitationsManagement(seed?: boolean, academicYear?: string, role?: string) {
  const params: Record<string, string | undefined> = { academicYear, role };
  if (seed) params.seed = '1';
  return api<EventInvitationsManagement>(`/api/communication/events${qs(params)}`);
}

export async function fetchEventInvitationDetail(id: string) {
  return api<EventInvitationDetail>(`/api/communication/events/${id}`);
}

export async function createEventDraft(payload: Record<string, unknown>) {
  return api<{ message: string; eventId: string; data: EventInvitationsManagement }>(
    '/api/communication/events',
    { method: 'POST', body: JSON.stringify(payload) },
  );
}

export async function publishEventInvitation(id: string, payload: Record<string, unknown>) {
  return api<{ message: string; eventId: string; data: EventInvitationsManagement }>(
    `/api/communication/events/${id}/publish`,
    { method: 'POST', body: JSON.stringify(payload) },
  );
}

export async function resendEventReminders(id: string, userRole: string) {
  return api<{ message: string; reminded: number; detail: EventInvitationDetail; data: EventInvitationsManagement }>(
    `/api/communication/events/${id}/resend-reminders`,
    { method: 'POST', body: JSON.stringify({ userRole }) },
  );
}

export async function processAutoEventReminders() {
  return api<{ processed: number; reminded: number; data: EventInvitationsManagement }>(
    '/api/communication/events/process-auto-reminders',
    { method: 'POST', body: JSON.stringify({}) },
  );
}

export type SurveysManagement = {
  academicYear: string;
  academicYears: string[];
  userRole: string;
  permissions: { canManage: boolean; canPublish: boolean };
  kpis: {
    totalSurveys: number;
    active: number;
    drafts: number;
    closed: number;
    totalResponses: number;
    avgResponseRate: number;
    pendingResponses: number;
  };
  surveys: {
    id: string;
    title: string;
    descriptionPreview: string;
    category: string;
    categoryLabel: string;
    status: string;
    audienceLabel: string;
    isAnonymous: boolean;
    closesAt: string | null;
    targetCount: number;
    responseCount: number;
    pendingCount: number;
    responseRate: number;
    questionCount: number;
    pushSent: boolean;
    createdBy: string;
    publishedAt: string | null;
    createdAt: string;
  }[];
  categories: { value: string; label: string }[];
  questionTypes: { value: string; label: string }[];
  audienceOptions: { value: string; label: string }[];
  workflowSteps: string[];
  complianceNotes: string[];
};

export type SurveyDetail = {
  survey: SurveysManagement['surveys'][0];
  detail: { description: string; classFilter: string; pushCampaignId: string };
  questions: {
    id: string;
    questionText: string;
    questionType: string;
    options: string[];
    isRequired: boolean;
    sortOrder: number;
  }[];
  summary: {
    targetCount: number;
    responseCount: number;
    pendingCount: number;
    responseRate: number;
  };
  analytics: {
    questionId: string;
    questionText: string;
    questionType: string;
    responseCount: number;
    averageRating?: number;
    distribution?: { value: number; count: number }[];
    yesCount?: number;
    noCount?: number;
    optionCounts?: { option: string; count: number }[];
    textResponses?: string[];
  }[];
  completed: {
    id: string;
    accountName: string;
    accountRole: string;
    submittedAt: string | null;
    answers: { questionId: string; answerText: string; answerValue: number | null; selectedOptions: unknown }[];
  }[];
  pending: { id: string; accountName: string; accountRole: string }[];
};

export async function fetchSurveysManagement(seed?: boolean, academicYear?: string, role?: string) {
  const params: Record<string, string | undefined> = { academicYear, role };
  if (seed) params.seed = '1';
  return api<SurveysManagement>(`/api/communication/surveys${qs(params)}`);
}

export async function fetchSurveyDetail(id: string) {
  return api<SurveyDetail>(`/api/communication/surveys/${id}`);
}

export async function createSurveyDraft(payload: Record<string, unknown>) {
  return api<{ message: string; surveyId: string; data: SurveysManagement }>(
    '/api/communication/surveys',
    { method: 'POST', body: JSON.stringify(payload) },
  );
}

export async function publishSurvey(id: string, payload: Record<string, unknown>) {
  return api<{ message: string; surveyId: string; data: SurveysManagement }>(
    `/api/communication/surveys/${id}/publish`,
    { method: 'POST', body: JSON.stringify(payload) },
  );
}

export async function closeSurvey(id: string, userRole: string) {
  return api<{ message: string; data: SurveysManagement }>(
    `/api/communication/surveys/${id}/close`,
    { method: 'POST', body: JSON.stringify({ userRole }) },
  );
}

export async function resendSurveyReminders(id: string, userRole: string) {
  return api<{ message: string; reminded: number; detail: SurveyDetail; data: SurveysManagement }>(
    `/api/communication/surveys/${id}/resend-reminders`,
    { method: 'POST', body: JSON.stringify({ userRole }) },
  );
}

export type AutomationRule = {
  id: string;
  key: string;
  name: string;
  description: string;
  triggerType: string;
  triggerLabel: string;
  sourceModule: string;
  channel: string;
  channelFallback: string[];
  templateCode: string;
  templateBody: string;
  cronTime: string;
  offsetDays: number;
  isActive: boolean;
  lastRunAt: string | null;
  lastRunStatus: string;
  lastRecipientsCount: number;
  academicYear: string;
  updatedAt: string;
};

export type AutoRemindersManagement = {
  academicYear: string;
  academicYears: string[];
  userRole: string;
  permissions: { canManage: boolean; canRun: boolean };
  kpis: {
    totalRules: number;
    activeRules: number;
    inactiveRules: number;
    runsToday: number;
    queued: number;
    sent: number;
    failed: number;
  };
  rules: AutomationRule[];
  triggerTypes: { value: string; label: string; module: string; description: string }[];
  channelOptions: string[];
  recentRuns: {
    id: string;
    automationName: string;
    triggerType: string;
    runAt: string;
    status: string;
    recipientsFound: number;
    dispatchedCount: number;
    failedCount: number;
    durationMs: number;
    logSummary: string;
  }[];
  recentQueue: {
    id: string;
    automationName: string;
    channel: string;
    recipientName: string;
    recipientMobile: string;
    status: string;
    failoverUsed: boolean;
    queuedAt: string;
    sentAt: string | null;
  }[];
  workflowSteps: string[];
  erpIntegrations: string[];
};

export async function fetchAutoRemindersManagement(seed?: boolean, academicYear?: string, role?: string) {
  const params: Record<string, string | undefined> = { academicYear, role };
  if (seed) params.seed = '1';
  return api<AutoRemindersManagement>(`/api/communication/auto-reminders${qs(params)}`);
}

export async function updateAutomationRule(id: string, payload: Record<string, unknown>) {
  return api<{ message: string; data: AutoRemindersManagement }>(
    `/api/communication/auto-reminders/${id}`,
    { method: 'PUT', body: JSON.stringify(payload) },
  );
}

export async function toggleAutomationRule(id: string, isActive: boolean, userRole: string) {
  return api<{ message: string; isActive: boolean; data: AutoRemindersManagement }>(
    `/api/communication/auto-reminders/${id}/toggle`,
    { method: 'POST', body: JSON.stringify({ isActive, userRole }) },
  );
}

export async function runAutomationRule(id: string, userRole: string) {
  return api<{
    message: string;
    runId: string;
    recipientsFound: number;
    dispatchedCount: number;
    failedCount: number;
    durationMs: number;
    status: string;
    data: AutoRemindersManagement;
  }>(
    `/api/communication/auto-reminders/${id}/run`,
    { method: 'POST', body: JSON.stringify({ userRole }) },
  );
}

export async function runAllAutomations(userRole: string) {
  return api<{
    message: string;
    processed: number;
    results: { automationId: string; name: string; message: string; status: string }[];
    data: AutoRemindersManagement;
  }>(
    '/api/communication/auto-reminders/run-all',
    { method: 'POST', body: JSON.stringify({ userRole }) },
  );
}

export type MessageAuditLog = {
  id: string;
  logRef: string;
  timestamp: string;
  direction: string;
  channel: string;
  sender: string;
  recipientName: string;
  contactIdentifier: string;
  contactType: string;
  messageSnippet: string;
  status: string;
  statusBucket: string;
  cost: number | null;
  costLabel: string;
  studentName: string;
  admissionNumber: string;
  className: string;
  sourceModule: string;
  retainedUntil: string;
  hasError: boolean;
};

export type MessageHistoryManagement = {
  academicYear: string;
  academicYears: string[];
  userRole: string;
  permissions: {
    canFullSearch: boolean;
    canExport: boolean;
    canViewPayload: boolean;
    canViewCosts: boolean;
    isImmutable: boolean;
    retentionYears: number;
    helpdeskRequiresStudent: boolean;
  };
  filters: {
    channel: string;
    status: string;
    direction: string;
    contact: string;
    studentId: string;
    admissionNumber: string;
    studentName: string;
    dateFrom: string;
    dateTo: string;
  };
  kpis: {
    totalLogs: number;
    pageTotal: number;
    successCount: number;
    failedCount: number;
    queuedCount: number;
    inboundCount: number;
    totalCost: number | null;
  };
  channelBreakdown: { channel: string; count: number }[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
  logs: MessageAuditLog[];
  channelOptions: string[];
  statusOptions: string[];
  directionOptions: string[];
  complianceNotes: string[];
};

export type MessageAuditDetail = {
  log: MessageAuditLog & {
    contactIdentifierFull: string;
    studentId: string;
    sourceRecordId: string;
    errorDetail: string;
    gatewayPayload: unknown;
    gatewayResponse: unknown;
    createdAt: string;
    isImmutable: boolean;
  };
  compliance: { retentionYears: number; message: string };
};

export type MessageHistorySearchParams = {
  academicYear?: string;
  role?: string;
  channel?: string;
  status?: string;
  direction?: string;
  contact?: string;
  studentId?: string;
  admissionNumber?: string;
  studentName?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
  seed?: boolean;
};

export async function fetchMessageHistory(params: MessageHistorySearchParams = {}) {
  const { seed, ...rest } = params;
  const q: Record<string, string | undefined> = {
    academicYear: rest.academicYear,
    role: rest.role,
    channel: rest.channel,
    status: rest.status,
    direction: rest.direction,
    contact: rest.contact,
    studentId: rest.studentId,
    admissionNumber: rest.admissionNumber,
    studentName: rest.studentName,
    dateFrom: rest.dateFrom,
    dateTo: rest.dateTo,
    page: rest.page != null ? String(rest.page) : undefined,
    limit: rest.limit != null ? String(rest.limit) : undefined,
  };
  if (seed) q.seed = '1';
  return api<MessageHistoryManagement>(`/api/communication/message-history${qs(q)}`);
}

export async function fetchMessageAuditDetail(id: string, role?: string) {
  return api<MessageAuditDetail>(`/api/communication/message-history/${id}${qs({ role })}`);
}

export async function exportMessageHistory(params: MessageHistorySearchParams = {}) {
  const q: Record<string, string | undefined> = {
    academicYear: params.academicYear,
    role: params.role,
    channel: params.channel,
    status: params.status,
    direction: params.direction,
    contact: params.contact,
    studentId: params.studentId,
    admissionNumber: params.admissionNumber,
    studentName: params.studentName,
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
  };
  return api<{ message: string; rowCount: number; filename: string; csv: string }>(
    `/api/communication/message-history/export${qs(q)}`,
  );
}

export type CommReportPreview = {
  reportTemplate: string;
  reportName: string;
  description: string;
  columns: string[];
  rows: Record<string, string | number>[];
  rowCount: number;
  summary: Record<string, string | number>;
  filters: Record<string, string>;
  generatedAt: string;
};

export type CommunicationReportsAnalytics = {
  academicYear: string;
  academicYears: string[];
  userRole: string;
  permissions: { canExport: boolean; canSchedule: boolean; canViewCosts: boolean };
  reportTree: {
    mis: { label: string; reports: { id: string; name: string; description: string }[] };
    engagement: { label: string; reports: { id: string; name: string; description: string }[] };
    bottlenecks: { label: string; reports: { id: string; name: string; description: string }[] };
  };
  exportFormats: string[];
  channelOptions: string[];
  defaultFilters: { dateFrom?: string; dateTo?: string; academicYear?: string };
  kpis: {
    totalGatewayCost: number;
    totalMessages: number;
    deliveryRate: number;
    failedCount: number;
    reportsGenerated: number;
    activeSchedules: number;
    openGatewayAlerts: number;
  };
  charts: {
    expenseTrend: { month: string; cost: number }[];
    engagementFunnel: { stage: string; value: number; color: string }[];
    channelPerformance: { channel: string; sent: number; cost: number; deliveryRate: number }[];
  };
  bottlenecks: { id: string; channel: string; severity: string; message: string; createdAt: string }[];
  schedules: {
    id: string;
    reportTemplate: string;
    reportName: string;
    frequency: string;
    channel: string;
    recipients: string;
    cronExpr: string;
    status: string;
    lastRunAt: string | null;
    nextRunAt: string | null;
    createdBy: string;
  }[];
  recentRuns: {
    id: string;
    reportName: string;
    reportTemplate: string;
    rowCount: number;
    exportFormat: string;
    performedBy: string;
    relativeTime: string;
    status: string;
  }[];
  dashboardPreview: Record<string, string | number>[];
  automationNotes: string[];
  developerNotes: string[];
};

export async function fetchCommunicationReports(seed?: boolean, academicYear?: string, role?: string) {
  const params: Record<string, string | undefined> = { academicYear, role };
  if (seed) params.seed = '1';
  return api<CommunicationReportsAnalytics>(`/api/communication/reports${qs(params)}`);
}

export async function generateCommunicationReport(templateId: string, filters: Record<string, unknown>, userRole?: string) {
  return api<CommReportPreview>('/api/communication/reports/generate', {
    method: 'POST',
    body: JSON.stringify({ templateId, filters, userRole, performedBy: userRole }),
  });
}

export async function exportCommunicationReport(
  templateId: string,
  format: string,
  filters: Record<string, unknown>,
  userRole?: string,
) {
  return api<{
    message: string;
    format: string;
    fileName: string;
    mimeType: string;
    rowCount: number;
    content: string;
    preview: CommReportPreview;
  }>('/api/communication/reports/export', {
    method: 'POST',
    body: JSON.stringify({ templateId, format, filters, userRole, performedBy: userRole }),
  });
}

export async function scheduleCommunicationReport(payload: Record<string, unknown>) {
  return api<{ message: string; data: CommunicationReportsAnalytics }>(
    '/api/communication/reports/schedule',
    { method: 'POST', body: JSON.stringify(payload) },
  );
}

export async function deleteCommunicationReportSchedule(id: string) {
  return api<{ message: string; data: CommunicationReportsAnalytics }>(
    `/api/communication/reports/schedule/${id}`,
    { method: 'DELETE' },
  );
}
