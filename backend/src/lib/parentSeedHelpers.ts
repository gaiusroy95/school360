import type { Student } from '@prisma/client';

export function studentFullNameLocal(s: Pick<Student, 'firstName' | 'lastName'>) {
  return [s.firstName, s.lastName].filter(Boolean).join(' ').trim();
}
