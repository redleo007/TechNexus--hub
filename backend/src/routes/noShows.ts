/**
 * NO-SHOWS API - OPTIMIZED FOR PERFORMANCE
 * Endpoints: list, add, delete, export CSV
 * All operations use aggregated queries - NO N+1
 */

import { Router, Request, Response } from 'express';
import {
  getNoShowTotal,
  getAllNoShows,
  getNoShowsByParticipant,
  markAttendance,
  deleteAttendance
} from '../services/attendanceService';
import { syncAutoBlocklist } from '../services/blocklistService';

const router = Router();

/**
 * GET /api/no-shows
 * Returns: { total, count, data: [...], uniqueParticipants }
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    // Get all no-show records (single aggregated query)
    const records = await getAllNoShows();

    // Get count by participant
    const noShowsByParticipant = await getNoShowsByParticipant();
    const uniqueParticipants = Object.keys(noShowsByParticipant).length;

    return res.json({
      total: records.length,
      uniqueParticipants,
      count: records.length,
      data: records
    });
  } catch (error) {
    console.error('No-shows list error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

/**
 * GET /api/no-shows/count
 * Returns: { total, uniqueParticipants }
 * Lightweight endpoint for dashboard/frontend
 */
router.get('/count', async (req: Request, res: Response) => {
  try {
    const total = await getNoShowTotal();
    const noShowsByParticipant = await getNoShowsByParticipant();
    const uniqueParticipants = Object.keys(noShowsByParticipant).length;

    return res.json({
      total,
      uniqueParticipants
    });
  } catch (error) {
    console.error('No-shows count error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

/**
 * GET /api/no-shows/export/csv
 * Export all no-shows as CSV file
 */
router.get('/export/csv', async (req: Request, res: Response) => {
  try {
    const records = await getAllNoShows();

    // Build CSV manually (no external dependency)
    const headers = ['Participant ID', 'Participant Name', 'Event ID', 'Event Name', 'Status', 'Marked At', 'Created At'];
    const rows = records.map((record: any) => [
      record.participant_id,
      record.participants?.name || 'Unknown',
      record.event_id,
      record.events?.name || 'Unknown',
      record.status || 'not_attended',
      record.marked_at || '',
      record.created_at || ''
    ]);

    // Create CSV content
    const csvContent = [
      headers.map(h => `"${h}"`).join(','),
      ...rows.map(row => row.map((cell: any) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    // Send as file download
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="no-shows.csv"');
    return res.send(csvContent);
  } catch (error) {
    console.error('No-shows export error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

/**
 * POST /api/no-shows
 * Manually mark participant as no-show
 * Body: { participant_id, event_id }
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { participant_id, event_id } = req.body;

    if (!participant_id || !event_id) {
      return res.status(400).json({
        error: 'participant_id and event_id are required'
      });
    }

    // Mark as not_attended
    const attendance = await markAttendance(event_id, participant_id, 'not_attended');

    // Sync auto-blocklist (participant might need to be auto-blocked now)
    await syncAutoBlocklist();

    return res.json({
      success: true,
      data: attendance
    });
  } catch (error) {
    console.error('Mark no-show error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

/**
 * DELETE /api/no-shows/:id
 * Remove/undo a no-show record
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        error: 'id is required'
      });
    }

    await deleteAttendance(id);

    // Sync auto-blocklist (participant might need to be removed if now <2 no-shows)
    await syncAutoBlocklist();

    return res.json({
      success: true,
      message: 'No-show record deleted'
    });
  } catch (error) {
    console.error('Delete no-show error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

/**
 * GET /api/no-shows/participant/:id
 * Get all no-shows for a specific participant
 */
router.get('/participant/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const records = await getAllNoShows();
    const participantNoShows = records.filter(r => r.participant_id === id);

    return res.json({
      total: participantNoShows.length,
      data: participantNoShows
    });
  } catch (error) {
    console.error('Participant no-shows error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

export default router;

