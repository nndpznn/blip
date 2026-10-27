import { supabase } from './supabase';

export interface RsvpResult {
  error: string | null;
  /** False when the database was already in the requested state, so counts should not move. */
  changed: boolean;
}

/**
 * Sets whether `profileId` attends `meetId`. Idempotent: the primary key on (profile_id, meet_id)
 * rejects a duplicate insert with 23505 (already attending), and deleting a missing row removes nothing.
 */
export async function setRsvp(profileId: string, meetId: number | string, attending: boolean): Promise<RsvpResult> {
  if (attending) {
    const { error } = await supabase.from('meet_attendees').insert([{ profile_id: profileId, meet_id: meetId }]);
    if (!error) return { error: null, changed: true };
    if (error.code === '23505') return { error: null, changed: false };
    return { error: error.message, changed: false };
  }

  const { data, error } = await supabase
    .from('meet_attendees')
    .delete()
    .eq('profile_id', profileId)
    .eq('meet_id', meetId)
    .select('meet_id');
  if (error) return { error: error.message, changed: false };
  return { error: null, changed: (data?.length ?? 0) > 0 };
}
