import type { DerivedParentContact } from './parents.js';
import { computeParentPES, PES_HIGH_THRESHOLD } from './parentPES.js';

export type ParentEngagementScoreResult = {
  score: number;
  tier: 'lagging' | 'average' | 'exceptional';
  flags: string[];
};

export async function computeParentEngagementScore(
  institutionId: string,
  parent: DerivedParentContact,
): Promise<ParentEngagementScoreResult> {
  const pes = await computeParentPES(institutionId, parent);
  const flags: string[] = [];
  if (pes.components.readRate < 50) flags.push('Low message read rate');
  if (pes.components.attendance < 50) flags.push('Poor event attendance');
  if (pes.components.feedback < 40) flags.push('No feedback submitted');
  if (pes.components.proactiveMessages < 30) flags.push('Low proactive engagement');

  let tier: ParentEngagementScoreResult['tier'] = 'average';
  if (pes.score < PES_HIGH_THRESHOLD - 15) tier = 'lagging';
  else if (pes.score >= PES_HIGH_THRESHOLD + 15 && flags.length === 0) tier = 'exceptional';

  return { score: pes.score, tier, flags };
}

export async function scoreParents(
  institutionId: string,
  parents: DerivedParentContact[],
): Promise<Map<string, ParentEngagementScoreResult>> {
  const map = new Map<string, ParentEngagementScoreResult>();
  for (const p of parents) {
    map.set(p.parentKey, await computeParentEngagementScore(institutionId, p));
  }
  return map;
}

export function monthlyEngagementTrend(
  communications: { sentAt: Date | null; plannedAt: Date | null; createdAt: Date }[],
  engagements: { plannedAt: Date; status: string }[],
  meetings: { scheduledAt: Date; status: string }[],
) {
  const months = ['Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May'];
  return months.map((name, i) => {
    const monthIndex = i < 7 ? i + 5 : i - 7;
    const messages = communications.filter((c) => {
      const d = c.sentAt || c.plannedAt || c.createdAt;
      return d.getMonth() === monthIndex;
    }).length;
    const ptm = meetings.filter((m) => m.scheduledAt.getMonth() === monthIndex).length;
    const logins = engagements.filter((e) => e.plannedAt.getMonth() === monthIndex && e.status === 'COMPLETED').length;
    return { name, messages, ptm, logins };
  });
}
