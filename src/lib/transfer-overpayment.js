export const OVERPAYMENT_TOLERANCE_RUB = 0.009
export const TRANSFER_OVERPAYMENT_RESOLUTION_SELECT =
  'id, transfer_id, resolution_type, resolved_overpaid_amount_rub, note, created_at'

function roundCurrency(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

function normalizeCurrencyValue(value) {
  if (value === null || value === undefined || value === '') {
    return null
  }

  const numericValue = Number(value)

  if (!Number.isFinite(numericValue)) {
    return null
  }

  return roundCurrency(numericValue)
}

function getResolvedOverpaidAmountRub(latestResolution) {
  if (!latestResolution || typeof latestResolution !== 'object') {
    return null
  }

  const directValue = latestResolution.resolved_overpaid_amount_rub

  if (directValue !== null && directValue !== undefined && directValue !== '') {
    return normalizeCurrencyValue(directValue)
  }

  return normalizeCurrencyValue(latestResolution.resolvedOverpaidAmountRub)
}

function getResolutionCreatedAtTime(latestResolution) {
  if (!latestResolution?.created_at) {
    return 0
  }

  const parsedDate = new Date(latestResolution.created_at)

  if (Number.isNaN(parsedDate.getTime())) {
    return 0
  }

  return parsedDate.getTime()
}

function isResolutionMoreRecent(nextResolution, currentResolution) {
  const nextCreatedAtTime = getResolutionCreatedAtTime(nextResolution)
  const currentCreatedAtTime = getResolutionCreatedAtTime(currentResolution)

  if (nextCreatedAtTime !== currentCreatedAtTime) {
    return nextCreatedAtTime > currentCreatedAtTime
  }

  return String(nextResolution?.id || '') > String(currentResolution?.id || '')
}

export function buildLatestOverpaymentResolutionMap(resolutionRows = []) {
  const latestResolutionByTransferId = {}

  resolutionRows.forEach((resolutionRow) => {
    const transferId = resolutionRow?.transfer_id

    if (!transferId) {
      return
    }

    const currentResolution = latestResolutionByTransferId[transferId]

    if (!currentResolution || isResolutionMoreRecent(resolutionRow, currentResolution)) {
      latestResolutionByTransferId[transferId] = resolutionRow
    }
  })

  return latestResolutionByTransferId
}

export function doRubAmountsMatchWithinTolerance(
  leftAmountRub,
  rightAmountRub,
  tolerance = OVERPAYMENT_TOLERANCE_RUB
) {
  const normalizedLeftAmountRub = normalizeCurrencyValue(leftAmountRub)
  const normalizedRightAmountRub = normalizeCurrencyValue(rightAmountRub)

  if (normalizedLeftAmountRub === null || normalizedRightAmountRub === null) {
    return false
  }

  return Math.abs(normalizedLeftAmountRub - normalizedRightAmountRub) <= tolerance
}

export function deriveTransferOverpaymentState({
  payableRub,
  confirmedPaidRub,
  latestResolution = null,
  tolerance = OVERPAYMENT_TOLERANCE_RUB,
} = {}) {
  const normalizedPayableRub = normalizeCurrencyValue(payableRub)
  const normalizedConfirmedPaidRub = normalizeCurrencyValue(confirmedPaidRub)

  if (normalizedPayableRub === null || normalizedConfirmedPaidRub === null) {
    return {
      remainingRub: null,
      overpaidAmountRub: 0,
      isOverpaid: false,
      isResolvedOverpaid: false,
      isUnresolvedOverpaid: false,
    }
  }

  const remainingRub = roundCurrency(normalizedPayableRub - normalizedConfirmedPaidRub)
  const isOverpaid = remainingRub < -tolerance
  const overpaidAmountRub = isOverpaid ? roundCurrency(Math.abs(remainingRub)) : 0
  const latestResolvedOverpaidAmountRub = getResolvedOverpaidAmountRub(latestResolution)
  const isResolvedOverpaid =
    isOverpaid &&
    doRubAmountsMatchWithinTolerance(
      overpaidAmountRub,
      latestResolvedOverpaidAmountRub,
      tolerance
    )

  return {
    remainingRub,
    overpaidAmountRub,
    isOverpaid,
    isResolvedOverpaid,
    isUnresolvedOverpaid: isOverpaid && !isResolvedOverpaid,
  }
}
