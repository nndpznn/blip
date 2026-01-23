import { supabase } from '@/clients/supabaseClient'

export async function fetchUserByUsername(username: string) {
  try {
	const { data, error } = await supabase
	  .from('profiles')
	  .select("*")
	  .eq('username', username)
	  .single()

	if (error) {
	  throw error
	}
	
	if (data) {
	  return data;
	} else {
	  console.log('User not found.')
	}
  } catch (err: unknown) {
	console.error('Error fetching user:', err)
  }
}