import { supabase } from '@/clients/supabaseClient'

export async function fetchUserByUID(uid: string) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select("*")
      .eq('id', uid)
      .single()
    
    if (data) {
      return data;
    } else if (error) {
      return error;
    } else {
      console.log('User not found.')
    }

  } catch (err: unknown) {
    console.error('Error fetching user:', err)
  }
}