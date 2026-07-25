import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { getDefaultInstitutionId } from '../lib/institution.js';
import {
  getCommunicationDashboard,
  seedCommunicationDashboard,
} from '../lib/communicationDashboard.js';
import {
  approveComposeMessage,
  getComposeMessageManagement,
  previewComposeMessage,
  seedComposeMessage,
  submitComposeMessage,
  type ComposePayload,
} from '../lib/communicationCompose.js';
import {
  activateMessageTemplate,
  createMessageTemplate,
  deactivateMessageTemplate,
  deleteMessageTemplate,
  getMessageTemplateById,
  getMessageTemplatesManagement,
  handleTemplateGatewayWebhook,
  seedMessageTemplates,
  submitTemplateToGateway,
  syncTemplatesWithGateway,
  updateMessageTemplate,
  type TemplatePayload,
} from '../lib/communicationTemplates.js';
import {
  addDndEntry,
  calculateSmsSegments,
  createSmsGateway,
  enqueueSms,
  getSmsManagement,
  listDndEntries,
  processSmsQueue,
  scrubNumbersAgainstDnd,
  seedSmsManagement,
  updateSmsGateway,
  type EnqueueSmsPayload,
  type SmsGatewayInput,
} from '../lib/communicationSmsManagement.js';
import {
  createEmailGateway,
  enqueueEmail,
  getEmailManagement,
  getTrackingPixelBuffer,
  processEmailQueue,
  recordEmailClick,
  recordEmailOpen,
  seedEmailManagement,
  simulateEmailEngagement,
  updateEmailGateway,
  type EmailGatewayInput,
  type EnqueueEmailPayload,
} from '../lib/communicationEmailManagement.js';
import {
  getConversationMessages,
  getSessionWindowInfo,
  getWhatsAppManagement,
  handleWhatsAppWebhook,
  recordInboundMessage,
  registerOptIn,
  registerOptOut,
  seedWhatsAppManagement,
  sendWhatsAppMessage,
  type SendWhatsAppPayload,
} from '../lib/communicationWhatsAppManagement.js';
import {
  getPushManagement,
  seedPushManagement,
  sendPushCampaign,
  simulatePushRead,
  updatePushGateway,
  type PushGatewayInput,
  type SendPushPayload,
} from '../lib/communicationPushManagement.js';
import {
  acknowledgeMobileCircular,
  createCircularDraft,
  getCircularDetail,
  getCircularsManagement,
  getMobileNoticeboard,
  getMobileNoticeboardBlockStatus,
  publishCircular,
  resendCircularReminders,
  seedCircularsManagement,
  updateCircularDraft,
  viewMobileCircular,
  type CircularPayload,
} from '../lib/communicationCirculars.js';
import {
  createEventDraft,
  getEventInvitationDetail,
  getEventInvitationsManagement,
  processAutoEventReminders,
  publishEventInvitation,
  resendEventReminders,
  seedEventInvitationsManagement,
  updateEventDraft,
  type EventInvitationPayload,
} from '../lib/communicationEventInvitations.js';
import {
  closeSurvey,
  createSurveyDraft,
  getSurveyDetail,
  getSurveysManagement,
  publishSurvey,
  resendSurveyReminders,
  seedSurveysManagement,
  type SurveyPayload,
} from '../lib/communicationSurveys.js';
import {
  getAutoRemindersManagement,
  runAllActiveAutomations,
  runAutomationRule,
  seedAutoRemindersManagement,
  toggleAutomationRule,
  updateAutomationRule,
  type AutomationConfigPayload,
} from '../lib/communicationAutoReminders.js';
import {
  exportMessageHistoryCsv,
  getMessageAuditDetail,
  getMessageHistoryManagement,
  seedMessageHistoryManagement,
} from '../lib/communicationMessageHistory.js';
import {
  deleteCommunicationReportSchedule,
  exportCommunicationReport,
  generateCommunicationReport,
  getCommunicationReportsAnalytics,
  scheduleCommunicationReport,
  seedCommunicationReportsAnalytics,
} from '../lib/communicationReportsAnalytics.js';

export const communicationPublicRouter = Router();

communicationPublicRouter.get(
  '/email/track/open/:trackingId',
  asyncHandler(async (req, res) => {
    const ua = String(req.headers['user-agent'] ?? '');
    const ip = String(req.headers['x-forwarded-for'] ?? req.socket.remoteAddress ?? '');
    await recordEmailOpen(String(req.params.trackingId), ua, ip);
    res.setHeader('Content-Type', 'image/gif');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    return res.send(getTrackingPixelBuffer());
  }),
);

communicationPublicRouter.get(
  '/email/track/click/:trackingId',
  asyncHandler(async (req, res) => {
    const url = String(req.query.url ?? 'https://school.example.com');
    const ua = String(req.headers['user-agent'] ?? '');
    const ip = String(req.headers['x-forwarded-for'] ?? req.socket.remoteAddress ?? '');
    const result = await recordEmailClick(String(req.params.trackingId), url, ua, ip);
    if (!result) return res.redirect(url);
    return res.redirect(result.redirectUrl || url);
  }),
);

communicationPublicRouter.post(
  '/whatsapp/webhook',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await handleWhatsAppWebhook(institutionId, req.body);
    return res.json(result);
  }),
);

export const communicationRouter = Router();
communicationRouter.use(requireAuth);

communicationRouter.get(
  '/dashboard',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    if (req.query.seed === '1') await seedCommunicationDashboard(institutionId);
    const data = await getCommunicationDashboard(
      institutionId,
      String(req.query.academicYear ?? '2025-26'),
      {
        channel: req.query.channel ? String(req.query.channel) : undefined,
        userRole: req.query.role ? String(req.query.role) : 'Principal',
        classScope: req.query.classScope ? String(req.query.classScope) : undefined,
        performedBy: req.query.performedBy ? String(req.query.performedBy) : undefined,
      },
    );
    return res.json(data);
  }),
);

communicationRouter.get(
  '/compose',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    if (req.query.seed === '1') await seedComposeMessage(institutionId);
    const data = await getComposeMessageManagement(institutionId, {
      academicYear: req.query.academicYear ? String(req.query.academicYear) : undefined,
      userRole: req.query.role ? String(req.query.role) : 'Principal',
      classScope: req.query.classScope ? String(req.query.classScope) : undefined,
      performedBy: req.query.performedBy ? String(req.query.performedBy) : undefined,
    });
    return res.json(data);
  }),
);

communicationRouter.post(
  '/compose/preview',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const data = await previewComposeMessage(institutionId, req.body as ComposePayload);
    return res.json(data);
  }),
);

communicationRouter.post(
  '/compose/submit',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await submitComposeMessage(institutionId, req.body as ComposePayload);
    return res.json(result);
  }),
);

communicationRouter.post(
  '/compose/:id/approve',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const approvedBy = req.body?.approvedBy ? String(req.body.approvedBy) : 'Principal';
    const result = await approveComposeMessage(institutionId, String(req.params.id), approvedBy, {
      sendNow: req.body?.sendNow !== false,
    });
    return res.json(result);
  }),
);

communicationRouter.get(
  '/templates',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    if (req.query.seed === '1') await seedMessageTemplates(institutionId);
    const data = await getMessageTemplatesManagement(institutionId, {
      academicYear: req.query.academicYear ? String(req.query.academicYear) : undefined,
      userRole: req.query.role ? String(req.query.role) : 'Principal',
      channel: req.query.channel ? String(req.query.channel) : undefined,
      status: req.query.status ? String(req.query.status) : undefined,
      category: req.query.category ? String(req.query.category) : undefined,
    });
    return res.json(data);
  }),
);

communicationRouter.get(
  '/templates/:id',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const data = await getMessageTemplateById(
      institutionId,
      String(req.params.id),
      req.query.role ? String(req.query.role) : 'Principal',
    );
    return res.json(data);
  }),
);

communicationRouter.post(
  '/templates',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await createMessageTemplate(institutionId, req.body as TemplatePayload);
    return res.json(result);
  }),
);

communicationRouter.put(
  '/templates/:id',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await updateMessageTemplate(institutionId, String(req.params.id), req.body as TemplatePayload);
    return res.json(result);
  }),
);

communicationRouter.post(
  '/templates/:id/submit-gateway',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await submitTemplateToGateway(
      institutionId,
      String(req.params.id),
      req.body?.submittedBy ? String(req.body.submittedBy) : 'Super Admin',
      req.body?.userRole ? String(req.body.userRole) : 'Super Admin',
    );
    return res.json(result);
  }),
);

communicationRouter.post(
  '/templates/:id/activate',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await activateMessageTemplate(
      institutionId,
      String(req.params.id),
      req.body?.activatedBy ? String(req.body.activatedBy) : 'Super Admin',
      req.body?.userRole ? String(req.body.userRole) : 'Super Admin',
    );
    return res.json(result);
  }),
);

communicationRouter.post(
  '/templates/:id/deactivate',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await deactivateMessageTemplate(
      institutionId,
      String(req.params.id),
      req.body?.deactivatedBy ? String(req.body.deactivatedBy) : 'Super Admin',
      req.body?.userRole ? String(req.body.userRole) : 'Super Admin',
    );
    return res.json(result);
  }),
);

communicationRouter.delete(
  '/templates/:id',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await deleteMessageTemplate(
      institutionId,
      String(req.params.id),
      req.query.role ? String(req.query.role) : 'Super Admin',
    );
    return res.json(result);
  }),
);

communicationRouter.post(
  '/templates/sync-gateway',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await syncTemplatesWithGateway(
      institutionId,
      req.body?.userRole ? String(req.body.userRole) : 'Super Admin',
    );
    return res.json(result);
  }),
);

communicationRouter.post(
  '/templates/webhook',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await handleTemplateGatewayWebhook(institutionId, req.body);
    return res.json(result);
  }),
);

communicationRouter.get(
  '/sms',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    if (req.query.seed === '1') await seedSmsManagement(institutionId);
    const data = await getSmsManagement(institutionId, {
      academicYear: req.query.academicYear ? String(req.query.academicYear) : undefined,
      userRole: req.query.role ? String(req.query.role) : 'Principal',
    });
    return res.json(data);
  }),
);

communicationRouter.post(
  '/sms/calculate-segments',
  asyncHandler(async (req, res) => {
    const message = String(req.body?.message ?? '');
    return res.json(calculateSmsSegments(message));
  }),
);

communicationRouter.post(
  '/sms/scrub-dnd',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const mobiles = Array.isArray(req.body?.mobiles) ? req.body.mobiles.map(String) : [];
    const messageType = req.body?.messageType === 'TRANSACTIONAL' ? 'TRANSACTIONAL' : 'PROMOTIONAL';
    const data = await scrubNumbersAgainstDnd(institutionId, mobiles, messageType);
    return res.json(data);
  }),
);

communicationRouter.post(
  '/sms/enqueue',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await enqueueSms(institutionId, req.body as EnqueueSmsPayload);
    const data = await getSmsManagement(institutionId, { userRole: 'Super Admin' });
    return res.json({ ...result, data });
  }),
);

communicationRouter.post(
  '/sms/process-queue',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await processSmsQueue(institutionId, req.body?.academicYear ? String(req.body.academicYear) : '2025-26');
    const data = await getSmsManagement(institutionId, { userRole: 'Super Admin' });
    return res.json({ ...result, data });
  }),
);

communicationRouter.post(
  '/sms/gateways',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await createSmsGateway(institutionId, req.body as SmsGatewayInput);
    return res.json(result);
  }),
);

communicationRouter.put(
  '/sms/gateways/:id',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await updateSmsGateway(institutionId, String(req.params.id), req.body as SmsGatewayInput);
    return res.json(result);
  }),
);

communicationRouter.post(
  '/sms/dnd',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await addDndEntry(
      institutionId,
      String(req.body?.mobile ?? ''),
      req.body?.category ? String(req.body.category) : 'PROMOTIONAL',
      req.body?.notes ? String(req.body.notes) : '',
      req.body?.userRole ? String(req.body.userRole) : 'Super Admin',
    );
    return res.json(result);
  }),
);

communicationRouter.get(
  '/sms/dnd',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const data = await listDndEntries(institutionId, req.query.limit ? Number(req.query.limit) : 50);
    return res.json(data);
  }),
);

communicationRouter.get(
  '/email',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    if (req.query.seed === '1') await seedEmailManagement(institutionId);
    const data = await getEmailManagement(institutionId, {
      academicYear: req.query.academicYear ? String(req.query.academicYear) : undefined,
      userRole: req.query.role ? String(req.query.role) : 'Principal',
    });
    return res.json(data);
  }),
);

communicationRouter.post(
  '/email/enqueue',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await enqueueEmail(institutionId, req.body as EnqueueEmailPayload);
    const data = await getEmailManagement(institutionId, { userRole: 'Super Admin' });
    return res.json({ ...result, data });
  }),
);

communicationRouter.post(
  '/email/process-queue',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await processEmailQueue(institutionId, req.body?.academicYear ? String(req.body.academicYear) : '2025-26');
    const data = await getEmailManagement(institutionId, { userRole: 'Super Admin' });
    return res.json({ ...result, data });
  }),
);

communicationRouter.post(
  '/email/gateways',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await createEmailGateway(institutionId, req.body as EmailGatewayInput);
    return res.json(result);
  }),
);

communicationRouter.put(
  '/email/gateways/:id',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await updateEmailGateway(institutionId, String(req.params.id), req.body as EmailGatewayInput);
    return res.json(result);
  }),
);

communicationRouter.post(
  '/email/simulate-engagement/:trackingId',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await simulateEmailEngagement(institutionId, String(req.params.trackingId));
    return res.json(result);
  }),
);

communicationRouter.get(
  '/whatsapp',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    if (req.query.seed === '1') await seedWhatsAppManagement(institutionId);
    const data = await getWhatsAppManagement(institutionId, {
      academicYear: req.query.academicYear ? String(req.query.academicYear) : undefined,
      userRole: req.query.role ? String(req.query.role) : 'Principal',
    });
    return res.json(data);
  }),
);

communicationRouter.get(
  '/whatsapp/inbox/:mobile/messages',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const data = await getConversationMessages(institutionId, String(req.params.mobile));
    return res.json(data);
  }),
);

communicationRouter.get(
  '/whatsapp/window/:mobile',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const data = await getSessionWindowInfo(institutionId, String(req.params.mobile));
    return res.json(data);
  }),
);

communicationRouter.post(
  '/whatsapp/send',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await sendWhatsAppMessage(institutionId, req.body as SendWhatsAppPayload);
    const data = await getWhatsAppManagement(institutionId, {
      userRole: req.body?.userRole ? String(req.body.userRole) : 'Helpdesk',
    });
    return res.json({ ...result, data });
  }),
);

communicationRouter.post(
  '/whatsapp/opt-in',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await registerOptIn(
      institutionId,
      String(req.body?.mobile ?? ''),
      req.body?.contactName ? String(req.body.contactName) : '',
      req.body?.source ? String(req.body.source) : 'MANUAL',
      req.body?.userRole ? String(req.body.userRole) : 'Super Admin',
    );
    const data = await getWhatsAppManagement(institutionId);
    return res.json({ ...result, data });
  }),
);

communicationRouter.post(
  '/whatsapp/opt-out',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await registerOptOut(
      institutionId,
      String(req.body?.mobile ?? ''),
      req.body?.userRole ? String(req.body.userRole) : 'Super Admin',
    );
    const data = await getWhatsAppManagement(institutionId);
    return res.json({ ...result, data });
  }),
);

communicationRouter.post(
  '/whatsapp/simulate-inbound',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await recordInboundMessage(
      institutionId,
      String(req.body?.mobile ?? ''),
      String(req.body?.body ?? 'Hello, I have a question.'),
      req.body?.contactName ? String(req.body.contactName) : 'Parent',
      req.body?.academicYear ? String(req.body.academicYear) : '2025-26',
    );
    const data = await getWhatsAppManagement(institutionId);
    return res.json({ ...result, data });
  }),
);

communicationRouter.get(
  '/push',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    if (req.query.seed === '1') await seedPushManagement(institutionId);
    const data = await getPushManagement(institutionId, {
      academicYear: req.query.academicYear ? String(req.query.academicYear) : undefined,
      userRole: req.query.role ? String(req.query.role) : 'Principal',
    });
    return res.json(data);
  }),
);

communicationRouter.post(
  '/push/send',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await sendPushCampaign(institutionId, req.body as SendPushPayload);
    const data = await getPushManagement(institutionId, {
      academicYear: req.body?.academicYear ? String(req.body.academicYear) : undefined,
      userRole: req.body?.userRole ? String(req.body.userRole) : 'Super Admin',
    });
    return res.json({ ...result, data });
  }),
);

communicationRouter.post(
  '/push/simulate-read/:recipientId',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await simulatePushRead(institutionId, String(req.params.recipientId));
    const data = await getPushManagement(institutionId);
    return res.json({ ...result, data });
  }),
);

communicationRouter.put(
  '/push/gateways/:id',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await updatePushGateway(institutionId, String(req.params.id), req.body as PushGatewayInput);
    return res.json(result);
  }),
);

communicationRouter.get(
  '/circulars',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    if (req.query.seed === '1') await seedCircularsManagement(institutionId);
    const data = await getCircularsManagement(institutionId, {
      academicYear: req.query.academicYear ? String(req.query.academicYear) : undefined,
      userRole: req.query.role ? String(req.query.role) : 'Principal',
    });
    return res.json(data);
  }),
);

communicationRouter.get(
  '/circulars/:id',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const data = await getCircularDetail(institutionId, String(req.params.id));
    return res.json(data);
  }),
);

communicationRouter.post(
  '/circulars',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await createCircularDraft(institutionId, req.body as CircularPayload);
    const data = await getCircularsManagement(institutionId, {
      academicYear: req.body?.academicYear ? String(req.body.academicYear) : undefined,
      userRole: req.body?.userRole ? String(req.body.userRole) : 'Super Admin',
    });
    return res.json({ ...result, data });
  }),
);

communicationRouter.put(
  '/circulars/:id',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await updateCircularDraft(institutionId, String(req.params.id), req.body as CircularPayload);
    const data = await getCircularsManagement(institutionId);
    return res.json({ ...result, data });
  }),
);

communicationRouter.post(
  '/circulars/:id/publish',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await publishCircular(institutionId, String(req.params.id), {
      userRole: req.body?.userRole ? String(req.body.userRole) : 'Super Admin',
      publishedBy: req.body?.publishedBy ? String(req.body.publishedBy) : undefined,
      sendPush: req.body?.sendPush !== false,
    });
    const data = await getCircularsManagement(institutionId);
    return res.json({ ...result, data });
  }),
);

communicationRouter.post(
  '/circulars/:id/resend-reminders',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await resendCircularReminders(institutionId, String(req.params.id), {
      userRole: req.body?.userRole ? String(req.body.userRole) : 'Super Admin',
    });
    const detail = await getCircularDetail(institutionId, String(req.params.id));
    const data = await getCircularsManagement(institutionId);
    return res.json({ ...result, detail, data });
  }),
);

communicationRouter.get(
  '/events',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    if (req.query.seed === '1') await seedEventInvitationsManagement(institutionId);
    const data = await getEventInvitationsManagement(institutionId, {
      academicYear: req.query.academicYear ? String(req.query.academicYear) : undefined,
      userRole: req.query.role ? String(req.query.role) : 'Principal',
    });
    return res.json(data);
  }),
);

communicationRouter.get(
  '/events/:id',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const data = await getEventInvitationDetail(institutionId, String(req.params.id));
    return res.json(data);
  }),
);

communicationRouter.post(
  '/events',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await createEventDraft(institutionId, req.body as EventInvitationPayload);
    const data = await getEventInvitationsManagement(institutionId, {
      academicYear: req.body?.academicYear ? String(req.body.academicYear) : undefined,
      userRole: req.body?.userRole ? String(req.body.userRole) : 'Super Admin',
    });
    return res.json({ ...result, data });
  }),
);

communicationRouter.put(
  '/events/:id',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await updateEventDraft(institutionId, String(req.params.id), req.body as EventInvitationPayload);
    const data = await getEventInvitationsManagement(institutionId);
    return res.json({ ...result, data });
  }),
);

communicationRouter.post(
  '/events/:id/publish',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await publishEventInvitation(institutionId, String(req.params.id), {
      userRole: req.body?.userRole ? String(req.body.userRole) : 'Super Admin',
      sendPush: req.body?.sendPush !== false,
    });
    const data = await getEventInvitationsManagement(institutionId);
    return res.json({ ...result, data });
  }),
);

communicationRouter.post(
  '/events/:id/resend-reminders',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await resendEventReminders(institutionId, String(req.params.id), {
      userRole: req.body?.userRole ? String(req.body.userRole) : 'Super Admin',
    });
    const detail = await getEventInvitationDetail(institutionId, String(req.params.id));
    const data = await getEventInvitationsManagement(institutionId);
    return res.json({ ...result, detail, data });
  }),
);

communicationRouter.post(
  '/events/process-auto-reminders',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await processAutoEventReminders(institutionId);
    const data = await getEventInvitationsManagement(institutionId);
    return res.json({ ...result, data });
  }),
);

communicationRouter.get(
  '/surveys',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    if (req.query.seed === '1') await seedSurveysManagement(institutionId);
    const data = await getSurveysManagement(institutionId, {
      academicYear: req.query.academicYear ? String(req.query.academicYear) : undefined,
      userRole: req.query.role ? String(req.query.role) : 'Principal',
    });
    return res.json(data);
  }),
);

communicationRouter.get(
  '/surveys/:id',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const data = await getSurveyDetail(institutionId, String(req.params.id));
    return res.json(data);
  }),
);

communicationRouter.post(
  '/surveys',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await createSurveyDraft(institutionId, req.body as SurveyPayload);
    const data = await getSurveysManagement(institutionId, {
      academicYear: req.body?.academicYear ? String(req.body.academicYear) : undefined,
      userRole: req.body?.userRole ? String(req.body.userRole) : 'Super Admin',
    });
    return res.json({ ...result, data });
  }),
);

communicationRouter.post(
  '/surveys/:id/publish',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await publishSurvey(institutionId, String(req.params.id), {
      userRole: req.body?.userRole ? String(req.body.userRole) : 'Super Admin',
      sendPush: req.body?.sendPush !== false,
    });
    const data = await getSurveysManagement(institutionId);
    return res.json({ ...result, data });
  }),
);

communicationRouter.post(
  '/surveys/:id/close',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await closeSurvey(
      institutionId,
      String(req.params.id),
      req.body?.userRole ? String(req.body.userRole) : 'Super Admin',
    );
    const data = await getSurveysManagement(institutionId);
    return res.json({ ...result, data });
  }),
);

communicationRouter.post(
  '/surveys/:id/resend-reminders',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await resendSurveyReminders(institutionId, String(req.params.id), {
      userRole: req.body?.userRole ? String(req.body.userRole) : 'Super Admin',
    });
    const detail = await getSurveyDetail(institutionId, String(req.params.id));
    const data = await getSurveysManagement(institutionId);
    return res.json({ ...result, detail, data });
  }),
);

communicationRouter.get(
  '/auto-reminders',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    if (req.query.seed === '1') await seedAutoRemindersManagement(institutionId);
    const data = await getAutoRemindersManagement(institutionId, {
      academicYear: req.query.academicYear ? String(req.query.academicYear) : undefined,
      userRole: req.query.role ? String(req.query.role) : 'Principal',
    });
    return res.json(data);
  }),
);

communicationRouter.put(
  '/auto-reminders/:id',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await updateAutomationRule(institutionId, String(req.params.id), req.body as AutomationConfigPayload);
    const data = await getAutoRemindersManagement(institutionId);
    return res.json({ ...result, data });
  }),
);

communicationRouter.post(
  '/auto-reminders/:id/toggle',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await toggleAutomationRule(
      institutionId,
      String(req.params.id),
      req.body?.isActive !== false,
      req.body?.userRole ? String(req.body.userRole) : 'Super Admin',
    );
    const data = await getAutoRemindersManagement(institutionId);
    return res.json({ ...result, data });
  }),
);

communicationRouter.post(
  '/auto-reminders/:id/run',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await runAutomationRule(institutionId, String(req.params.id), {
      userRole: req.body?.userRole ? String(req.body.userRole) : 'Super Admin',
      simulatedCron: req.body?.cronTime ? String(req.body.cronTime) : undefined,
    });
    const data = await getAutoRemindersManagement(institutionId);
    return res.json({ ...result, data });
  }),
);

communicationRouter.post(
  '/auto-reminders/run-all',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await runAllActiveAutomations(institutionId, {
      userRole: req.body?.userRole ? String(req.body.userRole) : 'Super Admin',
    });
    const data = await getAutoRemindersManagement(institutionId);
    return res.json({ ...result, data });
  }),
);

communicationRouter.get(
  '/message-history',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    if (req.query.seed === '1') await seedMessageHistoryManagement(institutionId);
    const data = await getMessageHistoryManagement(institutionId, {
      academicYear: req.query.academicYear ? String(req.query.academicYear) : undefined,
      userRole: req.query.role ? String(req.query.role) : 'Super Admin',
      channel: req.query.channel ? String(req.query.channel) : undefined,
      status: req.query.status ? String(req.query.status) : undefined,
      direction: req.query.direction ? String(req.query.direction) : undefined,
      contact: req.query.contact ? String(req.query.contact) : undefined,
      studentId: req.query.studentId ? String(req.query.studentId) : undefined,
      admissionNumber: req.query.admissionNumber ? String(req.query.admissionNumber) : undefined,
      studentName: req.query.studentName ? String(req.query.studentName) : undefined,
      dateFrom: req.query.dateFrom ? String(req.query.dateFrom) : undefined,
      dateTo: req.query.dateTo ? String(req.query.dateTo) : undefined,
      page: req.query.page ? Number(req.query.page) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
    });
    return res.json(data);
  }),
);

communicationRouter.get(
  '/message-history/export',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await exportMessageHistoryCsv(institutionId, {
      academicYear: req.query.academicYear ? String(req.query.academicYear) : undefined,
      userRole: req.query.role ? String(req.query.role) : 'Super Admin',
      channel: req.query.channel ? String(req.query.channel) : undefined,
      status: req.query.status ? String(req.query.status) : undefined,
      direction: req.query.direction ? String(req.query.direction) : undefined,
      contact: req.query.contact ? String(req.query.contact) : undefined,
      studentId: req.query.studentId ? String(req.query.studentId) : undefined,
      admissionNumber: req.query.admissionNumber ? String(req.query.admissionNumber) : undefined,
      studentName: req.query.studentName ? String(req.query.studentName) : undefined,
      dateFrom: req.query.dateFrom ? String(req.query.dateFrom) : undefined,
      dateTo: req.query.dateTo ? String(req.query.dateTo) : undefined,
    });
    return res.json(result);
  }),
);

communicationRouter.get(
  '/message-history/:id',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const detail = await getMessageAuditDetail(
      institutionId,
      String(req.params.id),
      req.query.role ? String(req.query.role) : 'Super Admin',
    );
    return res.json(detail);
  }),
);

communicationRouter.get(
  '/reports',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    if (req.query.seed === '1') await seedCommunicationReportsAnalytics(institutionId);
    const data = await getCommunicationReportsAnalytics(
      institutionId,
      req.query.academicYear ? String(req.query.academicYear) : '2025-26',
      req.query.role ? String(req.query.role) : 'Communication Manager',
    );
    return res.json(data);
  }),
);

communicationRouter.post(
  '/reports/generate',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await generateCommunicationReport(
      institutionId,
      String(req.body.templateId),
      req.body.filters ?? {},
      req.body.performedBy ?? req.body.userRole ?? 'Communication Manager',
    );
    return res.json(result);
  }),
);

communicationRouter.post(
  '/reports/export',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await exportCommunicationReport(
      institutionId,
      String(req.body.templateId),
      req.body.format ?? 'CSV',
      req.body.filters ?? {},
      req.body.performedBy ?? req.body.userRole ?? 'Communication Manager',
    );
    return res.json(result);
  }),
);

communicationRouter.post(
  '/reports/schedule',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await scheduleCommunicationReport(institutionId, req.body);
    return res.json(result);
  }),
);

communicationRouter.delete(
  '/reports/schedule/:id',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await deleteCommunicationReportSchedule(institutionId, String(req.params.id));
    return res.json(result);
  }),
);
