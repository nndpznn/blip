import { ilikeLiteral } from '@blip/shared';

import { supabase } from './supabase';

/** Columns safe to show anyone. Never includes `email` (the database hides it from logged-out visitors). */
const PUBLIC_COLUMNS = 'id, fullname, username, headline, bio, link, profile_color';

export interface ProfileRow {
  id: string;
  fullname: string | null;
  username: string | null;
  headline: string | null;
  bio: string | null;
  link: string | null;
  profile_color: string | null;
}

export async function fetchProfile(id: string): Promise<{ profile: ProfileRow | null; error: string | null }> {
  const { data, error } = await supabase.from('profiles').select(PUBLIC_COLUMNS).eq('id', id).maybeSingle();
  if (error) return { profile: null, error: error.message };
  return { profile: (data as ProfileRow | null) ?? null, error: null };
}

export interface ProfileEdit {
  username: string;
  fullname: string;
  headline: string;
  bio: string;
  profile_color: string;
}

/**
 * Saves the signed-in user's profile. Usernames are unique case-insensitively ("Nolan" == "nolan"):
 * checked up front for a friendly message, and the unique constraint (23505) is the backstop.
 */
export async function saveProfile(
  userId: string,
  edit: ProfileEdit,
): Promise<{ profile: ProfileRow | null; usernameTaken: boolean; error: string | null }> {
  const username = edit.username.trim();

  // Not .maybeSingle(): old data could hold several case variants, and we only need any other owner.
  const { data: matches } = await supabase
    .from('profiles')
    .select('id')
    .ilike('username', ilikeLiteral(username))
    .neq('id', userId)
    .limit(1);
  if (matches && matches.length > 0) return { profile: null, usernameTaken: true, error: null };

  const { data, error } = await supabase
    .from('profiles')
    .update({ ...edit, username })
    .eq('id', userId)
    .select(PUBLIC_COLUMNS);
  if (error) return { profile: null, usernameTaken: error.code === '23505', error: error.code === '23505' ? null : error.message };
  if (!data?.length) return { profile: null, usernameTaken: false, error: 'Profile not found.' };
  return { profile: data[0] as ProfileRow, usernameTaken: false, error: null };
}

export const isHexColor = (value: string): boolean => /^#[0-9a-fA-F]{6}$/.test(value.trim());
