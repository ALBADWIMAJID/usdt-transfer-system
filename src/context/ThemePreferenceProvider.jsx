import { useCallback, useEffect, useMemo, useReducer, useState } from 'react'
import {
  DEFAULT_THEME_MODE,
  readStoredMode,
  resolveDataThemeFromMode,
  THEME_STORAGE_KEY,
  writeStoredMode,
  normalizeStoredMode,
} from '../lib/themePreference.js'
import { ThemePreferenceContext } from './theme-preference-context.js'

function ThemePreferenceProvider({ children }) {
  const [mode, setModeState] = useState(() => readStoredMode())
  const [, forceAutoResync] = useReducer((n) => n + 1, 0)

  const setMode = useCallback((next) => {
    const normalized =
      typeof next === 'string' ? normalizeStoredMode(next) : DEFAULT_THEME_MODE
    writeStoredMode(normalized)
    setModeState(normalized)
  }, [])

  useEffect(() => {
    if (mode === 'auto') return undefined
    document.documentElement.dataset.theme = mode
    return undefined
  }, [mode])

  useEffect(() => {
    if (mode !== 'auto') return undefined
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      document.documentElement.dataset.theme = mq.matches ? 'dark' : 'light'
      forceAutoResync()
    }
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [mode])

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key !== THEME_STORAGE_KEY || e.newValue == null) return
      setModeState(normalizeStoredMode(e.newValue))
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const resolvedTheme = resolveDataThemeFromMode(mode)

  const value = useMemo(
    () => ({
      mode,
      resolvedTheme,
      setMode,
    }),
    [mode, resolvedTheme, setMode]
  )

  return (
    <ThemePreferenceContext.Provider value={value}>{children}</ThemePreferenceContext.Provider>
  )
}

export default ThemePreferenceProvider
