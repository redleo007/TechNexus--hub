import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { successResponse } from '../utils/response';

const router = Router();

/**
 * Get application settings
 * Default: no-show threshold is 2 (auto-blocklist at 2+ no-shows)
 */
router.get(
  '/',
  asyncHandler(async (_req: Request, res: Response) => {
    const settings = {
      noShowThreshold: 2,
      autoBlocklistEnabled: true,
      createdAt: new Date().toISOString()
    };
    res.json(successResponse(settings));
  })
);

/**
 * Update application settings
 */
router.put(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    // For now, just return the updated settings with defaults
    const settings = {
      noShowThreshold: req.body.noShowThreshold || 2,
      autoBlocklistEnabled: req.body.autoBlocklistEnabled !== false,
      updatedAt: new Date().toISOString()
    };
    res.json(successResponse(settings));
  })
);

export default router;
