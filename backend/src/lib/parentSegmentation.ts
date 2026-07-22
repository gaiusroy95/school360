import type { DerivedParentContact } from './parents.js';
import { deriveParentContacts, loadStudentsForParents } from './parents.js';
import { prisma } from './prisma.js';
import {
  CHILD_PERFORMANCE_HIGH_THRESHOLD,
  PES_HIGH_THRESHOLD,
  computeChildPerformanceScore,
  computeParentPES,
  type PESResult,
} from './parentPES.js';

export type ParentSegmentId = 'champions' | 'silent_trusters' | 'anxious_intense' | 'disconnected';

export type EngagementPlan = {
  goal: string;
  platformActions: string[];
  studentImpact: string;
};

export type SegmentDefinition = {
  id: ParentSegmentId;
  name: string;
  dataProfile: string;
  reality: string;
  color: string;
  engagementPlan: EngagementPlan;
};

export const PARENT_SEGMENTS: SegmentDefinition[] = [
  {
    id: 'champions',
    name: 'The Champions',
    dataProfile: 'High PES + High Child Performance',
    reality:
      'Highly involved. They read every update, attend every meeting, and their child is thriving.',
    color: '#16a34a',
    engagementPlan: {
      goal: 'Turn them into community advocates without burning them out.',
      platformActions: [
        'Automate monthly milestone reports.',
        'Invite qualitative feedback on new school initiatives.',
        'Offer mentor roles for other parents.',
      ],
      studentImpact: 'Sustains high performance by acknowledging the parent\'s effort.',
    },
  },
  {
    id: 'silent_trusters',
    name: 'The Silent Trusters',
    dataProfile: 'Low PES + High Child Performance',
    reality:
      'Busy but supportive. They don\'t log in often because they trust the school and their child is doing fine.',
    color: '#0ea5e9',
    engagementPlan: {
      goal: 'Keep them informed with zero friction.',
      platformActions: [
        'Send concise weekly or bi-weekly summary dashboards — not daily granular updates.',
        'Use push notifications only for critical events.',
      ],
      studentImpact: 'Maintains stability at home without creating unnecessary anxiety.',
    },
  },
  {
    id: 'anxious_intense',
    name: 'The Anxious/Intense',
    dataProfile: 'High PES + Mixed Child Performance',
    reality:
      'High-stress. They message the teacher constantly and over-monitor grades, which can stress the child.',
    color: '#f59e0b',
    engagementPlan: {
      goal: 'Build trust and establish healthy boundaries.',
      platformActions: [
        'Route queries into scheduled weekly office hours instead of instant messaging.',
        'Send structured qualitative feedback focusing on effort rather than grades.',
      ],
      studentImpact: 'Reduces academic pressure and anxiety on the student at home.',
    },
  },
  {
    id: 'disconnected',
    name: 'The Disconnected',
    dataProfile: 'Low PES + Low Child Performance',
    reality:
      'The highest risk group. They do not read messages or attend meetings, and the child is struggling.',
    color: '#dc2626',
    engagementPlan: {
      goal: 'Re-establish contact using low-barrier, highly positive messaging.',
      platformActions: [
        'Trigger a "positive news only" protocol — short encouraging messages about small wins.',
        'Switch channels if ignored (email → SMS).',
        'Schedule a low-pressure PTM focused on support, not blame.',
      ],
      studentImpact:
        'Creates a positive reinforcement loop at home, critical for turning around a struggling student.',
    },
  },
];

export function assignSegment(pesScore: number, childScore: number): ParentSegmentId {
  const highPes = pesScore >= PES_HIGH_THRESHOLD;
  const highChild = childScore >= CHILD_PERFORMANCE_HIGH_THRESHOLD;
  if (highPes && highChild) return 'champions';
  if (!highPes && highChild) return 'silent_trusters';
  if (highPes && !highChild) return 'anxious_intense';
  return 'disconnected';
}

export type ParentSegmentRecord = {
  parentKey: string;
  name: string;
  relationship: string;
  mobile: string;
  students: { studentId: string; name: string; class: string }[];
  status: string;
  pesScore: number;
  pesComponents: PESResult['components'];
  childPerformanceScore: number;
  childPerformanceLabel: string;
  segmentId: ParentSegmentId;
  segmentName: string;
  flags: string[];
};

export async function buildParentSegmentRecord(
  institutionId: string,
  parent: DerivedParentContact,
): Promise<ParentSegmentRecord> {
  const [pes, child] = await Promise.all([
    computeParentPES(institutionId, parent),
    computeChildPerformanceScore(
      institutionId,
      parent.children.map((c) => c.studentId),
    ),
  ]);

  const segmentId = assignSegment(pes.score, child.score);
  const segment = PARENT_SEGMENTS.find((s) => s.id === segmentId)!;
  const flags: string[] = [];
  if (pes.components.readRate < 50) flags.push('Low message read rate');
  if (pes.components.attendance < 50) flags.push('Poor event attendance');
  if (child.label === 'low') flags.push('Child performance below target');
  if (segmentId === 'disconnected') flags.push('Needs immediate outreach');

  return {
    parentKey: parent.parentKey,
    name: parent.name,
    relationship: parent.relationshipLabel,
    mobile: parent.mobile,
    students: parent.children.map((c) => ({
      studentId: c.studentId,
      name: c.name,
      class: c.classGroup,
    })),
    status: parent.status,
    pesScore: pes.score,
    pesComponents: pes.components,
    childPerformanceScore: child.score,
    childPerformanceLabel: child.label,
    segmentId,
    segmentName: segment.name,
    flags,
  };
}

export async function getParentCategoryAnalytics(
  institutionId: string,
  opts?: { segment?: ParentSegmentId; academicYear?: string; q?: string },
) {
  const students = await loadStudentsForParents(institutionId, {
    academicYear: opts?.academicYear,
    q: opts?.q,
  });
  const parents = deriveParentContacts(students);

  const records: ParentSegmentRecord[] = [];
  for (const p of parents) {
    records.push(await buildParentSegmentRecord(institutionId, p));
  }

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const studentToParentKeys = new Map<string, string[]>();
  for (const r of records) {
    for (const s of r.students) {
      const list = studentToParentKeys.get(s.studentId) || [];
      list.push(r.parentKey);
      studentToParentKeys.set(s.studentId, list);
    }
  }

  const activeParentKeys = new Set<string>();
  const [monthComms, monthMeetings, monthFeedbacks] = await Promise.all([
    prisma.parentCommunication.findMany({
      where: { institutionId, createdAt: { gte: monthStart } },
      select: { studentId: true },
    }),
    prisma.parentMeeting.findMany({
      where: { institutionId, scheduledAt: { gte: monthStart } },
      select: { studentId: true },
    }),
    prisma.parentFeedback.findMany({
      where: { institutionId, submittedAt: { gte: monthStart } },
      select: { studentId: true },
    }),
  ]);
  for (const row of [...monthComms, ...monthMeetings, ...monthFeedbacks]) {
    for (const pk of studentToParentKeys.get(row.studentId) || []) {
      activeParentKeys.add(pk);
    }
  }

  const [pendingConsents] = await Promise.all([
    prisma.parentConsentResponse.count({
      where: { institutionId, status: 'PENDING' },
    }),
  ]);

  const segmentCounts = {
    champions: 0,
    silent_trusters: 0,
    anxious_intense: 0,
    disconnected: 0,
  };
  for (const r of records) {
    segmentCounts[r.segmentId] += 1;
  }

  const activeOpen = records.filter((r) => r.status === 'Active').length;
  const needsAction = records.filter(
    (r) => r.segmentId === 'disconnected' || r.segmentId === 'anxious_intense',
  ).length;

  const filtered = opts?.segment
    ? records.filter((r) => r.segmentId === opts.segment)
    : records;

  const sorted = [...filtered].sort((a, b) => a.childPerformanceScore - b.childPerformanceScore);

  const segments = PARENT_SEGMENTS.map((def) => ({
    ...def,
    count: segmentCounts[def.id],
    percent: records.length ? Math.round((segmentCounts[def.id] / records.length) * 100) : 0,
  }));

  return {
    summary: {
      totalParentCategories: records.length,
      activeOpen,
      pending: needsAction + Math.min(pendingConsents, records.length),
      thisMonth: activeParentKeys.size,
      segmented: records.length,
    },
    segments,
    parents: sorted.map((r) => ({
      parentKey: r.parentKey,
      name: r.name,
      relationship: r.relationship,
      mobile: r.mobile,
      email: '',
      students: r.students,
      status: r.status,
      lastComm: '—',
      categoryLabels: [],
      engagementScore: r.pesScore,
      engagementTier: r.segmentId,
      pesScore: r.pesScore,
      childPerformanceScore: r.childPerformanceScore,
      segmentId: r.segmentId,
      segmentName: r.segmentName,
      flags: r.flags,
      pesComponents: r.pesComponents,
    })),
    total: sorted.length,
  };
}
