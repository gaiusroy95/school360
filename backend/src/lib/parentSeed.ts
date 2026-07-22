import { ParentRelationship } from '@prisma/client';
import { prisma } from './prisma.js';
import { makeParentKey } from './parents.js';
import { studentFullNameLocal } from './parentSeedHelpers.js';

/** Enrich existing demo data with PES signals: read receipts, inbound messages, app sessions. */
export async function enrichParentPESDemoData(institutionId: string) {
  const inboundCount = await prisma.parentCommunication.count({
    where: { institutionId, direction: 'INBOUND' },
  });
  if (inboundCount > 0) return { enriched: false };

  const comms = await prisma.parentCommunication.findMany({
    where: { institutionId },
    orderBy: { createdAt: 'asc' },
    take: 40,
  });

  for (let i = 0; i < comms.length; i++) {
    const c = comms[i];
    const sentAt = c.sentAt || c.createdAt;
    const readWithin24h = i % 4 !== 3;
    await prisma.parentCommunication.update({
      where: { id: c.id },
      data: {
        direction: 'OUTBOUND',
        readAt: readWithin24h ? new Date(sentAt.getTime() + 2 * 3600000) : null,
        status: readWithin24h ? 'READ' : i % 4 === 3 ? 'DELIVERED' : c.status,
      },
    });
  }

  const students = await prisma.student.findMany({
    where: { institutionId },
    take: 12,
    orderBy: { enrolledAt: 'desc' },
  });

  let inbound = 0;
  let sessions = 0;
  const now = Date.now();

  for (let i = 0; i < students.length; i++) {
    const s = students[i];
    const name = studentFullNameLocal(s);
    const parentKey = makeParentKey(ParentRelationship.FATHER, s.fatherMobile || '', s.fatherName || name);

    if (i % 2 === 0) {
      await prisma.parentCommunication.create({
        data: {
          institutionId,
          recordId: `COM-IN-${7000 + i}`,
          studentId: s.id,
          parentRelationship: ParentRelationship.FATHER,
          channel: i % 3 === 0 ? 'APP' : 'EMAIL',
          direction: 'INBOUND',
          subject: 'Parent inquiry',
          body: `Question about ${name}'s homework assignment.`,
          sentAt: new Date(now - i * 86400000),
          status: 'READ',
          category: 'general',
        },
      });
      inbound += 1;
    }

    const loginCount = i % 4 === 0 ? 5 : i % 4 === 1 ? 1 : 0;
    for (let j = 0; j < loginCount; j++) {
      await prisma.parentAppSession.create({
        data: {
          institutionId,
          parentKey,
          studentId: s.id,
          loginAt: new Date(now - (i + j) * 86400000 * 2),
          durationMinutes: 8 + j * 3,
        },
      });
      sessions += 1;
    }
  }

  return { enriched: true, inbound, sessions };
}

export async function seedParentDemoData(institutionId: string) {
  const existing = await prisma.parentEngagementEvent.count({ where: { institutionId } });
  if (existing > 0) {
    await enrichParentPESDemoData(institutionId);
    return { engagements: 0, communications: 0, feedbacks: 0, meetings: 0, consents: 0 };
  }

  const students = await prisma.student.findMany({
    where: { institutionId },
    take: 20,
    orderBy: { enrolledAt: 'desc' },
  });
  if (students.length === 0) return { engagements: 0, communications: 0, feedbacks: 0, meetings: 0, consents: 0 };

  let engagements = 0;
  let communications = 0;
  let feedbacks = 0;
  let meetings = 0;
  let consents = 0;

  const now = new Date();

  for (let i = 0; i < Math.min(students.length, 8); i++) {
    const s = students[i];
    const name = studentFullNameLocal(s);
    const sentAt = new Date(now.getTime() - i * 86400000 + 3600000);

    await prisma.parentEngagementEvent.create({
      data: {
        institutionId,
        recordId: `ENG-${2000 + i + 1}`,
        studentId: s.id,
        parentRelationship: ParentRelationship.FATHER,
        title: 'PTM Follow-up',
        description: `Discuss progress for ${name}`,
        engagementType: 'Meeting',
        plannedAt: new Date(now.getTime() + (i - 4) * 86400000 * 3),
        completedAt: i % 3 === 0 ? new Date() : null,
        outcome: i % 3 === 0 ? 'Positive discussion on academics' : '',
        studentFeedbackNotes: i % 2 === 0 ? 'Student appreciates parent support' : '',
        status: i % 3 === 0 ? 'COMPLETED' : 'PLANNED',
      },
    });
    engagements += 1;

    await prisma.parentCommunication.create({
      data: {
        institutionId,
        recordId: `COM-${3000 + i + 1}`,
        studentId: s.id,
        parentRelationship: ParentRelationship.FATHER,
        channel: i % 2 === 0 ? 'SMS' : 'EMAIL',
        direction: 'OUTBOUND',
        subject: i % 4 === 0 ? 'Absence Alert' : 'Academic Update',
        body: i % 4 === 0 ? `${name} was absent today.` : `Mid-term scores shared for ${name}.`,
        plannedAt: new Date(now.getTime() - i * 86400000),
        sentAt,
        readAt: i % 3 !== 2 ? new Date(sentAt.getTime() + 3600000) : null,
        status: i % 3 !== 2 ? 'READ' : 'SENT',
        isImportant: i % 4 === 0,
        category: i % 4 === 0 ? 'absence_alert' : 'academic',
        academicData: i % 4 !== 0 ? { exam: 'Mid-Term', score: 72 + i } : {},
        teacherFeedback: i % 3 === 0 ? 'Parent responsive and cooperative' : '',
      },
    });
    communications += 1;

    if (i < 5) {
      await prisma.parentFeedback.create({
        data: {
          institutionId,
          recordId: `FB-${4000 + i + 1}`,
          studentId: s.id,
          parentRelationship: ParentRelationship.FATHER,
          parentName: s.fatherName || 'Parent',
          rating: 4 + (i % 2),
          category: 'Academic',
          message: 'Satisfied with school communication and support.',
          submittedAt: new Date(now.getTime() - i * 86400000 * 2),
        },
      });
      feedbacks += 1;
    }

    await prisma.parentMeeting.create({
      data: {
        institutionId,
        recordId: `PTM-${5000 + i + 1}`,
        studentId: s.id,
        className: s.className,
        sectionName: s.sectionName,
        studentName: name,
        fatherName: s.fatherName,
        scheduledAt: new Date(now.getTime() + (i + 1) * 86400000 * 5),
        conductedAt: i % 4 === 0 ? new Date() : null,
        discussionNotes: i % 4 === 0 ? 'Discussed homework and attendance.' : '',
        photoUrls: [],
        attendees: s.fatherName || 'Parent',
        status: i % 4 === 0 ? 'COMPLETED' : 'SCHEDULED',
      },
    });
    meetings += 1;
  }

  const template = await prisma.parentConsentTemplate.create({
    data: {
      institutionId,
      recordId: 'CON-6001',
      title: 'Extra Sports Class Consent',
      description: 'Permission for weekend sports coaching',
      category: 'Sports',
      academicYear: students[0]?.academicYear || '2025-26',
      status: 'ACTIVE',
      formFields: [{ label: 'Acknowledge risk', type: 'checkbox' }],
    },
  });

  for (const s of students.slice(0, 5)) {
    await prisma.parentConsentResponse.create({
      data: {
        institutionId,
        templateId: template.id,
        studentId: s.id,
        parentRelationship: ParentRelationship.FATHER,
        status: 'PENDING',
      },
    });
    consents += 1;
  }

  await enrichParentPESDemoData(institutionId);

  return { engagements, communications, feedbacks, meetings, consents };
}
