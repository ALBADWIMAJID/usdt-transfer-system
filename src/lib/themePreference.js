/** Persisted appearance mode; resolved to `light` | `dark` on `<html data-theme>`. */
export const THEME_STORAGE_KEY = 'usdt-theme-mode'

export const DEFAULT_THEME_MODE = 'auto'

export function normalizeStoredMode(raw) {
  if (raw === 'light' || raw === 'dark' || raw === 'auto') return raw
  return DEFAULT_THEME_MODE
}

export function readStoredMode() {
  try {
    return normalizeStoredMode(localStorage.getItem(THEME_STORAGE_KEY))
  } catch {
    return DEFAULT_THEME_MODE
  }
}

export function writeStoredMode(mode) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, normalizeStoredMode(mode))
  } catch {
    /* ignore quota / private mode */
  }
}

export function resolveDataThemeFromMode(mode) {
  if (mode === 'dark') return 'dark'
  if (mode === 'light') return 'light'
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return 'light'
}
