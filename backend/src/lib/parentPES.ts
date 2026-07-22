import type { DerivedParentContact } from './parents.js';
import { prisma } from './prisma.js';

/** PES = w1×A + w2×R + w3×M + w4×F */
export const PES_WEIGHTS = {
  attendance: 0.35,
  readRate: 0.30,
  proactiveMessages: 0.20,
  feedback: 0.15,
} as const;

export const PES_HIGH_THRESHOLD = 60;
export const CHILD_PERFORMANCE_HIGH_THRESHOLD = 65;

const DAY_MS = 24 * 60 * 60 * 1000;
const WINDOW_DAYS = 90;

export type PESComponents = {
  attendance: number;
  readRate: number;
  proactiveMessages: number;
  feedback: number;
  appLoginBonus: number;
};

export type PESResult = {
  score: number;
  components: PESComponents;
  breakdown: {
    label: string;
    value: number;
    weight: number;
    weighted: number;
  }[];
};

function clamp(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(n)));
}

export async function computePESComponents(
  institutionId: string,
  parent: DerivedParentContact,
): Promise<PESComponents> {
  const studentIds = parent.children.map((c) => c.studentId);
  const now = Date.now();
  const windowStart = new Date(now - WINDOW_DAYS * DAY_MS);

  const [meetings, engagements, comms, feedbacks, consents, sessions] = await Promise.all([
    prisma.parentMeeting.findMany({
      where: { institutionId, studentId: { in: studentIds }, scheduledAt: { gte: windowStart } },
    }),
    prisma.parentEngagementEvent.findMany({
      where: { institutionId, studentId: { in: studentIds }, plannedAt: { gte: windowStart } },
    }),
    prisma.parentCommunication.findMany({
      where: { institutionId, studentId: { in: studentIds }, createdAt: { gte: windowStart } },
    }),
    prisma.parentFeedback.findMany({
      where: { institutionId, studentId: { in: studentIds } },
    }),
    prisma.parentConsentResponse.findMany({
      where: { institutionId, studentId: { in: studentIds } },
    }),
    prisma.parentAppSession.findMany({
      where: { institutionId, parentKey: parent.parentKey, loginAt: { gte: windowStart } },
    }),
  ]);

  const events = [...meetings, ...engagements];
  const completed =
    meetings.filter((m) => m.status === 'COMPLETED').length +
    engagements.filter((e) => e.status === 'COMPLETED').length;
  const missed =
    meetings.filter((m) => m.status === 'MISSED').length +
    engagements.filter((e) => e.status === 'MISSED').length;
  const scheduled = events.length || 1;
  const attendance = clamp(((completed / scheduled) * 100) - missed * 8);

  const outbound = comms.filter((c) => c.direction === 'OUTBOUND' || !c.direction);
  const sentOutbound = outbound.filter((c) => c.sentAt && ['SENT', 'DELIVERED', 'READ'].includes(c.status));
  let readCount = 0;
  for (const c of sentOutbound) {
    if (c.status === 'READ' || c.readAt) {
      const sent = c.sentAt!.getTime();
      const read = c.readAt?.getTime() ?? sent;
      if (read - sent <= DAY_MS) readCount += 1;
      else if (c.status === 'READ') readCount += 0.7;
    } else if (c.status === 'DELIVERED') {
      readCount += 0.5;
    }
  }
  const readRate = sentOutbound.length > 0 ? clamp((readCount / sentOutbound.length) * 100) : 40;

  const inbound = comms.filter((c) => c.direction === 'INBOUND');
  const proactiveMessages = clamp(Math.min(100, inbound.length * 12 + sessions.length * 5));

  const sharedConsents = consents.length || 1;
  const respondedConsents = consents.filter((c) => c.status !== 'PENDING').length;
  const feedbackScore = feedbacks.length > 0 ? 70 + Math.min(30, feedbacks.length * 8) : 20;
  const consentScore = (respondedConsents / sharedConsents) * 100;
  const feedback = clamp(feedbackScore * 0.7 + consentScore * 0.3);

  const appLoginBonus = clamp(sessions.length * 8);

  return { attendance, readRate, proactiveMessages, feedback, appLoginBonus };
}

export function computePESScore(components: PESComponents): PESResult {
  const w = PES_WEIGHTS;
  const base =
    w.attendance * components.attendance +
    w.readRate * components.readRate +
    w.proactiveMessages * components.proactiveMessages +
    w.feedback * components.feedback;
  const score = clamp(base + components.appLoginBonus * 0.05);

  const breakdown = [
    { label: 'Event Attendance (A)', value: components.attendance, weight: w.attendance, weighted: w.attendance * components.attendance },
    { label: 'Message Read Rate (R)', value: components.readRate, weight: w.readRate, weighted: w.readRate * components.readRate },
    { label: 'Proactive Messages (M)', value: components.proactiveMessages, weight: w.proactiveMessages, weighted: w.proactiveMessages * components.proactiveMessages },
    { label: 'Feedback / Surveys (F)', value: components.feedback, weight: w.feedback, weighted: w.feedback * components.feedback },
  ];

  return { score, components, breakdown };
}

export async function computeParentPES(
  institutionId: string,
  parent: DerivedParentContact,
): Promise<PESResult> {
  const components = await computePESComponents(institutionId, parent);
  return computePESScore(components);
}

export async function computeChildPerformanceScore(
  institutionId: string,
  studentIds: string[],
): Promise<{ score: number; label: 'high' | 'mixed' | 'low' }> {
  if (studentIds.length === 0) return { score: 50, label: 'mixed' };

  const records = await prisma.studentAnalyticsRecord.findMany({
    where: { institutionId, studentId: { in: studentIds } },
  });

  if (records.length === 0) {
    const students = await prisma.student.findMany({ where: { id: { in: studentIds } } });
    const avgEntrance =
      students.reduce((s, st) => s + (st.entranceScore ?? 60), 0) / (students.length || 1);
    const score = clamp(avgEntrance);
    return {
      score,
      label: score >= CHILD_PERFORMANCE_HIGH_THRESHOLD ? 'high' : score < 55 ? 'low' : 'mixed',
    };
  }

  let total = 0;
  for (const r of records) {
    const s = r.scores as {
      growthScore?: number;
      academicPerformance?: number;
      attendanceScore?: number;
    };
    const growth = s.growthScore ?? 60;
    const academic = s.academicPerformance ?? 60;
    const attendance = s.attendanceScore ?? 60;
    total += growth * 0.4 + academic * 0.4 + attendance * 0.2;
  }
  const score = clamp(total / records.length);
  const label: 'high' | 'mixed' | 'low' =
    score >= CHILD_PERFORMANCE_HIGH_THRESHOLD ? 'high' : score < 55 ? 'low' : 'mixed';
  return { score, label };
}
