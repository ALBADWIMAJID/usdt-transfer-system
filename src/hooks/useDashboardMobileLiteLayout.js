import { useSyncExternalStore } from 'react'

const QUERY = '(max-width: 960px)'

function subscribe(callback) {
  const mq = window.matchMedia(QUERY)
  mq.addEventListener('change', callback)
  return () => mq.removeEventListener('change', callback)
}

function getSnapshot() {
  return window.matchMedia(QUERY).matches
}

function getServerSnapshot() {
  return false
}

/**
 * Presentation-only: Dashboard “Lite” single-panel workspace on phone widths.
 */
function useDashboardMobileLiteLayout() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

export default useDashboardMobileLiteLayout
