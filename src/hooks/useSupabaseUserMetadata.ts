import { useSupabaseUser } from './useSupabaseUser'

export const useSupabaseUserMetadata = () => {
  const { user, loading } = useSupabaseUser()

  const email = user?.email ?? ''
  const fullName = user?.user_metadata?.full_name ?? ''
  const uid = user?.id ?? ''
  const avatarUrl = user?.user_metadata?.avatar_url ?? ''

  return { email, fullName, uid, avatarUrl, loading }
}
