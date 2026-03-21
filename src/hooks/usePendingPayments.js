import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTenant } from '../context/tenant-context.js'
import {
  listActiveQueuedPaymentsForTransfer,
  normalizeQueuedPaymentsState,
  subscribeToMutationQueue,
} from '../lib/offline/paymentQueue.js'

function usePendingPayments(transferId) {
  const { orgId } = useTenant()
  const [pendingPayments, setPendingPayments] = useState([])
  const [loading, setLoading] = useState(Boolean(transferId))

  const refreshPendingPayments = useCallback(async () => {
    if (!transferId || !orgId) {
      setPendingPayments([])
      setLoading(false)
      return
    }

    setLoading(true)
    await normalizeQueuedPaymentsState(orgId)
    const queuedPayments = await listActiveQueuedPaymentsForTransfer(transferId, { orgId })
    setPendingPayments(queuedPayments)
    setLoading(false)
  }, [orgId, transferId])

  useEffect(() => {
    if (typeof queueMicrotask === 'function') {
      queueMicrotask(refreshPendingPayments)
    } else {
      Promise.resolve().then(refreshPendingPayments)
    }

    const unsubscribe = subscribeToMutationQueue(() => {
      refreshPendingPayments()
    })

    return unsubscribe
  }, [refreshPendingPayments])

  const summary = useMemo(() => {
    return pendingPayments.reduce(
      (accumulator, record) => {
        const amount = Number(record.payload?.amount_rub) || 0

        accumulator.activeCount += 1
        accumulator.totalAmountRub += amount

        if (record.status === 'failed') {
          accumulator.failedCount += 1
        } else if (record.status === 'blocked') {
          accumulator.blockedCount += 1
        } else if (record.status === 'syncing') {
          accumulator.syncingCount += 1
        } else {
          accumulator.pendingCount += 1
        }

        return accumulator
      },
      {
        activeCount: 0,
        blockedCount: 0,
        failedCount: 0,
        pendingCount: 0,
        syncingCount: 0,
        totalAmountRub: 0,
      }
    )
  }, [pendingPayments])

  return {
    pendingPayments,
    pendingPaymentsLoading: loading,
    refreshPendingPayments,
    ...summary,
  }
}

export default usePendingPayments
