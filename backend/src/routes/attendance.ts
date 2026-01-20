import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { successResponse } from '../utils/response';
import * as attendanceService from '../services/attendanceService';
import { checkAndAutoBlock } from '../services/blocklistService';

const router = Router();

router.post(
  '/bulk-import-batch',
  asyncHandler(async (req: Request, res: Response) => {
    const { records } = req.body;
    
    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ error: 'records must be a non-empty array' });
    }

    // Validate all records
    for (const record of records) {
      if (!record.name || !record.email || !record.event_id || record.attendance_status === undefined) {
        return res.status(400).json({ 
          error: 'All records must have: name, email, event_id, attendance_status' 
        });
      }
    }

    // Bulk import attendance
    const result = await attendanceService.bulkImportAttendance(records);

    res.status(201).json(successResponse({
      imported: result.length,
      failed: 0,
      errors: [],
    }));
  })
);

router.post(
  '/bulk-import',
  asyncHandler(async (req: Request, res: Response) => {
    const { name, email, event_id, attendance_status } = req.body;
    
    if (!name || !email || !event_id || !attendance_status) {
      return res.status(400).json({ error: 'Missing required fields: name, email, event_id, attendance_status' });
    }

    const records = await attendanceService.bulkImportAttendance([{
      name,
      email,
      event_id,
      attendance_status,
    }]);

    res.status(201).json(successResponse(records[0]));
  })
);

router.post(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const { event_id, participant_id, status } = req.body;
    
    if (!event_id || !participant_id || !status) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const attendance = await attendanceService.markAttendance({
      event_id,
      participant_id,
      status,
    });

    // Check if auto-blocking should occur (for no_show or null)
    if (status === 'no_show' || !status) {
      await checkAndAutoBlock(participant_id);
    }

    res.status(201).json(successResponse(attendance));
  })
);

router.get(
  '/event/:eventId',
  asyncHandler(async (req: Request, res: Response) => {
    const attendance = await attendanceService.getAttendanceByEvent(req.params.eventId);
    res.json(successResponse(attendance));
  })
);

router.get(
  '/participant/:participantId',
  asyncHandler(async (req: Request, res: Response) => {
    const attendance = await attendanceService.getAttendanceByParticipant(req.params.participantId);
    res.json(successResponse(attendance));
  })
);

router.put(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { status } = req.body;
    const attendance = await attendanceService.updateAttendance(req.params.id, status);

    // Check if auto-blocking should occur (for no_show or null)
    if (status === 'no_show' || !status) {
      // Need to get participant_id from the attendance record
      await checkAndAutoBlock(attendance.participant_id);
    }

    res.json(successResponse(attendance));
  })
);

router.get(
  '/stats/overview',
  asyncHandler(async (_req: Request, res: Response) => {
    const stats = await attendanceService.getAttendanceStats();
    res.json(successResponse(stats));
  })
);

router.get(
  '/no-shows',
  asyncHandler(async (_req: Request, res: Response) => {
    const noShows = await attendanceService.getAllNoShows();
    res.json(successResponse(noShows));
  })
);

router.get(
  '/no-shows/by-participant',
  asyncHandler(async (_req: Request, res: Response) => {
    const noShows = await attendanceService.getNoShowsByParticipant();
    res.json(successResponse(noShows));
  })
);

router.delete(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    // Delete handles blocklist removal internally if needed
    await attendanceService.deleteAttendance(req.params.id);
    res.json(successResponse({ message: 'Attendance record deleted successfully' }));
  })
);

export default router;
