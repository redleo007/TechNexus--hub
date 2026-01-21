import { getSupabaseClient } from '../utils/supabase';
import { getNoShowCount } from './attendanceService';
import { updateParticipant } from './participantService';

/**
 * Blocklist Type Enumeration
 * - auto: Automatically blocked due to no-shows >= limit
 * - manual: Manually added by admin
 */
export type BlocklistType = 'auto' | 'manual';

export interface BlocklistEntry {
  id: string;
  participant_id: string;
  reason: string;
  blocklist_type: BlocklistType;
  created_at: string;
  updated_at?: string;
}

export interface BlocklistStats {
  total: number;
  auto_blocked: number;
  manually_blocked: number;
}

/**
 * Represents the computed blocklist state for a participant
 * Combines auto-block logic with manual overrides
 */
export interface ComputedBlocklistState {
  is_blocklisted: boolean;
  auto_blocked: boolean;
  manually_blocked: boolean;
  manually_unblocked: boolean;
  no_show_count: number;
  reason: string;
}

/**
 * Get settings with defaults
 */
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

/**
 * Compute blocklist state for a participant
 * Implements the business logic:
 * - Final blocklist = auto block + manual block (no duplicates)
 * - Manual unblock overrides auto block
 * - If no-shows < threshold and not manually blocked → auto remove
 * 
 * @param participantId The participant ID
 * @returns Computed blocklist state
 */
export const computeBlocklistState = async (participantId: string): Promise<ComputedBlocklistState> => {
  const supabase = getSupabaseClient();
  const settings = await getSettings();

  // Get no-show count (source of truth)
  const noShowCount = await getNoShowCount(participantId);

  // Check auto-block eligibility
  const shouldAutoBlock = noShowCount >= settings.no_show_limit && settings.auto_block_enabled;

  // Check blocklist entries
  const { data: blocklistEntries } = await supabase
    .from('blocklist')
    .select('*')
    .eq('participant_id', participantId);

  const blocklistEntry = blocklistEntries?.[0];
  const isManuallyBlocked = blocklistEntry?.blocklist_type === 'manual' && blocklistEntry?.reason !== null;
  const isManuallyUnblocked = blocklistEntry?.blocklist_type === 'manual' && blocklistEntry?.reason === 'manually_unblocked';
  const isAutoBlocked = blocklistEntry?.blocklist_type === 'auto';

  // Final determination: Manual unblock overrides auto block
  let isFinallyBlocklisted = false;
  let finalReason = '';

  if (isManuallyUnblocked) {
    // Manually unblocked - override everything
    isFinallyBlocklisted = false;
    finalReason = 'manually_unblocked';
  } else if (isManuallyBlocked) {
    // Manually blocked - always block
    isFinallyBlocklisted = true;
    finalReason = blocklistEntry?.reason || 'manually_blocked';
  } else if (shouldAutoBlock) {
    // Auto block if no manual override
    isFinallyBlocklisted = true;
    finalReason = `Auto-blocked: ${noShowCount} no-shows (limit: ${settings.no_show_limit})`;
  } else {
    // Not blocked
    isFinallyBlocklisted = false;
    finalReason = '';
  }

  return {
    is_blocklisted: isFinallyBlocklisted,
    auto_blocked: shouldAutoBlock && !isManuallyUnblocked,
    manually_blocked: isManuallyBlocked,
    manually_unblocked: isManuallyUnblocked,
    no_show_count: noShowCount,
    reason: finalReason,
  };
};

/**
 * Sync blocklist state with database
 * Updates participant is_blocklisted flag to match computed state
 * 
 * @param participantId The participant ID
 */
export const syncBlocklistState = async (participantId: string): Promise<void> => {
  const state = await computeBlocklistState(participantId);

  await updateParticipant(participantId, {
    is_blocklisted: state.is_blocklisted,
    blocklist_reason: state.is_blocklisted ? state.reason : undefined,
  } as any);
};

/**
 * Check and auto-block a participant if they reach no-show limit
 * Also performs cleanup if conditions no longer met
 * 
 * @param participantId The participant ID
 * @returns True if state changed
 */
export const checkAndAutoBlock = async (participantId: string): Promise<boolean> => {
  const supabase = getSupabaseClient();
  const previousState = await computeBlocklistState(participantId);
  
  // Check current no-show count
  const noShowCount = await getNoShowCount(participantId);
  const settings = await getSettings();

  // Get existing blocklist entry if any
  const { data: blocklistEntries } = await supabase
    .from('blocklist')
    .select('*')
    .eq('participant_id', participantId);

  const blocklistEntry = blocklistEntries?.[0];

  if (!settings.auto_block_enabled) {
    return false;
  }

  // If no-shows >= limit and not manually unblocked, create or update auto-block entry
  if (noShowCount >= settings.no_show_limit) {
    if (!blocklistEntry) {
      // Create new auto-block entry
      const { error } = await supabase
        .from('blocklist')
        .insert([{
          participant_id: participantId,
          reason: `Auto-blocked: ${noShowCount} no-shows`,
          blocklist_type: 'auto',
        }]);

      if (error) throw new Error(`Failed to auto-block: ${error.message}`);

      await logActivity({
        type: 'participant_auto_blocked',
        participant_id: participantId,
        details: `Reached ${settings.no_show_limit} no-shows`,
      });
    }
  } else {
    // If no-shows < limit and entry is auto-block (not manual), remove it
    if (blocklistEntry?.blocklist_type === 'auto' && !blocklistEntry?.manually_blocked) {
      const { error } = await supabase
        .from('blocklist')
        .delete()
        .eq('participant_id', participantId);

      if (error) throw new Error(`Failed to remove auto-block: ${error.message}`);

      await logActivity({
        type: 'participant_auto_unblocked',
        participant_id: participantId,
        details: `No-shows below threshold (${noShowCount})`,
      });
    }
  }

  // Sync final state
  await syncBlocklistState(participantId);

  const newState = await computeBlocklistState(participantId);
  return previousState.is_blocklisted !== newState.is_blocklisted;
};

/**
 * Manually add participant to blocklist
 * This overrides auto-block logic
 * 
 * @param participantId The participant ID
 * @param reason The reason for manual block
 * @returns The blocklist entry
 */
export const addToBlocklist = async (participantId: string, reason: string): Promise<BlocklistEntry> => {
  const supabase = getSupabaseClient();
  
  if (!reason || !reason.trim()) {
    throw new Error('Reason is required for manual blocklist');
  }

  // Check if already in blocklist
  const { data: existing } = await supabase
    .from('blocklist')
    .select('*')
    .eq('participant_id', participantId)
    .single();

  let entry: BlocklistEntry;

  if (existing) {
    // Update existing entry to manual with new reason
    const { data, error } = await supabase
      .from('blocklist')
      .update({
        reason: reason.trim(),
        blocklist_type: 'manual',
        updated_at: new Date().toISOString(),
      })
      .eq('participant_id', participantId)
      .select()
      .single();

    if (error) throw new Error(`Failed to update blocklist: ${error.message}`);
    entry = data as BlocklistEntry;
  } else {
    // Create new manual blocklist entry
    const { data, error } = await supabase
      .from('blocklist')
      .insert([{
        participant_id: participantId,
        reason: reason.trim(),
        blocklist_type: 'manual',
      }])
      .select()
      .single();

    if (error) throw new Error(`Failed to add to blocklist: ${error.message}`);
    entry = data as BlocklistEntry;
  }

  // Sync final state
  await syncBlocklistState(participantId);

  // Log activity
  await logActivity({
    type: 'participant_blocked',
    participant_id: participantId,
    details: `Manual: ${reason.trim()}`,
  });

  return entry;
};

/**
 * Manually remove participant from blocklist
 * This creates a manual unblock entry that overrides auto-block
 * 
 * @param participantId The participant ID
 */
export const removeFromBlocklist = async (participantId: string): Promise<void> => {
  const supabase = getSupabaseClient();
  
  // Check if participant has auto-block due to no-shows
  const noShowCount = await getNoShowCount(participantId);
  const settings = await getSettings();

  // Get existing blocklist entry
  const { data: existing } = await supabase
    .from('blocklist')
    .select('*')
    .eq('participant_id', participantId)
    .single();

  // If auto-blocked but no longer eligible for auto-block, simply delete
  if (noShowCount < settings.no_show_limit && existing?.blocklist_type === 'auto') {
    const { error } = await supabase
      .from('blocklist')
      .delete()
      .eq('participant_id', participantId);

    if (error) throw new Error(`Failed to remove from blocklist: ${error.message}`);
  } else if (existing && noShowCount >= settings.no_show_limit) {
    // If still eligible for auto-block, create manual unblock override
    const { error } = await supabase
      .from('blocklist')
      .update({
        reason: 'manually_unblocked',
        blocklist_type: 'manual',
        updated_at: new Date().toISOString(),
      })
      .eq('participant_id', participantId);

    if (error) throw new Error(`Failed to unblock: ${error.message}`);
  } else if (existing) {
    // No special conditions, just delete
    const { error } = await supabase
      .from('blocklist')
      .delete()
      .eq('participant_id', participantId);

    if (error) throw new Error(`Failed to remove from blocklist: ${error.message}`);
  }

  // Sync final state
  await syncBlocklistState(participantId);

  // Log activity
  await logActivity({
    type: 'participant_unblocked',
    participant_id: participantId,
    details: 'Manually removed from blocklist',
  });
};

/**
 * Get blocklist with computed states
 * This is the unified function used by both Dashboard and Blocklist pages
 * Ensures consistent counts across the application
 */
export const getBlocklist = async (): Promise<any[]> => {
  const supabase = getSupabaseClient();
  
  // Get all participants with computed blocklist state
  const { data: participants, error: participantsError } = await supabase
    .from('participants')
    .select('id, name, email, is_blocklisted');

  if (participantsError) throw new Error(`Failed to fetch participants: ${participantsError.message}`);

  // Compute and sync state for each participant
  const blocklistData = [];
  for (const participant of participants || []) {
    const state = await computeBlocklistState(participant.id);

    // Only include if finally blocklisted
    if (state.is_blocklisted) {
      blocklistData.push({
        id: `${participant.id}-blocklist`,
        participant_id: participant.id,
        reason: state.reason,
        blocklist_type: state.auto_blocked ? 'auto' : 'manual',
        is_manually_unblocked: state.manually_unblocked,
        no_show_count: state.no_show_count,
        participants: {
          name: participant.name,
          email: participant.email,
        },
      });
    }
  }

  return blocklistData.sort((a, b) => b.no_show_count - a.no_show_count);
};

/**
 * Get blocklist count (unified for Dashboard and Blocklist page)
 * This ensures both pages show the same count
 */
export const getBlocklistCount = async (): Promise<number> => {
  const blocklist = await getBlocklist();
  return blocklist.length;
};

/**
 * Get blocklist statistics
 */
export const getBlocklistStats = async (): Promise<BlocklistStats> => {
  const supabase = getSupabaseClient();
  const blocklist = await getBlocklist();

  const { count: manualCount } = await supabase
    .from('blocklist')
    .select('*', { count: 'exact' })
    .eq('blocklist_type', 'manual');

  return {
    total: blocklist.length,
    auto_blocked: blocklist.filter(b => b.blocklist_type === 'auto').length,
    manually_blocked: (manualCount || 0) - blocklist.filter(b => b.is_manually_unblocked).length,
  };
};

/**
 * Log activity for audit trail
 */
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
