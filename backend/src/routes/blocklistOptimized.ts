/**
 * BLOCKLIST API - OPTIMIZED FOR PERFORMANCE
 * Endpoints: list, add, remove
 * Auto-blocklist synced at 2+ no-shows
 * NO N+1 queries - all single aggregated operations
 */

import { Router, Request, Response } from 'express';
import {
  getBlocklistWithDetails,
  getBlocklistCount,
  addToBlocklist,
  removeFromBlocklist,
  isBlocklisted,
  syncAutoBlocklist
} from '../services/blocklistService';

const router = Router();

/**
 * GET /api/blocklist
 * Returns all blocklisted participants with details
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const blocklist = await getBlocklistWithDetails();
    const count = await getBlocklistCount();

    return res.json({
      total: count,
      count: count,
      data: blocklist
    });
  } catch (error) {
    console.error('Blocklist list error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

/**
 * GET /api/blocklist/count
 * Returns just the count (lightweight for dashboard)
 */
router.get('/count', async (req: Request, res: Response) => {
  try {
    const count = await getBlocklistCount();

    return res.json({
      count,
      total: count
    });
  } catch (error) {
    console.error('Blocklist count error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

/**
 * GET /api/blocklist/:participant_id
 * Check if participant is blocklisted
 */
router.get('/:participant_id', async (req: Request, res: Response) => {
  try {
    const { participant_id } = req.params;
    const blocked = await isBlocklisted(participant_id);

    return res.json({
      participant_id,
      is_blocklisted: blocked
    });
  } catch (error) {
    console.error('Blocklist check error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

/**
 * POST /api/blocklist
 * Add participant to blocklist (manual)
 * Body: { participant_id, reason? }
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { participant_id, reason } = req.body;

    if (!participant_id) {
      return res.status(400).json({
        error: 'participant_id is required'
      });
    }

    const entry = await addToBlocklist(
      participant_id,
      'manual'
    );

    return res.json({
      success: true,
      data: entry
    });
  } catch (error) {
    console.error('Add to blocklist error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

/**
 * DELETE /api/blocklist/:participant_id
 * Remove participant from blocklist
 */
router.delete('/:participant_id', async (req: Request, res: Response) => {
  try {
    const { participant_id } = req.params;

    if (!participant_id) {
      return res.status(400).json({
        error: 'participant_id is required'
      });
    }

    await removeFromBlocklist(participant_id);

    return res.json({
      success: true,
      message: 'Participant removed from blocklist'
    });
  } catch (error) {
    console.error('Remove from blocklist error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

/**
 * POST /api/blocklist/sync
 * ADMIN: Sync auto-blocklist (2+ no-shows)
 * Returns: { added, removed } count of changes
 */
router.post('/sync', async (req: Request, res: Response) => {
  try {
    const result = await syncAutoBlocklist();

    return res.json({
      success: true,
      ...result,
      message: `Auto-blocklist synced: ${result.added} added, ${result.removed} removed`
    });
  } catch (error) {
    console.error('Blocklist sync error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

export default router;
