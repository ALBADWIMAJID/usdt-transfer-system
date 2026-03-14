const badgeBaseStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '0.4rem 0.8rem',
  border: '1px solid transparent',
  borderRadius: '999px',
  fontSize: '0.82rem',
  fontWeight: 700,
  letterSpacing: '0',
  boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.45)',
}

const transferStatusMeta = {
  open: {
    label: 'مفتوحة',
    style: {
      ...badgeBaseStyle,
      background: '#e7f1ff',
      borderColor: '#bfdbfe',
      color: '#1d4ed8',
    },
  },
  partial: {
    label: 'مدفوعة جزئيا',
    style: {
      ...badgeBaseStyle,
      background: '#fff1d6',
      borderColor: '#fcd34d',
      color: '#b45309',
    },
  },
  partially_paid: {
    label: 'مدفوعة جزئيا',
    style: {
      ...badgeBaseStyle,
      background: '#fff1d6',
      borderColor: '#fcd34d',
      color: '#b45309',
    },
  },
  paid: {
    label: 'مدفوعة',
    style: {
      ...badgeBaseStyle,
      background: '#e7faef',
      borderColor: '#86efac',
      color: '#15803d',
    },
  },
  cancelled: {
    label: 'ملغاة',
    style: {
      ...badgeBaseStyle,
      background: '#f1f5f9',
      borderColor: '#cbd5e1',
      color: '#374151',
    },
  },
  canceled: {
    label: 'ملغاة',
    style: {
      ...badgeBaseStyle,
      background: '#f1f5f9',
      borderColor: '#cbd5e1',
      color: '#374151',
    },
  },
}

export const ACTIVE_TRANSFER_STATUSES = ['open', 'partial', 'partially_paid']

export const TRANSFER_STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'كل الحالات' },
  { value: 'open', label: 'مفتوحة' },
  { value: 'partial_group', label: 'مدفوعة جزئيا' },
  { value: 'paid', label: 'مدفوعة' },
  { value: 'cancelled_group', label: 'ملغاة' },
]

export function getTransferStatusMeta(status) {
  const normalizedStatus = String(status || '').toLowerCase()

  if (transferStatusMeta[normalizedStatus]) {
    return transferStatusMeta[normalizedStatus]
  }

  return {
    label: status || 'غير معروفة',
    style: {
      ...badgeBaseStyle,
      background: '#eef2f7',
      borderColor: '#dbe2ea',
      color: '#334155',
    },
  }
}

export function matchesTransferStatusFilter(status, filterValue) {
  const normalizedStatus = String(status || '').toLowerCase()

  if (filterValue === 'all') {
    return true
  }

  if (filterValue === 'partial_group') {
    return normalizedStatus === 'partial' || normalizedStatus === 'partially_paid'
  }

  if (filterValue === 'cancelled_group') {
    return normalizedStatus === 'cancelled' || normalizedStatus === 'canceled'
  }

  return normalizedStatus === filterValue
}

export function getPaymentMethodLabel(paymentMethod) {
  const originalValue = String(paymentMethod || '').trim()
  const normalizedValue = originalValue.toLowerCase()

  if (!originalValue) {
    return 'غير مسجلة'
  }

  if (normalizedValue === 'sberbank') {
    return 'سبيربنك'
  }

  if (normalizedValue === 'tinkoff') {
    return 'تينكوف'
  }

  if (normalizedValue === 'vtb') {
    return 'VTB'
  }

  if (normalizedValue === 'alfa bank') {
    return 'ألفا بنك'
  }

  if (normalizedValue === 'raiffeisen') {
    return 'رايفايزن'
  }

  if (normalizedValue === 'cash' || normalizedValue.includes('cash')) {
    return 'نقدا'
  }

  if (normalizedValue === 'other bank') {
    return 'بنك آخر'
  }

  return originalValue
}
