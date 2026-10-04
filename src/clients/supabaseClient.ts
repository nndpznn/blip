import { createClient } from '@/clients/supabase/browser'

/** Browser Supabase client (cookie-backed via @supabase/ssr). */
export const supabase = createClient()
