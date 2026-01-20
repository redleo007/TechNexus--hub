import { getSupabaseClient } from '../utils/supabase';

export interface Attendance {
  id: string;
  event_id: string;
  participant_id: string;
  status: 'attended' | 'no_show' | null;
  marked_at: string;
  created_at: string;
}

export const markAttendance = async (attendanceData: Omit<Attendance, 'id' | 'created_at' | 'marked_at'>): Promise<Attendance> => {
  const supabase = getSupabaseClient();
  
  // Check if attendance record already exists for this participant-event combination
  const { data: existing } = await supabase
    .from('attendance')
    .select('id')
    .eq('participant_id', attendanceData.participant_id)
    .eq('event_id', attendanceData.event_id)
    .single();

  if (existing) {
    // Update existing record
    const { data, error } = await supabase
      .from('attendance')
      .update({ 
        status: attendanceData.status,
        marked_at: new Date().toISOString() 
      })
      .eq('id', existing.id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update attendance: ${error.message}`);
    return data as Attendance;
  } else {
    // Insert new record
    const { data, error } = await supabase
      .from('attendance')
      .insert([{ ...attendanceData, marked_at: new Date().toISOString() }])
      .select()
      .single();

    if (error) throw new Error(`Failed to mark attendance: ${error.message}`);
    return data as Attendance;
  }
};

export const getAttendanceByEvent = async (eventId: string): Promise<Attendance[]> => {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('attendance')
    .select('*')
    .eq('event_id', eventId);

  if (error) throw new Error(`Failed to fetch attendance: ${error.message}`);
  return (data || []) as Attendance[];
};

export const getAttendanceByParticipant = async (participantId: string): Promise<Attendance[]> => {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('attendance')
    .select('*')
    .eq('participant_id', participantId);

  if (error) throw new Error(`Failed to fetch participant attendance: ${error.message}`);
  return (data || []) as Attendance[];
};

export const deleteAttendance = async (id: string): Promise<void> => {
  const supabase = getSupabaseClient();
  
  // Get participant_id before deletion for blocklist check
  const { data: attendance } = await supabase
    .from('attendance')
    .select('participant_id')
    .eq('id', id)
    .single();

  const { error } = await supabase
    .from('attendance')
    .delete()
    .eq('id', id);

  if (error) throw new Error(`Failed to delete attendance: ${error.message}`);
  
  // After deletion, check if participant should be removed from blocklist
  if (attendance?.participant_id) {
    const noShowCount = await getNoShowCount(attendance.participant_id);
    if (noShowCount < 2) {
      // Remove from blocklist if no-shows are now below threshold
      const { removeFromBlocklist } = await import('./blocklistService');
      await removeFromBlocklist(attendance.participant_id).catch(() => {
        // Ignore error if not in blocklist
      });
    }
  }
};

export const updateAttendance = async (id: string, status: 'attended' | 'no_show'): Promise<Attendance> => {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('attendance')
    .update({ status, marked_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(`Failed to update attendance: ${error.message}`);
  return data as Attendance;
};

export const getNoShowCount = async (participantId: string): Promise<number> => {
  const supabase = getSupabaseClient();
  
  // Count records where status is 'no_show' or NULL
  const { data, error } = await supabase
    .from('attendance')
    .select('id')
    .eq('participant_id', participantId)
    .or('status.eq.no_show,status.is.null');

  if (error) throw new Error(`Failed to count no-shows: ${error.message}`);
  return (data || []).length;
};

export const getAttendanceStats = async (): Promise<{ attended: number; noShow: number }> => {
  const supabase = getSupabaseClient();
  
  const { count: attendedCount } = await supabase
    .from('attendance')
    .select('*', { count: 'exact' })
    .eq('status', 'attended');

  // Count no-shows: status = 'no_show' or NULL
  const { data: noShowData } = await supabase
    .from('attendance')
    .select('id')
    .or('status.eq.no_show,status.is.null');

  return {
    attended: attendedCount || 0,
    noShow: (noShowData || []).length,
  };
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
