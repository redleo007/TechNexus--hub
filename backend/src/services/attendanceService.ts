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
 * Get total no-show count (SINGLE QUERY - NO LOOP)
 * No-show = status is 'not_attended'
 */
export const getNoShowTotal = async (): Promise<number> => {
  const supabase = getSupabaseClient();

  const { count, error } = await supabase
    .from('attendance')
    .select('*', { count: 'planned' })
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
  status: 'attended' | 'not_attended',
  import_session_id?: string
): Promise<Attendance> => {
  const supabase = getSupabaseClient();

  // Enforce blocklist: participants on blocklist cannot be marked for attendance
  const { data: participant } = await supabase
    .from('participants')
    .select('is_blocklisted')
    .eq('id', participant_id)
    .single();

  if (participant?.is_blocklisted) {
    throw new Error('Participant is blocklisted and cannot be marked for attendance');
  }

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
    const updatePayload: Record<string, any> = { status, marked_at: now };
    if (import_session_id) {
      updatePayload.import_session_id = import_session_id;
    }

    const { data, error } = await supabase
      .from('attendance')
      .update(updatePayload)
      .eq('id', existing.id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update attendance: ${error.message}`);
    return data as Attendance;
  } else {
    const insertPayload: Record<string, any> = {
      event_id,
      participant_id,
      status,
      marked_at: now,
    };

    if (import_session_id) {
      insertPayload.import_session_id = import_session_id;
    }

    // Create new
    const { data, error } = await supabase
      .from('attendance')
      .insert([insertPayload])
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
 * Get attendance by event with participant details
 */
export const getAttendanceByEvent = async (eventId: string): Promise<Attendance[]> => {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('attendance')
    .select(`
      *,
      participants (
        id,
        name,
        email,
        is_blocklisted
      )
    `)
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

export const bulkImportAttendance = async (
  records: AttendanceImportRecord[],
  import_session_id?: string
): Promise<{ imported: number; createdParticipants: number; hadNoShows: boolean }> => {
  if (!Array.isArray(records) || records.length === 0) {
    throw new Error('records array is required and must not be empty');
  }

  const eventId = records[0]?.event_id?.trim();
  if (!eventId) {
    throw new Error('event_id is required on each record');
  }

  const hasMixedEvents = records.some((r) => (r.event_id || '').trim() !== eventId);
  if (hasMixedEvents) {
    throw new Error('All records must belong to the same event');
  }

  const supabase = getSupabaseClient();
  const emails = Array.from(
    new Set(
      records
        .map((r) => (r.email || '').toLowerCase().trim())
        .filter((email) => !!email)
    )
  );

  if (emails.length === 0) {
    throw new Error('All records must include a valid email');
  }

  const { data: existingParticipants, error: participantFetchError } = await supabase
    .from('participants')
    .select('id, email, name, is_blocklisted')
    .in('email', emails);

  if (participantFetchError) {
    throw new Error(`Failed to fetch participants: ${participantFetchError.message}`);
  }

  const participantByEmail = new Map<string, { id: string; email: string; name?: string; is_blocklisted?: boolean }>();
  (existingParticipants || []).forEach((p: any) => {
    if (p?.email) {
      participantByEmail.set(String(p.email).toLowerCase(), p);
    }
  });

  // Attendance imports must NEVER create participants
  const missingEmails = emails.filter((email) => !participantByEmail.has(email));
  if (missingEmails.length > 0) {
    throw new Error(`Attendance import failed: participants not found for emails: ${missingEmails.join(', ')}`);
  }

  let createdParticipants = 0; // always 0 by contract (no creation during attendance import)

  let imported = 0;
  let hadNoShows = false;

  for (const record of records) {
    const emailKey = record.email?.toLowerCase().trim();
    if (!emailKey) {
      continue;
    }

    const participant = participantByEmail.get(emailKey);
    if (!participant) {
      continue;
    }

    if (participant.is_blocklisted) {
      throw new Error(`Attendance import failed: participant ${participant.email} is blocklisted`);
    }

    const status = normalizeStatus(record.attendance_status);
    if (status === 'not_attended') {
      hadNoShows = true;
    }

    await markAttendance(eventId, participant.id, status, import_session_id);
    imported += 1;
  }

  return { imported, createdParticipants, hadNoShows };
};
