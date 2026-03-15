import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  listActiveQueuedCustomers,
  normalizeQueuedCustomersState,
  subscribeToMutationQueue,
} from '../lib/offline/customerQueue.js'

function usePendingCustomers() {
  const [pendingCustomers, setPendingCustomers] = useState([])
  const [loading, setLoading] = useState(true)

  const refreshPendingCustomers = useCallback(async () => {
    setLoading(true)
    await normalizeQueuedCustomersState()
    const queuedCustomers = await listActiveQueuedCustomers()
    setPendingCustomers(queuedCustomers)
    setLoading(false)
  }, [])

  useEffect(() => {
    if (typeof queueMicrotask === 'function') {
      queueMicrotask(refreshPendingCustomers)
    } else {
      Promise.resolve().then(refreshPendingCustomers)
    }

    const unsubscribe = subscribeToMutationQueue(() => {
      refreshPendingCustomers()
    })

    return unsubscribe
  }, [refreshPendingCustomers])

  const summary = useMemo(() => {
    return pendingCustomers.reduce(
      (accumulator, record) => {
        accumulator.activeCount += 1

        if (record.status === 'failed') {
          accumulator.failedCount += 1
        } else if (record.status === 'syncing') {
          accumulator.syncingCount += 1
        } else {
          accumulator.pendingCount += 1
        }

        return accumulator
      },
      {
        activeCount: 0,
        failedCount: 0,
        pendingCount: 0,
        syncingCount: 0,
      }
    )
  }, [pendingCustomers])

  return {
    pendingCustomers,
    pendingCustomersLoading: loading,
    refreshPendingCustomers,
    ...summary,
  }
}

export default usePendingCustomers
