import {
  createLocalPendingTransferReference,
  createOfflineMutationId,
  createTransferMutationDedupeKey,
} from './mutationIds.js'
import {
  getMutationRecord,
  listMutationRecords,
  putMutationRecord,
  removeMutationRecord,
  subscribeToMutationQueue,
} from './mutationQueue.js'

const TRANSFER_CREATE_MUTATION_TYPE = 'transfer_create'
const ACTIVE_TRANSFER_QUEUE_STATUSES = new Set(['pending', 'syncing', 'failed'])

function normalizeTransferPayload(payload, customerId) {
  return {
    client_rate: Number(payload.client_rate || 0),
    commission_pct: Number(payload.commission_pct || 0),
    commission_rub: Number(payload.commission_rub || 0),
    created_at: payload.created_at || new Date().toISOString(),
    customer_id: customerId,
    gross_rub: Number(payload.gross_rub || 0),
    market_rate: Number(payload.market_rate || 0),
    notes: payload.notes ? String(payload.notes).trim() : null,
    payable_rub: Number(payload.payable_rub || 0),
    pricing_mode: String(payload.pricing_mode || 'hybrid').trim() || 'hybrid',
    status: String(payload.status || 'open').trim() || 'open',
    usdt_amount: Number(payload.usdt_amount || 0),
  }
}

function buildQueuedTransferRecord({ customerId, localMeta = {}, payload }) {
  const normalizedPayload = normalizeTransferPayload(payload, customerId)
  const createdAt = new Date().toISOString()

  return {
    createdAt,
    customerId,
    dedupeKey: createTransferMutationDedupeKey(normalizedPayload),
    id: createOfflineMutationId('transfer-create'),
    lastError: '',
    lastAttemptAt: '',
    localMeta: {
      customerName: localMeta.customerName || '',
      localReference: localMeta.localReference || createLocalPendingTransferReference(),
    },
    payload: normalizedPayload,
    retryCount: 0,
    status: 'pending',
    type: TRANSFER_CREATE_MUTATION_TYPE,
    updatedAt: createdAt,
  }
}

function isActiveTransferMutation(record) {
  return (
    record?.type === TRANSFER_CREATE_MUTATION_TYPE &&
    ACTIVE_TRANSFER_QUEUE_STATUSES.has(record.status)
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

async function queueOfflineTransfer({ customerId, localMeta, payload }) {
  const queuedRecord = buildQueuedTransferRecord({
    customerId,
    localMeta,
    payload,
  })

  return putMutationRecord(queuedRecord)
}

async function listQueuedTransferMutations() {
  const records = await listMutationRecords()

  return records.filter((record) => record?.type === TRANSFER_CREATE_MUTATION_TYPE)
}

async function listActiveQueuedTransfers({ customerId = '' } = {}) {
  const records = await listQueuedTransferMutations()

  return sortQueueRecordsByCreatedAt(
    records.filter((record) => {
      if (!isActiveTransferMutation(record)) {
        return false
      }

      if (!customerId) {
        return true
      }

      return record.customerId === customerId
    })
  )
}

async function listReplayableQueuedTransfers({ includeFailed = true } = {}) {
  const records = await listQueuedTransferMutations()

  return sortQueueRecordsByCreatedAt(
    records.filter((record) => {
      if (record.status === 'pending' || record.status === 'syncing') {
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

async function getTransferQueueSummary() {
  const records = await listQueuedTransferMutations()
  const summary = {
    activeCount: 0,
    blockedCount: 0,
    failedCount: 0,
    pendingCount: 0,
    syncingCount: 0,
  }

  records.forEach((record) => {
    if (!isActiveTransferMutation(record)) {
      return
    }

    summary.activeCount += 1

    if (record.status === 'failed') {
      summary.failedCount += 1
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

async function updateQueuedTransfer(id, updater) {
  const currentRecord = await getMutationRecord(id)

  if (!currentRecord || currentRecord.type !== TRANSFER_CREATE_MUTATION_TYPE) {
    return null
  }

  const nextRecord = {
    ...currentRecord,
    ...updater(currentRecord),
    updatedAt: new Date().toISOString(),
  }

  return putMutationRecord(nextRecord)
}

async function markQueuedTransferSyncing(id) {
  return updateQueuedTransfer(id, (record) => ({
    lastAttemptAt: new Date().toISOString(),
    lastError: '',
    retryCount: record.retryCount || 0,
    status: 'syncing',
  }))
}

async function markQueuedTransferFailed(id, errorMessage) {
  return updateQueuedTransfer(id, (record) => ({
    lastAttemptAt: new Date().toISOString(),
    lastError: errorMessage || 'تعذر إرسال الحوالة المحلية.',
    retryCount: (record.retryCount || 0) + 1,
    status: 'failed',
  }))
}

async function markQueuedTransferPending(id) {
  return updateQueuedTransfer(id, () => ({
    status: 'pending',
  }))
}

async function normalizeQueuedTransfersState() {
  const records = await listQueuedTransferMutations()
  const syncingRecords = records.filter((record) => record.status === 'syncing')

  if (syncingRecords.length === 0) {
    return records
  }

  await Promise.all(syncingRecords.map((record) => markQueuedTransferPending(record.id)))

  return listQueuedTransferMutations()
}

async function resolveQueuedTransfer(id) {
  return removeMutationRecord(id)
}

export {
  TRANSFER_CREATE_MUTATION_TYPE,
  getTransferQueueSummary,
  listActiveQueuedTransfers,
  listQueuedTransferMutations,
  listReplayableQueuedTransfers,
  markQueuedTransferFailed,
  markQueuedTransferPending,
  markQueuedTransferSyncing,
  normalizeQueuedTransfersState,
  queueOfflineTransfer,
  resolveQueuedTransfer,
  subscribeToMutationQueue,
}
