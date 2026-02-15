/**
 * OPTIMIZED ATTENDANCE SERVICE - SEPARATE TABLES
 * table 'attendance': Tracks PRESENCE (status='attended')
 * table 'no_shows': Tracks ABSENCE (status='not_attended')
 * Logic ensures mutual exclusivity (participant cannot be in both for same event)
 */

import { getSupabaseClient } from '../utils/supabase';

export interface Attendance {
  id: string;
  event_id: string;
  participant_id: string;
  status: 'attended' | 'not_attended';
  marked_at: string;
  created_at: string;
}

export interface NoShowStats {
  total: number;
  uniqueParticipants: number;
  byParticipant: { participant_id: string; count: number }[];
}

export type AttendanceImportRecord = {
  name?: string;
  email: string;
  event_id: string;
  attendance_status?: string;
};

const normalizeStatus = (status?: string): 'attended' | 'not_attended' => {
  if (!status) return 'not_attended';
  const normalized = status.toLowerCase().trim();
  if (normalized === 'attended' || normalized === 'yes') return 'attended';
  return 'not_attended';
};

/**
 * Get total no-show count (from no_shows table)
 */
export const getNoShowTotal = async (): Promise<number> => {
  const supabase = getSupabaseClient();

  // Count from separate table - EXTREMELY FAST
  const { count, error } = await supabase
    .from('no_shows')
    .select('*', { count: 'exact', head: true });

  if (error) throw new Error(`Failed to count no-shows: ${error.message}`);
  return count || 0;
};

/**
 * Get no-shows by participant (GROUP BY equivalent)
 */
export const getNoShowsByParticipant = async (): Promise<{ [key: string]: number }> => {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('no_shows')
    .select('participant_id');

  if (error) throw new Error(`Failed to fetch no-shows: ${error.message}`);

  const grouped: { [key: string]: number } = {};
  (data || []).forEach(record => {
    grouped[record.participant_id] = (grouped[record.participant_id] || 0) + 1;
  });

  return grouped;
};

/**
 * Get complete no-show statistics
 */
export const getNoShowStats = async (): Promise<NoShowStats> => {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('no_shows')
    .select('participant_id');

  if (error) throw new Error(`Failed to fetch no-show stats: ${error.message}`);

  const records = data || [];
  const uniqueSet = new Set<string>();
  const counts: { [key: string]: number } = {};

  records.forEach(record => {
    uniqueSet.add(record.participant_id);
    counts[record.participant_id] = (counts[record.participant_id] || 0) + 1;
  });

  const byParticipant = Object.entries(counts)
    .map(([participant_id, count]) => ({ participant_id, count }))
    .sort((a, b) => b.count - a.count);

  return {
    total: records.length,
    uniqueParticipants: uniqueSet.size,
    byParticipant,
  };
};

/**
 * Get no-show count for a specific participant
 */
export const getNoShowCountForParticipant = async (participantId: string): Promise<number> => {
  const supabase = getSupabaseClient();

  const { count, error } = await supabase
    .from('no_shows')
    .select('*', { count: 'exact', head: true })
    .eq('participant_id', participantId);

  if (error) throw new Error(`Failed to count no-shows: ${error.message}`);
  return count || 0;
};

/**
 * Get all no-show records with details
 */
export const getAllNoShows = async (): Promise<any[]> => {
  const supabase = getSupabaseClient();

  // Join with events and participants
  const { data, error } = await supabase
    .from('no_shows')
    .select(`
      id,
      event_id,
      participant_id,
      created_at,
      events (id, name, date),
      participants (id, name, email)
    `)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Failed to fetch no-shows: ${error.message}`);

  // Transform to match expected interface (add virtual 'status' and map created_at -> marked_at)
  return (data || []).map((r: any) => ({
    ...r,
    status: 'not_attended',
    marked_at: r.created_at
  }));
};

/**
 * Mark attendance or no-show
 * Guaranteed Mutual Exclusivity:
 * - If status='attended': Add to 'attendance', Remove from 'no_shows'
 * - If status='not_attended': Add to 'no_shows', Remove from 'attendance'
 */
export const markAttendance = async (
  event_id: string,
  participant_id: string,
  status: 'attended' | 'not_attended',
  import_session_id?: string
): Promise<Attendance> => {
  const supabase = getSupabaseClient();
  const now = new Date().toISOString();

  // 1. Check Blocklist
  const { data: participant } = await supabase
    .from('participants')
    .select('is_blocklisted')
    .eq('id', participant_id)
    .single();

  if (participant?.is_blocklisted) {
    throw new Error('Participant is blocklisted and cannot be marked');
  }

  if (status === 'attended') {
    // A. Handle ATTENDED
    // 1. Remove from no_shows if exists
    await supabase.from('no_shows').delete().match({ event_id, participant_id });

    // 2. Upsert into attendance
    const payload: any = { event_id, participant_id, status: 'attended', marked_at: now };
    if (import_session_id) payload.import_session_id = import_session_id;

    const { data, error } = await supabase
      .from('attendance')
      .upsert(payload, { onConflict: 'event_id,participant_id' })
      .select()
      .single();

    if (error) throw new Error(`Failed to mark present: ${error.message}`);
    return data as Attendance;

  } else {
    // B. Handle NO-SHOW
    // 1. Remove from attendance if exists
    await supabase.from('attendance').delete().match({ event_id, participant_id });

    // 2. Upsert into no_shows (using ON CONFLICT to ignore duplicates)
    // Note: 'no_shows' doesn't have 'status' col, just existence implies no-show
    const payload: any = { event_id, participant_id, created_at: now };

    // Check if exists first to avoid error if unique constraint is hit
    const { data: existing } = await supabase
      .from('no_shows')
      .select('id')
      .match({ event_id, participant_id })
      .maybeSingle();

    if (!existing) {
      const { error } = await supabase.from('no_shows').insert(payload);
      if (error) throw new Error(`Failed to mark no-show: ${error.message}`);
    }

    // Return virtual attendance record
    return {
      id: existing?.id || 'new',
      event_id,
      participant_id,
      status: 'not_attended',
      marked_at: now,
      created_at: now
    };
  }
};

/**
 * Delete record (from either table)
 */
export const deleteAttendance = async (id: string): Promise<void> => {
  const supabase = getSupabaseClient();

  // Try deleting from attendance first
  const { count } = await supabase
    .from('attendance')
    .delete({ count: 'exact' })
    .eq('id', id)
    .select('id');

  // If not found, try deleting from no_shows
  if (count === 0) {
    const { error } = await supabase
      .from('no_shows')
      .delete()
      .eq('id', id);

    if (error) throw new Error(`Failed to delete record: ${error.message}`);
  }
};

/**
 * Get attendance by event (merges attendance and no_shows)
 */
export const getAttendanceByEvent = async (eventId: string): Promise<Attendance[]> => {
  const supabase = getSupabaseClient();

  // Parallel fetch from both tables
  const [attendedRes, noShowRes] = await Promise.all([
    supabase
      .from('attendance')
      .select('*, participants(id, name, email, is_blocklisted)')
      .eq('event_id', eventId),
    supabase
      .from('no_shows')
      .select('*, participants(id, name, email, is_blocklisted)')
      .eq('event_id', eventId)
  ]);

  const attended = (attendedRes.data || []) as any[];
  const noShows = (noShowRes.data || []).map((r: any) => ({
    ...r,
    status: 'not_attended',
    marked_at: r.created_at
  }));

  // Combine
  return [...attended, ...noShows];
};

/**
 * Get attendance by participant
 */
export const getAttendanceByParticipant = async (participantId: string): Promise<Attendance[]> => {
  const supabase = getSupabaseClient();

  const [attendedRes, noShowRes] = await Promise.all([
    supabase.from('attendance').select('*').eq('participant_id', participantId),
    supabase.from('no_shows').select('*').eq('participant_id', participantId)
  ]);

  const attended = attendedRes.data || [];
  const noShows = (noShowRes.data || []).map((r: any) => ({
    ...r,
    status: 'not_attended',
    marked_at: r.created_at
  }));

  return [...attended, ...noShows] as Attendance[];
};

export const bulkImportAttendance = async (
  records: AttendanceImportRecord[],
  import_session_id?: string
): Promise<{ imported: number; createdParticipants: number; hadNoShows: boolean }> => {
  if (!Array.isArray(records) || records.length === 0) throw new Error('No records');
  const eventId = records[0]?.event_id?.trim();
  if (!eventId) throw new Error('Missing event_id');

  const supabase = getSupabaseClient();

  // 1. Resolve emails to participant IDs
  const emails = Array.from(new Set(records.map(r => r.email?.toLowerCase().trim()).filter(Boolean)));
  if (emails.length === 0) throw new Error('No valid emails');

  const { data: participants } = await supabase
    .from('participants')
    .select('id, email, is_blocklisted')
    .in('email', emails);

  const map = new Map();
  participants?.forEach((p: any) => map.set(p.email, p));

  let imported = 0;
  let hadNoShows = false;

  // 2. Process records sequentially (safest for complex logic) 
  // Optimization: Could be parallelized but mutual exclusivity logic is subtle
  for (const record of records) {
    const email = record.email?.toLowerCase().trim();
    const p = map.get(email);

    if (!p || p.is_blocklisted) continue;

    const status = normalizeStatus(record.attendance_status);
    if (status === 'not_attended') hadNoShows = true;

    await markAttendance(eventId, p.id, status, import_session_id);
    imported++;
  }

  return { imported, createdParticipants: 0, hadNoShows };
};
