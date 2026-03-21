import {
  createCustomerMutationDedupeKey,
  createLocalPendingCustomerReference,
  createOfflineMutationId,
  normalizeMutationOrgId,
} from './mutationIds.js'
import {
  getMutationRecord,
  listMutationRecords,
  putMutationRecord,
  removeMutationRecord,
  subscribeToMutationQueue,
} from './mutationQueue.js'

const CUSTOMER_CREATE_MUTATION_TYPE = 'customer_create'
const ACTIVE_CUSTOMER_QUEUE_STATUSES = new Set(['pending', 'syncing', 'failed'])

function normalizeCustomerPayload(payload) {
  return {
    full_name: String(payload.full_name || '').trim(),
    notes: payload.notes ? String(payload.notes).trim() : null,
    org_id: normalizeMutationOrgId(payload.org_id),
    phone: payload.phone ? String(payload.phone).trim() : null,
  }
}

function buildQueuedCustomerRecord({ localMeta = {}, orgId, payload }) {
  const normalizedPayload = normalizeCustomerPayload(payload)
  const createdAt = new Date().toISOString()
  const normalizedOrgId = normalizeMutationOrgId(orgId || normalizedPayload.org_id)

  return {
    createdAt,
    dedupeKey: createCustomerMutationDedupeKey(normalizedPayload, normalizedOrgId),
    id: createOfflineMutationId('customer-create'),
    lastError: '',
    lastAttemptAt: '',
    localMeta: {
      localReference: localMeta.localReference || createLocalPendingCustomerReference(),
    },
    orgId: normalizedOrgId,
    payload: {
      ...normalizedPayload,
      org_id: normalizedOrgId,
    },
    retryCount: 0,
    status: 'pending',
    type: CUSTOMER_CREATE_MUTATION_TYPE,
    updatedAt: createdAt,
  }
}

function isActiveCustomerMutation(record) {
  return (
    record?.type === CUSTOMER_CREATE_MUTATION_TYPE &&
    ACTIVE_CUSTOMER_QUEUE_STATUSES.has(record.status)
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

async function queueOfflineCustomer({ localMeta, payload }) {
  const normalizedOrgId = normalizeMutationOrgId(payload?.org_id)

  if (!normalizedOrgId) {
    return null
  }

  const queuedRecord = buildQueuedCustomerRecord({
    localMeta,
    orgId: normalizedOrgId,
    payload,
  })

  return putMutationRecord(queuedRecord)
}

function getQueuedCustomerOrgId(record) {
  return normalizeMutationOrgId(record?.orgId || record?.payload?.org_id)
}

function isScopedQueuedCustomer(record) {
  return Boolean(getQueuedCustomerOrgId(record))
}

function matchesQueuedCustomerOrg(record, orgId) {
  return getQueuedCustomerOrgId(record) === normalizeMutationOrgId(orgId)
}

async function listQueuedCustomerMutations({ orgId = '' } = {}) {
  const records = await listMutationRecords()
  const normalizedOrgId = normalizeMutationOrgId(orgId)
  const scopedRecords = records.filter((record) => record?.type === CUSTOMER_CREATE_MUTATION_TYPE)

  if (!normalizedOrgId) {
    return []
  }

  return scopedRecords.filter(
    (record) => isScopedQueuedCustomer(record) && matchesQueuedCustomerOrg(record, normalizedOrgId)
  )
}

async function listActiveQueuedCustomers({ orgId = '' } = {}) {
  const records = await listQueuedCustomerMutations({ orgId })

  return sortQueueRecordsByCreatedAt(records.filter(isActiveCustomerMutation))
}

async function listReplayableQueuedCustomers({ includeFailed = true, orgId = '' } = {}) {
  const records = await listQueuedCustomerMutations({ orgId })

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

async function getCustomerQueueSummary({ orgId = '' } = {}) {
  const records = await listQueuedCustomerMutations({ orgId })
  const summary = {
    activeCount: 0,
    blockedCount: 0,
    failedCount: 0,
    pendingCount: 0,
    syncingCount: 0,
  }

  records.forEach((record) => {
    if (!isActiveCustomerMutation(record)) {
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

async function updateQueuedCustomer(id, updater) {
  const currentRecord = await getMutationRecord(id)

  if (!currentRecord || currentRecord.type !== CUSTOMER_CREATE_MUTATION_TYPE) {
    return null
  }

  const nextRecord = {
    ...currentRecord,
    ...updater(currentRecord),
    updatedAt: new Date().toISOString(),
  }

  return putMutationRecord(nextRecord)
}

async function markQueuedCustomerSyncing(id) {
  return updateQueuedCustomer(id, (record) => ({
    lastAttemptAt: new Date().toISOString(),
    lastError: '',
    retryCount: record.retryCount || 0,
    status: 'syncing',
  }))
}

async function markQueuedCustomerFailed(id, errorMessage) {
  return updateQueuedCustomer(id, (record) => ({
    lastAttemptAt: new Date().toISOString(),
    lastError: errorMessage || 'تعذر إرسال ملف العميل المحلي.',
    retryCount: (record.retryCount || 0) + 1,
    status: 'failed',
  }))
}

async function markQueuedCustomerPending(id) {
  return updateQueuedCustomer(id, () => ({
    status: 'pending',
  }))
}

async function normalizeQueuedCustomersState(orgId = '') {
  const records = await listQueuedCustomerMutations({ orgId })
  const syncingRecords = records.filter((record) => record.status === 'syncing')

  if (syncingRecords.length === 0) {
    return records
  }

  await Promise.all(syncingRecords.map((record) => markQueuedCustomerPending(record.id)))

  return listQueuedCustomerMutations({ orgId })
}

async function resolveQueuedCustomer(id) {
  return removeMutationRecord(id)
}

export {
  CUSTOMER_CREATE_MUTATION_TYPE,
  getCustomerQueueSummary,
  listActiveQueuedCustomers,
  listQueuedCustomerMutations,
  listReplayableQueuedCustomers,
  markQueuedCustomerFailed,
  markQueuedCustomerPending,
  markQueuedCustomerSyncing,
  normalizeQueuedCustomersState,
  queueOfflineCustomer,
  resolveQueuedCustomer,
  subscribeToMutationQueue,
}
