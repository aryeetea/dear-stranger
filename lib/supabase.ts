import { createClient } from '@supabase/supabase-js'
import { env } from './env'

const supabaseUrl = env.supabaseUrl()
const supabaseAnonKey = env.supabaseAnonKey()

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    detectSessionInUrl: false,
    flowType: 'pkce',
    persistSession: true,
  },
})
