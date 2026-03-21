import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTenant } from '../context/tenant-context.js'
import {
  listActiveQueuedCustomers,
  normalizeQueuedCustomersState,
  subscribeToMutationQueue,
} from '../lib/offline/customerQueue.js'

function usePendingCustomers() {
  const { orgId } = useTenant()
  const [pendingCustomers, setPendingCustomers] = useState([])
  const [loading, setLoading] = useState(true)

  const refreshPendingCustomers = useCallback(async () => {
    if (!orgId) {
      setPendingCustomers([])
      setLoading(false)
      return
    }

    setLoading(true)
    await normalizeQueuedCustomersState(orgId)
    const queuedCustomers = await listActiveQueuedCustomers({ orgId })
    setPendingCustomers(queuedCustomers)
    setLoading(false)
  }, [orgId])

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
