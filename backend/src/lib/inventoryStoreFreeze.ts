import { prisma } from './prisma.js';

const ACTIVE_AUDIT_STATUSES = ['DRAFT', 'FROZEN', 'IN_PROGRESS', 'VARIANCE_REVIEW'];

export async function isStoreFrozenForAudit(institutionId: string, storeId: string) {
  const session = await prisma.invAuditSession.findFirst({
    where: {
      institutionId,
      storeId,
      storeFrozen: true,
      status: { in: ACTIVE_AUDIT_STATUSES },
    },
    select: { sessionCode: true, status: true },
  });
  return session;
}

export async function assertStoreOperationsAllowed(institutionId: string, storeId: string) {
  const frozen = await isStoreFrozenForAudit(institutionId, storeId);
  if (frozen) {
    throw new Error(
      `Store operations are frozen for audit ${frozen.sessionCode} (${frozen.status.replace(/_/g, ' ')}). Complete or cancel the audit session first.`,
    );
  }
}
