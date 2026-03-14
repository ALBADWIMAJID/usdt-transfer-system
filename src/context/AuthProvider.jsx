import { useEffect, useState } from 'react'
import { AuthContext } from './auth-context.js'
import { isSupabaseConfigured, supabase } from '../lib/supabase.js'

const configError = 'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env.'

function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(Boolean(supabase))

  useEffect(() => {
    if (!supabase) {
      return undefined
    }

    let isMounted = true

    const loadSession = async () => {
      const { data, error } = await supabase.auth.getSession()

      if (!isMounted) {
        return
      }

      if (error) {
        console.error('Failed to load Supabase session:', error.message)
      }

      setSession(data.session ?? null)
      setLoading(false)
    }

    loadSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setLoading(false)
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

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

    return supabase.auth.signOut()
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
