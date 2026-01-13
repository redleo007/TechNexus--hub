import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { successResponse } from '../utils/response';
import * as volunteerAttendanceService from '../services/volunteerAttendanceService';

const router = Router();

/**
 * POST /api/volunteer-attendance/bulk-import
 * Bulk import volunteer attendance records
 */
router.post(
  '/bulk-import',
  asyncHandler(async (req: Request, res: Response) => {
    const { records } = req.body;

    if (!records || !Array.isArray(records)) {
      return res.status(400).json({ error: 'records array is required' });
    }

    if (records.length === 0) {
      return res.status(400).json({ error: 'records array cannot be empty' });
    }

    // Validate required fields in each record
    const validatedRecords = records.map((record: any) => ({
      name: record.name,
      email: record.email,
      event_id: record.event_id,
      attendance_status: record.attendance_status || 'no_show'
    }));

    // Bulk import
    const result = await volunteerAttendanceService.bulkImportAttendance(validatedRecords);

    res.status(201).json(successResponse({
      imported: result.imported,
      failed: result.failed,
      errors: result.errors,
      records: result.records
    }));
  })
);

export default router;
