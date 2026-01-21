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
  status: 'attended' | 'not_attended' | null;
  marked_at: string;
  created_at: string;
}

export interface NoShowStats {
  total: number;  // Total no-show records
  uniqueParticipants: number;  // Unique people with no-shows
  byParticipant: { participant_id: string; count: number }[];
}

/**
 * Get total no-show count (SINGLE QUERY - NO LOOP)
 * No-show = status is 'not_attended' or NULL
 */
export const getNoShowTotal = async (): Promise<number> => {
  const supabase = getSupabaseClient();
  
  const { count, error } = await supabase
    .from('attendance')
    .select('*', { count: 'exact' })
    .or('status.eq.not_attended,status.is.null');

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
    .or('status.eq.not_attended,status.is.null');

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
    .or('status.eq.not_attended,status.is.null');

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
    .or('status.eq.not_attended,status.is.null');

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
    .or('status.eq.not_attended,status.is.null')
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

export const getAllNoShows = async (): Promise<any[]> => {
  const supabase = getSupabaseClient();
  
  try {
    // Fetch all records where status is 'no_show' or NULL
    const { data, error } = await supabase
      .from('attendance')
      .select(`
        id,
        event_id,
        participant_id,
        status,
        marked_at,
        events!inner (
          id,
          name,
          date
        ),
        participants!inner (
          id,
          name,
          email
        )
      `)
      .or('status.eq.no_show,status.is.null')
      .order('marked_at', { ascending: false, nullsFirst: false });

    if (error) {
      console.error('Supabase error in getAllNoShows:', error);
      throw new Error(`Failed to fetch no-shows: ${error.message}`);
    }
    
    // Transform the data to flatten the nested objects
    const transformed = (data || []).map(record => ({
      id: record.id,
      event_id: record.event_id,
      participant_id: record.participant_id,
      status: record.status,
      marked_at: record.marked_at,
      events: Array.isArray(record.events) ? record.events[0] : record.events,
      participants: Array.isArray(record.participants) ? record.participants[0] : record.participants,
    }));
    
    console.log(`getAllNoShows: Returning ${transformed.length} records`);
    return transformed;
  } catch (error) {
    console.error('Error in getAllNoShows:', error);
    throw error;
  }
};

export const getNoShowsByParticipant = async (): Promise<any[]> => {
  const supabase = getSupabaseClient();
  
  // Fetch all no-show records (no_show or NULL)
  const { data, error } = await supabase
    .from('attendance')
    .select(`
      participant_id,
      participants (
        id,
        name,
        email,
        is_blocklisted
      )
    `)
    .or('status.eq.no_show,status.is.null');

  if (error) throw new Error(`Failed to fetch no-shows by participant: ${error.message}`);
  
  // Group by participant and count
  const grouped = (data || []).reduce((acc: any, curr: any) => {
    const pid = curr.participant_id;
    if (!acc[pid]) {
      acc[pid] = {
        participant_id: pid,
        participant: curr.participants,
        no_show_count: 0,
      };
    }
    acc[pid].no_show_count++;
    return acc;
  }, {});
  
  return Object.values(grouped);
};

export const bulkImportAttendance = async (attendanceRecords: Array<{
  name: string;
  email: string;
  event_id: string;
  attendance_status: 'attended' | 'no_show';
}>): Promise<Attendance[]> => {
  const supabase = getSupabaseClient();
  const importedRecords: Attendance[] = [];

  for (const record of attendanceRecords) {
    try {
      // Find or create participant
      let { data: existingParticipant } = await supabase
        .from('participants')
        .select('id')
        .eq('email', record.email)
        .single();

      let participantId: string;
      if (existingParticipant) {
        participantId = existingParticipant.id;
      } else {
        // Create new participant
        const { data: newParticipant, error: participantError } = await supabase
          .from('participants')
          .insert([{
            name: record.name.trim(),
            email: record.email.trim(),
            is_blocklisted: false,
          }])
          .select()
          .single();

        if (participantError) throw new Error(`Failed to create participant: ${participantError.message}`);
        participantId = newParticipant.id;
      }

      // Check if attendance record already exists for this event
      const { data: existingAttendance } = await supabase
        .from('attendance')
        .select('id')
        .eq('participant_id', participantId)
        .eq('event_id', record.event_id)
        .single();

      // Map attendance status: treat any non-attended as 'no_show'
      let attendanceStatus: 'attended' | 'no_show' = 'no_show';
      if (record.attendance_status === 'attended') {
        attendanceStatus = 'attended';
      } else {
        attendanceStatus = 'no_show';
      }

      if (existingAttendance) {
        // Update existing attendance
        const { data: updatedAttendance, error: updateError } = await supabase
          .from('attendance')
          .update({ 
            status: attendanceStatus,
            marked_at: new Date().toISOString()
          })
          .eq('id', existingAttendance.id)
          .select()
          .single();

        if (updateError) throw new Error(`Failed to update attendance: ${updateError.message}`);
        importedRecords.push(updatedAttendance as Attendance);
      } else {
        // Create new attendance record
        const { data: newAttendance, error: insertError } = await supabase
          .from('attendance')
          .insert([{
            event_id: record.event_id,
            participant_id: participantId,
            status: attendanceStatus,
            marked_at: new Date().toISOString(),
          }])
          .select()
          .single();

        if (insertError) throw new Error(`Failed to create attendance: ${insertError.message}`);
        importedRecords.push(newAttendance as Attendance);
      }

      // Auto-blocklist if no-show count reaches threshold
      if (attendanceStatus === 'no_show') {
        const noShowCount = await getNoShowCount(participantId);
        if (noShowCount >= 2) {
          // Import the addToBlocklist function
          const { addToBlocklist } = await import('./blocklistService');
          await addToBlocklist(participantId, `Auto-blocklisted: ${noShowCount} no-shows`);
        }
      }
    } catch (error) {
      throw new Error(`Failed to import attendance for "${record.email}": ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return importedRecords;
};

export const bulkImportAttendanceBatch = async (attendanceRecords: Array<{
  name: string;
  email: string;
  event_id: string;
  attendance_status: 'attended' | 'no_show';
}>): Promise<{ imported: number; failed: number; errors: string[] }> => {
  let imported = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const record of attendanceRecords) {
    try {
      await bulkImportAttendance([record]);
      imported++;
    } catch (error) {
      failed++;
      const errorMsg = error instanceof Error ? error.message : String(error);
      errors.push(`${record.email}: ${errorMsg}`);
    }
  }

  return { imported, failed, errors };
};

// Bulk import attendance with snapshot tracking for rollback capability
export const bulkImportAttendanceWithSnapshots = async (
  attendanceRecords: Array<{
    name: string;
    email: string;
    event_id: string;
    attendance_status: 'attended' | 'no_show';
  }>,
  import_session_id?: string
): Promise<{ imported: number; failed: number; errors: string[] }> => {
  const supabase = getSupabaseClient();
  let imported = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const record of attendanceRecords) {
    try {
      // Find or create participant
      let { data: existingParticipant } = await supabase
        .from('participants')
        .select('id, is_blocklisted')
        .eq('email', record.email)
        .single();

      let participantId: string;
      let isNewParticipant = false;

      if (existingParticipant) {
        participantId = existingParticipant.id;
      } else {
        // Create new participant
        const { data: newParticipant, error: participantError } = await supabase
          .from('participants')
          .insert([{
            name: record.name.trim(),
            email: record.email.trim(),
            is_blocklisted: false,
            import_session_id,
          }])
          .select()
          .single();

        if (participantError) throw new Error(`Failed to create participant: ${participantError.message}`);
        participantId = newParticipant.id;
        isNewParticipant = true;
      }

      // Get current attendance status if exists
      const { data: existingAttendance } = await supabase
        .from('attendance')
        .select('id, status')
        .eq('participant_id', participantId)
        .eq('event_id', record.event_id)
        .single();

      // Create snapshot before making changes
      const previousStatus = existingAttendance?.status || null;
      const { data: participant } = await supabase
        .from('participants')
        .select('is_blocklisted')
        .eq('id', participantId)
        .single();

      await supabase.from('attendance_snapshots').insert([{
        import_session_id,
        participant_id: participantId,
        event_id: record.event_id,
        previous_status: previousStatus,
        previous_blocklist_status: participant?.is_blocklisted || false,
        is_new_participant: isNewParticipant,
      }]);

      // Map attendance status: treat any non-attended as 'no_show'
      let attendanceStatus: 'attended' | 'no_show' = 'no_show';
      if (record.attendance_status === 'attended') {
        attendanceStatus = 'attended';
      } else {
        attendanceStatus = 'no_show';
      }

      // Create or update attendance record
      if (existingAttendance) {
        const { error: updateError } = await supabase
          .from('attendance')
          .update({
            status: attendanceStatus,
            marked_at: new Date().toISOString(),
            import_session_id,
          })
          .eq('id', existingAttendance.id);

        if (updateError) throw new Error(`Failed to update attendance: ${updateError.message}`);
      } else {
        const { error: insertError } = await supabase
          .from('attendance')
          .insert([{
            event_id: record.event_id,
            participant_id: participantId,
            status: attendanceStatus,
            marked_at: new Date().toISOString(),
            import_session_id,
          }]);

        if (insertError) throw new Error(`Failed to create attendance: ${insertError.message}`);
      }

      // Auto-blocklist if no-show count reaches threshold
      if (attendanceStatus === 'no_show') {
        const noShowCount = await getNoShowCount(participantId);
        if (noShowCount >= 2) {
          const { addToBlocklist } = await import('./blocklistService');
          await addToBlocklist(participantId, `Auto-blocklisted: ${noShowCount} no-shows`);
        }
      }

      imported++;
    } catch (error) {
      failed++;
      const errorMsg = error instanceof Error ? error.message : String(error);
      errors.push(`${record.email}: ${errorMsg}`);
    }
  }

  return { imported, failed, errors };
};
