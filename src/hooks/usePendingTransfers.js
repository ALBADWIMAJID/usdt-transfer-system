import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTenant } from '../context/tenant-context.js'
import {
  listActiveQueuedTransfers,
  normalizeQueuedTransfersState,
  subscribeToMutationQueue,
} from '../lib/offline/transferQueue.js'

function usePendingTransfers(customerId = '') {
  const { orgId } = useTenant()
  const [pendingTransfers, setPendingTransfers] = useState([])
  const [loading, setLoading] = useState(true)

  const refreshPendingTransfers = useCallback(async () => {
    if (!orgId) {
      setPendingTransfers([])
      setLoading(false)
      return
    }

    setLoading(true)
    await normalizeQueuedTransfersState(orgId)
    const queuedTransfers = await listActiveQueuedTransfers({ customerId, orgId })
    setPendingTransfers(queuedTransfers)
    setLoading(false)
  }, [customerId, orgId])

  useEffect(() => {
    if (typeof queueMicrotask === 'function') {
      queueMicrotask(refreshPendingTransfers)
    } else {
      Promise.resolve().then(refreshPendingTransfers)
    }

    const unsubscribe = subscribeToMutationQueue(() => {
      refreshPendingTransfers()
    })

    return unsubscribe
  }, [refreshPendingTransfers])

  const summary = useMemo(() => {
    return pendingTransfers.reduce(
      (accumulator, record) => {
        const payableAmount = Number(record.payload?.payable_rub) || 0

        accumulator.activeCount += 1
        accumulator.totalPayableRub += payableAmount

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
        totalPayableRub: 0,
      }
    )
  }, [pendingTransfers])

  return {
    pendingTransfers,
    pendingTransfersLoading: loading,
    refreshPendingTransfers,
    ...summary,
  }
}

export default usePendingTransfers
