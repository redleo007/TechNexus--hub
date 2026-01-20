import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { successResponse } from '../utils/response';
import * as eventParticipantService from '../services/eventParticipantService';

const router = Router({ mergeParams: true });

/**
 * GET /api/events/:event_id/participants
 * Get all participants for an event
 */
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const { event_id } = req.params;

    if (!event_id) {
      return res.status(400).json({ error: 'event_id is required' });
    }

    const participants = await eventParticipantService.getEventParticipants(event_id);
    res.json(successResponse(participants));
  })
);

/**
 * GET /api/events/:event_id/attendance
 * Get all attendance records for an event
 */
router.get(
  '/attendance',
  asyncHandler(async (req: Request, res: Response) => {
    const { event_id } = req.params;

    if (!event_id) {
      return res.status(400).json({ error: 'event_id is required' });
    }

    const attendance = await eventParticipantService.getEventAttendance(event_id);
    res.json(successResponse(attendance));
  })
);

/**
 * DELETE /api/events/:event_id/participants
 * Delete all participants for an event
 */
router.delete(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const { event_id } = req.params;

    if (!event_id) {
      return res.status(400).json({ error: 'event_id is required' });
    }

    const result = await eventParticipantService.deleteAllEventParticipants(event_id);
    res.json(successResponse(result));
  })
);

/**
 * POST /api/events/:event_id/participants/bulk-delete
 * Delete selected participants for an event
 */
router.post(
  '/bulk-delete',
  asyncHandler(async (req: Request, res: Response) => {
    const { event_id } = req.params;
    const { participant_ids } = req.body;

    if (!event_id) {
      return res.status(400).json({ error: 'event_id is required' });
    }

    if (!Array.isArray(participant_ids) || participant_ids.length === 0) {
      return res.status(400).json({ error: 'participant_ids must be a non-empty array' });
    }

    const result = await eventParticipantService.deleteSelectedParticipants(event_id, participant_ids);
    res.json(successResponse(result));
  })
);

/**
 * DELETE /api/events/:event_id/attendance
 * Delete all attendance records for an event
 */
router.delete(
  '/attendance',
  asyncHandler(async (req: Request, res: Response) => {
    const { event_id } = req.params;

    if (!event_id) {
      return res.status(400).json({ error: 'event_id is required' });
    }

    const result = await eventParticipantService.deleteAllEventAttendance(event_id);
    res.json(successResponse(result));
  })
);

/**
 * POST /api/events/:event_id/attendance/bulk-delete
 * Delete selected attendance records for an event
 */
router.post(
  '/attendance/bulk-delete',
  asyncHandler(async (req: Request, res: Response) => {
    const { event_id } = req.params;
    const { attendance_ids } = req.body;

    if (!event_id) {
      return res.status(400).json({ error: 'event_id is required' });
    }

    if (!Array.isArray(attendance_ids) || attendance_ids.length === 0) {
      return res.status(400).json({ error: 'attendance_ids must be a non-empty array' });
    }

    const result = await eventParticipantService.deleteSelectedAttendance(event_id, attendance_ids);
    res.json(successResponse(result));
  })
);

export default router;

/**
 * POST /api/events/:event_id/participants/undo-delete
 * Undo the last delete operation for this event (one-time, token-based)
 */
router.post(
  '/undo-delete',
  asyncHandler(async (req: Request, res: Response) => {
    const { event_id } = req.params;
    const { type, undo_token } = req.body as { type: 'participant' | 'attendance'; undo_token: string };

    if (!event_id) {
      return res.status(400).json({ error: 'event_id is required' });
    }
    if (!type || !undo_token) {
      return res.status(400).json({ error: 'type and undo_token are required' });
    }

    const result = await eventParticipantService.undoLastDelete(event_id, type, undo_token);
    res.json(successResponse(result));
  })
);
