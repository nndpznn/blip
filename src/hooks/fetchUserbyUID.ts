import { supabase } from '@/clients/supabaseClient'
import { PUBLIC_PROFILE_COLUMNS, type ProfileRow } from '@/models/user'

/**
 * Loads a profile. By default only public columns are requested (never `email`), so this
 * works for logged-out visitors. Pass `includeEmail` only for the signed-in user's own profile.
 * Returns null when the profile can't be loaded.
 */
export async function fetchUserByUID(
  uid: string,
  options: { includeEmail?: boolean } = {},
): Promise<ProfileRow | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select(options.includeEmail ? '*' : PUBLIC_PROFILE_COLUMNS)
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
