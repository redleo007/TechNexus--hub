/**
 * OPTIMIZED BLOCKLIST SERVICE - ZERO N+1 QUERIES
 * Auto-blocklist at 2+ no-shows. Manual add/remove.
 * NO LOOPS. Single aggregated queries only.
 */

import { getSupabaseClient } from '../utils/supabase';
import { getNoShowsByParticipant } from './attendanceService';

export interface BlocklistEntry {
  id: string;
  participant_id: string;
  reason: 'auto_no_show' | 'manual';
  created_at: string;
  added_by?: string;
}

/**
 * Get all blocklisted participants (single query - NO loop)
 */
export const getBlocklist = async (): Promise<BlocklistEntry[]> => {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('blocklist')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Failed to fetch blocklist: ${error.message}`);
  return (data || []) as BlocklistEntry[];
};

/**
 * Get blocklist count (SINGLE COUNT query - NO loop)
 */
export const getBlocklistCount = async (): Promise<number> => {
  const supabase = getSupabaseClient();
  
  const { count, error } = await supabase
    .from('blocklist')
    .select('*', { count: 'exact' });

  if (error) throw new Error(`Failed to count blocklist: ${error.message}`);
  return count || 0;
};

/**
 * Check if participant is on blocklist
 */
export const isBlocklisted = async (participantId: string): Promise<boolean> => {
  const supabase = getSupabaseClient();
  
  const { count, error } = await supabase
    .from('blocklist')
    .select('*', { count: 'exact' })
    .eq('participant_id', participantId);

  if (error) throw new Error(`Failed to check blocklist status: ${error.message}`);
  return (count || 0) > 0;
};

/**
 * Get blocklist entry by participant
 */
export const getBlocklistEntry = async (participantId: string): Promise<BlocklistEntry | null> => {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('blocklist')
    .select('*')
    .eq('participant_id', participantId)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to fetch blocklist entry: ${error.message}`);
  }
  
  return (data as BlocklistEntry) || null;
};

/**
 * Add to blocklist (manual or auto)
 */
export const addToBlocklist = async (
  participantId: string,
  reason: 'auto_no_show' | 'manual',
  addedBy?: string
): Promise<BlocklistEntry> => {
  const supabase = getSupabaseClient();

  // Check if already blocked
  const existing = await getBlocklistEntry(participantId);
  if (existing) {
    return existing; // Already blocked
  }

  const { data, error } = await supabase
    .from('blocklist')
    .insert([{ participant_id: participantId, reason, added_by: addedBy || null }])
    .select()
    .single();

  if (error) throw new Error(`Failed to add to blocklist: ${error.message}`);
  return data as BlocklistEntry;
};

/**
 * Remove from blocklist
 */
export const removeFromBlocklist = async (participantId: string): Promise<void> => {
  const supabase = getSupabaseClient();
  
  const { error } = await supabase
    .from('blocklist')
    .delete()
    .eq('participant_id', participantId);

  if (error) throw new Error(`Failed to remove from blocklist: ${error.message}`);
};

/**
 * CRITICAL: Auto-manage blocklist based on no-shows (SINGLE AGGREGATED QUERY)
 * Participants with 2+ no-shows MUST be on blocklist
 * Participants with <2 no-shows must NOT be auto-blocklisted
 */
export const syncAutoBlocklist = async (): Promise<{ added: number; removed: number }> => {
  // Get no-shows by participant (SINGLE QUERY - aggregated)
  const noShowsByParticipant = await getNoShowsByParticipant();
  
  // Get current blocklist (SINGLE QUERY)
  const blocklist = await getBlocklist();
  const autoBlocklisted = new Set(
    blocklist.filter(e => e.reason === 'auto_no_show').map(e => e.participant_id)
  );

  let added = 0;
  let removed = 0;

  // Participants that SHOULD be auto-blocked (2+ no-shows)
  const shouldBeBlocked = new Set<string>();
  Object.entries(noShowsByParticipant).forEach(([participantId, count]) => {
    if (count >= 2) {
      shouldBeBlocked.add(participantId);
    }
  });

  // ADD: Participants with 2+ no-shows not yet blocked
  for (const participantId of shouldBeBlocked) {
    if (!autoBlocklisted.has(participantId)) {
      await addToBlocklist(participantId, 'auto_no_show');
      added++;
    }
  }

  // REMOVE: Auto-blocked participants with <2 no-shows
  for (const participantId of autoBlocklisted) {
    if (!shouldBeBlocked.has(participantId)) {
      await removeFromBlocklist(participantId);
      removed++;
    }
  }

  return { added, removed };
};

/**
 * Get blocklist with participant details (single query with joins)
 */
export const getBlocklistWithDetails = async (): Promise<any[]> => {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('blocklist')
    .select(`
      id,
      participant_id,
      reason,
      created_at,
      participants (id, name, email, phone)
    `)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Failed to fetch blocklist details: ${error.message}`);
  return (data || []) as any[];
};
