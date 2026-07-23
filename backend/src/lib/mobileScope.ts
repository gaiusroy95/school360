import type { MobileAuthUser } from './mobileAuth.js';
import { assertStudentAccess } from './mobileAuth.js';

export function resolveStudentId(user: MobileAuthUser, requested?: string): string {
  if (user.role === 'STUDENT') {
    if (!user.studentId) throw new Error('Student account is not linked');
    if (requested && requested !== user.studentId) {
      throw new Error('Access denied for this student');
    }
    return user.studentId;
  }

  if (user.role === 'PARENT') {
    const studentId = requested || user.activeStudentId || user.studentIds[0];
    if (!studentId) throw new Error('studentId is required');
    assertStudentAccess(user, studentId);
    return studentId;
  }

  throw new Error('This endpoint is only available to student and parent accounts');
}
