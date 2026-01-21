import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { successResponse } from '../utils/response';
import * as blocklistService from '../services/blocklistService';

const router = Router();

/**
 * Add participant to blocklist (manual block)
 */
router.post(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const { participant_id, reason } = req.body;
    
    if (!participant_id || !reason) {
      return res.status(400).json({ error: 'Missing required fields: participant_id, reason' });
    }

    const entry = await blocklistService.addToBlocklist(participant_id, reason);
    res.status(201).json(successResponse(entry));
  })
);

/**
 * Get full blocklist (unified endpoint for Dashboard and Blocklist page)
 * This ensures both pages show the same count and list
 */
router.get(
  '/',
  asyncHandler(async (_req: Request, res: Response) => {
    const blocklist = await blocklistService.getBlocklist();
    res.json(successResponse(blocklist));
  })
);

/**
 * Get blocklist count only
 * Used for quick stats on Dashboard
 */
router.get(
  '/count',
  asyncHandler(async (_req: Request, res: Response) => {
    const count = await blocklistService.getBlocklistCount();
    res.json(successResponse({ count }));
  })
);

/**
 * Get blocklist statistics
 */
router.get(
  '/stats',
  asyncHandler(async (_req: Request, res: Response) => {
    const blocklist = await blocklistService.getBlocklist();
    const autoBlocked = blocklist.filter((b: any) => b.reason === 'auto_no_show').length;
    const manualBlocked = blocklist.filter((b: any) => b.reason === 'manual').length;
    
    res.json(successResponse({
      total: blocklist.length,
      auto_blocked: autoBlocked,
      manually_blocked: manualBlocked
    }));
  })
);

/**
 * Remove participant from blocklist (manual unblock)
 */
router.delete(
  '/:participantId',
  asyncHandler(async (req: Request, res: Response) => {
    await blocklistService.removeFromBlocklist(req.params.participantId);
    res.json(successResponse({ message: 'Participant removed from blocklist' }));
  })
);

export default router;
