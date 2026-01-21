import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { successResponse } from '../utils/response';
import * as attendanceService from '../services/attendanceService';
import { syncAutoBlocklist } from '../services/blocklistService';

const router = Router();

/**
 * Mark attendance for a participant at an event
 */
router.post(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const { event_id, participant_id, status } = req.body;
    
    if (!event_id || !participant_id || !status) {
      return res.status(400).json({ error: 'Missing required fields: event_id, participant_id, status' });
    }

    const attendance = await attendanceService.markAttendance(event_id, participant_id, status);

    // Sync blocklist if needed (auto-block at 2+ no-shows)
    if (status === 'not_attended' || status === null) {
      await syncAutoBlocklist();
    }

    res.status(201).json(successResponse(attendance));
  })
);

/**
 * Get attendance records for an event
 */
router.get(
  '/event/:eventId',
  asyncHandler(async (req: Request, res: Response) => {
    const attendance = await attendanceService.getAttendanceByEvent(req.params.eventId);
    res.json(successResponse(attendance));
  })
);

/**
 * Get attendance records for a participant
 */
router.get(
  '/participant/:participantId',
  asyncHandler(async (req: Request, res: Response) => {
    const attendance = await attendanceService.getAttendanceByParticipant(req.params.participantId);
    res.json(successResponse(attendance));
  })
);

/**
 * Get all no-shows
 */
router.get(
  '/no-shows',
  asyncHandler(async (_req: Request, res: Response) => {
    const noShows = await attendanceService.getAllNoShows();
    res.json(successResponse(noShows));
  })
);

/**
 * Get no-shows by participant (aggregated count per participant)
 */
router.get(
  '/no-shows/by-participant',
  asyncHandler(async (_req: Request, res: Response) => {
    const noShows = await attendanceService.getNoShowsByParticipant();
    res.json(successResponse(noShows));
  })
);

/**
 * Get no-show statistics
 */
router.get(
  '/stats',
  asyncHandler(async (_req: Request, res: Response) => {
    const stats = await attendanceService.getNoShowStats();
    res.json(successResponse(stats));
  })
);

/**
 * Delete an attendance record
 */
router.delete(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    await attendanceService.deleteAttendance(req.params.id);
    
    // Sync blocklist in case this was a no-show deletion
    await syncAutoBlocklist();
    
    res.json(successResponse({ message: 'Attendance record deleted successfully' }));
  })
);

export default router;
