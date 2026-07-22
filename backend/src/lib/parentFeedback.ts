import { ParentRelationship } from '@prisma/client';
import { prisma } from './prisma.js';

export function serializeFeedback(row: {
  id: string;
  recordId: string;
  studentId: string;
  parentRelationship: ParentRelationship;
  parentName: string;
  rating: number;
  category: string;
  message: string;
  submittedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: row.id,
    recordId: row.recordId,
    studentId: row.studentId,
    parentRelationship: row.parentRelationship,
    parentName: row.parentName,
    rating: row.rating,
    category: row.category,
    message: row.message,
    submittedAt: row.submittedAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function nextFeedbackRecordId(institutionId: string) {
  const count = await prisma.parentFeedback.count({ where: { institutionId } });
  return `FB-${String(4000 + count + 1)}`;
}

export async function getFeedbackDashboard(institutionId: string) {
  const [total, avg] = await Promise.all([
    prisma.parentFeedback.count({ where: { institutionId } }),
    prisma.parentFeedback.aggregate({ where: { institutionId, rating: { gt: 0 } }, _avg: { rating: true } }),
  ]);
  return { total, averageRating: avg._avg.rating ? Math.round(avg._avg.rating * 10) / 10 : 0 };
}
