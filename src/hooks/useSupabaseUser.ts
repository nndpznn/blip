import { useEffect, useState } from 'react'

import { supabase } from '@/clients/supabaseClient'

import { User, UserResponse } from '@supabase/supabase-js'

export const useSupabaseUser = () => {
  const [user, setUser] = useState<User | null>()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    const fetchUser = async () => {
      const response: UserResponse = await supabase.auth.getUser()
      if (mounted) {
        setUser(response.data.user)
        setLoading(false)
      }
    }

    fetchUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.info('useSupabaseUser hook > onAuthStateChange > event: ', event)
      if (mounted) {
        setUser(session?.user ?? null)
        setLoading(false)
      }
    })

    return () => {
      mounted = false
      subscription?.unsubscribe()
    }
  }, [])

  return { user, loading }
}
