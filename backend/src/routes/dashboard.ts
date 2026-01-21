import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { successResponse } from '../utils/response';
import { getActivityLogs, getBlocklistCount, getBlocklistStats } from '../services/blocklistService';
import { getEvents } from '../services/eventService';
import { getActiveParticipantsCount } from '../services/participantService';
import { getAttendanceStats } from '../services/attendanceService';

const router = Router();

router.get(
  '/stats',
  asyncHandler(async (_req: Request, res: Response) => {
    const events = await getEvents();
    const activeParticipants = await getActiveParticipantsCount();
    const blocklistedParticipants = await getBlocklistCount(); // Use unified function
    const attendanceStats = await getAttendanceStats();
    const activities = await getActivityLogs(10);

    res.json(successResponse({
      totalEvents: events.length,
      activeParticipants,
      blocklistedParticipants,
      noShows: attendanceStats.noShow,
      recentActivities: activities,
    }));
  })
);

export default router;
