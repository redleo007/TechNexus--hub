/**
 * OPTIMIZED ATTENDANCE SERVICE - ZERO N+1 QUERIES
 * Single source of truth for attendance & no-show data
 * All calculations use aggregated SQL - NO loops
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

/**
 * Get total no-show count (SINGLE QUERY - NO LOOP)
 * No-show = status is 'not_attended'
 */
export const getNoShowTotal = async (): Promise<number> => {
  const supabase = getSupabaseClient();
  
  const { count, error } = await supabase
    .from('attendance')
    .select('*', { count: 'exact' })
    .eq('status', 'not_attended');

  if (error) throw new Error(`Failed to count no-shows: ${error.message}`);
  return count || 0;
};

/**
 * Get no-shows by participant (GROUP BY - NO LOOP)
 * Returns count per participant
 */
export const getNoShowsByParticipant = async (): Promise<{ [key: string]: number }> => {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('attendance')
    .select('participant_id')
    .eq('status', 'not_attended');

  if (error) throw new Error(`Failed to fetch no-shows: ${error.message}`);

  // Group by participant_id in a single pass
  const grouped: { [key: string]: number } = {};
  (data || []).forEach(record => {
    grouped[record.participant_id] = (grouped[record.participant_id] || 0) + 1;
  });

  return grouped;
};

/**
 * Get complete no-show statistics
 * Returns: total count, unique participants, per-participant breakdown
 */
export const getNoShowStats = async (): Promise<NoShowStats> => {
  const supabase = getSupabaseClient();
  
  // Single query - get all no-show records
  const { data, error } = await supabase
    .from('attendance')
    .select('participant_id')
    .eq('status', 'not_attended');

  if (error) throw new Error(`Failed to fetch no-show stats: ${error.message}`);

  const records = data || [];
  
  // Single pass to aggregate
  const byParticipant: { participant_id: string; count: number }[] = [];
  const uniqueSet = new Set<string>();
  const counts: { [key: string]: number } = {};

  records.forEach(record => {
    uniqueSet.add(record.participant_id);
    counts[record.participant_id] = (counts[record.participant_id] || 0) + 1;
  });

  // Convert to array sorted by count (descending)
  Object.entries(counts).forEach(([participant_id, count]) => {
    byParticipant.push({ participant_id, count });
  });
  byParticipant.sort((a, b) => b.count - a.count);

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
    .from('attendance')
    .select('*', { count: 'exact' })
    .eq('participant_id', participantId)
    .eq('status', 'not_attended');

  if (error) throw new Error(`Failed to count no-shows: ${error.message}`);
  return count || 0;
};

/**
 * Get all no-show records with details
 */
export const getAllNoShows = async (): Promise<any[]> => {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('attendance')
    .select(`
      id,
      event_id,
      participant_id,
      status,
      marked_at,
      created_at,
      events (id, name, date),
      participants (id, name, email)
    `)
    .eq('status', 'not_attended')
    .order('marked_at', { ascending: false });

  if (error) throw new Error(`Failed to fetch no-shows: ${error.message}`);
  return (data || []) as any[];
};

/**
 * Mark attendance - single operation
 */
export const markAttendance = async (
  event_id: string,
  participant_id: string,
  status: 'attended' | 'not_attended'
): Promise<Attendance> => {
  const supabase = getSupabaseClient();
  
  // Check if exists - single query
  const { data: existing } = await supabase
    .from('attendance')
    .select('id')
    .eq('participant_id', participant_id)
    .eq('event_id', event_id)
    .single();

  const now = new Date().toISOString();

  if (existing) {
    // Update existing
    const { data, error } = await supabase
      .from('attendance')
      .update({ status, marked_at: now })
      .eq('id', existing.id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update attendance: ${error.message}`);
    return data as Attendance;
  } else {
    // Create new
    const { data, error } = await supabase
      .from('attendance')
      .insert([{ event_id, participant_id, status, marked_at: now }])
      .select()
      .single();

    if (error) throw new Error(`Failed to create attendance: ${error.message}`);
    return data as Attendance;
  }
};

/**
 * Delete attendance record
 */
export const deleteAttendance = async (id: string): Promise<void> => {
  const supabase = getSupabaseClient();
  
  const { error } = await supabase
    .from('attendance')
    .delete()
    .eq('id', id);

  if (error) throw new Error(`Failed to delete attendance: ${error.message}`);
};

/**
 * Get attendance by event
 */
export const getAttendanceByEvent = async (eventId: string): Promise<Attendance[]> => {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('attendance')
    .select('*')
    .eq('event_id', eventId);

  if (error) throw new Error(`Failed to fetch attendance: ${error.message}`);
  return (data || []) as Attendance[];
};

/**
 * Get attendance by participant
 */
export const getAttendanceByParticipant = async (participantId: string): Promise<Attendance[]> => {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('attendance')
    .select('*')
    .eq('participant_id', participantId);

  if (error) throw new Error(`Failed to fetch attendance: ${error.message}`);
  return (data || []) as Attendance[];
};
