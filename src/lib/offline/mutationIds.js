function createOfflineMutationId(prefix = 'mutation') {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function normalizeMutationValue(value) {
  if (value === null || value === undefined || value === '') {
    return ''
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(value) : ''
  }

  return String(value).trim()
}

function normalizeMutationOrgId(orgId) {
  return String(orgId || '').trim()
}

function buildOrgAwareDedupeKey(orgId, parts) {
  return [normalizeMutationOrgId(orgId), ...parts.map(normalizeMutationValue)].join('::')
}

function createPaymentMutationDedupeKey(payload, orgId = payload?.org_id) {
  return buildOrgAwareDedupeKey(orgId, [
    payload.transfer_id || '',
    Number(payload.amount_rub || 0).toFixed(2),
    payload.payment_method || '',
    payload.note || '',
    payload.paid_at || '',
  ])
}

function createCustomerMutationDedupeKey(payload, orgId = payload?.org_id) {
  return buildOrgAwareDedupeKey(orgId, [payload.full_name || '', payload.phone || '', payload.notes || ''])
}

function createTransferMutationDedupeKey(payload, orgId = payload?.org_id) {
  return buildOrgAwareDedupeKey(orgId, [
    payload.customer_id,
    payload.usdt_amount,
    payload.market_rate,
    payload.client_rate,
    payload.pricing_mode,
    payload.commission_pct,
    payload.commission_rub,
    payload.gross_rub,
    payload.payable_rub,
    payload.status,
    payload.created_at,
    payload.notes,
  ])
}

function createLocalPendingTransferReference() {
  const dateStamp = new Date().toISOString().replace(/\D/g, '').slice(2, 14)
  const randomSuffix = Math.random().toString(36).slice(2, 6).toUpperCase()

  return `LOCAL-${dateStamp}-${randomSuffix}`
}

function createLocalPendingCustomerReference() {
  const dateStamp = new Date().toISOString().replace(/\D/g, '').slice(2, 14)
  const randomSuffix = Math.random().toString(36).slice(2, 6).toUpperCase()

  return `LOCAL-CUST-${dateStamp}-${randomSuffix}`
}

export {
  createCustomerMutationDedupeKey,
  createLocalPendingCustomerReference,
  createLocalPendingTransferReference,
  createOfflineMutationId,
  createPaymentMutationDedupeKey,
  createTransferMutationDedupeKey,
  normalizeMutationOrgId,
}
