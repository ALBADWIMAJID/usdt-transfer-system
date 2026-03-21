import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTenant } from './tenant-context.js'
import {
  getCustomerQueueSummary,
  normalizeQueuedCustomersState,
} from '../lib/offline/customerQueue.js'
import { replayCustomerQueue } from '../lib/offline/replayCustomers.js'
import {
  getPaymentQueueSummary,
  normalizeQueuedPaymentsState,
  subscribeToMutationQueue,
} from '../lib/offline/paymentQueue.js'
import { replayPaymentQueue } from '../lib/offline/replayPayments.js'
import {
  getTransferQueueSummary,
  normalizeQueuedTransfersState,
} from '../lib/offline/transferQueue.js'
import { replayTransferQueue } from '../lib/offline/replayTransfers.js'
import useNetworkStatus from '../hooks/useNetworkStatus.js'

const initialManualState = {
  message: '',
  pendingCount: 0,
  status: 'idle',
}

function createEmptyQueueSummary() {
  return {
    activeCount: 0,
    blockedCount: 0,
    failedCount: 0,
    pendingCount: 0,
    syncingCount: 0,
  }
}

function createCombinedQueueSummary({ customers, payments, transfers }) {
  return {
    activeCount: customers.activeCount + payments.activeCount + transfers.activeCount,
    blockedCount: customers.blockedCount + payments.blockedCount + transfers.blockedCount,
    customers,
    failedCount: customers.failedCount + payments.failedCount + transfers.failedCount,
    payments,
    pendingCount: customers.pendingCount + payments.pendingCount + transfers.pendingCount,
    syncingCount: customers.syncingCount + payments.syncingCount + transfers.syncingCount,
    transfers,
  }
}

function buildQueueBreakdown({ customers, payments, transfers }, fieldName = 'activeCount') {
  const parts = []

  if (customers[fieldName] > 0) {
    parts.push(`${customers[fieldName]} عميل محلي`)
  }

  if (transfers[fieldName] > 0) {
    parts.push(`${transfers[fieldName]} حوالة محلية`)
  }

  if (payments[fieldName] > 0) {
    parts.push(`${payments[fieldName]} دفعة محلية`)
  }

  return parts.join('، ')
}

function buildPendingMessage(queueSummary) {
  if (queueSummary.pendingCount <= 0) {
    return ''
  }

  const pendingBreakdown = buildQueueBreakdown(queueSummary, 'pendingCount')
  const blockedBreakdown = buildQueueBreakdown(queueSummary, 'blockedCount')

  if (blockedBreakdown) {
    return pendingBreakdown
      ? `توجد ${pendingBreakdown} بانتظار الإرسال إلى الخادم، بينما تنتظر ${blockedBreakdown} تأكيد سجلات مرتبطة قبل الإرسال.`
      : `توجد عمليات محلية بانتظار الإرسال، بينما تنتظر ${blockedBreakdown} تأكيد سجلات مرتبطة قبل الإرسال.`
  }

  return pendingBreakdown
    ? `توجد ${pendingBreakdown} بانتظار الإرسال إلى الخادم.`
    : `توجد ${queueSummary.pendingCount} عملية محلية بانتظار الإرسال إلى الخادم.`
}

function buildBlockedMessage(queueSummary) {
  const blockedBreakdown = buildQueueBreakdown(queueSummary, 'blockedCount')

  if (!blockedBreakdown) {
    return 'توجد عناصر محلية محجوبة مؤقتا بانتظار تأكيد سجلات مرتبطة من الخادم.'
  }

  return `توجد ${blockedBreakdown} محجوبة مؤقتا بانتظار تأكيد حوالات مرتبطة أو نجاح إعادة المحاولة.`
}

function buildErrorMessage(queueSummary) {
  const breakdown = buildQueueBreakdown(queueSummary, 'failedCount')

  if (!breakdown) {
    return 'تعذر تحديث حالة المزامنة المحلية.'
  }

  return `تعذر إرسال ${breakdown}. راجع العناصر المحلية ثم أعد المحاولة عند توفر الاتصال.`
}

function buildSyncingMessage({ customerCount = 0, paymentCount = 0, transferCount = 0 }) {
  const parts = []

  if (customerCount > 0) {
    parts.push(`${customerCount} عميل`)
  }

  if (transferCount > 0) {
    parts.push(`${transferCount} حوالة`)
  }

  if (paymentCount > 0) {
    parts.push(`${paymentCount} دفعة`)
  }

  if (parts.length === 0) {
    return 'جار إرسال العمليات المحلية إلى الخادم...'
  }

  return `جار إرسال ${parts.join(' و ')} محلية إلى الخادم...`
}

const emptyReplayResult = {
  blockedCount: 0,
  dedupedCount: 0,
  failedCount: 0,
  replayedCount: 0,
  resolvedTransfers: [],
  totalProcessed: 0,
}

const SyncContext = createContext(null)

function SyncProvider({ children }) {
  const { isOffline } = useNetworkStatus()
  const { orgId } = useTenant()
  const [manualState, setManualState] = useState(initialManualState)
  const [queueSummary, setQueueSummary] = useState(() =>
    createCombinedQueueSummary({
      customers: createEmptyQueueSummary(),
      payments: createEmptyQueueSummary(),
      transfers: createEmptyQueueSummary(),
    })
  )
  const syncPromiseRef = useRef(null)

  const refreshSyncState = useCallback(async () => {
    if (!orgId) {
      const emptySummary = createCombinedQueueSummary({
        customers: createEmptyQueueSummary(),
        payments: createEmptyQueueSummary(),
        transfers: createEmptyQueueSummary(),
      })

      setQueueSummary(emptySummary)
      return emptySummary
    }

    await Promise.all([
      normalizeQueuedCustomersState(orgId),
      normalizeQueuedPaymentsState(orgId),
      normalizeQueuedTransfersState(orgId),
    ])

    const [customers, payments, transfers] = await Promise.all([
      getCustomerQueueSummary({ orgId }),
      getPaymentQueueSummary({ orgId }),
      getTransferQueueSummary({ orgId }),
    ])

    const nextSummary = createCombinedQueueSummary({
      customers,
      payments,
      transfers,
    })

    setQueueSummary(nextSummary)
    return nextSummary
  }, [orgId])

  useEffect(() => {
    refreshSyncState()

    const unsubscribe = subscribeToMutationQueue(() => {
      refreshSyncState()
    })

    return unsubscribe
  }, [refreshSyncState])

  useEffect(() => {
    if (orgId) {
      return
    }

    setManualState(initialManualState)
  }, [orgId])

  const runSyncNow = useCallback(
    async ({
      automatic = false,
      includeCustomers = true,
      includePayments = true,
      includeTransfers = true,
    } = {}) => {
      if (isOffline) {
        return {
          blockedCount: 0,
          customerResult: emptyReplayResult,
          dedupedCount: 0,
          failedCount: 0,
          paymentResult: emptyReplayResult,
          replayedCount: 0,
          started: false,
          totalProcessed: 0,
          transferResult: emptyReplayResult,
        }
      }

      if (!orgId) {
        setManualState(initialManualState)

        return {
          blockedCount: 0,
          customerResult: emptyReplayResult,
          dedupedCount: 0,
          failedCount: 0,
          paymentResult: emptyReplayResult,
          replayedCount: 0,
          started: false,
          totalProcessed: 0,
          transferResult: emptyReplayResult,
        }
      }

      if (syncPromiseRef.current) {
        return syncPromiseRef.current
      }

      const currentSummary = await refreshSyncState()
      const customerCount = includeCustomers
        ? automatic
          ? currentSummary.customers.pendingCount
          : currentSummary.customers.activeCount
        : 0
      const transferCount = includeTransfers
        ? automatic
          ? currentSummary.transfers.pendingCount
          : currentSummary.transfers.activeCount
        : 0
      const paymentCount = includePayments
        ? automatic
          ? currentSummary.payments.pendingCount + currentSummary.payments.blockedCount
          : currentSummary.payments.activeCount
        : 0
      const totalItems = customerCount + transferCount + paymentCount

      if (totalItems <= 0) {
        setManualState(initialManualState)
        return {
          blockedCount: currentSummary.blockedCount,
          customerResult: emptyReplayResult,
          dedupedCount: 0,
          failedCount: currentSummary.failedCount,
          paymentResult: emptyReplayResult,
          replayedCount: 0,
          started: false,
          totalProcessed: 0,
          transferResult: emptyReplayResult,
        }
      }

      setManualState({
        message: buildSyncingMessage({ customerCount, paymentCount, transferCount }),
        pendingCount: totalItems,
        status: 'syncing',
      })

      const syncPromise = (async () => {
        const customerResult =
          includeCustomers && customerCount > 0
            ? await replayCustomerQueue({ includeFailed: !automatic, orgId })
            : emptyReplayResult
        const transferResult =
          includeTransfers && transferCount > 0
            ? await replayTransferQueue({ includeFailed: !automatic, orgId })
            : emptyReplayResult
        const paymentResult =
          includePayments && paymentCount > 0
            ? await replayPaymentQueue({
                includeBlocked: true,
                includeFailed: !automatic,
                orgId,
                transferReplayResult: transferResult,
              })
            : emptyReplayResult
        const nextSummary = await refreshSyncState()

        if (nextSummary.failedCount > 0) {
          setManualState({
            message: buildErrorMessage(nextSummary),
            pendingCount: nextSummary.activeCount,
            status: 'error',
          })
        } else if (nextSummary.blockedCount > 0 && nextSummary.pendingCount <= 0) {
          setManualState({
            message: buildBlockedMessage(nextSummary),
            pendingCount: nextSummary.activeCount,
            status: 'blocked',
          })
        } else if (nextSummary.pendingCount > 0) {
          setManualState({
            message: buildPendingMessage(nextSummary),
            pendingCount: nextSummary.activeCount,
            status: 'pending',
          })
        } else {
          setManualState(initialManualState)
        }

        return {
          blockedCount:
            customerResult.blockedCount + transferResult.blockedCount + paymentResult.blockedCount,
          customerResult,
          dedupedCount:
            customerResult.dedupedCount + transferResult.dedupedCount + paymentResult.dedupedCount,
          failedCount:
            customerResult.failedCount + transferResult.failedCount + paymentResult.failedCount,
          paymentResult,
          replayedCount:
            customerResult.replayedCount + transferResult.replayedCount + paymentResult.replayedCount,
          started: true,
          totalProcessed:
            customerResult.totalProcessed + transferResult.totalProcessed + paymentResult.totalProcessed,
          transferResult,
        }
      })()
        .catch(async (error) => {
          const nextSummary = await refreshSyncState()

          setManualState({
            message: error?.message || buildErrorMessage(nextSummary),
            pendingCount: nextSummary.activeCount || totalItems,
            status: 'error',
          })

          return {
            blockedCount: nextSummary.blockedCount || 0,
            customerResult: {
              ...emptyReplayResult,
              blockedCount: nextSummary.customers.blockedCount || 0,
              failedCount: nextSummary.customers.failedCount || 0,
              totalProcessed: customerCount,
            },
            dedupedCount: 0,
            failedCount: nextSummary.failedCount || totalItems,
            paymentResult: {
              ...emptyReplayResult,
              blockedCount: nextSummary.payments.blockedCount || 0,
              failedCount: nextSummary.payments.failedCount || 0,
              totalProcessed: paymentCount,
            },
            replayedCount: 0,
            started: true,
            totalProcessed: totalItems,
            transferResult: {
              ...emptyReplayResult,
              blockedCount: nextSummary.transfers.blockedCount || 0,
              failedCount: nextSummary.transfers.failedCount || 0,
              totalProcessed: transferCount,
            },
          }
        })
        .finally(() => {
          syncPromiseRef.current = null
        })

      syncPromiseRef.current = syncPromise

      return syncPromise
    },
    [isOffline, orgId, refreshSyncState]
  )

  const syncPaymentsNow = useCallback(
    (options = {}) =>
      runSyncNow({
        ...options,
        includeCustomers: false,
        includePayments: true,
        includeTransfers: false,
      }),
    [runSyncNow]
  )

  const syncCustomersNow = useCallback(
    (options = {}) =>
      runSyncNow({
        ...options,
        includeCustomers: true,
        includePayments: false,
        includeTransfers: false,
      }),
    [runSyncNow]
  )

  const syncTransfersNow = useCallback(
    (options = {}) =>
      runSyncNow({
        ...options,
        includeCustomers: false,
        includePayments: false,
        includeTransfers: true,
      }),
    [runSyncNow]
  )

  const syncAllNow = useCallback((options = {}) => runSyncNow(options), [runSyncNow])

  useEffect(() => {
    if (isOffline) {
      return
    }

    if (queueSummary.pendingCount <= 0) {
      return
    }

    if (syncPromiseRef.current) {
      return
    }

    syncAllNow({ automatic: true })
  }, [isOffline, queueSummary.pendingCount, syncAllNow])

  const status = useMemo(() => {
    if (isOffline) {
      return 'offline'
    }

    if (manualState.status === 'syncing') {
      return 'syncing'
    }

    if (queueSummary.failedCount > 0 || manualState.status === 'error') {
      return 'error'
    }

    if (queueSummary.pendingCount > 0 || manualState.status === 'pending') {
      return 'pending'
    }

    if (
      manualState.status === 'blocked' ||
      (queueSummary.blockedCount > 0 && queueSummary.pendingCount <= 0)
    ) {
      return 'blocked'
    }

    return 'idle'
  }, [
    isOffline,
    manualState.status,
    queueSummary.blockedCount,
    queueSummary.failedCount,
    queueSummary.pendingCount,
  ])

  const message = useMemo(() => {
    if (status === 'syncing') {
      return manualState.message
    }

    if (status === 'error') {
      return manualState.message || buildErrorMessage(queueSummary)
    }

    if (status === 'blocked') {
      return manualState.message || buildBlockedMessage(queueSummary)
    }

    if (status === 'pending') {
      return manualState.message || buildPendingMessage(queueSummary)
    }

    return ''
  }, [manualState.message, queueSummary, status])

  const contextValue = {
    blockedCount: queueSummary.blockedCount,
    clearSyncState: () => setManualState(initialManualState),
    customerBlockedCount: queueSummary.customers.blockedCount,
    customerFailedCount: queueSummary.customers.failedCount,
    customerPendingCount: queueSummary.customers.pendingCount,
    customerQueueCount: queueSummary.customers.activeCount,
    failedCount: queueSummary.failedCount,
    hasPendingWork: queueSummary.activeCount > 0,
    isOffline: status === 'offline',
    message,
    paymentBlockedCount: queueSummary.payments.blockedCount,
    paymentFailedCount: queueSummary.payments.failedCount,
    paymentPendingCount: queueSummary.payments.pendingCount,
    paymentQueueCount: queueSummary.payments.activeCount,
    pendingCount: queueSummary.activeCount,
    refreshSyncState,
    setSyncError: (nextMessage = '') =>
      setManualState({
        message: nextMessage,
        pendingCount: queueSummary.activeCount,
        status: 'error',
      }),
    setSyncIdle: () => setManualState(initialManualState),
    setSyncPending: ({ message: nextMessage = '', pendingCount = queueSummary.activeCount || 1 } = {}) =>
      setManualState({
        message: nextMessage,
        pendingCount,
        status: 'pending',
      }),
    setSyncState: (nextStatus, options = {}) =>
      setManualState({
        message: options.message || '',
        pendingCount: Number.isFinite(options.pendingCount)
          ? options.pendingCount
          : queueSummary.activeCount,
        status: nextStatus,
      }),
    setSyncing: (nextMessage = '') =>
      setManualState({
        message: nextMessage,
        pendingCount: queueSummary.activeCount,
        status: 'syncing',
      }),
    status,
    syncAllNow,
    syncCustomersNow,
    syncPaymentsNow,
    syncTransfersNow,
    transferBlockedCount: queueSummary.transfers.blockedCount,
    transferFailedCount: queueSummary.transfers.failedCount,
    transferPendingCount: queueSummary.transfers.pendingCount,
    transferQueueCount: queueSummary.transfers.activeCount,
  }

  return <SyncContext.Provider value={contextValue}>{children}</SyncContext.Provider>
}

export { SyncContext }
export default SyncProvider
