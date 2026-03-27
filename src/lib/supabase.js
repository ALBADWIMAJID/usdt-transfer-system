import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const supabaseAuthStorageKey = createSupabaseAuthStorageKey(supabaseUrl)

function createSupabaseAuthStorageKey(url) {
  if (!url) {
    return ''
  }

  try {
    const parsedUrl = new URL(url)

    return `sb-${parsedUrl.hostname.split('.')[0]}-auth-token`
  } catch {
    return ''
  }
}

function readStoredJson(key) {
  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined' || !key) {
    return null
  }

  try {
    const rawValue = window.localStorage.getItem(key)

    return rawValue ? JSON.parse(rawValue) : null
  } catch {
    return null
  }
}

export const isSupabaseConfigured = Boolean(
  supabaseUrl && supabaseAnonKey
)

export function readPersistedSupabaseSession() {
  if (!supabaseAuthStorageKey) {
    return null
  }

  const storedSession = readStoredJson(supabaseAuthStorageKey)

  if (!storedSession || typeof storedSession !== 'object') {
    return null
  }

  const nextSession = { ...storedSession }

  if (!nextSession.user) {
    const storedUser = readStoredJson(`${supabaseAuthStorageKey}-user`)

    if (storedUser?.user) {
      nextSession.user = storedUser.user
    }
  }

  return nextSession.user || nextSession.access_token || nextSession.refresh_token
    ? nextSession
    : null
}

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, supabaseAuthStorageKey
      ? {
          auth: {
            storageKey: supabaseAuthStorageKey,
          },
        }
      : undefined)
  : null
