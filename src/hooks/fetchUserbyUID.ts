import { supabase } from '@/clients/supabaseClient'

export async function fetchUserByUID(uid: string) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select("*")
      .eq('id', uid)
      .single()

    if (error) {
      throw error
    }
    
    if (data) {
      return data;
    } else {
      console.log('User not found.')
    }
  } catch (err: any) {
    console.error('Error fetching user:', err.message)
  }
}