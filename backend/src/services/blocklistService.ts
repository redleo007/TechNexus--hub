import { getSupabaseClient } from '../utils/supabase';
import { getNoShowCount } from './attendanceService';
import { updateParticipant } from './participantService';

export interface BlocklistEntry {
  id: string;
  participant_id: string;
  reason: string;
  created_at: string;
}

export const getSettings = async () => {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('settings')
    .select('*')
    .limit(1)
    .single();

  if (error && error.code === 'PGRST116') {
    // No settings yet, return defaults
    return { no_show_limit: 2, auto_block_enabled: true };
  }

  if (error) throw new Error(`Failed to fetch settings: ${error.message}`);
  return data || { no_show_limit: 2, auto_block_enabled: true };
};

export const updateSettings = async (updates: any): Promise<any> => {
  const supabase = getSupabaseClient();
  
  // Ensure a single settings row exists; create if missing, else update
  const { data: existing } = await supabase
    .from('settings')
    .select('id')
    .limit(1)
    .single();

  if (!existing) {
    const { data, error } = await supabase
      .from('settings')
      .insert(updates)
      .select()
      .single();
    if (error) throw new Error(`Failed to create settings: ${error.message}`);
    return data;
  }

  const { data, error } = await supabase
    .from('settings')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', existing.id)
    .select()
    .single();

  if (error) throw new Error(`Failed to update settings: ${error.message}`);
  return data;
};

export const checkAndAutoBlock = async (participantId: string): Promise<boolean> => {
  const settings = await getSettings();
  
  if (!settings.auto_block_enabled) {
    return false;
  }

  const noShowCount = await getNoShowCount(participantId);
  
  if (noShowCount >= settings.no_show_limit) {
    // Check if already blocklisted
    const supabase = getSupabaseClient();
    const { data: existing } = await supabase
      .from('blocklist')
      .select('id')
      .eq('participant_id', participantId);

    if (!existing || existing.length === 0) {
      // Auto-block the participant
      await updateParticipant(participantId, {
        is_blocklisted: true,
        blocklist_reason: `Auto-blocked: ${noShowCount} no-shows (limit: ${settings.no_show_limit})`,
      } as any);

      await addToBlocklist(participantId, `Auto-blocked: ${noShowCount} no-shows`);
      
      // Log activity
      await logActivity({
        type: 'participant_auto_blocked',
        participant_id: participantId,
        details: `Reached ${settings.no_show_limit} no-shows`,
      });

      return true;
    }
  }

  return false;
};

export const addToBlocklist = async (participantId: string, reason: string): Promise<BlocklistEntry> => {
  const supabase = getSupabaseClient();
  
  // Update participant status
  await updateParticipant(participantId, {
    is_blocklisted: true,
    blocklist_reason: reason,
  } as any);
  
  // Check if already in blocklist
  const { data: existing } = await supabase
    .from('blocklist')
    .select('id')
    .eq('participant_id', participantId)
    .single();
  
  if (existing) {
    // Update existing entry
    const { data, error } = await supabase
      .from('blocklist')
      .update({ reason })
      .eq('participant_id', participantId)
      .select()
      .single();
    
    if (error) throw new Error(`Failed to update blocklist: ${error.message}`);
    return data as BlocklistEntry;
  }
  
  const { data, error } = await supabase
    .from('blocklist')
    .insert([{ participant_id: participantId, reason }])
    .select()
    .single();

  if (error) throw new Error(`Failed to add to blocklist: ${error.message}`);
  
  // Log activity
  await logActivity({
    type: 'participant_blocked',
    participant_id: participantId,
    details: reason,
  });
  
  return data as BlocklistEntry;
};

export const removeFromBlocklist = async (participantId: string): Promise<void> => {
  const supabase = getSupabaseClient();
  
  await updateParticipant(participantId, {
    is_blocklisted: false,
    blocklist_reason: undefined,
  } as any);

  const { error } = await supabase
    .from('blocklist')
    .delete()
    .eq('participant_id', participantId);

  if (error) throw new Error(`Failed to remove from blocklist: ${error.message}`);

  await logActivity({
    type: 'participant_unblocked',
    participant_id: participantId,
    details: 'Manually removed from blocklist',
  });
};

export const getBlocklist = async (): Promise<any[]> => {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('blocklist')
    .select(`
      id,
      participant_id,
      reason,
      created_at,
      participants (
        name,
        email
      )
    `)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Failed to fetch blocklist: ${error.message}`);
  return (data || []) as any[];
};

export const logActivity = async (activity: any): Promise<void> => {
  const supabase = getSupabaseClient();
  
  const { error } = await supabase
    .from('activity_logs')
    .insert([{ ...activity, created_at: new Date().toISOString() }]);

  if (error) console.error('Failed to log activity:', error.message);
};

export const getActivityLogs = async (limit: number = 20): Promise<any[]> => {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('activity_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(`Failed to fetch activity logs: ${error.message}`);
  return (data || []) as any[];
};
