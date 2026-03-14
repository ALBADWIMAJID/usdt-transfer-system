import { createOfflineMutationId, createPaymentMutationDedupeKey } from './mutationIds.js'
import {
  getMutationRecord,
  listMutationRecords,
  putMutationRecord,
  removeMutationRecord,
  subscribeToMutationQueue,
} from './mutationQueue.js'

const PAYMENT_CREATE_MUTATION_TYPE = 'payment_create'
const ACTIVE_PAYMENT_QUEUE_STATUSES = new Set(['pending', 'blocked', 'syncing', 'failed'])

function normalizePaymentPayload(payload, transferId) {
  return {
    amount_rub: Number(payload.amount_rub || 0),
    note: payload.note ? String(payload.note).trim() : null,
    paid_at: payload.paid_at || new Date().toISOString(),
    payment_method: String(payload.payment_method || '').trim(),
    transfer_id: transferId,
  }
}

function buildQueuedPaymentRecord({ payload, transferId, localMeta = {} }) {
  const normalizedPayload = normalizePaymentPayload(payload, transferId)
  const createdAt = new Date().toISOString()

  return {
    createdAt,
    dedupeKey: createPaymentMutationDedupeKey(normalizedPayload),
    id: createOfflineMutationId('payment-create'),
    blockedReason: '',
    lastError: '',
    lastAttemptAt: '',
    localMeta: {
      customerName: localMeta.customerName || '',
      dependencyLocalReference: localMeta.dependencyLocalReference || '',
      dependencyTransferQueueId: localMeta.dependencyTransferQueueId || '',
      referenceNumber: localMeta.referenceNumber || '',
    },
    payload: normalizedPayload,
    retryCount: 0,
    status: 'pending',
    transferId,
    type: PAYMENT_CREATE_MUTATION_TYPE,
    updatedAt: createdAt,
  }
}

function isActivePaymentMutation(record) {
  return (
    record?.type === PAYMENT_CREATE_MUTATION_TYPE &&
    ACTIVE_PAYMENT_QUEUE_STATUSES.has(record.status)
  )
}

function sortQueueRecordsByCreatedAt(records, direction = 'desc') {
  const multiplier = direction === 'asc' ? 1 : -1

  return [...records].sort((left, right) => {
    const leftTime = new Date(left.createdAt || 0).getTime() || 0
    const rightTime = new Date(right.createdAt || 0).getTime() || 0

    return (leftTime - rightTime) * multiplier
  })
}

async function queueOfflinePayment({ payload, transferId, localMeta }) {
  const queuedRecord = buildQueuedPaymentRecord({
    localMeta,
    payload,
    transferId,
  })

  return putMutationRecord(queuedRecord)
}

async function listQueuedPaymentMutations() {
  const records = await listMutationRecords()

  return records.filter((record) => record?.type === PAYMENT_CREATE_MUTATION_TYPE)
}

async function listActiveQueuedPaymentsForTransfer(transferId) {
  const records = await listQueuedPaymentMutations()

  return sortQueueRecordsByCreatedAt(
    records.filter((record) => isActivePaymentMutation(record) && record.transferId === transferId)
  )
}

async function listReplayableQueuedPayments({
  includeBlocked = true,
  includeFailed = true,
} = {}) {
  const records = await listQueuedPaymentMutations()

  return sortQueueRecordsByCreatedAt(
    records.filter((record) => {
      if (record.status === 'pending' || record.status === 'syncing') {
        return true
      }

      if (includeBlocked && record.status === 'blocked') {
        return true
      }

      if (includeFailed && record.status === 'failed') {
        return true
      }

      return false
    }),
    'asc'
  )
}

async function getPaymentQueueSummary() {
  const records = await listQueuedPaymentMutations()
  const summary = {
    activeCount: 0,
    blockedCount: 0,
    failedCount: 0,
    pendingCount: 0,
    syncingCount: 0,
  }

  records.forEach((record) => {
    if (!isActivePaymentMutation(record)) {
      return
    }

    summary.activeCount += 1

    if (record.status === 'failed') {
      summary.failedCount += 1
      return
    }

    if (record.status === 'blocked') {
      summary.blockedCount += 1
      return
    }

    if (record.status === 'syncing') {
      summary.syncingCount += 1
      return
    }

    summary.pendingCount += 1
  })

  return summary
}

async function updateQueuedPayment(id, updater) {
  const currentRecord = await getMutationRecord(id)

  if (!currentRecord || currentRecord.type !== PAYMENT_CREATE_MUTATION_TYPE) {
    return null
  }

  const nextRecord = {
    ...currentRecord,
    ...updater(currentRecord),
    updatedAt: new Date().toISOString(),
  }

  return putMutationRecord(nextRecord)
}

async function markQueuedPaymentSyncing(id) {
  return updateQueuedPayment(id, (record) => ({
    blockedReason: '',
    lastAttemptAt: new Date().toISOString(),
    lastError: '',
    status: 'syncing',
    retryCount: record.retryCount || 0,
  }))
}

async function markQueuedPaymentFailed(id, errorMessage) {
  return updateQueuedPayment(id, (record) => ({
    blockedReason: '',
    lastAttemptAt: new Date().toISOString(),
    lastError: errorMessage || 'تعذر إرسال الدفعة المحلية.',
    retryCount: (record.retryCount || 0) + 1,
    status: 'failed',
  }))
}

async function markQueuedPaymentBlocked(id, blockedReason) {
  return updateQueuedPayment(id, (record) => ({
    blockedReason:
      blockedReason || 'تعذر إرسال هذه الدفعة الآن لارتباطها بسجل محلي لم يؤكد بعد.',
    lastAttemptAt: new Date().toISOString(),
    lastError: '',
    retryCount: record.retryCount || 0,
    status: 'blocked',
  }))
}

async function markQueuedPaymentPending(id) {
  return updateQueuedPayment(id, () => ({
    blockedReason: '',
    status: 'pending',
  }))
}

async function prepareQueuedPaymentForReplay(id, { localMetaPatch = {}, payloadPatch = {} } = {}) {
  return updateQueuedPayment(id, (record) => {
    const nextPayload = {
      ...record.payload,
      ...payloadPatch,
    }
    const nextLocalMeta = {
      ...record.localMeta,
      ...localMetaPatch,
    }

    return {
      blockedReason: '',
      dedupeKey: createPaymentMutationDedupeKey(nextPayload),
      localMeta: nextLocalMeta,
      payload: nextPayload,
      status: 'pending',
      transferId: nextPayload.transfer_id || record.transferId,
    }
  })
}

async function linkQueuedPaymentsToResolvedTransfer({
  localReference = '',
  queueId = '',
  referenceNumber = '',
  serverTransferId = '',
} = {}) {
  if (!serverTransferId) {
    return 0
  }

  const records = await listQueuedPaymentMutations()
  const matchingRecords = records.filter((record) => {
    if (record?.type !== PAYMENT_CREATE_MUTATION_TYPE) {
      return false
    }

    const dependencyQueueId = String(record.localMeta?.dependencyTransferQueueId || '').trim()
    const dependencyLocalReference = String(record.localMeta?.dependencyLocalReference || '').trim()

    return (
      (queueId && dependencyQueueId === queueId) ||
      (localReference && dependencyLocalReference === localReference)
    )
  })

  if (matchingRecords.length === 0) {
    return 0
  }

  const results = await Promise.all(
    matchingRecords.map((record) =>
      prepareQueuedPaymentForReplay(record.id, {
        localMetaPatch: {
          dependencyLocalReference: '',
          dependencyTransferQueueId: '',
          referenceNumber: referenceNumber || record.localMeta?.referenceNumber || '',
        },
        payloadPatch: {
          transfer_id: serverTransferId,
        },
      })
    )
  )

  return results.filter(Boolean).length
}

async function normalizeQueuedPaymentsState() {
  const records = await listQueuedPaymentMutations()
  const syncingRecords = records.filter((record) => record.status === 'syncing')

  if (syncingRecords.length === 0) {
    return records
  }

  await Promise.all(syncingRecords.map((record) => markQueuedPaymentPending(record.id)))

  return listQueuedPaymentMutations()
}

async function resolveQueuedPayment(id) {
  return removeMutationRecord(id)
}

export {
  PAYMENT_CREATE_MUTATION_TYPE,
  getPaymentQueueSummary,
  listActiveQueuedPaymentsForTransfer,
  linkQueuedPaymentsToResolvedTransfer,
  listQueuedPaymentMutations,
  listReplayableQueuedPayments,
  markQueuedPaymentBlocked,
  markQueuedPaymentFailed,
  markQueuedPaymentPending,
  markQueuedPaymentSyncing,
  normalizeQueuedPaymentsState,
  prepareQueuedPaymentForReplay,
  queueOfflinePayment,
  resolveQueuedPayment,
  subscribeToMutationQueue,
}
