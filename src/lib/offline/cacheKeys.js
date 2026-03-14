export const CUSTOMERS_LIST_SNAPSHOT_KEY = 'customers:list'
export const NEW_TRANSFER_CUSTOMERS_SNAPSHOT_KEY = 'customers:new-transfer-options'
export const TRANSFERS_LIST_SNAPSHOT_KEY = 'transfers:list'

export function getCustomerDetailsSnapshotKey(customerId) {
  return `customers:detail:${customerId || 'unknown'}`
}

export function getTransferDetailsSnapshotKey(transferId) {
  return `transfers:detail:${transferId || 'unknown'}`
}
