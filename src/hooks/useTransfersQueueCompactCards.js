import { useSyncExternalStore } from 'react'

const QUERY = '(max-width: 720px)'

function subscribeCompact(callback) {
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
 * Presentation-only: dense transfer cards on narrow viewports (Transfers queue page).
 */
function useTransfersQueueCompactCards() {
  return useSyncExternalStore(subscribeCompact, getSnapshot, getServerSnapshot)
}

export default useTransfersQueueCompactCards
