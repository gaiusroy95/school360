import { Prisma } from '@prisma/client';
import { prisma } from './prisma.js';

const ACADEMIC_YEARS = ['2023-24', '2024-25', '2025-26', '2026-27'];
const CHANNELS = ['SMS', 'EMAIL', 'WHATSAPP'] as const;
type Channel = (typeof CHANNELS)[number];

const INSTITUTION_ROLES = new Set(['Super Admin', 'Principal', 'Management', 'Admin', 'Communication Manager']);
const TEACHER_ROLES = new Set(['Teacher', 'Class Teacher']);

const SMS_MAX_CHARS = 160;
const EMAIL_MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;
const WHATSAPP_MAX_ATTACHMENT_BYTES = 16 * 1024 * 1024;

const MERGE_TAGS = [
  { tag: '{{Student_Name}}', label: 'Student Name', field: 'studentName' },
  { tag: '{{Class_Name}}', label: 'Class', field: 'className' },
  { tag: '{{Section_Name}}', label: 'Section', field: 'sectionName' },
  { tag: '{{Father_Name}}', label: 'Father Name', field: 'fatherName' },
  { tag: '{{Mother_Name}}', label: 'Mother Name', field: 'motherName' },
  { tag: '{{Fee_Amount}}', label: 'Fee Amount', field: 'feeAmount' },
  { tag: '{{Due_Date}}', label: 'Due Date', field: 'dueDate' },
  { tag: '{{School_Name}}', label: 'School Name', field: 'schoolName' },
];

const DND_REGISTRY = new Set(['9876500000', '9123400000', '9988770000']);

const TRANSLATION_PHRASES: Record<string, Record<string, string>> = {
  hi: {
    'Dear Parent': 'प्रिय अभिभावक',
    'Fee Payment Reminder': 'शुल्क भुगतान अनुस्मारक',
    'Thank you': 'धन्यवाद',
    'School': 'विद्यालय',
  },
  ta: {
    'Dear Parent': 'அன்புள்ள பெற்றோரே',
    'Fee Payment Reminder': 'கட்டணம் செலுத்தும் நினைவூட்டல்',
    'Thank you': 'நன்றி',
    'School': 'பள்ளி',
  },
  te: {
    'Dear Parent': 'ప్రియమైన తల్లిదండ్రులారా',
    'Fee Payment Reminder': 'ఫీజు చెల్లింపు రిమైండర్',
    'Thank you': 'ధన్యవాదాలు',
    'School': 'పాఠశాల',
  },
};

export type AudienceNode = {
  key: string;
  label: string;
  type: 'group' | 'class' | 'section' | 'hostel' | 'route' | 'role' | 'filter';
  count?: number;
  disabled?: boolean;
  children?: AudienceNode[];
};

export type ComposeAttachmentInput = {
  fileName: string;
  fileUrl?: string;
  fileSize: number;
  mimeType?: string;
};

export type ComposePayload = {
  channel: Channel;
  subject?: string;
  bodyPlain: string;
  bodyHtml?: string;
  recipientKeys: string[];
  audienceFilters?: {
    minFeeDue?: number;
    defaultersOnly?: boolean;
    parentType?: 'FATHER' | 'MOTHER' | 'BOTH';
  };
  attachments?: ComposeAttachmentInput[];
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

type ResolvedRecipient = {
  studentId: string;
  recipientName: string;
  mobile: string;
  email: string;
  preferredLanguage: string;
  mergeData: Record<string, string>;
};

function canBypassApproval(userRole: string) {
  return INSTITUTION_ROLES.has(userRole);
}

function requiresSmsApproval(userRole: string, channel: string) {
  return channel === 'SMS' && TEACHER_ROLES.has(userRole);
}

function formatInr(amount: number) {
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}

function formatDate(d: Date) {
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function applyMergeTags(template: string, data: Record<string, string>) {
  let out = template;
  for (const { tag, field } of MERGE_TAGS) {
    out = out.split(tag).join(data[field] ?? '');
  }
  return out;
}

function extractMergeTags(text: string) {
  const matches = text.match(/\{\{[A-Za-z_]+\}\}/g) ?? [];
  return [...new Set(matches)];
}

function translateText(text: string, lang: string) {
  if (!lang || lang === 'en') return text;
  const dict = TRANSLATION_PHRASES[lang];
  if (!dict) return text;
  let out = text;
  for (const [en, translated] of Object.entries(dict)) {
    out = out.replace(new RegExp(en, 'gi'), translated);
  }
  return out;
}

function isDndNumber(mobile: string) {
  const digits = mobile.replace(/\D/g, '');
  return DND_REGISTRY.has(digits) || digits.endsWith('0000');
}

function attachmentLimit(channel: Channel) {
  if (channel === 'WHATSAPP') return WHATSAPP_MAX_ATTACHMENT_BYTES;
  if (channel === 'EMAIL') return EMAIL_MAX_ATTACHMENT_BYTES;
  return 0;
}

async function logActivity(
  institutionId: string,
  action: string,
  details: string,
  snapshot: Record<string, unknown> = {},
  performedBy = 'Communication Manager',
) {
  await prisma.commActivityLog.create({
    data: { institutionId, action, details, filterSnapshot: snapshot as Prisma.InputJsonValue, performedBy },
  });
}

async function nextMessageCode(institutionId: string, academicYear: string) {
  const year = academicYear.split('-')[0] ?? '2025';
  const count = await prisma.commMessageHeader.count({ where: { institutionId, academicYear } });
  return `MSG-${year}-${String(count + 1).padStart(4, '0')}`;
}

async function getSchoolName(institutionId: string) {
  const inst = await prisma.institution.findUnique({ where: { id: institutionId }, select: { name: true } });
  return inst?.name ?? 'School ERP';
}

function teacherClassFilter(classScope: string): Prisma.StudentWhereInput {
  const [cls, sec] = classScope.split('-');
  if (!cls) return {};
  if (sec) return { className: cls, sectionName: sec };
  return { className: cls };
}

function teacherSectionFilter(classScope: string): { className?: string; sectionName?: string } {
  const [cls, sec] = classScope.split('-');
  if (!cls) return {};
  if (sec) return { className: cls, sectionName: sec };
  return { className: cls };
}

async function buildAudienceTree(
  institutionId: string,
  academicYear: string,
  userRole: string,
  classScope: string,
): Promise<AudienceNode[]> {
  const isTeacher = TEACHER_ROLES.has(userRole) && !INSTITUTION_ROLES.has(userRole);

  const [sections, hostels, routes, groups] = await Promise.all([
    prisma.academicClassSection.findMany({
      where: { institutionId, academicYear, isActive: true, ...(isTeacher ? teacherSectionFilter(classScope) : {}) },
      orderBy: [{ className: 'asc' }, { sectionName: 'asc' }],
    }),
    prisma.hostelMaster.findMany({ where: { institutionId }, select: { id: true, hostelName: true } }),
    prisma.transportRoute.findMany({ where: { institutionId, academicYear }, select: { id: true, routeName: true } }),
    prisma.commRecipientGroup.findMany({ where: { institutionId, academicYear }, orderBy: { groupName: 'asc' } }),
  ]);

  const classMap = new Map<string, AudienceNode>();
  for (const s of sections) {
    const classKey = `class:${s.className}`;
    if (!classMap.has(classKey)) {
      classMap.set(classKey, { key: classKey, label: `Class ${s.className}`, type: 'class', children: [] });
    }
    const secKey = `section:${s.className}-${s.sectionName}`;
    const studentCount = await prisma.student.count({
      where: { institutionId, academicYear, status: 'ACTIVE', className: s.className, sectionName: s.sectionName },
    });
    classMap.get(classKey)!.children!.push({
      key: secKey,
      label: `Section ${s.sectionName}`,
      type: 'section',
      count: studentCount,
    });
  }

  const classNodes = [...classMap.values()].map((c) => ({
    ...c,
    count: c.children?.reduce((sum, ch) => sum + (ch.count ?? 0), 0) ?? 0,
  }));

  const hostelNodes: AudienceNode[] = await Promise.all(
    hostels.map(async (h) => {
      const count = await prisma.hostelStudentProfile.count({
        where: { institutionId, academicYear, hostelId: h.id, residentStatus: 'ACTIVE' },
      });
      return { key: `hostel:${h.id}`, label: h.hostelName, type: 'hostel' as const, count };
    }),
  );

  const routeNodes: AudienceNode[] = await Promise.all(
    routes.map(async (r) => {
      const count = await prisma.transportStudentEnrollment.count({
        where: { institutionId, academicYear, routeId: r.id, status: 'ACTIVE' },
      });
      return { key: `route:${r.id}`, label: r.routeName, type: 'route' as const, count };
    }),
  );

  const groupNodes: AudienceNode[] = groups.map((g) => ({
    key: `group:${g.groupCode}`,
    label: g.groupName,
    type: 'group' as const,
    count: g.memberCount,
    disabled: isTeacher && g.audienceScope === 'INSTITUTION',
  }));

  const filterNodes: AudienceNode[] = [
    { key: 'filter:defaulters_500', label: 'Defaulters with > ₹500 due', type: 'filter', count: 0 },
    { key: 'filter:defaulters_all', label: 'All Fee Defaulters', type: 'filter', count: 0 },
    { key: 'filter:parents_all', label: 'All Parents (Institution)', type: 'filter', count: 0, disabled: isTeacher },
  ];

  const [def500, defAll, allParents] = await Promise.all([
    countDefaulters(institutionId, academicYear, 500, isTeacher ? classScope : undefined),
    countDefaulters(institutionId, academicYear, 0, isTeacher ? classScope : undefined),
    prisma.student.count({ where: { institutionId, academicYear, status: 'ACTIVE', ...(isTeacher ? teacherClassFilter(classScope) : {}) } }),
  ]);
  filterNodes[0].count = def500;
  filterNodes[1].count = defAll;
  filterNodes[2].count = allParents;

  const tree: AudienceNode[] = [
    { key: 'roles', label: 'Roles & Groups', type: 'role', children: groupNodes },
    { key: 'classes', label: 'Classes & Sections', type: 'class', children: classNodes },
  ];

  if (!isTeacher) {
    tree.push(
      { key: 'hostels', label: 'Hostels', type: 'hostel', children: hostelNodes },
      { key: 'transport', label: 'Transport Routes', type: 'route', children: routeNodes },
    );
  }
  tree.push({ key: 'filters', label: 'Smart Filters', type: 'filter', children: filterNodes });

  return tree;
}

async function countDefaulters(institutionId: string, academicYear: string, minAmount: number, classScope?: string) {
  const students = await prisma.student.findMany({
    where: {
      institutionId,
      academicYear,
      status: 'ACTIVE',
      ...(classScope ? teacherClassFilter(classScope) : {}),
    },
    select: { id: true },
  });
  const ids = students.map((s) => s.id);
  if (ids.length === 0) return 0;

  const dues = await prisma.feeDue.groupBy({
    by: ['studentId'],
    where: { institutionId, academicYear, status: 'PENDING', studentId: { in: ids } },
    _sum: { amount: true },
  });

  return dues.filter((d) => (d._sum.amount ?? 0) > minAmount).length;
}

async function getStudentFeeInfo(institutionId: string, studentId: string, academicYear: string) {
  const dues = await prisma.feeDue.findMany({
    where: { institutionId, studentId, academicYear, status: 'PENDING' },
    orderBy: { dueDate: 'asc' },
  });
  const total = dues.reduce((s, d) => s + d.amount, 0);
  const earliest = dues[0]?.dueDate;
  return { total, dueDate: earliest ? formatDate(earliest) : '' };
}

async function resolveRecipients(
  institutionId: string,
  academicYear: string,
  recipientKeys: string[],
  filters: ComposePayload['audienceFilters'],
  userRole: string,
  classScope: string,
): Promise<ResolvedRecipient[]> {
  const isTeacher = TEACHER_ROLES.has(userRole) && !INSTITUTION_ROLES.has(userRole);
  const schoolName = await getSchoolName(institutionId);
  const map = new Map<string, ResolvedRecipient>();

  const addStudent = async (student: {
    id: string;
    firstName: string;
    lastName: string;
    className: string;
    sectionName: string;
    fatherName: string;
    fatherMobile: string;
    motherName: string;
    motherMobile: string;
    email: string;
    mobile: string;
  }) => {
    const fee = await getStudentFeeInfo(institutionId, student.id, academicYear);
    if (filters?.defaultersOnly && fee.total <= 0) return;
    if (filters?.minFeeDue && fee.total < filters.minFeeDue) return;

    const studentName = `${student.firstName} ${student.lastName}`.trim();
    const mergeData: Record<string, string> = {
      studentName,
      className: student.className,
      sectionName: student.sectionName,
      fatherName: student.fatherName || 'Parent',
      motherName: student.motherName || 'Parent',
      feeAmount: fee.total > 0 ? formatInr(fee.total) : '₹0',
      dueDate: fee.dueDate,
      schoolName,
    };

    const parentType = filters?.parentType ?? 'BOTH';
    const targets: { name: string; mobile: string; email: string; type: string }[] = [];
    if (parentType !== 'MOTHER' && student.fatherName) {
      targets.push({ name: student.fatherName, mobile: student.fatherMobile, email: student.email, type: 'FATHER' });
    }
    if (parentType !== 'FATHER' && student.motherName) {
      targets.push({ name: student.motherName, mobile: student.motherMobile, email: student.email, type: 'MOTHER' });
    }
    if (targets.length === 0) {
      targets.push({ name: studentName, mobile: student.mobile || student.fatherMobile, email: student.email, type: 'PARENT' });
    }

    for (const t of targets) {
      const key = `${student.id}:${t.type}`;
      if (!map.has(key)) {
        map.set(key, {
          studentId: student.id,
          recipientName: t.name,
          mobile: t.mobile,
          email: t.email,
          preferredLanguage: 'en',
          mergeData,
        });
      }
    }
  };

  const studentWhere: Prisma.StudentWhereInput = {
    institutionId,
    academicYear,
    status: 'ACTIVE',
    ...(isTeacher ? teacherClassFilter(classScope) : {}),
  };

  for (const key of recipientKeys) {
    if (key.startsWith('section:')) {
      const [, scope] = key.split(':');
      const [cls, sec] = (scope ?? '').split('-');
      const students = await prisma.student.findMany({
        where: { ...studentWhere, className: cls, sectionName: sec },
      });
      for (const s of students) await addStudent(s);
    } else if (key.startsWith('class:')) {
      const cls = key.replace('class:', '');
      const students = await prisma.student.findMany({ where: { ...studentWhere, className: cls } });
      for (const s of students) await addStudent(s);
    } else if (key.startsWith('hostel:')) {
      if (isTeacher) continue;
      const hostelId = key.replace('hostel:', '');
      const profiles = await prisma.hostelStudentProfile.findMany({
        where: { institutionId, academicYear, hostelId, residentStatus: 'ACTIVE' },
        include: { student: true },
      });
      for (const p of profiles) {
        if (p.student) await addStudent(p.student);
      }
    } else if (key.startsWith('route:')) {
      if (isTeacher) continue;
      const routeId = key.replace('route:', '');
      const enrollments = await prisma.transportStudentEnrollment.findMany({
        where: { institutionId, academicYear, routeId, status: 'ACTIVE' },
        include: { student: true },
      });
      for (const e of enrollments) {
        if (e.student) await addStudent(e.student);
      }
    } else if (key.startsWith('group:')) {
      const code = key.replace('group:', '');
      if (code === 'ALL_PARENTS' || code === 'ALL_STUDENTS') {
        const students = await prisma.student.findMany({ where: studentWhere });
        for (const s of students) await addStudent(s);
      } else if (code.startsWith('CLASS_')) {
        const match = code.match(/CLASS_(\d+)([A-Z])?/);
        if (match) {
          const cls = match[1];
          const sec = match[2] ?? '';
          const students = await prisma.student.findMany({
            where: { ...studentWhere, className: cls, ...(sec ? { sectionName: sec } : {}) },
          });
          for (const s of students) await addStudent(s);
        }
      }
    } else if (key === 'filter:defaulters_500') {
      const students = await prisma.student.findMany({ where: studentWhere });
      for (const s of students) await addStudent(s);
      // filter applied in addStudent via minFeeDue
      const filtered = [...map.values()].filter((r) => {
        const amt = parseFloat((r.mergeData.feeAmount ?? '0').replace(/[^\d.]/g, '')) || 0;
        return amt > 500;
      });
      map.clear();
      for (const r of filtered) map.set(`${r.studentId}:${r.recipientName}`, r);
    } else if (key === 'filter:defaulters_all') {
      const students = await prisma.student.findMany({ where: studentWhere });
      for (const s of students) await addStudent(s);
      const filtered = [...map.values()].filter((r) => {
        const amt = parseFloat((r.mergeData.feeAmount ?? '0').replace(/[^\d.]/g, '')) || 0;
        return amt > 0;
      });
      map.clear();
      for (const r of filtered) map.set(`${r.studentId}:${r.recipientName}`, r);
    } else if (key === 'filter:parents_all') {
      const students = await prisma.student.findMany({ where: studentWhere });
      for (const s of students) await addStudent(s);
    }
  }

  if (filters?.minFeeDue) {
    return [...map.values()].filter((r) => {
      const amt = parseFloat((r.mergeData.feeAmount ?? '0').replace(/[^\d.]/g, '')) || 0;
      return amt >= filters.minFeeDue!;
    });
  }
  if (filters?.defaultersOnly) {
    return [...map.values()].filter((r) => {
      const amt = parseFloat((r.mergeData.feeAmount ?? '0').replace(/[^\d.]/g, '')) || 0;
      return amt > 0;
    });
  }

  return [...map.values()];
}

function validatePayload(payload: ComposePayload, recipientCount: number) {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!payload.channel || !CHANNELS.includes(payload.channel)) {
    errors.push('Valid channel (SMS, EMAIL, WHATSAPP) is required.');
  }
  if (!payload.bodyPlain?.trim()) {
    errors.push('Message body is required.');
  }
  if (!payload.recipientKeys?.length) {
    errors.push('At least one recipient group must be selected.');
  }
  if (recipientCount < 1) {
    errors.push('No recipients match the selected audience and filters.');
  }

  if (payload.channel === 'SMS') {
    const len = payload.bodyPlain.length;
    if (len > SMS_MAX_CHARS) {
      errors.push(`SMS body exceeds ${SMS_MAX_CHARS} characters (${len} chars).`);
    }
    if (payload.attachments?.length) {
      errors.push('SMS does not support attachments.');
    }
  }

  if (payload.channel === 'EMAIL' && !payload.subject?.trim()) {
    warnings.push('Email subject is empty — deliverability may be affected.');
  }

  const limit = attachmentLimit(payload.channel);
  for (const att of payload.attachments ?? []) {
    if (limit > 0 && att.fileSize > limit) {
      const mb = Math.round(limit / (1024 * 1024));
      errors.push(`Attachment "${att.fileName}" exceeds ${mb}MB limit for ${payload.channel}.`);
    }
  }

  if (payload.scheduleAt) {
    const sched = new Date(payload.scheduleAt);
    if (sched.getTime() < Date.now() - 60000) {
      errors.push('Schedule time must be in the future.');
    }
  }

  const tags = extractMergeTags(payload.bodyPlain + (payload.bodyHtml ?? ''));
  const known = new Set(MERGE_TAGS.map((t) => t.tag));
  for (const t of tags) {
    if (!known.has(t)) warnings.push(`Unknown merge tag: ${t}`);
  }

  return { errors, warnings, mergeTagsFound: tags, charCount: payload.bodyPlain.length };
}

export async function getComposeMessageManagement(
  institutionId: string,
  opts: { academicYear?: string; userRole?: string; classScope?: string; performedBy?: string } = {},
) {
  const academicYear = opts.academicYear ?? '2025-26';
  const userRole = opts.userRole ?? 'Principal';
  const classScope = opts.classScope ?? '10-A';

  const [audienceTree, templates, recentMessages, pendingApprovals, institution] = await Promise.all([
    buildAudienceTree(institutionId, academicYear, userRole, classScope),
    prisma.commMessageTemplate.findMany({
      where: { institutionId, academicYear, isActive: true, gatewayStatus: 'APPROVED' },
      include: { variables: { orderBy: { sortOrder: 'asc' } } },
      orderBy: { templateName: 'asc' },
    }),
    prisma.commMessageHeader.findMany({
      where: { institutionId, academicYear },
      orderBy: { createdAt: 'desc' },
      take: 8,
      include: { _count: { select: { recipients: true, attachments: true } } },
    }),
    prisma.commMessageHeader.findMany({
      where: { institutionId, status: 'PENDING_APPROVAL' },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
    prisma.institution.findUnique({ where: { id: institutionId }, select: { name: true } }),
  ]);

  return {
    academicYear,
    academicYears: ACADEMIC_YEARS,
    userRole,
    classScope,
    schoolName: institution?.name ?? 'School ERP',
    canBypassApproval: canBypassApproval(userRole),
    requiresSmsApproval: requiresSmsApproval(userRole, 'SMS'),
    permissions: {
      canComposeToAll: canBypassApproval(userRole),
      canSendSms: true,
      smsNeedsApproval: TEACHER_ROLES.has(userRole) && !canBypassApproval(userRole),
      canSchedule: true,
      canAttachFiles: true,
    },
    channels: CHANNELS.map((c) => ({
      code: c,
      label: c === 'EMAIL' ? 'Email' : c === 'WHATSAPP' ? 'WhatsApp' : 'SMS',
      maxChars: c === 'SMS' ? SMS_MAX_CHARS : null,
      maxAttachmentBytes: attachmentLimit(c) || null,
    })),
    mergeTags: MERGE_TAGS,
    audienceTree,
    templates: templates.map((t) => ({
      id: t.id,
      code: t.templateCode,
      name: t.templateName,
      channel: t.channel,
      subject: t.subject,
      body: t.body,
      mergeTags: t.mergeTags,
    })),
    recentMessages: recentMessages.map((m) => ({
      id: m.id,
      code: m.messageCode,
      channel: m.channel,
      status: m.status,
      recipientCount: m.recipientCount,
      createdAt: m.createdAt.toISOString(),
      preview: m.bodyPlain.slice(0, 80),
    })),
    pendingApprovals: pendingApprovals.map((m) => ({
      id: m.id,
      code: m.messageCode,
      channel: m.channel,
      createdBy: m.createdBy,
      recipientCount: m.recipientCount,
      preview: m.bodyPlain.slice(0, 100),
      createdAt: m.createdAt.toISOString(),
    })),
    validationRules: {
      smsMaxChars: SMS_MAX_CHARS,
      emailMaxAttachmentMb: 5,
      whatsappMaxAttachmentMb: 16,
      scheduleMustBeFuture: true,
      dndScrubEnabled: true,
    },
    queueProviders: ['RABBITMQ', 'KAFKA'],
    languages: [
      { code: 'en', label: 'English' },
      { code: 'hi', label: 'Hindi' },
      { code: 'ta', label: 'Tamil' },
      { code: 'te', label: 'Telugu' },
    ],
  };
}

export async function previewComposeMessage(institutionId: string, payload: ComposePayload) {
  const academicYear = payload.academicYear ?? '2025-26';
  const userRole = payload.userRole ?? 'Principal';
  const classScope = payload.classScope ?? '10-A';

  const recipients = await resolveRecipients(
    institutionId,
    academicYear,
    payload.recipientKeys ?? [],
    payload.audienceFilters,
    userRole,
    classScope,
  );

  const validation = validatePayload(payload, recipients.length);
  const sample = recipients[0];
  let previewBody = payload.bodyPlain;
  if (sample) {
    previewBody = applyMergeTags(payload.bodyPlain, sample.mergeData);
    if (payload.translateEnabled && payload.targetLanguage) {
      previewBody = translateText(previewBody, payload.targetLanguage);
    }
  }

  const dndCount = recipients.filter((r) => isDndNumber(r.mobile)).length;
  const effectiveCount = recipients.length - dndCount;

  return {
    validation: { ...validation, dndSkipped: dndCount, effectiveRecipients: effectiveCount },
    recipientCount: recipients.length,
    effectiveRecipients: effectiveCount,
    preview: {
      subject: payload.subject ?? '',
      body: previewBody,
      bodyHtml: payload.bodyHtml ? applyMergeTags(payload.bodyHtml, sample?.mergeData ?? {}) : '',
      sampleRecipient: sample
        ? { name: sample.recipientName, mobile: sample.mobile, email: sample.email }
        : null,
    },
    requiresApproval: requiresSmsApproval(userRole, payload.channel),
    canSendNow: validation.errors.length === 0 && canBypassApproval(userRole),
  };
}

export async function submitComposeMessage(institutionId: string, payload: ComposePayload) {
  const academicYear = payload.academicYear ?? '2025-26';
  const userRole = payload.userRole ?? 'Principal';
  const classScope = payload.classScope ?? '10-A';
  const createdBy = payload.createdBy ?? 'Communication Manager';

  const recipients = await resolveRecipients(
    institutionId,
    academicYear,
    payload.recipientKeys ?? [],
    payload.audienceFilters,
    userRole,
    classScope,
  );

  const validation = validatePayload(payload, recipients.length);
  if (validation.errors.length > 0) {
    throw new Error(validation.errors.join(' '));
  }

  const messageCode = await nextMessageCode(institutionId, academicYear);
  const needsApproval = requiresSmsApproval(userRole, payload.channel);
  const scheduleAt = payload.scheduleAt ? new Date(payload.scheduleAt) : null;

  let status = 'DRAFT';
  if (needsApproval && !canBypassApproval(userRole)) {
    status = 'PENDING_APPROVAL';
  } else if (scheduleAt && scheduleAt.getTime() > Date.now()) {
    status = 'SCHEDULED';
  } else if (payload.sendNow) {
    status = 'QUEUED';
  }

  const dndSkipped = recipients.filter((r) => isDndNumber(r.mobile)).length;

  const header = await prisma.commMessageHeader.create({
    data: {
      institutionId,
      messageCode,
      channel: payload.channel,
      subject: payload.subject ?? '',
      bodyHtml: payload.bodyHtml ?? '',
      bodyPlain: payload.bodyPlain,
      recipientGroups: payload.recipientKeys as Prisma.InputJsonValue,
      audienceFilters: (payload.audienceFilters ?? {}) as Prisma.InputJsonValue,
      recipientCount: recipients.length,
      status,
      requiresApproval: needsApproval,
      scheduleAt,
      translateEnabled: payload.translateEnabled ?? false,
      targetLanguage: payload.targetLanguage ?? '',
      dndSkippedCount: dndSkipped,
      createdBy,
      userRole,
      academicYear,
      ...(status === 'QUEUED'
        ? {
            queuedAt: new Date(),
            queueRef: `rabbitmq://comm.dispatch/${messageCode}`,
            queueProvider: 'RABBITMQ',
          }
        : {}),
    },
  });

  if (payload.attachments?.length) {
    await prisma.commMessageAttachment.createMany({
      data: payload.attachments.map((a) => ({
        institutionId,
        headerId: header.id,
        fileName: a.fileName,
        fileUrl: a.fileUrl ?? '',
        fileSize: a.fileSize,
        mimeType: a.mimeType ?? '',
      })),
    });
  }

  const recipientRows = recipients.map((r) => {
    const dnd = isDndNumber(r.mobile);
    let body = applyMergeTags(payload.bodyPlain, r.mergeData);
    if (payload.translateEnabled && r.preferredLanguage !== 'en') {
      body = translateText(body, r.preferredLanguage);
    } else if (payload.translateEnabled && payload.targetLanguage) {
      body = translateText(body, payload.targetLanguage);
    }
    return {
      institutionId,
      headerId: header.id,
      studentId: r.studentId,
      recipientType: 'PARENT',
      recipientName: r.recipientName,
      mobile: r.mobile,
      email: r.email,
      preferredLanguage: r.preferredLanguage,
      mergeData: r.mergeData as Prisma.InputJsonValue,
      personalizedBody: body,
      status: dnd ? 'DND_SKIPPED' : status === 'QUEUED' ? 'QUEUED' : 'PENDING',
      dndSkipped: dnd,
    };
  });

  if (recipientRows.length > 0) {
    await prisma.commMessageRecipient.createMany({ data: recipientRows });
  }

  if (status === 'QUEUED') {
    await pushToDeliveryQueue(institutionId, header, recipients.length - dndSkipped);
  }

  if (scheduleAt && status === 'SCHEDULED') {
    await prisma.commScheduledMessage.create({
      data: {
        institutionId,
        title: payload.subject || payload.bodyPlain.slice(0, 60),
        channel: payload.channel,
        scheduledDate: scheduleAt,
        scheduledTime: `${String(scheduleAt.getHours()).padStart(2, '0')}:${String(scheduleAt.getMinutes()).padStart(2, '0')}`,
        recipientCount: recipients.length - dndSkipped,
        recipientGroup: payload.recipientKeys.join(', '),
        audienceScope: TEACHER_ROLES.has(userRole) ? 'CLASS' : 'INSTITUTION',
        status: 'SCHEDULED',
        academicYear,
      },
    });
  }

  await logActivity(
    institutionId,
    status === 'PENDING_APPROVAL' ? 'COMPOSE_SUBMITTED_APPROVAL' : 'COMPOSE_SUBMITTED',
    `${messageCode} — ${payload.channel} to ${recipients.length} recipients (${status})`,
    { messageCode, channel: payload.channel, status, recipientCount: recipients.length },
    createdBy,
  );

  const data = await getComposeMessageManagement(institutionId, { academicYear, userRole, classScope, performedBy: createdBy });

  return {
    message: status === 'PENDING_APPROVAL'
      ? `Message ${messageCode} submitted for Principal approval.`
      : status === 'SCHEDULED'
        ? `Message ${messageCode} scheduled successfully.`
        : status === 'QUEUED'
          ? `Message ${messageCode} pushed to dispatch queue (${recipients.length - dndSkipped} recipients).`
          : `Draft ${messageCode} saved.`,
    messageId: header.id,
    messageCode,
    status,
    data,
  };
}

async function pushToDeliveryQueue(
  institutionId: string,
  header: { id: string; messageCode: string; channel: string; bodyPlain: string; subject: string; recipientCount: number },
  effectiveCount: number,
) {
  const channel = await prisma.commChannel.findFirst({
    where: { institutionId, channelCode: header.channel },
  });
  const costPerUnit = channel?.costPerUnit ?? 0.25;

  await prisma.commDeliveryLog.create({
    data: {
      institutionId,
      channel: header.channel,
      campaignTitle: header.subject || header.bodyPlain.slice(0, 60),
      messagePreview: header.bodyPlain.slice(0, 120),
      recipientGroup: 'Compose Message',
      recipientCount: effectiveCount,
      status: 'PENDING',
      cost: costPerUnit * effectiveCount,
      sourceModule: 'Communication',
    },
  });

  await prisma.commMessageHeader.update({
    where: { id: header.id },
    data: { sentAt: new Date(), status: 'SENT' },
  });

  await prisma.commMessageRecipient.updateMany({
    where: { headerId: header.id, dndSkipped: false },
    data: { status: 'QUEUED' },
  });
}

export async function approveComposeMessage(
  institutionId: string,
  messageId: string,
  approvedBy: string,
  opts: { sendNow?: boolean } = {},
) {
  const header = await prisma.commMessageHeader.findFirst({
    where: { id: messageId, institutionId, status: 'PENDING_APPROVAL' },
  });
  if (!header) throw new Error('Message not found or not pending approval.');

  const scheduleAt = header.scheduleAt;
  let status = 'APPROVED';
  if (scheduleAt && scheduleAt.getTime() > Date.now()) {
    status = 'SCHEDULED';
  } else if (opts.sendNow !== false) {
    status = 'QUEUED';
  }

  await prisma.commMessageHeader.update({
    where: { id: messageId },
    data: {
      status,
      approvedBy,
      approvedAt: new Date(),
      ...(status === 'QUEUED'
        ? {
            queuedAt: new Date(),
            queueRef: `kafka://comm-dispatch/${header.messageCode}`,
            queueProvider: 'KAFKA',
          }
        : {}),
    },
  });

  if (status === 'QUEUED') {
    const dnd = await prisma.commMessageRecipient.count({ where: { headerId: messageId, dndSkipped: true } });
    await pushToDeliveryQueue(institutionId, header, header.recipientCount - dnd);
  }

  await logActivity(institutionId, 'COMPOSE_APPROVED', `${header.messageCode} approved by ${approvedBy}`, { messageId }, approvedBy);

  return {
    message: `Message ${header.messageCode} approved and ${status === 'QUEUED' ? 'queued for dispatch' : 'scheduled'}.`,
    status,
    data: await getComposeMessageManagement(institutionId, { academicYear: header.academicYear }),
  };
}

export async function seedComposeMessage(institutionId: string) {
  const { seedMessageTemplates } = await import('./communicationTemplates.js');
  await seedMessageTemplates(institutionId);
  const academicYear = '2025-26';
  const existing = await prisma.commMessageHeader.count({ where: { institutionId } });
  if (existing === 0) {
    await prisma.commMessageHeader.create({
      data: {
        institutionId,
        messageCode: 'MSG-2025-0001',
        channel: 'SMS',
        bodyPlain: 'Dear Parent, PTM scheduled for Class 10-A on Saturday.',
        recipientGroups: ['section:10-A'] as Prisma.InputJsonValue,
        recipientCount: 42,
        status: 'SENT',
        createdBy: 'Class Teacher',
        userRole: 'Class Teacher',
        academicYear,
        sentAt: new Date(),
        queueRef: 'rabbitmq://comm.dispatch/MSG-2025-0001',
      },
    });
  }

  return getComposeMessageManagement(institutionId, { academicYear, userRole: 'Principal' });
}
