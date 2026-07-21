import { prisma } from './prisma.js';

export const DEFAULT_PASS_MARKS_PERCENT = 40;

export async function getInstitutionPassMarks(institutionId: string): Promise<number> {
  const settings = await prisma.admissionTestSettings.findUnique({
    where: { institutionId },
  });
  return settings?.passMarksPercent ?? DEFAULT_PASS_MARKS_PERCENT;
}

export async function getPassMarksForTest(
  testId: string,
  institutionId: string,
): Promise<number> {
  const test = await prisma.admissionTest.findFirst({
    where: { id: testId, institutionId },
    select: { passMarksPercent: true },
  });
  if (test?.passMarksPercent != null) return test.passMarksPercent;
  return getInstitutionPassMarks(institutionId);
}

export async function ensureAdmissionTestSettings(institutionId: string) {
  return prisma.admissionTestSettings.upsert({
    where: { institutionId },
    create: { institutionId, passMarksPercent: DEFAULT_PASS_MARKS_PERCENT },
    update: {},
  });
}
