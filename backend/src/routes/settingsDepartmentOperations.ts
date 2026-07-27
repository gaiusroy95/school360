import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { getDefaultInstitutionId } from '../lib/institution.js';
import {
  bootstrapDepartmentOps,
  exportHolidayCalendarIcal,
  getDepartmentOpsOverview,
  syncDepartmentOpsFromSetup,
} from '../lib/departmentOperationsManagement.js';

export const settingsDepartmentOperationsRouter = Router();
settingsDepartmentOperationsRouter.use(requireAuth);

settingsDepartmentOperationsRouter.get(
  '/overview',
  asyncHandler(async (_req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await bootstrapDepartmentOps(institutionId);
    return res.json(await getDepartmentOpsOverview(institutionId));
  }),
);

settingsDepartmentOperationsRouter.post(
  '/sync',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await syncDepartmentOpsFromSetup(institutionId, req.user?.email ?? 'system');
    return res.json({ message: 'Department & operations synced from Institution Setup', ...result });
  }),
);

settingsDepartmentOperationsRouter.get(
  '/holiday-calendar/export',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const audience = typeof req.query.audience === 'string' ? req.query.audience : 'ALL';
    const ical = await exportHolidayCalendarIcal(institutionId, audience);
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="holiday-calendar.ics"');
    return res.send(ical);
  }),
);
