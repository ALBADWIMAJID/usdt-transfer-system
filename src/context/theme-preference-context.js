import { createContext, useContext } from 'react'

const ThemePreferenceContext = createContext(null)

function useThemePreference() {
  const ctx = useContext(ThemePreferenceContext)
  if (!ctx) {
    throw new Error('useThemePreference must be used within ThemePreferenceProvider')
  }
  return ctx
}

export { ThemePreferenceContext, useThemePreference }
