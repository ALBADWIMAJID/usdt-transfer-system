import { useCallback, useState } from 'react'

const initialSnapshotState = {
  hasSnapshot: false,
  isFromCache: false,
  savedAt: '',
  source: 'live',
}

function useOfflineSnapshot() {
  const [snapshotState, setSnapshotState] = useState(initialSnapshotState)

  const markLiveSnapshot = useCallback((savedAt = '') => {
    setSnapshotState({
      hasSnapshot: Boolean(savedAt),
      isFromCache: false,
      savedAt: savedAt || '',
      source: 'live',
    })
  }, [])

  const markCachedSnapshot = useCallback((savedAt = '') => {
    setSnapshotState({
      hasSnapshot: true,
      isFromCache: true,
      savedAt: savedAt || '',
      source: 'cache',
    })
  }, [])

  const clearSnapshotState = useCallback(() => {
    setSnapshotState(initialSnapshotState)
  }, [])

  return {
    clearSnapshotState,
    markCachedSnapshot,
    markLiveSnapshot,
    snapshotState,
  }
}

export default useOfflineSnapshot
