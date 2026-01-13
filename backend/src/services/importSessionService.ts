import { getSupabaseClient } from '../utils/supabase';

export interface ImportSession {
  id: string;
  event_id: string;
  import_type: 'participants' | 'attendance' | 'volunteer_attendance';
  status: 'pending' | 'completed' | 'failed' | 'rolled_back';
  record_count: number;
  uploaded_at: string;
  rolled_back_at?: string;
  created_at: string;
}

export interface ImportAuditLog {
  id: string;
  import_session_id: string;
  action: 'created' | 'deleted' | 'rolled_back';
  details?: any;
  created_by?: string;
  created_at: string;
}

// Create a new import session
export const createImportSession = async (
  event_id: string,
  import_type: 'participants' | 'attendance' | 'volunteer_attendance',
  record_count: number
): Promise<ImportSession> => {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('import_sessions')
    .insert([
      {
        event_id,
        import_type,
        record_count,
        status: 'completed',
      },
    ])
    .select()
    .single();

  if (error) throw new Error(`Failed to create import session: ${error.message}`);
  return data as ImportSession;
};

// Get import sessions for an event
export const getImportSessions = async (event_id: string, daysBack?: number): Promise<ImportSession[]> => {
  const supabase = getSupabaseClient();

  let query = supabase
    .from('import_sessions')
    .select('*')
    .eq('event_id', event_id);

  if (daysBack) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysBack);
    query = query.gte('created_at', cutoffDate.toISOString());
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) throw new Error(`Failed to fetch import sessions: ${error.message}`);
  return (data || []) as ImportSession[];
};

// Get a specific import session
export const getImportSession = async (import_session_id: string): Promise<ImportSession> => {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('import_sessions')
    .select('*')
    .eq('id', import_session_id)
    .single();

  if (error) throw new Error(`Failed to fetch import session: ${error.message}`);
  return data as ImportSession;
};

// Create audit log entry
export const createAuditLog = async (
  import_session_id: string,
  action: 'created' | 'deleted' | 'rolled_back',
  details?: any,
  created_by?: string
): Promise<ImportAuditLog> => {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('import_audit_logs')
    .insert([
      {
        import_session_id,
        action,
        details,
        created_by,
      },
    ])
    .select()
    .single();

  if (error) throw new Error(`Failed to create audit log: ${error.message}`);
  return data as ImportAuditLog;
};

// Get audit logs for an import session
export const getAuditLogs = async (import_session_id: string): Promise<ImportAuditLog[]> => {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('import_audit_logs')
    .select('*')
    .eq('import_session_id', import_session_id)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Failed to fetch audit logs: ${error.message}`);
  return (data || []) as ImportAuditLog[];
};

// Delete/rollback participant import
export const deleteParticipantImport = async (import_session_id: string): Promise<{ deleted: number; error?: string }> => {
  const supabase = getSupabaseClient();

  try {
    // Get the import session
    const session = await getImportSession(import_session_id);

    // Get all participants linked to this import
    const { data: participants, error: fetchError } = await supabase
      .from('participants')
      .select('id')
      .eq('import_session_id', import_session_id);

    if (fetchError) throw new Error(`Failed to fetch participants: ${fetchError.message}`);

    const participantIds = participants?.map(p => p.id) || [];

    if (participantIds.length === 0) {
      // Mark session as rolled back
      await supabase
        .from('import_sessions')
        .update({ status: 'rolled_back', rolled_back_at: new Date().toISOString() })
        .eq('id', import_session_id);

      await createAuditLog(import_session_id, 'rolled_back', { deleted: 0 });
      return { deleted: 0 };
    }

    // Delete participants (will cascade delete attendance records due to FK)
    const { error: deleteError } = await supabase
      .from('participants')
      .delete()
      .in('id', participantIds);

    if (deleteError) throw new Error(`Failed to delete participants: ${deleteError.message}`);

    // Mark session as rolled back
    await supabase
      .from('import_sessions')
      .update({ status: 'rolled_back', rolled_back_at: new Date().toISOString() })
      .eq('id', import_session_id);

    // Log the deletion
    await createAuditLog(import_session_id, 'rolled_back', { 
      deleted: participantIds.length,
      participant_ids: participantIds 
    });

    return { deleted: participantIds.length };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { deleted: 0, error: message };
  }
};

// Revert attendance import
export const revertAttendanceImport = async (import_session_id: string): Promise<{ reverted: number; error?: string }> => {
  const supabase = getSupabaseClient();

  try {
    // Get the import session
    const session = await getImportSession(import_session_id);

    // Get snapshots for this import
    const { data: snapshots, error: snapshotError } = await supabase
      .from('attendance_snapshots')
      .select('*')
      .eq('import_session_id', import_session_id);

    if (snapshotError) throw new Error(`Failed to fetch snapshots: ${snapshotError.message}`);

    let reverted = 0;

    // Process each snapshot
    for (const snapshot of snapshots || []) {
      if (snapshot.is_new_participant) {
        // Delete the participant that was created during this import
        const { error: deleteError } = await supabase
          .from('participants')
          .delete()
          .eq('id', snapshot.participant_id);

        if (deleteError) throw new Error(`Failed to delete participant: ${deleteError.message}`);
      } else {
        // Restore previous attendance status
        if (snapshot.previous_status) {
          const { error: updateError } = await supabase
            .from('attendance')
            .update({ status: snapshot.previous_status })
            .eq('participant_id', snapshot.participant_id)
            .eq('event_id', snapshot.event_id);

          if (updateError) throw new Error(`Failed to restore attendance: ${updateError.message}`);
        }

        // Restore blocklist status
        if (snapshot.previous_blocklist_status !== undefined) {
          const { error: blocklistError } = await supabase
            .from('participants')
            .update({ is_blocklisted: snapshot.previous_blocklist_status })
            .eq('id', snapshot.participant_id);

          if (blocklistError) throw new Error(`Failed to restore blocklist status: ${blocklistError.message}`);
        }
      }

      reverted++;
    }

    // Delete attendance records created by this import
    const { error: deleteAttendanceError } = await supabase
      .from('attendance')
      .delete()
      .eq('import_session_id', import_session_id);

    if (deleteAttendanceError) throw new Error(`Failed to delete attendance records: ${deleteAttendanceError.message}`);

    // Mark session as rolled back
    await supabase
      .from('import_sessions')
      .update({ status: 'rolled_back', rolled_back_at: new Date().toISOString() })
      .eq('id', import_session_id);

    // Log the revert
    await createAuditLog(import_session_id, 'rolled_back', { 
      reverted,
      snapshot_count: snapshots?.length || 0
    });

    return { reverted };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { reverted: 0, error: message };
  }
};

// Delete volunteer attendance import (hard delete - no snapshots for volunteer attendance)
export const deleteVolunteerAttendanceImport = async (import_session_id: string): Promise<{ deleted: number; error?: string }> => {
  try {
    const supabase = getSupabaseClient();

    // Get the session to verify it exists and get record count
    const session = await getImportSession(import_session_id);
    if (!session) {
      return { deleted: 0, error: 'Import session not found' };
    }

    if (session.import_type !== 'volunteer_attendance') {
      return { deleted: 0, error: 'Session is not a volunteer attendance import' };
    }

    // Check if session is too old (30 days limit)
    const sessionDate = new Date(session.created_at);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    if (sessionDate < thirtyDaysAgo) {
      return { deleted: 0, error: 'Import history is only available for the last 30 days. This import cannot be deleted.' };
    }

    // Get all volunteer attendance records created by this session
    // Since volunteer attendance doesn't have snapshots, we need to find records by creation time
    // This is approximate - we'll delete records created around the same time as the session
    const sessionTime = new Date(session.created_at);
    const timeWindowStart = new Date(sessionTime.getTime() - 60000); // 1 minute before
    const timeWindowEnd = new Date(sessionTime.getTime() + (session.record_count * 1000)); // Allow time based on record count

    const { data: recordsToDelete, error: fetchError } = await supabase
      .from('volunteer_attendance')
      .select('id')
      .gte('created_at', timeWindowStart.toISOString())
      .lte('created_at', timeWindowEnd.toISOString())
      .limit(session.record_count + 10); // Add some buffer

    if (fetchError) {
      return { deleted: 0, error: `Failed to fetch records: ${fetchError.message}` };
    }

    if (!recordsToDelete || recordsToDelete.length === 0) {
      return { deleted: 0, error: 'No matching records found to delete' };
    }

    // Delete the records
    const { error: deleteError } = await supabase
      .from('volunteer_attendance')
      .delete()
      .in('id', recordsToDelete.map(r => r.id));

    if (deleteError) {
      return { deleted: 0, error: `Failed to delete records: ${deleteError.message}` };
    }

    // Mark session as rolled back
    await supabase
      .from('import_sessions')
      .update({ status: 'rolled_back', rolled_back_at: new Date().toISOString() })
      .eq('id', import_session_id);

    // Log the deletion
    await createAuditLog(import_session_id, 'rolled_back', { 
      deleted: recordsToDelete.length
    });

    return { deleted: recordsToDelete.length };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { deleted: 0, error: message };
  }
};
