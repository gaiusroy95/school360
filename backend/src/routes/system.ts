import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { purgeAllSiteData } from '../lib/clearDemoData.js';

export const systemRouter = Router();
systemRouter.use(requireAuth);

systemRouter.post(
  '/purge-demo-data',
  asyncHandler(async (req, res) => {
    if (req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Only super administrators can purge site data' });
    }

    const confirm = req.body?.confirm === true;
    if (!confirm) {
      return res.status(400).json({
        error: 'Confirmation required',
        message: 'Send { "confirm": true } to permanently delete all operational data',
      });
    }

    const result = await purgeAllSiteData();
    return res.json(result);
  }),
);
