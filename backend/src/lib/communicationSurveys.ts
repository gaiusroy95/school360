import { MobileAppRole, Prisma } from '@prisma/client';
import { prisma } from './prisma.js';
import { deliverPushToTokens } from './pushDelivery.js';
import { fetchAudienceAccounts } from './communicationCirculars.js';
import { sendPushCampaign, seedPushManagement } from './communicationPushManagement.js';

const ACADEMIC_YEARS = ['2023-24', '2024-25', '2025-26', '2026-27'];
const ADMIN_ROLES = new Set(['Super Admin', 'Principal', 'Management', 'Admin', 'Communication Manager']);

const AUDIENCE_LABELS: Record<string, string> = {
  ALL: 'All App Users',
  PARENT: 'All Parents',
  STUDENT: 'All Students',
  STAFF: 'Staff (Teachers & Admin)',
  CLASS: 'Class / Section',
};

const SURVEY_CATEGORIES = [
  { value: 'PTM_FEEDBACK', label: 'PTM Feedback' },
  { value: 'TEACHER_EVAL', label: 'Teacher Evaluation' },
  { value: 'FACILITY', label: 'Facility Feedback' },
  { value: 'EVENT_FEEDBACK', label: 'Event Feedback' },
  { value: 'GENERAL', label: 'General Survey' },
];

const QUESTION_TYPES = [
  { value: 'RATING', label: 'Star Rating (1–5)' },
  { value: 'YES_NO', label: 'Yes / No' },
  { value: 'SINGLE_CHOICE', label: 'Single Choice' },
  { value: 'MULTI_CHOICE', label: 'Multiple Choice' },
  { value: 'TEXT', label: 'Free Text' },
];

export type SurveyQuestionInput = {
  questionText: string;
  questionType?: string;
  options?: string[];
  isRequired?: boolean;
  sortOrder?: number;
};

export type SurveyPayload = {
  title: string;
  description?: string;
  category?: string;
  audienceType?: 'ALL' | 'PARENT' | 'STUDENT' | 'STAFF' | 'CLASS';
  classFilter?: string;
  isAnonymous?: boolean;
  closesAt?: string;
  questions?: SurveyQuestionInput[];
  academicYear?: string;
  userRole?: string;
  createdBy?: string;
};

function canManage(userRole: string) {
  return ADMIN_ROLES.has(userRole);
}

function responseRate(responses: number, target: number) {
  return target > 0 ? Math.round((responses / target) * 1000) / 10 : 0;
}

function audienceRoles(audienceType: string): MobileAppRole[] | null {
  switch (audienceType) {
    case 'PARENT': return ['PARENT'];
    case 'STUDENT': return ['STUDENT'];
    case 'STAFF': return ['TEACHER', 'PRINCIPAL', 'TRANSPORT'];
    default: return null;
  }
}

function accountMatchesAudience(role: MobileAppRole, audienceType: string) {
  const roles = audienceRoles(audienceType);
  if (!roles) return true;
  return roles.includes(role);
}

async function logActivity(
  institutionId: string,
  action: string,
  details: string,
  snapshot: Record<string, unknown> = {},
  performedBy = 'Survey Manager',
) {
  await prisma.commActivityLog.create({
    data: { institutionId, action, details, filterSnapshot: snapshot as Prisma.InputJsonValue, performedBy },
  });
}

function serializeSurveyList(s: {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  audienceType: string;
  audienceLabel: string;
  isAnonymous: boolean;
  closesAt: Date | null;
  targetCount: number;
  responseCount: number;
  pendingCount: number;
  pushSent: boolean;
  createdBy: string;
  publishedAt: Date | null;
  createdAt: Date;
  questions?: { id: string }[];
}) {
  return {
    id: s.id,
    title: s.title,
    descriptionPreview: s.description.slice(0, 120),
    category: s.category,
    categoryLabel: SURVEY_CATEGORIES.find((c) => c.value === s.category)?.label ?? s.category,
    status: s.status,
    audienceLabel: s.audienceLabel,
    isAnonymous: s.isAnonymous,
    closesAt: s.closesAt?.toISOString() ?? null,
    targetCount: s.targetCount,
    responseCount: s.responseCount,
    pendingCount: s.pendingCount,
    responseRate: responseRate(s.responseCount, s.targetCount),
    questionCount: s.questions?.length ?? 0,
    pushSent: s.pushSent,
    createdBy: s.createdBy,
    publishedAt: s.publishedAt?.toISOString() ?? null,
    createdAt: s.createdAt.toISOString(),
  };
}

function aggregateQuestionAnswers(
  question: { id: string; questionText: string; questionType: string; options: unknown },
  answers: { answerText: string; answerValue: number | null; selectedOptions: unknown }[],
) {
  const base = {
    questionId: question.id,
    questionText: question.questionText,
    questionType: question.questionType,
    responseCount: answers.length,
  };

  if (question.questionType === 'RATING') {
    const values = answers.map((a) => a.answerValue).filter((v): v is number => v != null);
    const avg = values.length > 0 ? Math.round((values.reduce((s, v) => s + v, 0) / values.length) * 10) / 10 : 0;
    const distribution = [1, 2, 3, 4, 5].map((n) => ({
      value: n,
      count: values.filter((v) => v === n).length,
    }));
    return { ...base, averageRating: avg, distribution };
  }

  if (question.questionType === 'YES_NO') {
    const yes = answers.filter((a) => a.answerText === 'YES' || a.answerValue === 1).length;
    const no = answers.filter((a) => a.answerText === 'NO' || a.answerValue === 0).length;
    return { ...base, yesCount: yes, noCount: no };
  }

  if (question.questionType === 'SINGLE_CHOICE' || question.questionType === 'MULTI_CHOICE') {
    const opts = Array.isArray(question.options) ? (question.options as string[]) : [];
    const counts: Record<string, number> = {};
    for (const opt of opts) counts[opt] = 0;
    for (const a of answers) {
      const selected = Array.isArray(a.selectedOptions) ? (a.selectedOptions as string[]) : [];
      if (a.answerText && !selected.length) selected.push(a.answerText);
      for (const sel of selected) {
        counts[sel] = (counts[sel] ?? 0) + 1;
      }
    }
    return {
      ...base,
      optionCounts: Object.entries(counts).map(([option, count]) => ({ option, count })),
    };
  }

  return {
    ...base,
    textResponses: answers.map((a) => a.answerText).filter(Boolean).slice(0, 20),
  };
}

export async function getSurveysManagement(
  institutionId: string,
  opts: { academicYear?: string; userRole?: string } = {},
) {
  const academicYear = opts.academicYear ?? '2025-26';
  const userRole = opts.userRole ?? 'Principal';

  const surveys = await prisma.commSurvey.findMany({
    where: { institutionId, academicYear },
    include: { questions: { select: { id: true } } },
    orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
  });

  const active = surveys.filter((s) => s.status === 'ACTIVE');
  const totalTarget = active.reduce((s, sv) => s + sv.targetCount, 0);
  const totalResponses = active.reduce((s, sv) => s + sv.responseCount, 0);

  return {
    academicYear,
    academicYears: ACADEMIC_YEARS,
    userRole,
    permissions: { canManage: canManage(userRole), canPublish: canManage(userRole) },
    kpis: {
      totalSurveys: surveys.length,
      active: active.length,
      drafts: surveys.filter((s) => s.status === 'DRAFT').length,
      closed: surveys.filter((s) => s.status === 'CLOSED').length,
      totalResponses,
      avgResponseRate: responseRate(totalResponses, totalTarget),
      pendingResponses: active.reduce((s, sv) => s + sv.pendingCount, 0),
    },
    surveys: surveys.map(serializeSurveyList),
    categories: SURVEY_CATEGORIES,
    questionTypes: QUESTION_TYPES,
    audienceOptions: Object.entries(AUDIENCE_LABELS).map(([value, label]) => ({ value, label })),
    workflowSteps: [
      'Design Survey Questions',
      'Select Target Audience',
      'Publish to App / Portal',
      'Send Push Notification',
      'Stakeholders Submit Feedback',
      'View Aggregated Results & Analytics',
    ],
    complianceNotes: [
      'Enable anonymous mode to encourage honest feedback without identifying respondents.',
      'Set a close date to automatically stop accepting new responses.',
      'PTM Feedback surveys help improve parent engagement and teacher communication.',
      'Results are available in real-time as responses are submitted.',
    ],
  };
}

export async function getSurveyDetail(institutionId: string, surveyId: string) {
  const survey = await prisma.commSurvey.findFirst({
    where: { id: surveyId, institutionId },
    include: {
      questions: { orderBy: { sortOrder: 'asc' } },
      responses: {
        include: { answers: true },
        orderBy: [{ status: 'asc' }, { submittedAt: 'desc' }],
      },
    },
  });
  if (!survey) throw new Error('Survey not found.');

  const completed = survey.responses.filter((r) => r.status === 'COMPLETED');
  const pending = survey.responses.filter((r) => r.status === 'PENDING');

  const questionAnalytics = survey.questions.map((q) => {
    const qAnswers = completed.flatMap((r) =>
      r.answers.filter((a) => a.questionId === q.id).map((a) => ({
        answerText: a.answerText,
        answerValue: a.answerValue,
        selectedOptions: a.selectedOptions,
      })),
    );
    return aggregateQuestionAnswers(q, qAnswers);
  });

  return {
    survey: serializeSurveyList(survey),
    detail: {
      description: survey.description,
      classFilter: survey.classFilter,
      pushCampaignId: survey.pushCampaignId,
    },
    questions: survey.questions.map((q) => ({
      id: q.id,
      questionText: q.questionText,
      questionType: q.questionType,
      options: Array.isArray(q.options) ? (q.options as string[]) : [],
      isRequired: q.isRequired,
      sortOrder: q.sortOrder,
    })),
    summary: {
      targetCount: survey.targetCount,
      responseCount: survey.responseCount,
      pendingCount: survey.pendingCount,
      responseRate: responseRate(survey.responseCount, survey.targetCount),
    },
    analytics: questionAnalytics,
    completed: completed.map((r) => ({
      id: r.id,
      accountName: survey.isAnonymous ? 'Anonymous' : r.accountName,
      accountRole: survey.isAnonymous ? '' : r.accountRole,
      submittedAt: r.submittedAt?.toISOString() ?? null,
      answers: r.answers.map((a) => ({
        questionId: a.questionId,
        answerText: a.answerText,
        answerValue: a.answerValue,
        selectedOptions: a.selectedOptions,
      })),
    })),
    pending: pending.map((r) => ({
      id: r.id,
      accountName: r.accountName,
      accountRole: r.accountRole,
    })),
  };
}

export async function createSurveyDraft(institutionId: string, payload: SurveyPayload) {
  if (!canManage(payload.userRole ?? '')) throw new Error('Permission denied.');
  if (!payload.title?.trim()) throw new Error('Survey title is required.');
  if (!payload.questions?.length) throw new Error('At least one question is required.');

  const audienceType = payload.audienceType ?? 'ALL';
  const survey = await prisma.commSurvey.create({
    data: {
      institutionId,
      title: payload.title.trim(),
      description: payload.description?.trim() ?? '',
      category: payload.category ?? 'GENERAL',
      audienceType,
      audienceLabel: AUDIENCE_LABELS[audienceType] ?? audienceType,
      classFilter: payload.classFilter ?? '',
      isAnonymous: payload.isAnonymous ?? false,
      closesAt: payload.closesAt ? new Date(payload.closesAt) : null,
      createdBy: payload.createdBy ?? payload.userRole ?? 'Survey Manager',
      academicYear: payload.academicYear ?? '2025-26',
      status: 'DRAFT',
    },
  });

  for (let i = 0; i < payload.questions.length; i++) {
    const q = payload.questions[i];
    await prisma.commSurveyQuestion.create({
      data: {
        institutionId,
        surveyId: survey.id,
        questionText: q.questionText.trim(),
        questionType: q.questionType ?? 'RATING',
        options: (q.options ?? []) as Prisma.InputJsonValue,
        isRequired: q.isRequired ?? true,
        sortOrder: q.sortOrder ?? i,
      },
    });
  }

  await logActivity(institutionId, 'SURVEY_DRAFT', `Draft created: ${survey.title}`, { surveyId: survey.id });
  return { message: 'Survey draft saved.', surveyId: survey.id };
}

export async function publishSurvey(
  institutionId: string,
  surveyId: string,
  opts: { userRole?: string; sendPush?: boolean } = {},
) {
  if (!canManage(opts.userRole ?? '')) throw new Error('Permission denied.');

  const survey = await prisma.commSurvey.findFirst({
    where: { id: surveyId, institutionId },
    include: { questions: true },
  });
  if (!survey) throw new Error('Survey not found.');
  if (survey.status !== 'DRAFT') throw new Error('Survey is already published.');
  if (survey.questions.length === 0) throw new Error('Add at least one question before publishing.');

  const accounts = await fetchAudienceAccounts(institutionId, survey.audienceType, survey.classFilter);
  if (accounts.length === 0) throw new Error('No target accounts found for the selected audience.');

  for (const account of accounts) {
    await prisma.commSurveyResponse.upsert({
      where: { surveyId_accountId: { surveyId, accountId: account.id } },
      create: {
        institutionId,
        surveyId,
        accountId: account.id,
        accountName: account.displayName,
        accountRole: account.role,
        status: 'PENDING',
      },
      update: { accountName: account.displayName, accountRole: account.role },
    });
  }

  let pushCampaignId = '';
  if (opts.sendPush !== false) {
    try {
      const pushResult = await sendPushCampaign(institutionId, {
        title: `Survey: ${survey.title}`,
        body: survey.description.slice(0, 140) || 'Please share your feedback. Your input helps us improve.',
        audienceType: survey.audienceType as 'ALL' | 'PARENT' | 'STUDENT' | 'STAFF' | 'CLASS',
        classFilter: survey.classFilter,
        deepLink: `/surveys/${surveyId}`,
        category: 'survey',
        sentBy: opts.userRole ?? 'Survey Manager',
        userRole: opts.userRole ?? 'Super Admin',
        academicYear: survey.academicYear,
      });
      pushCampaignId = pushResult.campaignId;
    } catch {
      // best-effort
    }
  }

  await prisma.commSurvey.update({
    where: { id: surveyId },
    data: {
      status: 'ACTIVE',
      publishedAt: new Date(),
      targetCount: accounts.length,
      pendingCount: accounts.length,
      pushSent: Boolean(pushCampaignId),
      pushCampaignId,
    },
  });

  await prisma.commDeliveryLog.create({
    data: {
      institutionId,
      channel: 'SURVEY',
      campaignTitle: survey.title,
      messagePreview: survey.description.slice(0, 120),
      recipientCount: accounts.length,
      maskedRecipient: survey.audienceLabel,
      audienceScope: survey.audienceType,
      status: 'DELIVERED',
      cost: 0,
      sourceModule: 'Surveys & Feedback',
      academicYear: survey.academicYear,
    },
  });

  await logActivity(
    institutionId,
    'SURVEY_PUBLISH',
    `Published: ${survey.title} to ${accounts.length} stakeholders`,
    { surveyId, targetCount: accounts.length },
    opts.userRole ?? 'Super Admin',
  );

  return {
    message: `Survey published to ${accounts.length} stakeholder(s).${pushCampaignId ? ' Push sent.' : ''}`,
    surveyId,
    targetCount: accounts.length,
  };
}

export async function closeSurvey(institutionId: string, surveyId: string, userRole?: string) {
  if (!canManage(userRole ?? '')) throw new Error('Permission denied.');
  await prisma.commSurvey.update({
    where: { id: surveyId, institutionId },
    data: { status: 'CLOSED' },
  });
  return { message: 'Survey closed. No new responses accepted.' };
}

export async function resendSurveyReminders(
  institutionId: string,
  surveyId: string,
  opts: { userRole?: string } = {},
) {
  if (!canManage(opts.userRole ?? '')) throw new Error('Permission denied.');

  const survey = await prisma.commSurvey.findFirst({
    where: { id: surveyId, institutionId, status: 'ACTIVE' },
  });
  if (!survey) throw new Error('Active survey not found.');

  const pending = await prisma.commSurveyResponse.findMany({
    where: { surveyId, status: 'PENDING' },
  });
  if (pending.length === 0) return { message: 'All stakeholders have responded.', reminded: 0 };

  let reminded = 0;
  for (const r of pending) {
    const account = await prisma.mobileAccount.findFirst({
      where: { id: r.accountId, institutionId, isActive: true },
      include: { devices: true },
    });
    if (!account?.devices.length) continue;
    await deliverPushToTokens(
      account.devices.map((d) => d.fcmToken),
      {
        title: `Reminder: ${survey.title}`,
        body: 'Your feedback is requested. Please complete the survey.',
        data: { category: 'survey_reminder', surveyId, deepLink: `/surveys/${surveyId}` },
      },
    );
    reminded += 1;
  }

  return { message: `Reminder sent to ${reminded} pending respondent(s).`, reminded };
}

export async function getMobileSurveys(
  institutionId: string,
  accountId: string,
  accountRole: MobileAppRole,
) {
  const surveys = await prisma.commSurvey.findMany({
    where: { institutionId, status: 'ACTIVE' },
    orderBy: { publishedAt: 'desc' },
    include: {
      questions: { select: { id: true } },
      responses: { where: { accountId } },
    },
  });

  const now = new Date();
  const items = surveys
    .filter((s) => accountMatchesAudience(accountRole, s.audienceType))
    .filter((s) => !s.closesAt || s.closesAt > now)
    .map((s) => {
      const resp = s.responses[0];
      return {
        id: s.id,
        title: s.title,
        descriptionPreview: s.description.slice(0, 160),
        category: s.category,
        categoryLabel: SURVEY_CATEGORIES.find((c) => c.value === s.category)?.label ?? s.category,
        questionCount: s.questions.length,
        isAnonymous: s.isAnonymous,
        closesAt: s.closesAt?.toISOString() ?? null,
        status: resp?.status ?? 'PENDING',
        isCompleted: resp?.status === 'COMPLETED',
        needsResponse: !resp || resp.status === 'PENDING',
        submittedAt: resp?.submittedAt?.toISOString() ?? null,
      };
    });

  const pendingCount = items.filter((i) => i.needsResponse).length;
  return { pendingCount, badgeCount: pendingCount, items };
}

export async function getMobileSurveyDetail(
  institutionId: string,
  accountId: string,
  accountRole: MobileAppRole,
  surveyId: string,
) {
  const survey = await prisma.commSurvey.findFirst({
    where: { id: surveyId, institutionId, status: { in: ['ACTIVE', 'CLOSED'] } },
    include: {
      questions: { orderBy: { sortOrder: 'asc' } },
      responses: { where: { accountId }, include: { answers: true } },
    },
  });
  if (!survey) throw new Error('Survey not found.');
  if (!accountMatchesAudience(accountRole, survey.audienceType)) {
    throw new Error('This survey is not available for your account.');
  }

  const resp = survey.responses[0];
  const closed = survey.status === 'CLOSED' || (survey.closesAt ? survey.closesAt < new Date() : false);

  return {
    id: survey.id,
    title: survey.title,
    description: survey.description,
    category: survey.category,
    isAnonymous: survey.isAnonymous,
    closesAt: survey.closesAt?.toISOString() ?? null,
    isClosed: closed,
    canSubmit: !closed && resp?.status !== 'COMPLETED',
    status: resp?.status ?? 'PENDING',
    submittedAt: resp?.submittedAt?.toISOString() ?? null,
    questions: survey.questions.map((q) => {
      const existing = resp?.answers.find((a) => a.questionId === q.id);
      return {
        id: q.id,
        questionText: q.questionText,
        questionType: q.questionType,
        options: Array.isArray(q.options) ? (q.options as string[]) : [],
        isRequired: q.isRequired,
        sortOrder: q.sortOrder,
        existingAnswer: existing
          ? {
              answerText: existing.answerText,
              answerValue: existing.answerValue,
              selectedOptions: existing.selectedOptions,
            }
          : null,
      };
    }),
  };
}

export type SubmitAnswerInput = {
  questionId: string;
  answerText?: string;
  answerValue?: number;
  selectedOptions?: string[];
};

export async function submitMobileSurveyResponse(
  institutionId: string,
  accountId: string,
  accountRole: MobileAppRole,
  surveyId: string,
  answers: SubmitAnswerInput[],
) {
  const survey = await prisma.commSurvey.findFirst({
    where: { id: surveyId, institutionId, status: 'ACTIVE' },
    include: { questions: true },
  });
  if (!survey) throw new Error('Survey not found or not accepting responses.');
  if (!accountMatchesAudience(accountRole, survey.audienceType)) {
    throw new Error('This survey is not available for your account.');
  }
  if (survey.closesAt && survey.closesAt < new Date()) {
    throw new Error('Survey has closed.');
  }

  const account = await prisma.mobileAccount.findFirst({ where: { id: accountId, institutionId } });
  if (!account) throw new Error('Account not found.');

  const existing = await prisma.commSurveyResponse.findUnique({
    where: { surveyId_accountId: { surveyId, accountId } },
  });
  if (existing?.status === 'COMPLETED') {
    throw new Error('You have already submitted this survey.');
  }

  for (const q of survey.questions) {
    if (!q.isRequired) continue;
    const ans = answers.find((a) => a.questionId === q.id);
    if (!ans) throw new Error(`Required question not answered: ${q.questionText}`);
    if (q.questionType === 'RATING' && (ans.answerValue == null || ans.answerValue < 1)) {
      throw new Error(`Rating required for: ${q.questionText}`);
    }
    if (q.questionType === 'TEXT' && !ans.answerText?.trim()) {
      throw new Error(`Text answer required for: ${q.questionText}`);
    }
  }

  const now = new Date();
  const response = await prisma.commSurveyResponse.upsert({
    where: { surveyId_accountId: { surveyId, accountId } },
    create: {
      institutionId,
      surveyId,
      accountId,
      accountName: survey.isAnonymous ? 'Anonymous' : account.displayName,
      accountRole: account.role,
      status: 'COMPLETED',
      submittedAt: now,
    },
    update: {
      status: 'COMPLETED',
      submittedAt: now,
      accountName: survey.isAnonymous ? 'Anonymous' : account.displayName,
    },
  });

  for (const ans of answers) {
    const q = survey.questions.find((x) => x.id === ans.questionId);
    if (!q) continue;
    await prisma.commSurveyAnswer.upsert({
      where: { responseId_questionId: { responseId: response.id, questionId: ans.questionId } },
      create: {
        institutionId,
        responseId: response.id,
        questionId: ans.questionId,
        answerText: ans.answerText?.trim() ?? '',
        answerValue: ans.answerValue ?? null,
        selectedOptions: (ans.selectedOptions ?? []) as Prisma.InputJsonValue,
      },
      update: {
        answerText: ans.answerText?.trim() ?? '',
        answerValue: ans.answerValue ?? null,
        selectedOptions: (ans.selectedOptions ?? []) as Prisma.InputJsonValue,
      },
    });
  }

  if (existing?.status !== 'COMPLETED') {
    await prisma.commSurvey.update({
      where: { id: surveyId },
      data: { responseCount: { increment: 1 }, pendingCount: { decrement: 1 } },
    });
  }

  await logActivity(
    institutionId,
    'SURVEY_RESPONSE',
    `${survey.isAnonymous ? 'Anonymous' : account.displayName} submitted: ${survey.title}`,
    { surveyId, accountId },
    survey.isAnonymous ? 'Anonymous' : account.displayName,
  );

  return {
    message: 'Thank you! Your feedback has been submitted.',
    surveyId,
    submittedAt: now.toISOString(),
  };
}

const PTM_QUESTIONS: SurveyQuestionInput[] = [
  {
    questionText: 'How satisfied are you with the overall PTM experience?',
    questionType: 'RATING',
    isRequired: true,
    sortOrder: 0,
  },
  {
    questionText: 'Was the teacher able to address your concerns?',
    questionType: 'YES_NO',
    isRequired: true,
    sortOrder: 1,
  },
  {
    questionText: 'How would you rate the venue and arrangements?',
    questionType: 'SINGLE_CHOICE',
    options: ['Excellent', 'Good', 'Average', 'Poor'],
    isRequired: true,
    sortOrder: 2,
  },
  {
    questionText: 'What could we improve for the next PTM?',
    questionType: 'TEXT',
    isRequired: false,
    sortOrder: 3,
  },
];

export async function seedSurveysManagement(institutionId: string) {
  const academicYear = '2025-26';

  const existing = await prisma.commSurvey.count({ where: { institutionId } });
  if (existing > 0) {
    return getSurveysManagement(institutionId, { academicYear, userRole: 'Super Admin' });
  }

  const accountCount = await prisma.mobileAccount.count({ where: { institutionId, isActive: true } });
  if (accountCount === 0) await seedPushManagement(institutionId);

  const ptmResult = await createSurveyDraft(institutionId, {
    title: 'PTM Feedback Survey — Term 2',
    description: 'Please share your feedback on the recent Parent-Teacher Meeting. Your responses help us improve future PTMs.',
    category: 'PTM_FEEDBACK',
    audienceType: 'PARENT',
    isAnonymous: true,
    closesAt: new Date('2026-12-31').toISOString(),
    questions: PTM_QUESTIONS,
    academicYear,
    userRole: 'Super Admin',
    createdBy: 'Principal',
  });

  await publishSurvey(institutionId, ptmResult.surveyId, { userRole: 'Super Admin', sendPush: true });

  const facilityResult = await createSurveyDraft(institutionId, {
    title: 'Canteen & Transport Facility Survey',
    description: 'We value your opinion on school canteen food quality and transport services.',
    category: 'FACILITY',
    audienceType: 'ALL',
    isAnonymous: false,
    questions: [
      { questionText: 'Rate canteen food quality', questionType: 'RATING', sortOrder: 0 },
      { questionText: 'Rate transport punctuality', questionType: 'RATING', sortOrder: 1 },
      { questionText: 'Any suggestions?', questionType: 'TEXT', isRequired: false, sortOrder: 2 },
    ],
    academicYear,
    userRole: 'Super Admin',
  });

  await publishSurvey(institutionId, facilityResult.surveyId, { userRole: 'Super Admin', sendPush: true });

  const ptmSurvey = await prisma.commSurvey.findUnique({
    where: { id: ptmResult.surveyId },
    include: { questions: true },
  });
  const ptmResponses = await prisma.commSurveyResponse.findMany({
    where: { surveyId: ptmResult.surveyId },
    take: 2,
  });

  if (ptmSurvey && ptmResponses[0]) {
    await submitMobileSurveyResponse(
      institutionId,
      ptmResponses[0].accountId,
      'PARENT',
      ptmResult.surveyId,
      [
        { questionId: ptmSurvey.questions[0].id, answerValue: 5 },
        { questionId: ptmSurvey.questions[1].id, answerText: 'YES', answerValue: 1 },
        { questionId: ptmSurvey.questions[2].id, answerText: 'Excellent', selectedOptions: ['Excellent'] },
        { questionId: ptmSurvey.questions[3].id, answerText: 'More time slots would be helpful.' },
      ],
    );
  }
  if (ptmSurvey && ptmResponses[1]) {
    await submitMobileSurveyResponse(
      institutionId,
      ptmResponses[1].accountId,
      'PARENT',
      ptmResult.surveyId,
      [
        { questionId: ptmSurvey.questions[0].id, answerValue: 4 },
        { questionId: ptmSurvey.questions[1].id, answerText: 'YES', answerValue: 1 },
        { questionId: ptmSurvey.questions[2].id, answerText: 'Good', selectedOptions: ['Good'] },
      ],
    );
  }

  await createSurveyDraft(institutionId, {
    title: 'Student Well-being Check-in (Draft)',
    description: 'Draft survey for student mental health and well-being check-in.',
    category: 'GENERAL',
    audienceType: 'STUDENT',
    questions: [
      { questionText: 'How are you feeling about school this week?', questionType: 'RATING', sortOrder: 0 },
      { questionText: 'Do you feel supported by teachers?', questionType: 'YES_NO', sortOrder: 1 },
    ],
    academicYear,
    userRole: 'Super Admin',
  });

  return getSurveysManagement(institutionId, { academicYear, userRole: 'Super Admin' });
}
