import { getSupabaseClient } from '../utils/supabase';

/**
 * Volunteer attendance management and history tracking
 */

/**
 * Get recent event attendance for a volunteer (last 5 events)
 */
export async function getVolunteerRecentAttendance(volunteerId: string, limit: number = 5): Promise<any[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('volunteer_attendance')
    .select(`
      id,
      volunteer_id,
      event_id,
      attendance_status,
      created_at,
      events(
        id,
        name,
        date
      )
    `)
    .eq('volunteer_id', volunteerId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(`Failed to fetch volunteer attendance: ${error.message}`);

  // Transform the response to flatten event data
  return (data || []).map((record: any) => ({
    id: record.id,
    volunteer_id: record.volunteer_id,
    event_id: record.event_id,
    attendance_status: record.attendance_status,
    created_at: record.created_at,
    event_name: record.events?.name,
    event_date: record.events?.date
  }));
}

/**
 * Record volunteer attendance for an event
 */
export async function recordVolunteerAttendance(
  volunteerId: string,
  eventId: string,
  status: 'attended' | 'not_attended' | 'no_show'
): Promise<any> {
  const supabase = getSupabaseClient();

  // Try to update first (upsert pattern)
  const { data: existing, error: selectError } = await supabase
    .from('volunteer_attendance')
    .select('id')
    .eq('volunteer_id', volunteerId)
    .eq('event_id', eventId)
    .single();

  if (selectError && selectError.code !== 'PGRST116') {
    throw new Error(`Failed to check existing attendance: ${selectError.message}`);
  }

  if (existing) {
    // Update existing record
    const { data, error } = await supabase
      .from('volunteer_attendance')
      .update({
        attendance_status: status,
        updated_at: new Date().toISOString()
      })
      .eq('id', existing.id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update attendance: ${error.message}`);
    return data;
  } else {
    // Insert new record
    const { data, error } = await supabase
      .from('volunteer_attendance')
      .insert({
        volunteer_id: volunteerId,
        event_id: eventId,
        attendance_status: status
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to record attendance: ${error.message}`);
    return data;
  }
}

/**
 * Get all attendance records for a volunteer (full history, paginated)
 */
export async function getVolunteerAttendanceHistory(
  volunteerId: string,
  page: number = 1,
  limit: number = 20
): Promise<{ records: any[]; total: number; page: number; totalPages: number }> {
  const supabase = getSupabaseClient();
  const offset = (page - 1) * limit;

  // Get total count
  const { count, error: countError } = await supabase
    .from('volunteer_attendance')
    .select('*', { count: 'exact', head: true })
    .eq('volunteer_id', volunteerId);

  if (countError) throw new Error(`Failed to count attendance: ${countError.message}`);

  // Get paginated records
  const { data, error } = await supabase
    .from('volunteer_attendance')
    .select(`
      id,
      volunteer_id,
      event_id,
      attendance_status,
      created_at,
      events(
        id,
        name,
        date,
        location
      )
    `)
    .eq('volunteer_id', volunteerId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw new Error(`Failed to fetch attendance history: ${error.message}`);

  const records = (data || []).map((record: any) => ({
    id: record.id,
    volunteer_id: record.volunteer_id,
    event_id: record.event_id,
    attendance_status: record.attendance_status,
    created_at: record.created_at,
    event_name: record.events?.name,
    event_date: record.events?.date,
    event_location: record.events?.location
  }));

  const total = count || 0;
  const totalPages = Math.ceil(total / limit);

  return {
    records,
    total,
    page,
    totalPages
  };
}

/**
 * Get attendance statistics for a volunteer
 */
export async function getVolunteerAttendanceStats(volunteerId: string): Promise<any> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('volunteer_attendance')
    .select('attendance_status')
    .eq('volunteer_id', volunteerId);

  if (error) throw new Error(`Failed to fetch attendance stats: ${error.message}`);

  const stats = {
    total: (data || []).length,
    attended: (data || []).filter((r: any) => r.attendance_status === 'attended').length,
    notAttended: (data || []).filter((r: any) => r.attendance_status === 'not_attended').length,
    noShow: (data || []).filter((r: any) => r.attendance_status === 'no_show').length
  };

  return {
    ...stats,
    attendanceRate: stats.total > 0 ? Math.round((stats.attended / stats.total) * 100) : 0
  };
}

/**
 * Bulk import volunteer attendance records
 */
export async function bulkImportAttendance(records: any[], importSessionId?: string): Promise<any> {
  const supabase = getSupabaseClient();

  if (!records || records.length === 0) {
    throw new Error('No records to import');
  }

  // Process each record
  const results = [];
  const errors = [];

  for (const record of records) {
    try {
      const { name, email, event_id, attendance_status } = record;

      if (!name || !email || !event_id || !attendance_status) {
        errors.push(`Invalid record: missing required fields`);
        continue;
      }

      // Find volunteer by email
      const { data: volunteerData, error: volunteerError } = await supabase
        .from('volunteers')
        .select('id')
        .eq('email', email)
        .single();

      if (volunteerError || !volunteerData) {
        errors.push(`Volunteer not found with email: ${email}`);
        continue;
      }

      // Insert or update attendance record
      const { data: existing } = await supabase
        .from('volunteer_attendance')
        .select('id')
        .eq('volunteer_id', volunteerData.id)
        .eq('event_id', event_id)
        .single();

      if (existing) {
        // Update
        const { data, error } = await supabase
          .from('volunteer_attendance')
          .update({
            attendance_status,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id)
          .select()
          .single();

        if (error) {
          errors.push(`Failed to update attendance for ${email}: ${error.message}`);
        } else {
          results.push(data);
        }
      } else {
        // Insert
        const insertData: any = {
          volunteer_id: volunteerData.id,
          event_id,
          attendance_status,
          created_at: new Date().toISOString()
        };
        
        if (importSessionId) {
          insertData.import_session_id = importSessionId;
        }

        const { data, error } = await supabase
          .from('volunteer_attendance')
          .insert(insertData)
          .select()
          .single();

        if (error) {
          errors.push(`Failed to insert attendance for ${email}: ${error.message}`);
        } else {
          results.push(data);
        }
      }
    } catch (error: any) {
      errors.push(`Processing error: ${error.message}`);
    }
  }

  return {
    imported: results.length,
    failed: errors.length,
    errors: errors.length > 0 ? errors : undefined,
    records: results
  };
}
