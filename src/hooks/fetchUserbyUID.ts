import { supabase } from '@/clients/supabaseClient'

export async function fetchUserByUID(uid: any) {
  try {
    const { data: user, error } = await supabase
      .from('users') // Note: In the client, the `auth.users` table is exposed as 'users'
      .select('id, email, created_at, user_metadata')
      .eq('id', uid)
      .single()

    if (error) {
      throw error
    }

	if (user) {
      console.log('User found:', user)
      // Access specific fields, like email:
      console.log('User email:', user.email)
      // Access metadata, like the user's display name:
      console.log('User display name:', user.user_metadata.displayName)
	  return user;
    } else {
      console.log('User not found.')
    }
  } catch (err: any) {
    console.error('Error fetching user:', err.message)
  }
}