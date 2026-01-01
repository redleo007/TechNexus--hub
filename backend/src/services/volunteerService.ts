import { getSupabaseClient } from '../utils/supabase';

export interface Volunteer {
  id: string;
  name: string;
  email: string;
  comment: string;
  place?: string;
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

export const deleteVolunteer = async (id: string): Promise<void> => {
  const supabase = getSupabaseClient();
  
  const { error } = await supabase
    .from('volunteers')
    .delete()
    .eq('id', id);

  if (error) throw new Error(`Failed to delete volunteer: ${error.message}`);
};
