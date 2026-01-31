import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { successResponse } from '../utils/response';
import { getSupabaseClient } from '../utils/supabase';

const router = Router();

/**
 * OPTIMIZED /stats endpoint - ALL counts in parallel
 * Target: <100ms response time
 */
router.get(
  '/stats',
  asyncHandler(async (_req: Request, res: Response) => {
    const supabase = getSupabaseClient();

    // Run ALL count queries in parallel - no sequential waits
    const [eventRes, participantRes, noShowRes, blocklistRes] = await Promise.all([
      supabase.from('events').select('*', { count: 'exact', head: true }),
      supabase.from('participants').select('*', { count: 'exact', head: true }).eq('is_blocklisted', false),
      supabase.from('attendance').select('*', { count: 'exact', head: true }).eq('status', 'not_attended'),
      supabase.from('blocklist').select('*', { count: 'exact', head: true }),
    ]);

    // Short cache to reduce redundant requests during rapid refreshes
    res.set('Cache-Control', 'private, max-age=5');

    res.json(successResponse({
      totalEvents: eventRes.count || 0,
      activeParticipants: participantRes.count || 0,
      blocklistedParticipants: blocklistRes.count || 0,
      noShows: noShowRes.count || 0,
      recentActivities: [],
      lastUpdated: new Date().toISOString(),
    }));
  })
);

/**
 * OPTIMIZED /summary endpoint - ALL counts in single parallel batch
 * Target: <50ms response time
 */
router.get(
  '/summary',
  asyncHandler(async (_req: Request, res: Response) => {
    const supabase = getSupabaseClient();

    // ALL queries in parallel - head:true skips fetching actual rows
    const [eventRes, participantRes, noShowRes, blocklistRes] = await Promise.all([
      supabase.from('events').select('*', { count: 'exact', head: true }),
      supabase.from('participants').select('*', { count: 'exact', head: true }).eq('is_blocklisted', false),
      supabase.from('attendance').select('*', { count: 'exact', head: true }).eq('status', 'not_attended'),
      supabase.from('blocklist').select('*', { count: 'exact', head: true }),
    ]);

    // Short cache for rapid refresh scenarios
    res.set('Cache-Control', 'private, max-age=5');

    res.json(successResponse({
      events: eventRes.count || 0,
      participants: participantRes.count || 0,
      noShows: noShowRes.count || 0,
      blocklisted: blocklistRes.count || 0,
      lastUpdated: new Date().toISOString(),
    }));
  })
);

/**
 * OPTIMIZED /overview endpoint - Minimal queries, maximum parallelism
 * Target: <150ms response time
 */
router.get(
  '/overview',
  asyncHandler(async (_req: Request, res: Response) => {
    const supabase = getSupabaseClient();

    // First batch: All counts + latest event + recent activity (all parallel)
    const [eventRes, participantRes, noShowRes, blocklistRes, latestEventRes, recentRes] = await Promise.all([
      supabase.from('events').select('*', { count: 'exact', head: true }),
      supabase.from('participants').select('*', { count: 'exact', head: true }).eq('is_blocklisted', false),
      supabase.from('attendance').select('*', { count: 'exact', head: true }).eq('status', 'not_attended'),
      supabase.from('blocklist').select('*', { count: 'exact', head: true }),
      supabase.from('events').select('id, name, date').order('date', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('attendance').select('id, status, marked_at, participant_id, event_id').order('marked_at', { ascending: false }).limit(10),
    ]);

    const latestEvent = latestEventRes.data;
    let lastEventStats = null as null | {
      id: string;
      name: string;
      date: string | null;
      attendanceCount: number;
      noShowCount: number;
      participantCount: number;
      blocklistedInEvent: number;
    };

    // Only fetch event-specific stats if we have a latest event
    if (latestEvent?.id) {
      const [attendedRes, eventNoShowRes, allAttendanceRes] = await Promise.all([
        // Count only those who actually attended (status = 'attended')
        supabase.from('attendance').select('*', { count: 'exact', head: true }).eq('event_id', latestEvent.id).eq('status', 'attended'),
        supabase.from('attendance').select('*', { count: 'exact', head: true }).eq('event_id', latestEvent.id).eq('status', 'not_attended'),
        // Get all attendance records to count unique participants
        supabase.from('attendance').select('participant_id').eq('event_id', latestEvent.id),
      ]);

      // Count unique participants from attendance records
      const attendanceRows = allAttendanceRes.data || [];
      const uniqueParticipantIds = new Set(attendanceRows.map((r: any) => r.participant_id));

      lastEventStats = {
        id: latestEvent.id,
        name: latestEvent.name,
        date: latestEvent.date || null,
        attendanceCount: attendedRes.count || 0,  // Only 'attended' status
        noShowCount: eventNoShowRes.count || 0,
        participantCount: uniqueParticipantIds.size,  // Unique participants in this event
        blocklistedInEvent: 0, // Skip expensive join for speed
      };
    }

    // Short cache to prevent hammering during rapid navigation
    res.set('Cache-Control', 'private, max-age=5');

    res.json(successResponse({
      summary: {
        events: eventRes.count || 0,
        participants: participantRes.count || 0,
        noShows: noShowRes.count || 0,
        blocklisted: blocklistRes.count || 0,
      },
      recentActivities: recentRes.data || [],
      lastEvent: lastEventStats,
      lastUpdated: new Date().toISOString(),
    }));
  })
);

export default router;
