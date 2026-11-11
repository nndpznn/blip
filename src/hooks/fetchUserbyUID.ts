import { supabase } from '@/clients/supabaseClient'
import { PUBLIC_PROFILE_COLUMNS, type ProfileRow } from '@/models/user'

/**
 * Loads a profile using only public columns (never `email`), so this works for logged-out
 * visitors. The signed-in user's own email comes from the auth session (`user.email`); the
 * database does not let any role read `profiles.email`.
 * Returns null when the profile can't be loaded.
 */
export async function fetchUserByUID(uid: string): Promise<ProfileRow | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select(PUBLIC_PROFILE_COLUMNS)
      .eq('id', uid)
      .single()

    if (error || !data) {
      console.error('Could not load profile:', error?.message ?? 'not found')
      return null
    }
    return data as unknown as ProfileRow
  } catch (err: unknown) {
    console.error('Error fetching user:', err)
    return null
  }
}
