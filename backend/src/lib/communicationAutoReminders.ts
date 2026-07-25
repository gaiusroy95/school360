import { AttendanceStatus, Prisma } from '@prisma/client';
import { prisma } from './prisma.js';
import { enqueueSms } from './communicationSmsManagement.js';

const ACADEMIC_YEARS = ['2023-24', '2024-25', '2025-26', '2026-27'];
const ADMIN_ROLES = new Set(['Super Admin', 'Principal', 'Management', 'Admin', 'Communication Manager']);

const TRIGGER_META: Record<string, { label: string; module: string; description: string }> = {
  FEE_DUE: {
    label: 'Fee Payment Reminder',
    module: 'Fees & Finance',
    description: 'Notify parents when fee invoice is due in T-minus X days',
  },
  STUDENT_ABSENT: {
    label: 'Attendance Absent Alert',
    module: 'Attendance',
    description: 'Alert parents when student is marked absent today',
  },
  BOOK_OVERDUE: {
    label: 'Book Overdue Alert',
    module: 'Library',
    description: 'Remind when library book is past due date',
  },
  BOOK_DUE_TOMORROW: {
    label: 'Book Due Tomorrow',
    module: 'Library',
    description: 'Remind member when book is due tomorrow',
  },
  BIRTHDAY_WISHES: {
    label: 'Birthday Wishes',
    module: 'Communication',
    description: 'Send birthday greetings to students on their date of birth',
  },
};

export type AutomationConfigPayload = {
  name?: string;
  description?: string;
  triggerType?: string;
  channel?: string;
  channelFallback?: string[];
  templateCode?: string;
  templateBody?: string;
  cronTime?: string;
  offsetDays?: number;
  isActive?: boolean;
  academicYear?: string;
  userRole?: string;
};

type Recipient = {
  name: string;
  mobile: string;
  email: string;
  triggerRef: string;
  mergeData: Record<string, string>;
};

function canManage(userRole: string) {
  return ADMIN_ROLES.has(userRole);
}

function parseFallback(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String);
  return ['WHATSAPP', 'SMS'];
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function dateOnly(d: Date) {
  return d.toISOString().slice(0, 10);
}

function renderTemplate(body: string, data: Record<string, string>) {
  let out = body;
  for (const [k, v] of Object.entries(data)) {
    out = out.replace(new RegExp(`\\{${k}\\}`, 'gi'), v);
    out = out.replace(new RegExp(`\\{#${k}#\\}`, 'gi'), v);
  }
  return out;
}

async function logActivity(
  institutionId: string,
  action: string,
  details: string,
  snapshot: Record<string, unknown> = {},
  performedBy = 'Automation Engine',
) {
  await prisma.commActivityLog.create({
    data: { institutionId, action, details, filterSnapshot: snapshot as Prisma.InputJsonValue, performedBy },
  });
}

async function resolveTemplateBody(
  institutionId: string,
  automation: { templateCode: string; templateBody: string },
  academicYear: string,
) {
  if (automation.templateCode) {
    const tpl = await prisma.commMessageTemplate.findFirst({
      where: {
        institutionId,
        templateCode: automation.templateCode,
        academicYear,
        isActive: true,
        gatewayStatus: 'APPROVED',
      },
    });
    if (tpl?.body) return tpl.body;
  }
  return automation.templateBody || 'Dear {parentName}, this is an automated reminder from school ERP.';
}

export async function evaluateTriggerRecipients(
  institutionId: string,
  automation: {
    triggerType: string;
    offsetDays: number;
    academicYear: string;
  },
): Promise<Recipient[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  switch (automation.triggerType) {
    case 'FEE_DUE': {
      const targetDate = addDays(today, automation.offsetDays);
      const targetStr = dateOnly(targetDate);
      const invoices = await prisma.feeInvoice.findMany({
        where: {
          institutionId,
          academicYear: automation.academicYear,
          status: { in: ['PENDING', 'PARTIAL', 'OVERDUE'] },
          balance: { gt: 0 },
          dueDate: new Date(targetStr),
        },
        take: 200,
      });
      return invoices
        .filter((inv) => inv.parentMobile.trim())
        .map((inv) => ({
          name: inv.parentName || inv.studentName,
          mobile: inv.parentMobile,
          email: inv.parentEmail,
          triggerRef: inv.invoiceNumber,
          mergeData: {
            parentName: inv.parentName || 'Parent',
            studentName: inv.studentName,
            amount: String(inv.balance),
            dueDate: inv.dueDate ? inv.dueDate.toISOString().slice(0, 10) : '',
            className: inv.className,
            invoiceNumber: inv.invoiceNumber,
          },
        }));
    }

    case 'STUDENT_ABSENT': {
      const sessions = await prisma.attendanceSession.findMany({
        where: {
          institutionId,
          academicYear: automation.academicYear,
          sessionDate: today,
          mode: 'CLASS',
        },
        select: { id: true },
      });
      if (!sessions.length) return [];
      const records = await prisma.attendanceRecord.findMany({
        where: {
          sessionId: { in: sessions.map((s) => s.id) },
          status: AttendanceStatus.ABSENT,
        },
        include: {
          student: {
            select: {
              firstName: true,
              lastName: true,
              fatherName: true,
              fatherMobile: true,
              motherMobile: true,
              className: true,
              sectionName: true,
            },
          },
        },
        take: 200,
      });
      const recipients: Recipient[] = [];
      for (const r of records) {
        const mobile = r.student.fatherMobile || r.student.motherMobile;
        if (!mobile?.trim()) continue;
        const studentName = [r.student.firstName, r.student.lastName].filter(Boolean).join(' ');
        recipients.push({
          name: r.student.fatherName || studentName,
          mobile,
          email: '',
          triggerRef: r.studentId,
          mergeData: {
            parentName: r.student.fatherName || 'Parent',
            studentName,
            className: `${r.student.className}${r.student.sectionName ? `-${r.student.sectionName}` : ''}`,
            date: dateOnly(today),
          },
        });
      }
      return recipients;
    }

    case 'BOOK_OVERDUE': {
      const issues = await prisma.libIssue.findMany({
        where: {
          institutionId,
          academicYear: automation.academicYear,
          status: 'ISSUED',
          dueDate: { lt: today },
        },
        include: { member: { select: { memberName: true, mobile: true, email: true } }, book: { select: { title: true } } },
        take: 200,
      });
      return issues
        .filter((i) => i.member.mobile?.trim())
        .map((i) => ({
          name: i.member.memberName,
          mobile: i.member.mobile,
          email: i.member.email ?? '',
          triggerRef: i.txnNumber || i.id,
          mergeData: {
            memberName: i.member.memberName,
            bookTitle: i.book.title,
            dueDate: i.dueDate.toISOString().slice(0, 10),
            daysOverdue: String(Math.max(0, Math.floor((today.getTime() - i.dueDate.getTime()) / 86400000))),
          },
        }));
    }

    case 'BOOK_DUE_TOMORROW': {
      const tomorrow = addDays(today, 1);
      const issues = await prisma.libIssue.findMany({
        where: {
          institutionId,
          academicYear: automation.academicYear,
          status: 'ISSUED',
          dueDate: tomorrow,
        },
        include: { member: { select: { memberName: true, mobile: true, email: true } }, book: { select: { title: true } } },
        take: 200,
      });
      return issues
        .filter((i) => i.member.mobile?.trim())
        .map((i) => ({
          name: i.member.memberName,
          mobile: i.member.mobile,
          email: i.member.email ?? '',
          triggerRef: i.txnNumber || i.id,
          mergeData: {
            memberName: i.member.memberName,
            bookTitle: i.book.title,
            dueDate: i.dueDate.toISOString().slice(0, 10),
          },
        }));
    }

    case 'BIRTHDAY_WISHES': {
      const month = today.getUTCMonth() + 1;
      const day = today.getUTCDate();
      const students = await prisma.student.findMany({
        where: { institutionId, academicYear: automation.academicYear, status: 'ACTIVE' },
        take: 500,
      });
      return students
        .filter((s) => {
          if (!s.dateOfBirth) return false;
          const dob = new Date(s.dateOfBirth);
          return dob.getUTCMonth() + 1 === month && dob.getUTCDate() === day;
        })
        .map((s) => {
          const studentName = [s.firstName, s.lastName].filter(Boolean).join(' ');
          const mobile = s.fatherMobile || s.motherMobile || s.mobile;
          return {
            name: studentName,
            mobile: mobile || '',
            email: s.email,
            triggerRef: s.admissionNumber,
            mergeData: { studentName, className: s.className },
          };
        })
        .filter((r) => r.mobile.trim());
    }

    default:
      return [];
  }
}

async function dispatchWithFallback(
  institutionId: string,
  automation: {
    id: string;
    channel: string;
    channelFallback: unknown;
    academicYear: string;
    sourceModule: string;
  },
  runId: string,
  recipient: Recipient,
  messageBody: string,
) {
  const channels = [automation.channel, ...parseFallback(automation.channelFallback)]
    .filter((c, i, arr) => arr.indexOf(c) === i);

  let lastError = '';
  for (let i = 0; i < channels.length; i++) {
    const channel = channels[i];
    const queueItem = await prisma.commAutomationQueueItem.create({
      data: {
        institutionId,
        automationId: automation.id,
        runId,
        channel,
        recipientName: recipient.name,
        recipientMobile: recipient.mobile,
        recipientEmail: recipient.email,
        messageBody,
        triggerRef: recipient.triggerRef,
        sourceModule: automation.sourceModule,
        academicYear: automation.academicYear,
        status: 'QUEUED',
        failoverUsed: i > 0,
      },
    });

    try {
      if (channel === 'SMS' && recipient.mobile) {
        const result = await enqueueSms(institutionId, {
          mobile: recipient.mobile,
          message: messageBody,
          messageType: 'TRANSACTIONAL',
          sourceModule: 'Auto Reminders',
          academicYear: automation.academicYear,
          processNow: true,
        });
        const sent = result.status === 'SENT';
        await prisma.commAutomationQueueItem.update({
          where: { id: queueItem.id },
          data: {
            status: sent ? 'SENT' : 'FAILED',
            sentAt: sent ? new Date() : null,
            lastError: sent ? '' : String(result.message ?? 'SMS dispatch failed'),
          },
        });
        if (sent) return { sent: true, channel, queueItemId: queueItem.id };
        lastError = String(result.message ?? 'SMS failed');
      } else {
        await prisma.messageDispatchLog.create({
          data: {
            institutionId,
            channel,
            recipient: recipient.mobile || recipient.email,
            template: automation.id,
            status: 'STUB_SENT',
            response: messageBody.slice(0, 120),
          },
        });
        await prisma.commAutomationQueueItem.update({
          where: { id: queueItem.id },
          data: { status: 'SENT', sentAt: new Date() },
        });
        return { sent: true, channel, queueItemId: queueItem.id };
      }
    } catch (e) {
      lastError = e instanceof Error ? e.message : 'Dispatch error';
      await prisma.commAutomationQueueItem.update({
        where: { id: queueItem.id },
        data: { status: 'FAILED', lastError },
      });
    }
  }

  return { sent: false, channel: channels[channels.length - 1], error: lastError };
}

export async function runAutomationRule(
  institutionId: string,
  automationId: string,
  opts: { userRole?: string; simulatedCron?: string } = {},
) {
  const automation = await prisma.commAutomation.findFirst({
    where: { id: automationId, institutionId },
  });
  if (!automation) throw new Error('Automation rule not found.');
  if (!automation.isActive && !opts.simulatedCron) {
    throw new Error('Automation is inactive. Enable it first or use force run.');
  }

  const start = Date.now();
  const templateBody = await resolveTemplateBody(
    institutionId,
    automation,
    automation.academicYear,
  );

  const recipients = await evaluateTriggerRecipients(institutionId, automation);

  const run = await prisma.commAutomationRun.create({
    data: {
      institutionId,
      automationId: automation.id,
      status: 'RUNNING',
      recipientsFound: recipients.length,
      academicYear: automation.academicYear,
      logSummary: `Cron ${opts.simulatedCron ?? automation.cronTime} — evaluating ${automation.triggerType}`,
    },
  });

  let dispatched = 0;
  let failed = 0;

  for (const recipient of recipients) {
    const messageBody = renderTemplate(templateBody, recipient.mergeData);
    const result = await dispatchWithFallback(
      institutionId,
      automation,
      run.id,
      recipient,
      messageBody,
    );
    if (result.sent) dispatched += 1;
    else failed += 1;
  }

  const durationMs = Date.now() - start;
  const status = failed === recipients.length && recipients.length > 0 ? 'FAILED' : 'COMPLETED';

  await prisma.commAutomationRun.update({
    where: { id: run.id },
    data: {
      status,
      queuedCount: recipients.length,
      dispatchedCount: dispatched,
      failedCount: failed,
      durationMs,
      logSummary: `Found ${recipients.length} recipient(s); dispatched ${dispatched}, failed ${failed}`,
    },
  });

  await prisma.commAutomation.update({
    where: { id: automation.id },
    data: {
      lastRunAt: new Date(),
      lastRunStatus: status,
      lastRecipientsCount: recipients.length,
    },
  });

  await logActivity(
    institutionId,
    'AUTOMATION_RUN',
    `${automation.name}: ${dispatched}/${recipients.length} dispatched`,
    { automationId, runId: run.id, dispatched, failed },
    opts.userRole ?? 'System',
  );

  return {
    message: `Automation run complete: ${dispatched} message(s) dispatched to ${recipients.length} recipient(s).`,
    runId: run.id,
    recipientsFound: recipients.length,
    dispatchedCount: dispatched,
    failedCount: failed,
    durationMs,
    status,
  };
}

export async function runAllActiveAutomations(institutionId: string, opts: { userRole?: string } = {}) {
  const rules = await prisma.commAutomation.findMany({
    where: { institutionId, isActive: true },
  });

  const results = [];
  for (const rule of rules) {
    const result = await runAutomationRule(institutionId, rule.id, {
      userRole: opts.userRole ?? 'System',
      simulatedCron: rule.cronTime,
    });
    results.push({ automationId: rule.id, name: rule.name, ...result });
  }

  return {
    message: `Processed ${rules.length} active automation rule(s).`,
    processed: rules.length,
    results,
  };
}

function serializeRule(a: {
  id: string;
  name: string;
  automationKey: string;
  description: string;
  triggerType: string;
  channel: string;
  channelFallback: unknown;
  sourceModule: string;
  templateCode: string;
  templateBody: string;
  cronTime: string;
  offsetDays: number;
  isActive: boolean;
  lastRunAt: Date | null;
  lastRunStatus: string;
  lastRecipientsCount: number;
  academicYear: string;
  updatedAt: Date;
}) {
  const meta = TRIGGER_META[a.triggerType] ?? { label: a.triggerType, module: a.sourceModule, description: '' };
  return {
    id: a.id,
    key: a.automationKey,
    name: a.name,
    description: a.description || meta.description,
    triggerType: a.triggerType,
    triggerLabel: meta.label,
    sourceModule: a.sourceModule || meta.module,
    channel: a.channel,
    channelFallback: parseFallback(a.channelFallback),
    templateCode: a.templateCode,
    templateBody: a.templateBody,
    cronTime: a.cronTime,
    offsetDays: a.offsetDays,
    isActive: a.isActive,
    lastRunAt: a.lastRunAt?.toISOString() ?? null,
    lastRunStatus: a.lastRunStatus,
    lastRecipientsCount: a.lastRecipientsCount,
    academicYear: a.academicYear,
    updatedAt: a.updatedAt.toISOString(),
  };
}

export async function getAutoRemindersManagement(
  institutionId: string,
  opts: { academicYear?: string; userRole?: string } = {},
) {
  const academicYear = opts.academicYear ?? '2025-26';
  const userRole = opts.userRole ?? 'Principal';

  const [rules, recentRuns, queueStats, recentQueue] = await Promise.all([
    prisma.commAutomation.findMany({
      where: { institutionId, academicYear },
      orderBy: { name: 'asc' },
    }),
    prisma.commAutomationRun.findMany({
      where: { institutionId, academicYear },
      orderBy: { runAt: 'desc' },
      take: 15,
      include: { automation: { select: { name: true, triggerType: true } } },
    }),
    prisma.commAutomationQueueItem.groupBy({
      by: ['status'],
      where: { institutionId, academicYear },
      _count: { _all: true },
    }),
    prisma.commAutomationQueueItem.findMany({
      where: { institutionId, academicYear },
      orderBy: { queuedAt: 'desc' },
      take: 20,
      include: { automation: { select: { name: true } } },
    }),
  ]);

  const qMap = Object.fromEntries(queueStats.map((q) => [q.status, q._count._all]));
  const activeCount = rules.filter((r) => r.isActive).length;

  return {
    academicYear,
    academicYears: ACADEMIC_YEARS,
    userRole,
    permissions: { canManage: canManage(userRole), canRun: canManage(userRole) },
    kpis: {
      totalRules: rules.length,
      activeRules: activeCount,
      inactiveRules: rules.length - activeCount,
      runsToday: recentRuns.filter((r) => r.runAt >= new Date(new Date().setHours(0, 0, 0, 0))).length,
      queued: qMap.QUEUED ?? 0,
      sent: (qMap.SENT ?? 0) + (qMap.DELIVERED ?? 0),
      failed: qMap.FAILED ?? 0,
    },
    rules: rules.map(serializeRule),
    triggerTypes: Object.entries(TRIGGER_META).map(([value, m]) => ({
      value,
      label: m.label,
      module: m.module,
      description: m.description,
    })),
    channelOptions: ['WHATSAPP', 'SMS', 'EMAIL', 'PUSH'],
    recentRuns: recentRuns.map((r) => ({
      id: r.id,
      automationName: r.automation.name,
      triggerType: r.automation.triggerType,
      runAt: r.runAt.toISOString(),
      status: r.status,
      recipientsFound: r.recipientsFound,
      dispatchedCount: r.dispatchedCount,
      failedCount: r.failedCount,
      durationMs: r.durationMs,
      logSummary: r.logSummary,
    })),
    recentQueue: recentQueue.map((q) => ({
      id: q.id,
      automationName: q.automation.name,
      channel: q.channel,
      recipientName: q.recipientName,
      recipientMobile: q.recipientMobile ? `***${q.recipientMobile.slice(-4)}` : '',
      status: q.status,
      failoverUsed: q.failoverUsed,
      queuedAt: q.queuedAt.toISOString(),
      sentAt: q.sentAt?.toISOString() ?? null,
    })),
    workflowSteps: [
      'Cron Job Runs (e.g., 08:00 AM)',
      'Query Database for Trigger Condition',
      'Compile Recipient List',
      'Map to Assigned Template',
      'Push to Queue',
      'Dispatch with Channel Fallback',
    ],
    erpIntegrations: [
      'Fees & Finance — Defaulter / due-date logic',
      'Attendance — Absent today triggers',
      'Library — Book due tomorrow & overdue alerts',
      'Student Records — Birthday wishes',
    ],
  };
}

export async function updateAutomationRule(
  institutionId: string,
  ruleId: string,
  payload: AutomationConfigPayload,
) {
  if (!canManage(payload.userRole ?? '')) throw new Error('Permission denied.');

  const existing = await prisma.commAutomation.findFirst({ where: { id: ruleId, institutionId } });
  if (!existing) throw new Error('Rule not found.');

  await prisma.commAutomation.update({
    where: { id: ruleId },
    data: {
      name: payload.name ?? existing.name,
      description: payload.description ?? existing.description,
      triggerType: payload.triggerType ?? existing.triggerType,
      channel: payload.channel ?? existing.channel,
      channelFallback: payload.channelFallback
        ? (payload.channelFallback as Prisma.InputJsonValue)
        : undefined,
      templateCode: payload.templateCode ?? existing.templateCode,
      templateBody: payload.templateBody ?? existing.templateBody,
      cronTime: payload.cronTime ?? existing.cronTime,
      offsetDays: payload.offsetDays ?? existing.offsetDays,
      isActive: payload.isActive ?? existing.isActive,
    },
  });

  return { message: 'Automation rule updated.' };
}

export async function toggleAutomationRule(
  institutionId: string,
  ruleId: string,
  isActive: boolean,
  userRole?: string,
) {
  if (!canManage(userRole ?? '')) throw new Error('Permission denied.');

  const existing = await prisma.commAutomation.findFirst({ where: { id: ruleId, institutionId } });
  if (!existing) throw new Error('Rule not found.');

  const rule = await prisma.commAutomation.update({
    where: { id: ruleId },
    data: { isActive },
  });

  return { message: `${rule.name} ${isActive ? 'enabled' : 'disabled'}.`, isActive };
}

const DEFAULT_RULES = [
  {
    key: 'FEE_REMINDER',
    triggerType: 'FEE_DUE',
    name: 'Fee Payment Reminder',
    channel: 'SMS',
    channelFallback: ['WHATSAPP', 'SMS'],
    module: 'Fees & Finance',
    offsetDays: 3,
    cronTime: '08:00',
    templateBody: 'Dear {parentName}, fee of Rs.{amount} for {studentName} ({className}) is due on {dueDate}. Invoice {invoiceNumber}. — School ERP',
    templateCode: 'FEE_REMINDER_SMS',
  },
  {
    key: 'ATTENDANCE_ALERT',
    triggerType: 'STUDENT_ABSENT',
    name: 'Attendance Absent Alert',
    channel: 'SMS',
    channelFallback: ['SMS', 'WHATSAPP'],
    module: 'Attendance',
    offsetDays: 0,
    cronTime: '14:00',
    templateBody: 'Dear {parentName}, {studentName} ({className}) was marked ABSENT on {date}. Contact school if incorrect. — School ERP',
    templateCode: '',
  },
  {
    key: 'BOOK_DUE_TOMORROW',
    triggerType: 'BOOK_DUE_TOMORROW',
    name: 'Library Book Due Tomorrow',
    channel: 'WHATSAPP',
    channelFallback: ['WHATSAPP', 'SMS'],
    module: 'Library',
    offsetDays: 1,
    cronTime: '09:00',
    templateBody: 'Dear {memberName}, book "{bookTitle}" is due tomorrow ({dueDate}). Please return on time. — School Library',
    templateCode: '',
  },
  {
    key: 'BOOK_OVERDUE',
    triggerType: 'BOOK_OVERDUE',
    name: 'Library Book Overdue',
    channel: 'SMS',
    channelFallback: ['SMS', 'EMAIL'],
    module: 'Library',
    offsetDays: 0,
    cronTime: '10:00',
    templateBody: 'Dear {memberName}, book "{bookTitle}" is overdue by {daysOverdue} day(s). Fine may apply. — School Library',
    templateCode: '',
  },
  {
    key: 'BIRTHDAY_WISHES',
    triggerType: 'BIRTHDAY_WISHES',
    name: 'Birthday Wishes',
    channel: 'WHATSAPP',
    channelFallback: ['WHATSAPP', 'PUSH'],
    module: 'Communication',
    offsetDays: 0,
    cronTime: '08:00',
    templateBody: 'Happy Birthday {studentName}! Wishing you joy and success. — Your School Family',
    templateCode: '',
  },
  {
    key: 'HOMEWORK_REMINDER',
    triggerType: 'FEE_DUE',
    name: 'Homework Reminder',
    channel: 'PUSH',
    channelFallback: ['PUSH', 'SMS'],
    module: 'Academics',
    offsetDays: 0,
    cronTime: '18:00',
    templateBody: 'Reminder: Check today\'s homework assignments in the student app.',
    templateCode: '',
    isActive: false,
  },
];

export async function seedAutoRemindersManagement(institutionId: string) {
  const academicYear = '2025-26';

  for (const r of DEFAULT_RULES) {
    const meta = TRIGGER_META[r.triggerType] ?? { label: r.name, module: r.module, description: '' };
    await prisma.commAutomation.upsert({
      where: {
        institutionId_automationKey_academicYear: {
          institutionId,
          automationKey: r.key,
          academicYear,
        },
      },
      create: {
        institutionId,
        automationKey: r.key,
        name: r.name,
        description: meta.description,
        triggerType: r.triggerType,
        channel: r.channel,
        channelFallback: r.channelFallback as Prisma.InputJsonValue,
        sourceModule: r.module,
        templateCode: r.templateCode,
        templateBody: r.templateBody,
        cronTime: r.cronTime,
        offsetDays: r.offsetDays,
        isActive: r.isActive ?? true,
        academicYear,
      },
      update: {
        description: meta.description,
        triggerType: r.triggerType,
        channelFallback: r.channelFallback as Prisma.InputJsonValue,
        templateBody: r.templateBody,
        cronTime: r.cronTime,
        offsetDays: r.offsetDays,
      },
    });
  }

  const feeRule = await prisma.commAutomation.findFirst({
    where: { institutionId, automationKey: 'FEE_REMINDER', academicYear },
  });
  if (feeRule && !feeRule.lastRunAt) {
    try {
      await runAutomationRule(institutionId, feeRule.id, { userRole: 'System', simulatedCron: '08:00' });
    } catch {
      // no fee data yet
    }
  }

  return getAutoRemindersManagement(institutionId, { academicYear, userRole: 'Super Admin' });
}
