export const TRANSFER_PAYMENT_VOID_SELECT =
  'id, payment_id, transfer_id, void_reason_type, note, created_at'

function roundCurrency(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

function parseDateValue(value) {
  if (!value) {
    return null
  }

  const parsedDate = new Date(value)

  if (Number.isNaN(parsedDate.getTime())) {
    return null
  }

  return parsedDate
}

function getPaymentActivityTime(payment) {
  return (
    parseDateValue(payment?.paid_at)?.getTime() ||
    parseDateValue(payment?.created_at)?.getTime() ||
    0
  )
}

function getPaymentCreatedAtTime(payment) {
  return parseDateValue(payment?.created_at)?.getTime() || 0
}

function isPaymentMoreRecent(nextPayment, currentPayment) {
  const nextActivityTime = getPaymentActivityTime(nextPayment)
  const currentActivityTime = getPaymentActivityTime(currentPayment)

  if (nextActivityTime !== currentActivityTime) {
    return nextActivityTime > currentActivityTime
  }

  const nextCreatedAtTime = getPaymentCreatedAtTime(nextPayment)
  const currentCreatedAtTime = getPaymentCreatedAtTime(currentPayment)

  if (nextCreatedAtTime !== currentCreatedAtTime) {
    return nextCreatedAtTime > currentCreatedAtTime
  }

  return String(nextPayment?.id || '') > String(currentPayment?.id || '')
}

function getPaymentVoidCreatedAtTime(paymentVoid) {
  return parseDateValue(paymentVoid?.created_at)?.getTime() || 0
}

function isPaymentVoidMoreRecent(nextPaymentVoid, currentPaymentVoid) {
  const nextCreatedAtTime = getPaymentVoidCreatedAtTime(nextPaymentVoid)
  const currentCreatedAtTime = getPaymentVoidCreatedAtTime(currentPaymentVoid)

  if (nextCreatedAtTime !== currentCreatedAtTime) {
    return nextCreatedAtTime > currentCreatedAtTime
  }

  return String(nextPaymentVoid?.id || '') > String(currentPaymentVoid?.id || '')
}

export function buildLatestPaymentVoidMap(paymentVoids = []) {
  const latestPaymentVoidByPaymentId = {}

  paymentVoids.forEach((paymentVoid) => {
    const paymentId = paymentVoid?.payment_id

    if (!paymentId) {
      return
    }

    const currentPaymentVoid = latestPaymentVoidByPaymentId[paymentId]

    if (!currentPaymentVoid || isPaymentVoidMoreRecent(paymentVoid, currentPaymentVoid)) {
      latestPaymentVoidByPaymentId[paymentId] = paymentVoid
    }
  })

  return latestPaymentVoidByPaymentId
}

export function deriveConfirmedPaymentState({ payments = [], paymentVoids = [] } = {}) {
  const latestPaymentVoidByPaymentId = buildLatestPaymentVoidMap(paymentVoids)
  const activePayments = []
  const voidedPayments = []
  let latestActivePayment = null

  payments.forEach((payment) => {
    const paymentVoid = payment?.id ? latestPaymentVoidByPaymentId[payment.id] : null

    if (paymentVoid) {
      voidedPayments.push(payment)
      return
    }

    activePayments.push(payment)

    if (!latestActivePayment || isPaymentMoreRecent(payment, latestActivePayment)) {
      latestActivePayment = payment
    }
  })

  return {
    activePayments,
    voidedPayments,
    totalActivePaidRub: roundCurrency(
      activePayments.reduce((total, payment) => total + (Number(payment.amount_rub) || 0), 0)
    ),
    latestActivePayment,
    latestPaymentVoidByPaymentId,
  }
}

export function buildActivePaymentTotalsByTransfer(activePayments = []) {
  const paymentTotalsByTransfer = {}

  activePayments.forEach((payment) => {
    const transferId = payment?.transfer_id

    if (!transferId) {
      return
    }

    paymentTotalsByTransfer[transferId] = roundCurrency(
      (paymentTotalsByTransfer[transferId] || 0) + (Number(payment.amount_rub) || 0)
    )
  })

  return paymentTotalsByTransfer
}

export function buildLatestActivePaymentByTransfer(activePayments = []) {
  const latestPaymentByTransfer = {}

  activePayments.forEach((payment) => {
    const transferId = payment?.transfer_id

    if (!transferId) {
      return
    }

    const currentLatestPayment = latestPaymentByTransfer[transferId]

    if (!currentLatestPayment || isPaymentMoreRecent(payment, currentLatestPayment)) {
      latestPaymentByTransfer[transferId] = {
        ...payment,
        activityAt: payment?.paid_at || payment?.created_at || '',
      }
    }
  })

  return latestPaymentByTransfer
}
