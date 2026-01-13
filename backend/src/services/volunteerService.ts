import { getSupabaseClient } from '../utils/supabase';

export interface Volunteer {
  id: string;
  name: string;
  email: string;
  comment: string;
  place?: string;
  is_active: boolean;
  joined_date: string;
  created_at: string;
}

export const createVolunteer = async (volunteerData: Omit<Volunteer, 'id' | 'created_at'>): Promise<Volunteer> => {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('volunteers')
    .insert([volunteerData])
    .select()
    .single();

  if (error) throw new Error(`Failed to create volunteer: ${error.message}`);
  return data as Volunteer;
};

export const getVolunteers = async (sortBy: 'newest' | 'oldest' = 'newest'): Promise<Volunteer[]> => {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('volunteers')
    .select('*')
    .order('joined_date', { ascending: sortBy === 'oldest' });

  if (error) throw new Error(`Failed to fetch volunteers: ${error.message}`);
  return (data || []) as Volunteer[];
};

export const getVolunteerById = async (id: string): Promise<Volunteer> => {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('volunteers')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw new Error(`Failed to fetch volunteer: ${error.message}`);
  return data as Volunteer;
};

export const updateVolunteer = async (id: string, updates: Partial<Volunteer>): Promise<Volunteer> => {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('volunteers')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(`Failed to update volunteer: ${error.message}`);
  return data as Volunteer;
};

export const toggleVolunteerStatus = async (id: string, isActive: boolean): Promise<Volunteer> => {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('volunteers')
    .update({ is_active: isActive })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(`Failed to update volunteer status: ${error.message}`);
  return data as Volunteer;
};

export const deleteVolunteer = async (id: string): Promise<void> => {
  const supabase = getSupabaseClient();
  
  const { error } = await supabase
    .from('volunteers')
    .delete()
    .eq('id', id);

  if (error) throw new Error(`Failed to delete volunteer: ${error.message}`);
};

export interface VolunteerWork {
  id: string;
  volunteer_id: string;
  event_id: string;
  task_name: string;
  task_status: 'assigned' | 'in_progress' | 'completed';
  created_at: string;
  updated_at: string;
}

export const createWorkAssignment = async (workData: Omit<VolunteerWork, 'id' | 'created_at' | 'updated_at'>): Promise<VolunteerWork> => {
  const supabase = getSupabaseClient();

  // Validate volunteer exists
  const { data: volunteer, error: volunteerError } = await supabase
    .from('volunteers')
    .select('id')
    .eq('id', workData.volunteer_id)
    .single();

  if (volunteerError || !volunteer) {
    throw new Error('Volunteer not found');
  }

  // Validate event exists
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('id')
    .eq('id', workData.event_id)
    .single();

  if (eventError || !event) {
    throw new Error('Event not found');
  }

  // Insert work assignment
  const { data, error } = await supabase
    .from('volunteer_work')
    .insert([{
      volunteer_id: workData.volunteer_id,
      event_id: workData.event_id,
      task_name: workData.task_name,
      task_status: workData.task_status,
      updated_at: new Date().toISOString()
    }])
    .select()
    .single();

  if (error) throw new Error(`Failed to create work assignment: ${error.message}`);
  return data as VolunteerWork;
};

export const getWorkHistory = async (volunteerId: string): Promise<VolunteerWork[]> => {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('volunteer_work')
    .select(`
      *,
      events:event_id (
        name,
        date,
        location
      )
    `)
    .eq('volunteer_id', volunteerId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Failed to fetch work history: ${error.message}`);
  return (data || []) as VolunteerWork[];
};

export const deleteWorkAssignment = async (workId: string): Promise<void> => {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from('volunteer_work')
    .delete()
    .eq('id', workId);

  if (error) throw new Error(`Failed to delete work assignment: ${error.message}`);
};

export const deleteAllWorkForEvent = async (eventId: string, volunteerId: string): Promise<void> => {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from('volunteer_work')
    .delete()
    .eq('event_id', eventId)
    .eq('volunteer_id', volunteerId);

  if (error) throw new Error(`Failed to delete work assignments: ${error.message}`);
};
