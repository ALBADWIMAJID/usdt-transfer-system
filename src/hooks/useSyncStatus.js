import { useContext } from 'react'
import { SyncContext } from '../context/SyncProvider.jsx'

function useSyncStatus() {
  const context = useContext(SyncContext)

  if (!context) {
    throw new Error('useSyncStatus must be used within a SyncProvider')
  }

  return context
}

export default useSyncStatus
