import { Prisma } from '@prisma/client';
import { prisma } from './prisma.js';
import { enqueueEmail } from './communicationEmailManagement.js';

const ACADEMIC_YEARS = ['2023-24', '2024-25', '2025-26', '2026-27'];
const CHANNELS = ['SMS', 'EMAIL', 'WHATSAPP', 'PUSH'] as const;

const REPORT_TREE = {
  mis: {
    label: 'MIS & Cost Reports',
    reports: [
      { id: 'expense_summary', name: 'Communication Expense Summary', description: 'Gateway costs by channel and source module' },
      { id: 'monthly_gateway_cost', name: 'Monthly Gateway Cost Report', description: 'Month-wise spend — auto-emailed to Principal & Accounts' },
      { id: 'channel_performance', name: 'Channel Performance MIS', description: 'Sent, delivered, failed metrics per channel' },
    ],
  },
  engagement: {
    label: 'Engagement Analytics',
    reports: [
      { id: 'engagement_analysis', name: 'Engagement & Read Rates', description: 'Delivery, open, read and click-through analysis' },
      { id: 'module_outreach', name: 'Module Outreach Analysis', description: 'Messages by ERP module — Fees, Attendance, Library, etc.' },
      { id: 'audience_breakdown', name: 'Audience Breakdown', description: 'Recipient groups and audience scope distribution' },
    ],
  },
  bottlenecks: {
    label: 'Delivery Bottlenecks',
    reports: [
      { id: 'delivery_bottlenecks', name: 'Delivery Bottleneck Report', description: 'Failures, gateway downtime, queue backlogs' },
      { id: 'failed_messages', name: 'Failed Messages Register', description: 'All failed dispatches with error detail' },
      { id: 'gateway_health', name: 'Gateway Health Summary', description: 'Gateway alerts and failover events' },
    ],
  },
};

export type CommReportFilters = {
  dateFrom?: string;
  dateTo?: string;
  channel?: string;
  academicYear?: string;
};

function todayDate() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function formatDate(d: Date) {
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatInr(n: number) {
  return `₹ ${Math.round(n * 100) / 100}`;
}

function relativeTime(d: Date) {
  const mins = Math.floor((Date.now() - d.getTime()) / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function pct(num: number, den: number) {
  if (den <= 0) return 0;
  return Math.round((num / den) * 1000) / 10;
}

function parseDateRange(filters: CommReportFilters) {
  const dateTo = filters.dateTo ? new Date(filters.dateTo) : todayDate();
  const dateFrom = filters.dateFrom
    ? new Date(filters.dateFrom)
    : new Date(dateTo.getFullYear(), dateTo.getMonth(), 1);
  dateTo.setHours(23, 59, 59, 999);
  return { dateFrom, dateTo };
}

function escapeCsv(v: string) {
  return `"${String(v ?? '').replace(/"/g, '""')}"`;
}

async function logActivity(institutionId: string, action: string, details: string, performedBy = 'Reports System') {
  await prisma.commActivityLog.create({
    data: { institutionId, action, details, performedBy },
  });
}

async function auditRun(
  institutionId: string,
  template: string,
  name: string,
  filters: CommReportFilters,
  rowCount: number,
  exportFormat = '',
  performedBy = 'Communication Manager',
  academicYear = '2025-26',
) {
  await prisma.commReportRun.create({
    data: {
      institutionId,
      reportTemplate: template,
      reportName: name,
      filters: filters as Prisma.InputJsonValue,
      rowCount,
      exportFormat,
      performedBy,
      academicYear,
    },
  });
}

async function fetchDeliveryLogs(
  institutionId: string,
  academicYear: string,
  dateFrom: Date,
  dateTo: Date,
  channel?: string,
) {
  return prisma.commDeliveryLog.findMany({
    where: {
      institutionId,
      academicYear,
      sentAt: { gte: dateFrom, lte: dateTo },
      ...(channel && channel !== 'ALL' ? { channel } : {}),
    },
    orderBy: { sentAt: 'desc' },
  });
}

async function fetchAuditLogs(
  institutionId: string,
  academicYear: string,
  dateFrom: Date,
  dateTo: Date,
  channel?: string,
) {
  return prisma.commMessageAuditLog.findMany({
    where: {
      institutionId,
      academicYear,
      sentAt: { gte: dateFrom, lte: dateTo },
      ...(channel && channel !== 'ALL' ? { channel } : {}),
    },
    orderBy: { sentAt: 'desc' },
  });
}

export async function generateCommunicationReport(
  institutionId: string,
  templateId: string,
  filters: CommReportFilters = {},
  performedBy = 'Communication Manager',
) {
  const academicYear = filters.academicYear ?? '2025-26';
  const { dateFrom, dateTo } = parseDateRange(filters);
  const channel = filters.channel ?? 'ALL';

  const [deliveryLogs, auditLogs, gatewayAlerts, smsFailed, emailFailed, waFailed] = await Promise.all([
    fetchDeliveryLogs(institutionId, academicYear, dateFrom, dateTo, channel),
    fetchAuditLogs(institutionId, academicYear, dateFrom, dateTo, channel),
    prisma.commGatewayAlert.findMany({
      where: { institutionId, academicYear, createdAt: { gte: dateFrom, lte: dateTo } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.commSmsQueueItem.count({ where: { institutionId, academicYear, status: 'FAILED' } }),
    prisma.commEmailQueueItem.count({ where: { institutionId, academicYear, status: 'FAILED' } }),
    prisma.commWaMessage.count({ where: { institutionId, academicYear, status: 'FAILED' } }),
  ]);

  const templateMeta = Object.values(REPORT_TREE)
    .flatMap((s) => s.reports)
    .find((r) => r.id === templateId);

  let rows: Record<string, string | number>[] = [];
  let columns: string[] = [];
  let summary: Record<string, string | number> = {};

  switch (templateId) {
    case 'expense_summary': {
      columns = ['Channel', 'Messages', 'Recipients', 'Total Cost (INR)', 'Avg Cost/Message'];
      const byChannel = CHANNELS.map((ch) => {
        const logs = deliveryLogs.filter((l) => l.channel === ch);
        const cost = logs.reduce((s, l) => s + l.cost, 0);
        const auditCost = auditLogs.filter((a) => a.channel === ch).reduce((s, a) => s + a.cost, 0);
        const totalCost = cost + auditCost;
        const msgs = logs.length + auditLogs.filter((a) => a.channel === ch).length;
        return {
          Channel: ch,
          Messages: msgs,
          Recipients: logs.reduce((s, l) => s + l.recipientCount, 0),
          'Total Cost (INR)': Math.round(totalCost * 100) / 100,
          'Avg Cost/Message': msgs ? Math.round((totalCost / msgs) * 100) / 100 : 0,
        };
      });
      rows = byChannel;
      const totalSpend = byChannel.reduce((s, r) => s + Number(r['Total Cost (INR)']), 0);
      summary = { totalSpend, period: `${formatDate(dateFrom)} – ${formatDate(dateTo)}` };
      break;
    }

    case 'monthly_gateway_cost': {
      columns = ['Month', 'SMS Cost', 'Email Cost', 'WhatsApp Cost', 'Push Cost', 'Total Cost'];
      const monthMap = new Map<string, Record<string, number>>();
      for (const log of [...deliveryLogs, ...auditLogs.map((a) => ({ channel: a.channel, cost: a.cost, sentAt: a.sentAt }))]) {
        const key = `${log.sentAt.getFullYear()}-${String(log.sentAt.getMonth() + 1).padStart(2, '0')}`;
        if (!monthMap.has(key)) {
          monthMap.set(key, { SMS: 0, EMAIL: 0, WHATSAPP: 0, PUSH: 0, total: 0 });
        }
        const m = monthMap.get(key)!;
        const ch = log.channel as keyof typeof m;
        if (ch in m && ch !== 'total') m[ch] += log.cost;
        m.total += log.cost;
      }
      rows = [...monthMap.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, costs]) => ({
          Month: month,
          'SMS Cost': Math.round(costs.SMS * 100) / 100,
          'Email Cost': Math.round(costs.EMAIL * 100) / 100,
          'WhatsApp Cost': Math.round(costs.WHATSAPP * 100) / 100,
          'Push Cost': Math.round(costs.PUSH * 100) / 100,
          'Total Cost': Math.round(costs.total * 100) / 100,
        }));
      summary = { grandTotal: rows.reduce((s, r) => s + Number(r['Total Cost']), 0) };
      break;
    }

    case 'channel_performance': {
      columns = ['Channel', 'Sent', 'Delivered', 'Read', 'Failed', 'Delivery %', 'Cost (INR)'];
      rows = CHANNELS.map((ch) => {
        const logs = deliveryLogs.filter((l) => l.channel === ch);
        const sent = logs.length;
        const delivered = logs.filter((l) => ['DELIVERED', 'READ'].includes(l.status)).length;
        const read = logs.filter((l) => l.status === 'READ').length;
        const failed = logs.filter((l) => l.status === 'FAILED').length;
        const cost = logs.reduce((s, l) => s + l.cost, 0);
        return {
          Channel: ch,
          Sent: sent,
          Delivered: delivered,
          Read: read,
          Failed: failed,
          'Delivery %': pct(delivered, sent),
          'Cost (INR)': Math.round(cost * 100) / 100,
        };
      });
      break;
    }

    case 'engagement_analysis': {
      columns = ['Channel', 'Sent', 'Delivered', 'Read/Open', 'Engagement %', 'Click Rate %'];
      rows = CHANNELS.map((ch) => {
        const logs = deliveryLogs.filter((l) => l.channel === ch);
        const sent = logs.length;
        const delivered = logs.filter((l) => ['DELIVERED', 'READ'].includes(l.status)).length;
        const readOpen = ch === 'EMAIL'
          ? logs.reduce((s, l) => s + l.openCount, 0)
          : logs.filter((l) => l.status === 'READ').length;
        const clicks = logs.reduce((s, l) => s + l.clickCount, 0);
        return {
          Channel: ch,
          Sent: sent,
          Delivered: delivered,
          'Read/Open': readOpen,
          'Engagement %': pct(readOpen, sent),
          'Click Rate %': ch === 'EMAIL' ? pct(clicks, sent) : 0,
        };
      });
      break;
    }

    case 'module_outreach': {
      columns = ['Source Module', 'Messages', 'Recipients', 'Cost (INR)', 'Top Channel'];
      const modMap = new Map<string, { count: number; recipients: number; cost: number; channels: Record<string, number> }>();
      for (const log of deliveryLogs) {
        const mod = log.sourceModule || 'Communication';
        if (!modMap.has(mod)) modMap.set(mod, { count: 0, recipients: 0, cost: 0, channels: {} });
        const m = modMap.get(mod)!;
        m.count += 1;
        m.recipients += log.recipientCount;
        m.cost += log.cost;
        m.channels[log.channel] = (m.channels[log.channel] ?? 0) + 1;
      }
      for (const log of auditLogs) {
        const mod = log.sourceModule || 'Communication';
        if (!modMap.has(mod)) modMap.set(mod, { count: 0, recipients: 0, cost: 0, channels: {} });
        const m = modMap.get(mod)!;
        m.count += 1;
        m.recipients += 1;
        m.cost += log.cost;
        m.channels[log.channel] = (m.channels[log.channel] ?? 0) + 1;
      }
      rows = [...modMap.entries()].map(([mod, data]) => {
        const topChannel = Object.entries(data.channels).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—';
        return {
          'Source Module': mod,
          Messages: data.count,
          Recipients: data.recipients,
          'Cost (INR)': Math.round(data.cost * 100) / 100,
          'Top Channel': topChannel,
        };
      });
      break;
    }

    case 'audience_breakdown': {
      columns = ['Audience Scope', 'Campaigns', 'Recipients', 'Delivery Rate %'];
      const scopeMap = new Map<string, { campaigns: number; recipients: number; delivered: number }>();
      for (const log of deliveryLogs) {
        const scope = log.audienceScope || 'INSTITUTION';
        if (!scopeMap.has(scope)) scopeMap.set(scope, { campaigns: 0, recipients: 0, delivered: 0 });
        const s = scopeMap.get(scope)!;
        s.campaigns += 1;
        s.recipients += log.recipientCount;
        if (['DELIVERED', 'READ'].includes(log.status)) s.delivered += 1;
      }
      rows = [...scopeMap.entries()].map(([scope, data]) => ({
        'Audience Scope': scope,
        Campaigns: data.campaigns,
        Recipients: data.recipients,
        'Delivery Rate %': pct(data.delivered, data.campaigns),
      }));
      break;
    }

    case 'delivery_bottlenecks': {
      columns = ['Bottleneck Type', 'Channel/Module', 'Count', 'Severity', 'Recommendation'];
      rows = [
        { 'Bottleneck Type': 'SMS Queue Failures', 'Channel/Module': 'SMS', Count: smsFailed, Severity: smsFailed > 10 ? 'HIGH' : 'MEDIUM', Recommendation: 'Check DLT template registration & gateway balance' },
        { 'Bottleneck Type': 'Email Queue Failures', 'Channel/Module': 'EMAIL', Count: emailFailed, Severity: emailFailed > 5 ? 'HIGH' : 'LOW', Recommendation: 'Verify SMTP credentials and sender reputation' },
        { 'Bottleneck Type': 'WhatsApp Failures', 'Channel/Module': 'WHATSAPP', Count: waFailed, Severity: waFailed > 5 ? 'HIGH' : 'LOW', Recommendation: 'Review 24h window and template approvals' },
        { 'Bottleneck Type': 'Gateway Alerts', 'Channel/Module': 'ALL', Count: gatewayAlerts.length, Severity: gatewayAlerts.some((a) => a.severity === 'HIGH') ? 'CRITICAL' : 'MEDIUM', Recommendation: 'Enable failover gateways for affected channels' },
        { 'Bottleneck Type': 'Audit Log Failures', 'Channel/Module': 'ALL', Count: auditLogs.filter((a) => a.status === 'FAILED').length, Severity: 'MEDIUM', Recommendation: 'Review failed message payloads in Message History' },
      ];
      break;
    }

    case 'failed_messages': {
      columns = ['Timestamp', 'Channel', 'Recipient', 'Contact', 'Status', 'Error', 'Module'];
      rows = auditLogs
        .filter((a) => a.status === 'FAILED')
        .slice(0, 200)
        .map((a) => ({
          Timestamp: a.sentAt.toISOString(),
          Channel: a.channel,
          Recipient: a.recipientName,
          Contact: a.contactIdentifier,
          Status: a.status,
          Error: a.errorDetail || 'Dispatch failed',
          Module: a.sourceModule,
        }));
      break;
    }

    case 'gateway_health': {
      columns = ['Date', 'Channel', 'Alert Type', 'Severity', 'Message', 'Status'];
      rows = gatewayAlerts.map((a) => ({
        Date: formatDate(a.createdAt),
        Channel: a.channel,
        'Alert Type': a.alertType,
        Severity: a.severity,
        Message: a.message,
        Status: a.status,
      }));
      break;
    }

    default:
      throw new Error(`Unknown report template: ${templateId}`);
  }

  await auditRun(institutionId, templateId, templateMeta?.name ?? templateId, filters, rows.length, '', performedBy, academicYear);

  return {
    reportTemplate: templateId,
    reportName: templateMeta?.name ?? templateId,
    description: templateMeta?.description ?? '',
    columns,
    rows,
    rowCount: rows.length,
    summary,
    filters: { ...filters, academicYear, dateFrom: dateFrom.toISOString().slice(0, 10), dateTo: dateTo.toISOString().slice(0, 10) },
    generatedAt: new Date().toISOString(),
  };
}

function rowsToCsv(columns: string[], rows: Record<string, string | number>[]) {
  const header = columns.join(',');
  const lines = rows.map((row) => columns.map((col) => escapeCsv(String(row[col] ?? ''))).join(','));
  return [header, ...lines].join('\n');
}

function rowsToExcel(columns: string[], rows: Record<string, string | number>[]) {
  return '\uFEFF' + rowsToCsv(columns, rows);
}

export async function exportCommunicationReport(
  institutionId: string,
  templateId: string,
  format: 'CSV' | 'Excel' | 'PDF',
  filters: CommReportFilters = {},
  performedBy = 'Communication Manager',
) {
  const preview = await generateCommunicationReport(institutionId, templateId, filters, performedBy);
  const ext = format === 'Excel' ? 'xlsx' : format.toLowerCase();
  const fileName = `comm_${templateId}_${Date.now()}.${ext}`;

  let content = '';
  let mimeType = 'text/csv';

  if (format === 'PDF') {
    content = [
      `Communication Report: ${preview.reportName}`,
      `Generated: ${preview.generatedAt}`,
      `Period: ${preview.filters.dateFrom} to ${preview.filters.dateTo}`,
      '',
      preview.columns.join(' | '),
      ...preview.rows.map((r) => preview.columns.map((c) => String(r[c] ?? '')).join(' | ')),
    ].join('\n');
    mimeType = 'text/plain';
  } else if (format === 'Excel') {
    content = rowsToExcel(preview.columns, preview.rows);
    mimeType = 'application/vnd.ms-excel';
  } else {
    content = rowsToCsv(preview.columns, preview.rows);
  }

  await prisma.commReportRun.create({
    data: {
      institutionId,
      reportTemplate: templateId,
      reportName: preview.reportName,
      filters: filters as Prisma.InputJsonValue,
      rowCount: preview.rowCount,
      exportFormat: format,
      performedBy,
      academicYear: filters.academicYear ?? '2025-26',
    },
  });

  await logActivity(institutionId, 'REPORT_EXPORT', `${preview.reportName} exported as ${format} (${preview.rowCount} rows)`, performedBy);

  return {
    message: `${preview.reportName} exported as ${format}.`,
    format,
    fileName,
    mimeType,
    rowCount: preview.rowCount,
    content,
    preview,
  };
}

async function emailReportSummary(
  institutionId: string,
  recipients: string,
  reportName: string,
  preview: Awaited<ReturnType<typeof generateCommunicationReport>>,
) {
  const emails = recipients.split(',').map((e) => e.trim()).filter(Boolean);

  const bodyHtml = `
    <h2>${reportName}</h2>
    <p>Period: ${preview.filters.dateFrom} to ${preview.filters.dateTo}</p>
    <p>Total rows: ${preview.rowCount}</p>
    ${preview.summary.grandTotal != null ? `<p><strong>Grand Total Gateway Cost: ${formatInr(Number(preview.summary.grandTotal))}</strong></p>` : ''}
    ${preview.summary.totalSpend != null ? `<p><strong>Total Spend: ${formatInr(Number(preview.summary.totalSpend))}</strong></p>` : ''}
    <table border="1" cellpadding="6" cellspacing="0">
      <tr>${preview.columns.map((c) => `<th>${c}</th>`).join('')}</tr>
      ${preview.rows.slice(0, 20).map((r) => `<tr>${preview.columns.map((c) => `<td>${r[c] ?? ''}</td>`).join('')}</tr>`).join('')}
    </table>
    <p><em>Auto-generated by School ERP Communication Reports Engine</em></p>
  `;

  for (const toEmail of emails) {
    try {
      await enqueueEmail(institutionId, {
        toEmail,
        toName: toEmail.split('@')[0],
        subject: `[School ERP] ${reportName} — ${formatDate(new Date())}`,
        bodyHtml,
        bodyPlain: `${reportName}\nPeriod: ${preview.filters.dateFrom} to ${preview.filters.dateTo}\nRows: ${preview.rowCount}`,
        campaignType: 'TRANSACTIONAL',
        sourceModule: 'Communication Reports',
        academicYear: preview.filters.academicYear as string,
        processNow: true,
      });
    } catch {
      await prisma.messageDispatchLog.create({
        data: {
          institutionId,
          channel: 'EMAIL',
          recipient: toEmail,
          template: reportName,
          status: 'STUB_SENT',
          response: `Scheduled report: ${preview.rowCount} rows`,
        },
      });
    }
  }
}

export async function processScheduledCommunicationReports(institutionId: string) {
  const now = new Date();
  const due = await prisma.commReportSchedule.findMany({
    where: { institutionId, status: 'ACTIVE', OR: [{ nextRunAt: { lte: now } }, { nextRunAt: null }] },
  });

  let processed = 0;
  for (const sched of due) {
    const filters = (sched.filters as CommReportFilters) ?? {};
    filters.academicYear = sched.academicYear;
    const preview = await generateCommunicationReport(institutionId, sched.reportTemplate, filters, 'Scheduler');

    if (sched.channel === 'EMAIL') {
      await emailReportSummary(institutionId, sched.recipients, sched.reportName, preview);
    }

    const nextRun = new Date(now);
    if (sched.frequency === 'DAILY') nextRun.setDate(nextRun.getDate() + 1);
    else if (sched.frequency === 'WEEKLY') nextRun.setDate(nextRun.getDate() + 7);
    else nextRun.setMonth(nextRun.getMonth() + 1);
    nextRun.setHours(8, 0, 0, 0);

    await prisma.commReportSchedule.update({
      where: { id: sched.id },
      data: { lastRunAt: now, nextRunAt: nextRun },
    });

    await logActivity(
      institutionId,
      'SCHEDULED_REPORT',
      `${sched.reportName} emailed to ${sched.recipients} (${preview.rowCount} rows)`,
    );
    processed += 1;
  }
  return { processed };
}

export async function scheduleCommunicationReport(
  institutionId: string,
  body: {
    reportTemplate: string;
    reportName: string;
    frequency?: string;
    channel?: string;
    recipients: string;
    filters?: CommReportFilters;
    createdBy?: string;
    academicYear?: string;
  },
) {
  const nextRun = new Date();
  if (body.frequency === 'DAILY') nextRun.setDate(nextRun.getDate() + 1);
  else if (body.frequency === 'WEEKLY') {
    nextRun.setDate(nextRun.getDate() + ((8 - nextRun.getDay()) % 7 || 7));
  } else {
    nextRun.setMonth(nextRun.getMonth() + 1);
    nextRun.setDate(1);
  }
  nextRun.setHours(8, 0, 0, 0);

  const cronExpr = body.frequency === 'DAILY' ? '0 8 * * *'
    : body.frequency === 'WEEKLY' ? '0 8 * * 1'
      : '0 8 1 * *';

  const schedule = await prisma.commReportSchedule.create({
    data: {
      institutionId,
      reportTemplate: body.reportTemplate,
      reportName: body.reportName,
      frequency: body.frequency ?? 'MONTHLY',
      channel: body.channel ?? 'EMAIL',
      recipients: body.recipients,
      cronExpr,
      filters: (body.filters ?? {}) as Prisma.InputJsonValue,
      nextRunAt: nextRun,
      createdBy: body.createdBy ?? 'Communication Manager',
      academicYear: body.academicYear ?? '2025-26',
    },
  });

  await logActivity(institutionId, 'SCHEDULE_REPORT', `Scheduled "${body.reportName}" → ${body.recipients}`);
  return {
    message: `Report "${body.reportName}" scheduled (${schedule.frequency}).`,
    schedule,
    data: await getCommunicationReportsAnalytics(institutionId, body.academicYear ?? '2025-26'),
  };
}

export async function deleteCommunicationReportSchedule(institutionId: string, scheduleId: string) {
  await prisma.commReportSchedule.deleteMany({ where: { institutionId, id: scheduleId } });
  return { message: 'Schedule removed.', data: await getCommunicationReportsAnalytics(institutionId) };
}

export async function getCommunicationReportsAnalytics(
  institutionId: string,
  academicYear = '2025-26',
  userRole = 'Communication Manager',
) {
  await processScheduledCommunicationReports(institutionId);

  const { dateFrom, dateTo } = parseDateRange({ academicYear });
  const defaultFilters: CommReportFilters = {
    academicYear,
    dateFrom: dateFrom.toISOString().slice(0, 10),
    dateTo: dateTo.toISOString().slice(0, 10),
  };

  const [schedules, recentRuns, deliveryLogs, auditLogs, gatewayAlerts] = await Promise.all([
    prisma.commReportSchedule.findMany({ where: { institutionId, academicYear }, orderBy: { createdAt: 'desc' } }),
    prisma.commReportRun.findMany({ where: { institutionId, academicYear }, orderBy: { createdAt: 'desc' }, take: 30 }),
    fetchDeliveryLogs(institutionId, academicYear, dateFrom, dateTo),
    fetchAuditLogs(institutionId, academicYear, dateFrom, dateTo),
    prisma.commGatewayAlert.findMany({ where: { institutionId, academicYear, status: 'OPEN' }, take: 10 }),
  ]);

  const totalCost = deliveryLogs.reduce((s, l) => s + l.cost, 0) + auditLogs.reduce((s, a) => s + a.cost, 0);
  const totalSent = deliveryLogs.length + auditLogs.length;
  const delivered = deliveryLogs.filter((l) => ['DELIVERED', 'READ'].includes(l.status)).length
    + auditLogs.filter((a) => ['SENT', 'DELIVERED', 'READ'].includes(a.status)).length;
  const failed = deliveryLogs.filter((l) => l.status === 'FAILED').length
    + auditLogs.filter((a) => a.status === 'FAILED').length;

  const expenseTrend = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (5 - i));
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const monthLogs = deliveryLogs.filter((l) => {
      const k = `${l.sentAt.getFullYear()}-${String(l.sentAt.getMonth() + 1).padStart(2, '0')}`;
      return k === key;
    });
    const monthAudit = auditLogs.filter((a) => {
      const k = `${a.sentAt.getFullYear()}-${String(a.sentAt.getMonth() + 1).padStart(2, '0')}`;
      return k === key;
    });
    const cost = monthLogs.reduce((s, l) => s + l.cost, 0) + monthAudit.reduce((s, a) => s + a.cost, 0);
    return { month: d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }), cost: Math.round(cost * 100) / 100 };
  });

  const engagementFunnel = [
    { stage: 'Sent', value: totalSent, color: '#3b82f6' },
    { stage: 'Delivered', value: delivered, color: '#10b981' },
    { stage: 'Failed', value: failed, color: '#ef4444' },
  ];

  const channelChart = CHANNELS.map((ch) => {
    const logs = deliveryLogs.filter((l) => l.channel === ch);
    return {
      channel: ch,
      sent: logs.length,
      cost: Math.round(logs.reduce((s, l) => s + l.cost, 0) * 100) / 100,
      deliveryRate: pct(logs.filter((l) => ['DELIVERED', 'READ'].includes(l.status)).length, logs.length),
    };
  });

  let dashboardPreview;
  try {
    dashboardPreview = await generateCommunicationReport(institutionId, 'expense_summary', defaultFilters);
  } catch {
    dashboardPreview = { rows: [] };
  }

  return {
    academicYear,
    academicYears: ACADEMIC_YEARS,
    userRole,
    permissions: {
      canExport: ['Super Admin', 'Principal', 'Finance Head', 'Accountant', 'Admin', 'Communication Manager'].includes(userRole),
      canSchedule: ['Super Admin', 'Principal', 'Admin', 'Communication Manager'].includes(userRole),
      canViewCosts: true,
    },
    reportTree: REPORT_TREE,
    exportFormats: ['CSV', 'Excel', 'PDF'],
    channelOptions: ['ALL', ...CHANNELS],
    defaultFilters,
    kpis: {
      totalGatewayCost: Math.round(totalCost * 100) / 100,
      totalMessages: totalSent,
      deliveryRate: pct(delivered, totalSent),
      failedCount: failed,
      reportsGenerated: recentRuns.length,
      activeSchedules: schedules.filter((s) => s.status === 'ACTIVE').length,
      openGatewayAlerts: gatewayAlerts.length,
    },
    charts: {
      expenseTrend,
      engagementFunnel,
      channelPerformance: channelChart,
    },
    bottlenecks: gatewayAlerts.map((a) => ({
      id: a.id,
      channel: a.channel,
      severity: a.severity,
      message: a.message,
      createdAt: a.createdAt.toISOString(),
    })),
    schedules: schedules.map((s) => ({
      id: s.id,
      reportTemplate: s.reportTemplate,
      reportName: s.reportName,
      frequency: s.frequency,
      channel: s.channel,
      recipients: s.recipients,
      cronExpr: s.cronExpr,
      status: s.status,
      lastRunAt: s.lastRunAt?.toISOString() ?? null,
      nextRunAt: s.nextRunAt?.toISOString() ?? null,
      createdBy: s.createdBy,
    })),
    recentRuns: recentRuns.map((r) => ({
      id: r.id,
      reportName: r.reportName,
      reportTemplate: r.reportTemplate,
      rowCount: r.rowCount,
      exportFormat: r.exportFormat || 'Preview',
      performedBy: r.performedBy,
      relativeTime: relativeTime(r.createdAt),
      status: r.status,
    })),
    dashboardPreview: dashboardPreview.rows,
    automationNotes: [
      'Monthly summary auto-emailed to Principal and Accounts Head on the 1st at 08:00 AM',
      'Scheduled reports include gateway cost breakdown by SMS, Email, WhatsApp & Push',
      'Exports available in CSV and Excel formats for MIS and audit',
    ],
    developerNotes: [
      'Integrates CommDeliveryLog, CommMessageAuditLog, gateway queues & alerts',
      'processScheduledCommunicationReports() runs on page load and can be wired to cron',
      'Monthly email uses ERP mail server via enqueueEmail',
    ],
  };
}

export async function seedCommunicationReportsAnalytics(institutionId: string, academicYear = '2025-26') {
  const existing = await prisma.commReportSchedule.count({ where: { institutionId, academicYear } });
  if (existing === 0) {
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    nextMonth.setDate(1);
    nextMonth.setHours(8, 0, 0, 0);

    await prisma.commReportSchedule.create({
      data: {
        institutionId,
        reportTemplate: 'monthly_gateway_cost',
        reportName: 'Monthly Communication Cost Summary',
        frequency: 'MONTHLY',
        channel: 'EMAIL',
        recipients: 'principal@school.edu, accounts@school.edu',
        cronExpr: '0 8 1 * *',
        nextRunAt: nextMonth,
        lastRunAt: new Date(Date.now() - 30 * 86400000),
        academicYear,
        createdBy: 'System',
      },
    });

    await prisma.commReportSchedule.create({
      data: {
        institutionId,
        reportTemplate: 'delivery_bottlenecks',
        reportName: 'Weekly Delivery Bottleneck Digest',
        frequency: 'WEEKLY',
        channel: 'EMAIL',
        recipients: 'communication@school.edu, it@school.edu',
        cronExpr: '0 8 * * 1',
        nextRunAt: new Date(Date.now() + 3 * 86400000),
        academicYear,
        createdBy: 'System',
      },
    });
  }

  const templates = ['expense_summary', 'engagement_analysis', 'channel_performance', 'module_outreach'];
  for (const t of templates) {
    try {
      await generateCommunicationReport(institutionId, t, { academicYear });
    } catch {
      // partial seed ok
    }
  }

  await logActivity(institutionId, 'SEED', 'Communication reports & analytics demo seeded');
  return getCommunicationReportsAnalytics(institutionId, academicYear, 'Super Admin');
}
