import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { successResponse } from '../utils/response';
import { getSupabaseClient } from '../utils/supabase';

const router = Router();

/**
 * OPTIMIZED /stats endpoint - ALL counts in parallel
 * Target: <50ms response time
 * STRATEGY: Use 'exact' counts on optimized tables
 */
router.get(
  '/stats',
  asyncHandler(async (_req: Request, res: Response) => {
    const supabase = getSupabaseClient();

    // Run ALL count queries in parallel - use 'exact' for accuracy
    // 'exact' is fast (<100ms) with proper indexes
    const [eventRes, participantRes, noShowRes, blocklistRes] = await Promise.all([
      supabase.from('events').select('*', { count: 'exact', head: true }),
      supabase.from('participants').select('*', { count: 'exact', head: true }),
      // Count from NEW no_shows table - extremely fast
      supabase.from('no_shows').select('*', { count: 'exact', head: true }),
      supabase.from('blocklist').select('*', { count: 'exact', head: true }),
    ]);

    const totalParticipants = participantRes.count || 0;
    const blocklistedCount = blocklistRes.count || 0;
    // Derive active participants instead of filtering (Total - Blocklisted) - much faster
    const activeParticipants = Math.max(0, totalParticipants - blocklistedCount);

    // Short cache to reduce redundant requests during rapid refreshes
    res.set('Cache-Control', 'private, max-age=10');

    res.json(successResponse({
      totalEvents: eventRes.count || 0,
      activeParticipants: activeParticipants,
      blocklistedParticipants: blocklistedCount,
      noShows: noShowRes.count || 0,
      recentActivities: [],
      lastUpdated: new Date().toISOString(),
    }));
  })
);

/**
 * OPTIMIZED /summary endpoint - ALL counts in single parallel batch
 * Target: <30ms response time
 */
router.get(
  '/summary',
  asyncHandler(async (_req: Request, res: Response) => {
    const supabase = getSupabaseClient();

    // ALL queries in parallel using 'exact' counts for accuracy
    const [eventRes, participantRes, noShowRes, blocklistRes] = await Promise.all([
      supabase.from('events').select('*', { count: 'exact', head: true }),
      supabase.from('participants').select('*', { count: 'exact', head: true }),
      supabase.from('no_shows').select('*', { count: 'exact', head: true }),
      supabase.from('blocklist').select('*', { count: 'exact', head: true }),
    ]);

    const totalParticipants = participantRes.count || 0;
    const blocklistedCount = blocklistRes.count || 0;
    const activeParticipants = Math.max(0, totalParticipants - blocklistedCount);

    // Short cache for rapid refresh scenarios
    res.set('Cache-Control', 'private, max-age=10');

    res.json(successResponse({
      events: eventRes.count || 0,
      participants: activeParticipants,
      noShows: noShowRes.count || 0,
      blocklisted: blocklistedCount,
      lastUpdated: new Date().toISOString(),
    }));
  })
);

/**
 * OPTIMIZED /overview endpoint - Minimal queries, maximum parallelism
 * Target: <100ms response time
 */
router.get(
  '/overview',
  asyncHandler(async (_req: Request, res: Response) => {
    const supabase = getSupabaseClient();

    // First batch: All counts + latest event + recent activity (all parallel)
    const [eventRes, participantRes, noShowRes, blocklistRes, latestEventRes, recentRes] = await Promise.all([
      supabase.from('events').select('*', { count: 'exact', head: true }),
      supabase.from('participants').select('*', { count: 'exact', head: true }),
      supabase.from('no_shows').select('*', { count: 'exact', head: true }),
      supabase.from('blocklist').select('*', { count: 'exact', head: true }),
      supabase.from('events').select('id, name, date').order('date', { ascending: false }).limit(1).maybeSingle(),
      // Use attendance for activity log as it tracks "presence" which is more active
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
      // For specific event ID, exact count is fine as the scope is limited
      const [attendedRes, eventNoShowRes, eventParticipantsRes] = await Promise.all([
        // Count just 'attended' from attendance (now strictly attended)
        supabase.from('attendance').select('*', { count: 'exact', head: true }).eq('event_id', latestEvent.id),
        // Count from no_shows table
        supabase.from('no_shows').select('*', { count: 'exact', head: true }).eq('event_id', latestEvent.id),
        // Count total participants associated with this event (union logic, but estimation is fine here usually, 
        // but for now we sum attended + noshows roughly or query effectively if we had a registration table.
        // Since we don't have separate registration, "participants in event" = attended + no_shows
        // We can just sum them up or query them.
        // Actually, let's keep it simple: sum attended + no_show
        Promise.resolve({ count: 0, head: true })
      ]);

      const attendedCount = attendedRes.count || 0;
      const noShowCount = eventNoShowRes.count || 0;

      lastEventStats = {
        id: latestEvent.id,
        name: latestEvent.name,
        date: latestEvent.date || null,
        attendanceCount: attendedCount,
        noShowCount: noShowCount,
        participantCount: attendedCount + noShowCount,
        blocklistedInEvent: 0,
      };
    }

    const totalParticipants = participantRes.count || 0;
    const blocklistedCount = blocklistRes.count || 0;
    const activeParticipants = Math.max(0, totalParticipants - blocklistedCount);

    // Short cache to prevent hammering during rapid navigation
    res.set('Cache-Control', 'private, max-age=10');

    res.json(successResponse({
      summary: {
        events: eventRes.count || 0,
        participants: activeParticipants,
        noShows: noShowRes.count || 0,
        blocklisted: blocklistedCount,
      },
      recentActivities: recentRes.data || [],
      lastEvent: lastEventStats,
      lastUpdated: new Date().toISOString(),
    }));
  })
);

export default router;
