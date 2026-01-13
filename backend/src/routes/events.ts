import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { successResponse, errorResponse } from '../utils/response';
import * as eventService from '../services/eventService';
import * as volunteerAttendanceService from '../services/volunteerAttendanceService';
import * as importSessionService from '../services/importSessionService';
import { validateEventData } from '../utils/validation';

const router = Router();

router.post(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    validateEventData(req.body);
    const event = await eventService.createEvent(req.body);
    res.status(201).json(successResponse(event));
  })
);

router.get(
  '/',
  asyncHandler(async (_req: Request, res: Response) => {
    const events = await eventService.getEvents();
    res.json({
      success: true,
      data: [...events],
      timestamp: '...',
    });
  })
);

router.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const event = await eventService.getEventById(req.params.id);
    res.json(successResponse(event));
  })
);

router.put(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    if (req.body.name) {
      validateEventData(req.body);
    }
    const event = await eventService.updateEvent(req.params.id, req.body);
    res.json(successResponse(event));
  })
);

router.delete(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    await eventService.deleteEvent(req.params.id);
    res.json(successResponse({ message: 'Event deleted successfully' }));
  })
);

/**
 * POST /api/events/:event_id/volunteer-attendance/import
 * Bulk import volunteer attendance records for a specific event
 */
router.post(
  '/:event_id/volunteer-attendance/import',
  asyncHandler(async (req: Request, res: Response) => {
    const { event_id } = req.params;
    const { records } = req.body;

    // Validate event_id
    if (!event_id) {
      return res.status(400).json(errorResponse('event_id is required'));
    }

    // Validate event exists
    const event = await eventService.getEventById(event_id);
    if (!event) {
      return res.status(404).json(errorResponse('Event not found'));
    }

    // Validate records array
    if (!records || !Array.isArray(records)) {
      return res.status(400).json(errorResponse('records array is required'));
    }

    if (records.length === 0) {
      return res.status(400).json(errorResponse('records array cannot be empty'));
    }

    // Validate required fields in each record and ensure event_id matches
    const validatedRecords = [];
    for (const record of records) {
      if (!record.name || !record.email) {
        return res.status(400).json(errorResponse('All records must have name and email fields'));
      }

      if (!record.attendance_status) {
        record.attendance_status = 'no_show';
      }

      // Ensure attendance_status is valid
      if (!['attended', 'not_attended', 'no_show'].includes(record.attendance_status)) {
        return res.status(400).json(errorResponse('attendance_status must be one of: attended, not_attended, no_show'));
      }

      validatedRecords.push({
        name: record.name.trim(),
        email: record.email.trim().toLowerCase(),
        event_id: event_id, // Use the validated event_id from URL
        attendance_status: record.attendance_status
      });
    }

    try {
      // Create import session
      const importSession = await importSessionService.createImportSession(
        event_id,
        'volunteer_attendance',
        validatedRecords.length
      );

      // Bulk import with session tracking
      const result = await volunteerAttendanceService.bulkImportAttendance(validatedRecords, importSession.id);

      res.status(201).json(successResponse({
        imported: result.imported,
        failed: result.failed,
        errors: result.errors,
        import_session_id: importSession.id,
        records: result.records
      }));
    } catch (error) {
      console.error('Volunteer attendance import error:', error);
      return res.status(500).json(errorResponse('Failed to import volunteer attendance records'));
    }
  })
);

export default router;
