export const DASHBOARD_SNAPSHOT_KEY = 'dashboard:main'
export const CUSTOMERS_LIST_SNAPSHOT_KEY = 'customers:list'
export const NEW_TRANSFER_CUSTOMERS_SNAPSHOT_KEY = 'customers:new-transfer-options'
export const TRANSFERS_LIST_SNAPSHOT_KEY = 'transfers:list'

function normalizeSnapshotOrgId(orgId) {
  return String(orgId || '').trim()
}

function buildOrgSnapshotKey(orgId, suffix) {
  const normalizedOrgId = normalizeSnapshotOrgId(orgId)

  if (!normalizedOrgId) {
    return ''
  }

  return `org:${normalizedOrgId}:${suffix}`
}

export function getDashboardSnapshotKey(orgId) {
  return buildOrgSnapshotKey(orgId, DASHBOARD_SNAPSHOT_KEY)
}

export function getCustomersListSnapshotKey(orgId) {
  return buildOrgSnapshotKey(orgId, CUSTOMERS_LIST_SNAPSHOT_KEY)
}

export function getNewTransferCustomersSnapshotKey(orgId) {
  return buildOrgSnapshotKey(orgId, NEW_TRANSFER_CUSTOMERS_SNAPSHOT_KEY)
}

export function getTransfersListSnapshotKey(orgId) {
  return buildOrgSnapshotKey(orgId, TRANSFERS_LIST_SNAPSHOT_KEY)
}

export function getCustomerDetailsSnapshotKey(orgId, customerId) {
  return buildOrgSnapshotKey(orgId, `customers:detail:${customerId || 'unknown'}`)
}

export function getTransferDetailsSnapshotKey(orgId, transferId) {
  return buildOrgSnapshotKey(orgId, `transfers:detail:${transferId || 'unknown'}`)
}
