import { getSupabaseClient } from '../utils/supabase';
import { randomBytes } from 'crypto';

/**
 * Event-based participant management with full delete support
 */

/**
 * Check if a participant already exists in the event
 * Matching logic: email (if provided) or name
 */
export async function checkParticipantExists(
  eventId: string,
  name: string,
  email?: string
): Promise<string | null> {
  const supabase = getSupabaseClient();

  // If email is provided, match by email first
  if (email && email.trim()) {
    const { data: byEmail } = await supabase
      .from('participants')
      .select('id')
      .eq('email', email.trim())
      .single();

    if (byEmail) return byEmail.id;
  }

  // Fall back to name matching
  if (name && name.trim()) {
    const { data: byName } = await supabase
      .from('participants')
      .select('id')
      .eq('name', name.trim())
      .single();

    if (byName) return byName.id;
  }

  return null;
}

/**
 * Get all participants for an event
 */
export async function getEventParticipants(eventId: string): Promise<any[]> {
  const supabase = getSupabaseClient();

  // Get attendance records for this event, then fetch unique participants
  const { data: attendanceData, error: attendanceError } = await supabase
    .from('attendance')
    .select('participant_id')
    .eq('event_id', eventId);

  if (attendanceError) throw new Error(`Failed to fetch attendance: ${attendanceError.message}`);

  // If no attendance, return empty array
  if (!attendanceData || attendanceData.length === 0) {
    return [];
  }

  // Get unique participant IDs from attendance
  const participantIds = [...new Set(attendanceData.map((a: any) => a.participant_id))];

  // Fetch participant details for those IDs
  const { data, error } = await supabase
    .from('participants')
    .select('id, name, email, is_blocklisted')
    .in('id', participantIds)
    .order('name', { ascending: true });

  if (error) throw new Error(`Failed to fetch participants: ${error.message}`);

  return data || [];
}

/**
 * Get attendance records for an event with participant details
 */
export async function getEventAttendance(eventId: string): Promise<any[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('attendance')
    .select(`
      id,
      participant_id,
      status,
      created_at,
      participants(
        id,
        name,
        email,
        is_blocklisted
      )
    `)
    .eq('event_id', eventId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Failed to fetch attendance: ${error.message}`);

  // Transform the response to flatten participant data
  return (data || []).map((record: any) => ({
    id: record.id,
    participant_id: record.participant_id,
    status: record.status,
    created_at: record.created_at,
    name: record.participants?.name,
    email: record.participants?.email,
    is_blocklisted: record.participants?.is_blocklisted
  }));
}

/**
 * In-memory backup store for last delete action per event.
 * This enables a one-time undo using an ephemeral token returned to the client.
 * Note: Backups are overwritten on each new delete and cleared after undo.
 */
type DeleteBackup = {
  type: 'participant' | 'attendance';
  undoToken: string;
  createdAt: number;
  used: boolean;
  participants?: Array<{ id: string; name: string; email: string; is_blocklisted: boolean; blocklist_reason?: string }>; // for participant deletes
  attendance?: Array<{ id: string; event_id: string; participant_id: string; status: 'attended' | 'no_show'; marked_at?: string; created_at?: string } & { name?: string; email?: string }>; // include participant info for safer restore
};

const deleteBackups: Map<string, DeleteBackup> = new Map();

function createUndoToken(): string {
  return randomBytes(16).toString('hex');
}

function setBackup(eventId: string, backup: DeleteBackup) {
  deleteBackups.set(eventId, backup);
}

function getBackup(eventId: string): DeleteBackup | undefined {
  return deleteBackups.get(eventId);
}

function markBackupUsed(eventId: string) {
  const b = deleteBackups.get(eventId);
  if (b) {
    b.used = true;
    deleteBackups.set(eventId, b);
  }
}

/**
 * Delete all participants for an event
 * This also deletes all their attendance records
 */
export async function deleteAllEventParticipants(eventId: string): Promise<{ deleted: number; undoToken: string }> {
  const supabase = getSupabaseClient();

  // Gather attendance for this event (including participant info for backup)
  const { data: attendanceRecords, error: attendanceFetchError } = await supabase
    .from('attendance')
    .select(`id, event_id, participant_id, status, marked_at, created_at, participants(id, name, email, is_blocklisted, blocklist_reason)`) // join for email
    .eq('event_id', eventId);

  if (attendanceFetchError) throw new Error(`Failed to fetch attendance: ${attendanceFetchError.message}`);

  const participantIds = [...new Set((attendanceRecords || []).map((a: any) => a.participant_id))];

  // Fetch participant details
  const { data: participantData, error: participantFetchError } = await supabase
    .from('participants')
    .select('id, name, email, is_blocklisted, blocklist_reason')
    .in('id', participantIds);

  if (participantFetchError) throw new Error(`Failed to fetch participants: ${participantFetchError.message}`);

  // Create backup
  const undoToken = createUndoToken();
  setBackup(eventId, {
    type: 'participant',
    undoToken,
    createdAt: Date.now(),
    used: false,
    participants: (participantData || []) as DeleteBackup['participants'],
    attendance: (attendanceRecords || []).map((rec: any) => ({
      id: rec.id,
      event_id: rec.event_id,
      participant_id: rec.participant_id,
      status: rec.status,
      marked_at: rec.marked_at,
      created_at: rec.created_at,
      name: rec.participants?.name,
      email: rec.participants?.email,
    })) as DeleteBackup['attendance'],
  });

  // Delete attendance for the event
  const { data: deletedAttendance, error: attendanceDeleteError } = await supabase
    .from('attendance')
    .delete()
    .eq('event_id', eventId)
    .select('id, participant_id');

  if (attendanceDeleteError) throw new Error(`Failed to delete attendance records: ${attendanceDeleteError.message}`);

  // After removing attendance for this event, delete participants that no longer have any attendance anywhere
  const { data: remainingAttendance, error: remainingError } = await supabase
    .from('attendance')
    .select('participant_id')
    .in('participant_id', participantIds);

  if (remainingError) throw new Error(`Failed to check remaining attendance: ${remainingError.message}`);

  const stillReferenced = new Set((remainingAttendance || []).map((r: any) => r.participant_id));
  const deletableParticipantIds = participantIds.filter(id => !stillReferenced.has(id));

  if (deletableParticipantIds.length > 0) {
    const { error: participantDeleteError } = await supabase
      .from('participants')
      .delete()
      .in('id', deletableParticipantIds);

    if (participantDeleteError) throw new Error(`Failed to delete participants: ${participantDeleteError.message}`);
  }

  return { deleted: participantIds.length, undoToken };
}

/**
 * Delete selected participants (by IDs)
 * This also deletes their attendance records
 */
export async function deleteSelectedParticipants(
  eventId: string,
  participantIds: string[]
): Promise<{ deleted: number }> {
  const supabase = getSupabaseClient();

  if (!participantIds || participantIds.length === 0) {
    return { deleted: 0 };
  }

  // Delete attendance records for these participants in the event
  const { error: attendanceError } = await supabase
    .from('attendance')
    .delete()
    .eq('event_id', eventId)
    .in('participant_id', participantIds);

  if (attendanceError) {
    throw new Error(`Failed to delete attendance records: ${attendanceError.message}`);
  }

  // Delete the participants themselves
  const { error: deleteError } = await supabase
    .from('participants')
    .delete()
    .in('id', participantIds);

  if (deleteError) throw new Error(`Failed to delete participants: ${deleteError.message}`);

  return { deleted: participantIds.length };
}

/**
 * Delete all attendance records for an event
 * This keeps participants intact
 */
export async function deleteAllEventAttendance(eventId: string): Promise<{ deleted: number; undoToken: string }> {
  const supabase = getSupabaseClient();

  // Backup attendance for event with participant info
  const { data: attendanceRecords, error: attendanceFetchError } = await supabase
    .from('attendance')
    .select(`id, event_id, participant_id, status, marked_at, created_at, participants(id, name, email)`) // join for email
    .eq('event_id', eventId);

  if (attendanceFetchError) throw new Error(`Failed to fetch attendance: ${attendanceFetchError.message}`);

  const undoToken = createUndoToken();
  setBackup(eventId, {
    type: 'attendance',
    undoToken,
    createdAt: Date.now(),
    used: false,
    attendance: (attendanceRecords || []).map((rec: any) => ({
      id: rec.id,
      event_id: rec.event_id,
      participant_id: rec.participant_id,
      status: rec.status,
      marked_at: rec.marked_at,
      created_at: rec.created_at,
      name: rec.participants?.name,
      email: rec.participants?.email,
    })),
  });

  const { data, error: deleteError } = await supabase
    .from('attendance')
    .delete()
    .eq('event_id', eventId)
    .select();

  if (deleteError) throw new Error(`Failed to delete attendance: ${deleteError.message}`);

  return { deleted: data?.length || 0, undoToken };
}

/**
 * Delete selected attendance records (by IDs)
 */
export async function deleteSelectedAttendance(
  eventId: string,
  attendanceIds: string[]
): Promise<{ deleted: number }> {
  const supabase = getSupabaseClient();

  if (!attendanceIds || attendanceIds.length === 0) {
    return { deleted: 0 };
  }

  const { error } = await supabase
    .from('attendance')
    .delete()
    .eq('event_id', eventId)
    .in('id', attendanceIds);

  if (error) throw new Error(`Failed to delete attendance: ${error.message}`);

  return { deleted: attendanceIds.length };
}

/**
 * Undo the last delete for an event (one-time, token-based).
 * - type 'participant': restores participants (dedup by email/name) and their attendance for the event
 * - type 'attendance': restores attendance records for the event (ensures participant exists)
 */
export async function undoLastDelete(
  eventId: string,
  type: 'participant' | 'attendance',
  undoToken: string
): Promise<{ restored: number }> {
  const supabase = getSupabaseClient();
  const backup = getBackup(eventId);

  if (!backup || backup.used || backup.type !== type || backup.undoToken !== undoToken) {
    throw new Error('No undo available for this event or token has expired');
  }

  let restored = 0;

  if (type === 'participant') {
    // Restore participants (dedup) and map old to new IDs by email/name
    const idMap = new Map<string, string>(); // key: original participant_id, value: current participant_id

    for (const p of backup.participants || []) {
      // Try to find existing participant by email; fall back to name
      let currentId: string | null = null;
      if (p.email) {
        const { data: byEmail } = await supabase
          .from('participants')
          .select('id')
          .eq('email', p.email)
          .single();
        if (byEmail) currentId = byEmail.id;
      }
      if (!currentId && p.name) {
        const { data: byName } = await supabase
          .from('participants')
          .select('id')
          .eq('name', p.name)
          .single();
        if (byName) currentId = byName.id;
      }

      if (!currentId) {
        // Recreate participant
        const { data: newP, error: insertError } = await supabase
          .from('participants')
          .insert({
            name: p.name,
            email: p.email,
            is_blocklisted: p.is_blocklisted,
            blocklist_reason: p.blocklist_reason || null,
          })
          .select()
          .single();
        if (insertError) throw new Error(`Failed to restore participant: ${insertError.message}`);
        currentId = newP.id;
      }

      idMap.set(p.id, currentId);
    }

    // Restore attendance for this event, linking to current participant IDs
    for (const a of backup.attendance || []) {
      const mappedParticipantId = idMap.get(a.participant_id) || a.participant_id;
      // Check if attendance already exists
      const { data: existing } = await supabase
        .from('attendance')
        .select('id')
        .eq('event_id', eventId)
        .eq('participant_id', mappedParticipantId)
        .single();

      if (!existing) {
        const { error: insertError } = await supabase
          .from('attendance')
          .insert({
            event_id: eventId,
            participant_id: mappedParticipantId,
            status: a.status,
            marked_at: a.marked_at || new Date().toISOString(),
          });
        if (insertError) throw new Error(`Failed to restore attendance: ${insertError.message}`);
        restored++;
      }
    }
  } else if (type === 'attendance') {
    // Restore attendance records for this event
    for (const a of backup.attendance || []) {
      // Ensure participant exists (try by id; else by email/name)
      let participantId = a.participant_id;
      const { data: exists } = await supabase
        .from('participants')
        .select('id')
        .eq('id', participantId)
        .single();

      if (!exists) {
        // Try by email
        let foundId: string | null = null;
        if (a.email) {
          const { data: byEmail } = await supabase
            .from('participants')
            .select('id')
            .eq('email', a.email)
            .single();
          if (byEmail) foundId = byEmail.id;
        }
        if (!foundId && a.name) {
          const { data: byName } = await supabase
            .from('participants')
            .select('id')
            .eq('name', a.name)
            .single();
          if (byName) foundId = byName.id;
        }

        if (!foundId) {
          // Recreate participant minimally
          const { data: newP, error: insertError } = await supabase
            .from('participants')
            .insert({ name: a.name || 'Unknown', email: a.email || `${Date.now()}@restore.local`, is_blocklisted: false })
            .select()
            .single();
          if (insertError) throw new Error(`Failed to restore participant: ${insertError.message}`);
          participantId = newP.id;
        } else {
          participantId = foundId;
        }
      }

      // Check if attendance exists; if not, re-insert
      const { data: existingAttendance } = await supabase
        .from('attendance')
        .select('id')
        .eq('event_id', eventId)
        .eq('participant_id', participantId)
        .single();

      if (!existingAttendance) {
        const { error: insertError } = await supabase
          .from('attendance')
          .insert({
            event_id: eventId,
            participant_id: participantId,
            status: a.status,
            marked_at: a.marked_at || new Date().toISOString(),
          });
        if (insertError) throw new Error(`Failed to restore attendance: ${insertError.message}`);
        restored++;
      }
    }
  }

  markBackupUsed(eventId);
  return { restored };
}
