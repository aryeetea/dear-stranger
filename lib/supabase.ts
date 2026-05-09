import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { env } from './env'

let liveClient: SupabaseClient | null = null

export let supabaseInitError: Error | null = null

try {
  const supabaseUrl = env.supabaseUrl()
  const supabaseAnonKey = env.supabaseAnonKey()

  liveClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      detectSessionInUrl: false,
      flowType: 'pkce',
      persistSession: true,
    },
  })
} catch (error) {
  supabaseInitError = error instanceof Error ? error : new Error('Supabase failed to initialize.')
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    if (!liveClient) {
      throw supabaseInitError ?? new Error('Supabase failed to initialize.')
    }

    const value = Reflect.get(liveClient as object, prop)
    if (typeof value === 'function') {
      return value.bind(liveClient)
    }

    return value
  },
})
