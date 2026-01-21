import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { successResponse } from '../utils/response';
import { getBlocklistCount } from '../services/blocklistService';
import { getEvents } from '../services/eventService';
import { getActiveParticipantsCount } from '../services/participantService';
import { getNoShowStats } from '../services/attendanceService';

const router = Router();

router.get(
  '/stats',
  asyncHandler(async (_req: Request, res: Response) => {
    const events = await getEvents();
    const activeParticipants = await getActiveParticipantsCount();
    const blocklistedParticipants = await getBlocklistCount();
    const noShowStats = await getNoShowStats();

    res.json(successResponse({
      totalEvents: events.length,
      activeParticipants,
      blocklistedParticipants,
      noShows: noShowStats.total,
      recentActivities: [],
    }));
  })
);

export default router;
