import { Router } from 'express';
import { z } from 'zod';
import {
  ApplicationStatus,
  EnquiryActivityType,
  EnquiryStatus,
  FollowUpMode,
  Prisma,
} from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { getDefaultInstitutionId } from '../lib/institution.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../lib/asyncHandler.js';

export const counsellingRouter = Router();
counsellingRouter.use(requireAuth);

export const INTERACTION_TYPES = [
  'Phone Call',
  'Campus Visit',
  'Email',
  'WhatsApp',
  'Virtual Meeting',
] as const;

export const SENTIMENTS = [
  'Highly Positive',
  'Positive',
  'Neutral',
  'Concerned',
  'Negative',
] as const;

export const ENGAGEMENT_LEVELS = [
  'Very Active',
  'Active',
  'Passive',
  'Unresponsive',
] as const;

export const RISK_FACTORS = [
  'Distance/Transport',
  'High Fees',
  'Academic Competition',
  'Undecided',
  'Competitor School',
  'None',
] as const;

export const ACTION_INTENTS = [
  'Needs Follow-up',
  'Schedule Interview',
  'Send Fee Details',
  'Mark as Lost',
  'Move to Application',
] as const;

const STATUS_DB_TO_UI: Record<EnquiryStatus, string> = {
  NEW: 'New',
  IN_PROCESS: 'In Process',
  FOLLOW_UP: 'Follow Up',
  CONVERTED: 'Converted',
  NOT_INTERESTED: 'Not Interested',
};

function parseOptionalDate(value?: string | null): Date | null {
  if (!value) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) {
    const timeMatch = raw.match(/T(\d{2}):(\d{2})/);
    if (timeMatch) {
      return new Date(
        Number(m[1]),
        Number(m[2]) - 1,
        Number(m[3]),
        Number(timeMatch[1]),
        Number(timeMatch[2]),
        0,
        0,
      );
    }
    return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 0, 0, 0, 0);
  }
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

function interactionToFollowUpMode(type: string): FollowUpMode {
  switch (type) {
    case 'Campus Visit':
      return FollowUpMode.CAMPUS_VISIT;
    case 'Email':
      return FollowUpMode.EMAIL;
    case 'Virtual Meeting':
      return FollowUpMode.VIDEO_CALL;
    case 'WhatsApp':
    case 'Phone Call':
    default:
      return FollowUpMode.PHONE;
  }
}

function serializeLead(e: {
  id: string;
  enquiryId: string;
  enquirerName: string;
  mobile: string;
  email: string;
  classInterested: string;
  status: EnquiryStatus;
  assignedTo: string;
  nextFollowUp: Date | null;
  lastContactedAt: Date | null;
  lastSentiment: string | null;
  lastEngagement: string | null;
  lastRiskFactor: string | null;
  lastRiskDetails: string | null;
  enquiryDate: Date;
}) {
  return {
    id: e.id,
    enquiryId: e.enquiryId,
    enquirerName: e.enquirerName,
    mobile: e.mobile,
    email: e.email,
    classInterested: e.classInterested,
    status: STATUS_DB_TO_UI[e.status],
    assignedTo: e.assignedTo,
    nextFollowUp: e.nextFollowUp ? e.nextFollowUp.toISOString() : '',
    lastContactedAt: e.lastContactedAt ? e.lastContactedAt.toISOString() : '',
    lastSentiment: e.lastSentiment || '',
    lastEngagement: e.lastEngagement || '',
    lastRiskFactor: e.lastRiskFactor || '',
    lastRiskDetails: e.lastRiskDetails || '',
    enquiryDate: e.enquiryDate.toISOString(),
  };
}

function serializeLog(log: {
  id: string;
  interactionType: string;
  sentiment: string;
  engagement: string;
  riskFactor: string;
  riskDetails: string | null;
  remarks: string;
  actionIntent: string;
  nextFollowUp: Date | null;
  counselorName: string;
  createdAt: Date;
}) {
  return {
    id: log.id,
    interactionType: log.interactionType,
    sentiment: log.sentiment,
    engagement: log.engagement,
    riskFactor: log.riskFactor,
    riskDetails: log.riskDetails || '',
    remarks: log.remarks,
    actionIntent: log.actionIntent,
    nextFollowUp: log.nextFollowUp ? log.nextFollowUp.toISOString() : '',
    counselorName: log.counselorName,
    createdAt: log.createdAt.toISOString(),
  };
}

async function logActivity(
  enquiryId: string,
  description: string,
  performedBy: string,
  type: EnquiryActivityType = EnquiryActivityType.SYSTEM,
) {
  await prisma.enquiryActivity.create({
    data: { enquiryId, type, description, performedBy },
  });
}

async function nextApplicationCode(institutionId: string) {
  const count = await prisma.application.count({ where: { institutionId } });
  return `APP${String(10000 + count + 1).padStart(5, '0')}`;
}

const sessionSchema = z.object({
  interactionType: z.enum(INTERACTION_TYPES),
  sentiment: z.enum(SENTIMENTS),
  engagement: z.enum(ENGAGEMENT_LEVELS),
  riskFactor: z.enum(RISK_FACTORS),
  riskDetails: z.string().optional().nullable(),
  remarks: z.string().min(1),
  actionIntent: z.enum(ACTION_INTENTS),
  nextFollowUp: z.string().optional().nullable(),
  counselorName: z.string().optional(),
});

counsellingRouter.get('/meta', (_req, res) => {
  return res.json({
    interactionTypes: INTERACTION_TYPES,
    sentiments: SENTIMENTS,
    engagementLevels: ENGAGEMENT_LEVELS,
    riskFactors: RISK_FACTORS,
    actionIntents: ACTION_INTENTS,
  });
});

counsellingRouter.get(
  '/queue',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const sort = String(req.query.sort || 'followUpDue');
    const assignedTo = req.query.assignedTo ? String(req.query.assignedTo) : undefined;

    const enquiries = await prisma.enquiry.findMany({
      where: {
        institutionId,
        status: { notIn: [EnquiryStatus.CONVERTED, EnquiryStatus.NOT_INTERESTED] },
        ...(assignedTo ? { assignedTo } : {}),
      },
    });

    const sorted = [...enquiries].sort((a, b) => {
      if (sort === 'lastContacted') {
        const ad = a.lastContactedAt?.getTime() ?? a.enquiryDate.getTime();
        const bd = b.lastContactedAt?.getTime() ?? b.enquiryDate.getTime();
        return bd - ad;
      }
      const ad = a.nextFollowUp?.getTime() ?? Number.MAX_SAFE_INTEGER;
      const bd = b.nextFollowUp?.getTime() ?? Number.MAX_SAFE_INTEGER;
      return ad - bd;
    });

    return res.json({ leads: sorted.map(serializeLead) });
  }),
);

counsellingRouter.get(
  '/:enquiryId',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const enquiry = await prisma.enquiry.findFirst({
      where: { id: req.params.enquiryId, institutionId },
    });
    if (!enquiry) return res.status(404).json({ error: 'Enquiry not found' });

    const logs = await prisma.counselingLog.findMany({
      where: { enquiryId: enquiry.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return res.json({
      lead: serializeLead(enquiry),
      logs: logs.map(serializeLog),
    });
  }),
);

counsellingRouter.post(
  '/:enquiryId/sessions',
  asyncHandler(async (req, res) => {
    const parsed = sessionSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const institutionId = await getDefaultInstitutionId();
    const enquiry = await prisma.enquiry.findFirst({
      where: { id: req.params.enquiryId, institutionId },
    });
    if (!enquiry) return res.status(404).json({ error: 'Enquiry not found' });

    const counselorName =
      parsed.data.counselorName?.trim() ||
      req.user?.email ||
      enquiry.assignedTo ||
      'Counselor';

    const nextFollowUp = parseOptionalDate(parsed.data.nextFollowUp);
    const now = new Date();

    if (parsed.data.nextFollowUp && !nextFollowUp) {
      return res.status(400).json({ error: 'Invalid next follow-up date' });
    }
    if (nextFollowUp && nextFollowUp.getTime() <= now.getTime()) {
      return res.status(400).json({ error: 'Next follow-up must be a future date/time' });
    }

    const needsFollowUpDate =
      parsed.data.actionIntent === 'Needs Follow-up' ||
      parsed.data.actionIntent === 'Schedule Interview';
    if (needsFollowUpDate && !nextFollowUp) {
      return res.status(400).json({
        error: 'Next follow-up date is required for this action',
      });
    }

    const log = await prisma.counselingLog.create({
      data: {
        enquiryId: enquiry.id,
        interactionType: parsed.data.interactionType,
        sentiment: parsed.data.sentiment,
        engagement: parsed.data.engagement,
        riskFactor: parsed.data.riskFactor,
        riskDetails: parsed.data.riskDetails?.trim() || null,
        remarks: parsed.data.remarks.trim(),
        actionIntent: parsed.data.actionIntent,
        nextFollowUp,
        counselorName,
      },
    });

    let newStatus = enquiry.status;
    if (parsed.data.actionIntent === 'Mark as Lost') {
      newStatus = EnquiryStatus.NOT_INTERESTED;
    } else if (enquiry.status === EnquiryStatus.NEW) {
      newStatus = EnquiryStatus.FOLLOW_UP;
    } else if (enquiry.status === EnquiryStatus.IN_PROCESS) {
      newStatus = EnquiryStatus.FOLLOW_UP;
    }

    const updatedEnquiry = await prisma.enquiry.update({
      where: { id: enquiry.id },
      data: {
        lastContactedAt: now,
        lastSentiment: parsed.data.sentiment,
        lastEngagement: parsed.data.engagement,
        lastRiskFactor: parsed.data.riskFactor,
        lastRiskDetails: parsed.data.riskDetails?.trim() || null,
        ...(nextFollowUp ? { nextFollowUp } : {}),
        status: newStatus,
      },
    });

    await logActivity(
      enquiry.id,
      `Counseling session logged (${parsed.data.interactionType}): ${parsed.data.sentiment}, ${parsed.data.engagement}`,
      counselorName,
      parsed.data.interactionType === 'Campus Visit'
        ? EnquiryActivityType.VISIT
        : parsed.data.interactionType === 'Email'
          ? EnquiryActivityType.EMAIL
          : parsed.data.interactionType === 'Phone Call' || parsed.data.interactionType === 'WhatsApp'
            ? EnquiryActivityType.CALL
            : EnquiryActivityType.MEETING,
    );

    if (
      nextFollowUp &&
      (parsed.data.actionIntent === 'Needs Follow-up' ||
        parsed.data.actionIntent === 'Schedule Interview' ||
        parsed.data.actionIntent === 'Send Fee Details')
    ) {
      const title =
        parsed.data.actionIntent === 'Schedule Interview'
          ? `Interview: ${enquiry.enquirerName}`
          : parsed.data.actionIntent === 'Send Fee Details'
            ? `Send fee details: ${enquiry.enquirerName}`
            : `Follow-up: ${enquiry.enquirerName}`;

      await prisma.followUpTask.create({
        data: {
          enquiryId: enquiry.id,
          title,
          mode: interactionToFollowUpMode(parsed.data.interactionType),
          subject: parsed.data.actionIntent,
          discussionNotes: parsed.data.remarks,
          assignedTo: counselorName,
          dueDate: nextFollowUp,
        } as Prisma.FollowUpTaskUncheckedCreateInput,
      });
    }

    if (parsed.data.actionIntent === 'Move to Application') {
      const existing = await prisma.application.findFirst({
        where: {
          enquiryId: enquiry.id,
          status: { not: ApplicationStatus.REJECTED },
        },
      });
      if (!existing) {
        const applicationId = await nextApplicationCode(institutionId);
        await prisma.application.create({
          data: {
            institutionId,
            enquiryId: enquiry.id,
            applicationId,
            submittedBy: counselorName,
            studentName: enquiry.enquirerName,
            classApplied: enquiry.classInterested,
            notes: parsed.data.remarks,
          },
        });
        await prisma.enquiry.update({
          where: { id: enquiry.id },
          data: { status: EnquiryStatus.CONVERTED },
        });
        await logActivity(
          enquiry.id,
          `Application created from counseling session (${applicationId})`,
          counselorName,
        );
      }
    }

    if (parsed.data.actionIntent === 'Mark as Lost') {
      await logActivity(enquiry.id, 'Lead marked as lost during counseling', counselorName);
    }

    const freshEnquiry = await prisma.enquiry.findUnique({ where: { id: enquiry.id } });
    const logs = await prisma.counselingLog.findMany({
      where: { enquiryId: enquiry.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return res.status(201).json({
      log: serializeLog(log),
      lead: serializeLead(freshEnquiry || updatedEnquiry),
      logs: logs.map(serializeLog),
    });
  }),
);
