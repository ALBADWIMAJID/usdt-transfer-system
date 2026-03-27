import { useEffect, useState } from 'react'
import { AuthContext } from './auth-context.js'
import useNetworkStatus from '../hooks/useNetworkStatus.js'
import { clearTenantBootstrapCache } from '../lib/bootstrapCache.js'
import { isSupabaseConfigured, readPersistedSupabaseSession, supabase } from '../lib/supabase.js'

const configError = 'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env.'
const AUTH_SESSION_BOOTSTRAP_TIMEOUT_MS = 4000

function AuthProvider({ children }) {
  const { isOffline } = useNetworkStatus()
  const [session, setSession] = useState(readPersistedSupabaseSession)
  const [loading, setLoading] = useState(Boolean(supabase))

  useEffect(() => {
    if (!supabase) {
      return undefined
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!nextSession) {
        clearTenantBootstrapCache()
      }

      setSession(nextSession)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!supabase) {
      return undefined
    }

    let isMounted = true
    let timeoutId = null

    const applyResolvedSession = (nextSession) => {
      if (!isMounted) {
        return
      }

      setSession(nextSession ?? null)
      setLoading(false)
    }

    const applyPersistedSessionFallback = () => {
      applyResolvedSession(readPersistedSupabaseSession())
    }

    if (isOffline) {
      applyPersistedSessionFallback()

      return () => {
        isMounted = false
      }
    }

    timeoutId = window.setTimeout(() => {
      console.warn('Supabase session bootstrap timed out. Falling back to persisted session data.')
      applyPersistedSessionFallback()
    }, AUTH_SESSION_BOOTSTRAP_TIMEOUT_MS)

    const loadSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession()

        if (!isMounted) {
          return
        }

        if (error) {
          console.error('Failed to load Supabase session:', error.message)
          applyPersistedSessionFallback()
          return
        }

        applyResolvedSession(data.session ?? null)
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        console.error('Failed to load Supabase session:', message)
        applyPersistedSessionFallback()
      } finally {
        if (timeoutId) {
          clearTimeout(timeoutId)
        }
      }
    }

    loadSession()

    return () => {
      isMounted = false

      if (timeoutId) {
        clearTimeout(timeoutId)
      }
    }
  }, [isOffline])

  const signInWithPassword = async ({ email, password }) => {
    if (!supabase) {
      return { data: null, error: new Error(configError) }
    }

    return supabase.auth.signInWithPassword({ email, password })
  }

  const signOut = async () => {
    if (!supabase) {
      return { error: new Error(configError) }
    }

    const result = await supabase.auth.signOut()

    if (!result.error) {
      clearTenantBootstrapCache()
    }

    return result
  }

  return (
    <AuthContext.Provider
      value={{
        configError,
        isConfigured: isSupabaseConfigured,
        loading,
        session,
        signInWithPassword,
        signOut,
        user: session?.user ?? null,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export default AuthProvider
