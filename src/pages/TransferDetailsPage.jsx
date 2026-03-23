import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import BalanceSummary from '../components/transfer-details/BalanceSummary.jsx'
import PaymentForm from '../components/transfer-details/PaymentForm.jsx'
import PaymentList from '../components/transfer-details/PaymentList.jsx'
import PrintStatement from '../components/transfer-details/PrintStatement.jsx'
import TransferFollowUpPanel from '../components/transfer-details/TransferFollowUpPanel.jsx'
import TransferSummary from '../components/transfer-details/TransferSummary.jsx'
import FieldShell from '../components/ui/FieldShell.jsx'
import InfoCard from '../components/ui/InfoCard.jsx'
import InfoGrid from '../components/ui/InfoGrid.jsx'
import InlineMessage from '../components/ui/InlineMessage.jsx'
import OfflineSnapshotNotice from '../components/ui/OfflineSnapshotNotice.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import PendingMutationNotice from '../components/ui/PendingMutationNotice.jsx'
import RecordMeta from '../components/ui/RecordMeta.jsx'
import ReadonlyField from '../components/ui/ReadonlyField.jsx'
import SectionCard from '../components/ui/SectionCard.jsx'
import { useAuth } from '../context/auth-context.js'
import { useTenant } from '../context/tenant-context.js'
import useNetworkStatus from '../hooks/useNetworkStatus.js'
import useOfflineSnapshot from '../hooks/useOfflineSnapshot.js'
import usePendingPayments from '../hooks/usePendingPayments.js'
import useReplayQueue from '../hooks/useReplayQueue.js'
import { getTransferDetailsSnapshotKey } from '../lib/offline/cacheKeys.js'
import { getOfflineSnapshotMissingMessage } from '../lib/offline/freshness.js'
import { queueOfflinePayment } from '../lib/offline/paymentQueue.js'
import { MISSING_CURRENT_ORG_MESSAGE, withOrgScope, withStampedOrg } from '../lib/orgScope.js'
import {
  isBrowserOffline,
  isLikelyOfflineReadFailure,
  loadReadSnapshot,
  saveReadSnapshot,
  withLiveReadTimeout,
} from '../lib/offline/readCache.js'
import { deriveTransferOverpaymentState } from '../lib/transfer-overpayment.js'
import {
  deriveConfirmedPaymentState,
  TRANSFER_PAYMENT_VOID_SELECT,
} from '../lib/transfer-payment-state.js'
import { getPaymentMethodLabel, getTransferStatusMeta } from '../lib/transfer-ui.js'
import { supabase } from '../lib/supabase.js'

const PAYMENT_METHOD_OPTIONS = [
  { value: 'Sberbank', label: 'سبيربنك' },
  { value: 'Tinkoff', label: 'تينكوف' },
  { value: 'VTB', label: 'VTB' },
  { value: 'Alfa Bank', label: 'ألفا بنك' },
  { value: 'Raiffeisen', label: 'رايفايزن' },
  { value: 'Cash 💵', label: 'نقدا' },
  { value: 'Other bank', label: 'بنك آخر' },
]

const emptyPaymentForm = {
  amount_rub: '',
  payment_method: '',
  note: '',
}

const OVERPAYMENT_RESOLUTION_TYPE_OPTIONS = [
  { value: 'recovered', label: 'تم الاسترداد' },
  { value: 'offset_outside_system', label: 'تمت التسوية خارج النظام' },
  { value: 'other', label: 'أخرى' },
]

const emptyOverpaymentResolutionForm = {
  resolution_type: '',
  note: '',
}

const PAYMENT_VOID_REASON_TYPE_OPTIONS = [
  { value: 'entered_in_error', label: 'أُدخلت بالخطأ' },
  { value: 'duplicate_entry', label: 'إدخال مكرر' },
  { value: 'wrong_transfer', label: 'سجلت على حوالة خاطئة' },
  { value: 'other', label: 'أخرى' },
]

const emptyPaymentVoidForm = {
  void_reason_type: '',
  note: '',
}

const emptyReplacementPaymentForm = {
  amount_rub: '',
  payment_method: '',
  note: '',
  paid_at: '',
}

function RefreshIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 11a8 8 0 1 0 2 5.3" />
      <path d="M20 4v7h-7" />
    </svg>
  )
}

const TRANSFER_STATUS_EDIT_OPTIONS = [
  { value: 'open', label: getTransferStatusMeta('open').label },
  { value: 'partial', label: getTransferStatusMeta('partial').label },
  { value: 'paid', label: getTransferStatusMeta('paid').label },
  { value: 'cancelled', label: getTransferStatusMeta('cancelled').label },
]

const emptyTransferEditForm = {
  customer_id: '',
  amount: '',
  global_rate: '',
  percentage: '0',
  status: 'open',
  notes: '',
}

function formatNumber(value, digits = 2) {
  if (value === null || value === undefined || value === '') {
    return '--'
  }

  const numericValue = Number(value)

  if (!Number.isFinite(numericValue)) {
    return String(value)
  }

  return new Intl.NumberFormat(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(numericValue)
}

function formatDate(value) {
  if (!value) {
    return '--'
  }

  const parsedDate = new Date(value)

  if (Number.isNaN(parsedDate.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(parsedDate)
}

function formatAgeLabel(value) {
  if (!value) {
    return '--'
  }

  const parsedDate = new Date(value)

  if (Number.isNaN(parsedDate.getTime())) {
    return formatDate(value)
  }

  const diffMs = Date.now() - parsedDate.getTime()

  if (diffMs < 0) {
    return formatDate(value)
  }

  const diffMinutes = Math.floor(diffMs / 60000)

  if (diffMinutes < 60) {
    return `منذ ${Math.max(diffMinutes, 1)} دقيقة`
  }

  const diffHours = Math.floor(diffMinutes / 60)

  if (diffHours < 24) {
    return `منذ ${diffHours} ساعة`
  }

  const diffDays = Math.floor(diffHours / 24)

  if (diffDays < 30) {
    return `منذ ${diffDays} يوم`
  }

  return formatDate(value)
}

function formatDateTimeLocalInput(value) {
  if (!value) {
    return ''
  }

  const parsedDate = new Date(value)

  if (Number.isNaN(parsedDate.getTime())) {
    return ''
  }

  const pad = (part) => String(part).padStart(2, '0')

  return `${parsedDate.getFullYear()}-${pad(parsedDate.getMonth() + 1)}-${pad(parsedDate.getDate())}T${pad(parsedDate.getHours())}:${pad(parsedDate.getMinutes())}`
}

function normalizeDateTimeLocalInput(value) {
  if (!value) {
    return ''
  }

  const parsedDate = new Date(value)

  if (Number.isNaN(parsedDate.getTime())) {
    return ''
  }

  return parsedDate.toISOString()
}

function roundCurrency(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

function roundRate(value) {
  return Math.round((value + Number.EPSILON) * 1000000) / 1000000
}

function parseOptionalNumber(value) {
  if (value === null || value === undefined || value === '') {
    return null
  }

  const parsedValue = Number(value)

  return Number.isFinite(parsedValue) ? parsedValue : null
}

function formatOptionalNumberInput(value) {
  const numericValue = Number(value)

  return Number.isFinite(numericValue) ? String(numericValue) : ''
}

function formatOptionalRateInput(value) {
  const numericValue = Number(value)

  return Number.isFinite(numericValue) ? String(roundRate(numericValue)) : ''
}

function createTransferEditForm(transfer) {
  if (!transfer) {
    return emptyTransferEditForm
  }

  return {
    customer_id: String(transfer.customer_id || ''),
    amount: formatOptionalNumberInput(transfer.usdt_amount),
    global_rate: formatOptionalRateInput(transfer.market_rate),
    percentage:
      transfer.commission_pct === null || transfer.commission_pct === undefined
        ? '0'
        : formatOptionalNumberInput(transfer.commission_pct),
    status: String(transfer.status || 'open'),
    notes: String(transfer.notes || ''),
  }
}

function normalizeTransferCustomerOptions(customers = [], currentTransfer = null, currentCustomerName = '') {
  const customerMap = new Map()
  const currentCustomerId = String(currentTransfer?.customer_id || '').trim()

  customers.forEach((customer) => {
    const customerId = String(customer?.id || '').trim()
    const customerName = String(customer?.full_name || '').trim()

    if (!customerId || !customerName) {
      return
    }

    if (customer?.is_archived && customerId !== currentCustomerId) {
      return
    }

    customerMap.set(customerId, {
      full_name: customerName,
      id: customerId,
      isArchived: Boolean(customer?.is_archived),
    })
  })

  if (currentCustomerId && !customerMap.has(currentCustomerId)) {
    customerMap.set(currentCustomerId, {
      full_name: currentCustomerName || 'العميل الحالي',
      id: currentCustomerId,
      isArchived: true,
    })
  }

  return Array.from(customerMap.values()).sort((left, right) =>
    left.full_name.localeCompare(right.full_name, 'ar')
  )
}

function buildTransferStatusEditOptions(currentStatus) {
  const normalizedCurrentStatus = String(currentStatus || '').trim().toLowerCase()

  if (
    !normalizedCurrentStatus ||
    TRANSFER_STATUS_EDIT_OPTIONS.some((option) => option.value === normalizedCurrentStatus)
  ) {
    return TRANSFER_STATUS_EDIT_OPTIONS
  }

  return [
    ...TRANSFER_STATUS_EDIT_OPTIONS,
    {
      value: normalizedCurrentStatus,
      label: getTransferStatusMeta(normalizedCurrentStatus).label,
    },
  ]
}

function extractPaymentMethod(payment) {
  return getPaymentMethodLabel(payment?.payment_method)
}

function extractPaymentNote(payment) {
  const note = String(payment?.note || '')

  if (!note) {
    return 'لا توجد ملاحظة على الدفعة.'
  }

  return note
}

function buildReplacementPaymentForm(payment) {
  return {
    amount_rub: Number.isFinite(Number(payment?.amount_rub))
      ? String(roundCurrency(Number(payment.amount_rub)))
      : '',
    payment_method: String(payment?.payment_method || ''),
    note: String(payment?.note || ''),
    paid_at: formatDateTimeLocalInput(payment?.paid_at || payment?.created_at || ''),
  }
}

function getConfirmedPaymentActivityTime(payment) {
  const activityValue = payment?.paid_at || payment?.created_at
  const parsedDate = activityValue ? new Date(activityValue) : null

  if (!parsedDate || Number.isNaN(parsedDate.getTime())) {
    return 0
  }

  return parsedDate.getTime()
}

function getConfirmedPaymentCreatedTime(payment) {
  const createdValue = payment?.created_at
  const parsedDate = createdValue ? new Date(createdValue) : null

  if (!parsedDate || Number.isNaN(parsedDate.getTime())) {
    return 0
  }

  return parsedDate.getTime()
}

function sortConfirmedPaymentsDescending(paymentRows = []) {
  return [...paymentRows].sort((nextPayment, currentPayment) => {
    const nextActivityTime = getConfirmedPaymentActivityTime(nextPayment)
    const currentActivityTime = getConfirmedPaymentActivityTime(currentPayment)

    if (nextActivityTime !== currentActivityTime) {
      return currentActivityTime - nextActivityTime
    }

    const nextCreatedTime = getConfirmedPaymentCreatedTime(nextPayment)
    const currentCreatedTime = getConfirmedPaymentCreatedTime(currentPayment)

    if (nextCreatedTime !== currentCreatedTime) {
      return currentCreatedTime - nextCreatedTime
    }

    return String(currentPayment?.id || '').localeCompare(String(nextPayment?.id || ''))
  })
}

function getOverpaymentResolutionTypeLabel(value) {
  const normalizedValue = String(value || '').trim().toLowerCase()

  if (!normalizedValue) {
    return '--'
  }

  return (
    OVERPAYMENT_RESOLUTION_TYPE_OPTIONS.find((option) => option.value === normalizedValue)?.label ||
    value
  )
}

function getPaymentVoidReasonTypeLabel(value) {
  const normalizedValue = String(value || '').trim().toLowerCase()

  if (!normalizedValue) {
    return '--'
  }

  return (
    PAYMENT_VOID_REASON_TYPE_OPTIONS.find((option) => option.value === normalizedValue)?.label ||
    value
  )
}

function getTransferDetailsSnapshotData(snapshot) {
  if (!snapshot?.data || typeof snapshot.data !== 'object') {
    return {}
  }

  return snapshot.data
}

function hasSavedTransferSnapshot(snapshotData) {
  return Boolean(snapshotData?.transfer) || snapshotData?.hasTransferSnapshot === true
}

function hasSavedPaymentsSnapshot(snapshotData) {
  return Array.isArray(snapshotData?.payments) || snapshotData?.hasPaymentsSnapshot === true
}

function hasSavedPaymentVoidsSnapshot(snapshotData) {
  return Array.isArray(snapshotData?.paymentVoidRows) || snapshotData?.hasPaymentVoidsSnapshot === true
}

function hasSavedOverpaymentResolutionSnapshot(snapshotData) {
  return snapshotData?.hasOverpaymentResolutionSnapshot === true
}

const TRANSFER_DETAILS_SECTIONS = [
  { key: 'summary', label: 'الملخص', description: 'الحوالة والرصيد' },
  { key: 'payments', label: 'الدفعات', description: 'إدخال ومزامنة' },
  { key: 'history', label: 'السجل', description: 'المؤكد والمحلي' },
  { key: 'print', label: 'الطباعة', description: 'كشف الحوالة' },
]

const MOBILE_TRANSFER_DETAILS_QUERY = '(max-width: 767px)'

function TransferDetailsPage() {
  const { transferId } = useParams()
  const location = useLocation()
  const { configError, isConfigured } = useAuth()
  const { orgId } = useTenant()
  const { isOffline } = useNetworkStatus()
  const { clearSnapshotState, markCachedSnapshot, markLiveSnapshot, snapshotState } =
    useOfflineSnapshot()
  const [isCompactMobileLayout, setIsCompactMobileLayout] = useState(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return false
    }

    return window.matchMedia(MOBILE_TRANSFER_DETAILS_QUERY).matches
  })
  const [isSecondaryInfoOpen, setIsSecondaryInfoOpen] = useState(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return true
    }

    return !window.matchMedia(MOBILE_TRANSFER_DETAILS_QUERY).matches
  })
  const [activeSections, setActiveSections] = useState({})
  const [transfer, setTransfer] = useState(null)
  const [transferLoading, setTransferLoading] = useState(Boolean(isConfigured))
  const [transferError, setTransferError] = useState(isConfigured ? '' : configError)
  const [customerName, setCustomerName] = useState('')
  const [isEditingTransfer, setIsEditingTransfer] = useState(false)
  const [transferEditForm, setTransferEditForm] = useState(emptyTransferEditForm)
  const [transferEditSubmitting, setTransferEditSubmitting] = useState(false)
  const [transferEditSubmitError, setTransferEditSubmitError] = useState('')
  const [transferEditSubmitSuccess, setTransferEditSubmitSuccess] = useState('')
  const [transferCustomerOptions, setTransferCustomerOptions] = useState([])
  const [transferCustomerOptionsLoading, setTransferCustomerOptionsLoading] = useState(false)
  const [transferCustomerOptionsError, setTransferCustomerOptionsError] = useState('')
  const [payments, setPayments] = useState([])
  const [paymentVoidRows, setPaymentVoidRows] = useState([])
  const [paymentsLoading, setPaymentsLoading] = useState(Boolean(isConfigured))
  const [paymentsError, setPaymentsError] = useState(isConfigured ? '' : configError)
  const [transferRefreshKey, setTransferRefreshKey] = useState(0)
  const [paymentsRefreshKey, setPaymentsRefreshKey] = useState(0)
  const [paymentForm, setPaymentForm] = useState(emptyPaymentForm)
  const [paymentSubmitting, setPaymentSubmitting] = useState(false)
  const [paymentSubmitError, setPaymentSubmitError] = useState('')
  const [paymentSubmitSuccess, setPaymentSubmitSuccess] = useState('')
  const [paymentVoidForm, setPaymentVoidForm] = useState(emptyPaymentVoidForm)
  const [paymentVoidFormPaymentId, setPaymentVoidFormPaymentId] = useState('')
  const [paymentVoidSubmitting, setPaymentVoidSubmitting] = useState(false)
  const [paymentVoidSubmitError, setPaymentVoidSubmitError] = useState('')
  const [paymentVoidSubmitSuccess, setPaymentVoidSubmitSuccess] = useState('')
  const [replacementPaymentForm, setReplacementPaymentForm] = useState(emptyReplacementPaymentForm)
  const [replacementPaymentFormPaymentId, setReplacementPaymentFormPaymentId] = useState('')
  const [replacementPaymentSubmitting, setReplacementPaymentSubmitting] = useState(false)
  const [replacementPaymentSubmitError, setReplacementPaymentSubmitError] = useState('')
  const [replacementPaymentSubmitSuccess, setReplacementPaymentSubmitSuccess] = useState('')
  const [replacementPaymentLinks, setReplacementPaymentLinks] = useState({})
  const [latestOverpaymentResolution, setLatestOverpaymentResolution] = useState(null)
  const [overpaymentResolutionLoading, setOverpaymentResolutionLoading] = useState(Boolean(isConfigured))
  const [overpaymentResolutionLoaded, setOverpaymentResolutionLoaded] = useState(false)
  const [overpaymentResolutionError, setOverpaymentResolutionError] = useState(
    isConfigured ? '' : configError
  )
  const [overpaymentResolutionRefreshKey, setOverpaymentResolutionRefreshKey] = useState(0)
  const [overpaymentResolutionForm, setOverpaymentResolutionForm] = useState(
    emptyOverpaymentResolutionForm
  )
  const [overpaymentResolutionFormOpen, setOverpaymentResolutionFormOpen] = useState(false)
  const [overpaymentResolutionSubmitting, setOverpaymentResolutionSubmitting] = useState(false)
  const [overpaymentResolutionSubmitError, setOverpaymentResolutionSubmitError] = useState('')
  const [overpaymentResolutionSubmitSuccess, setOverpaymentResolutionSubmitSuccess] = useState('')
  const previousPendingCountRef = useRef(0)
  const snapshotPersistQueueRef = useRef(Promise.resolve(null))
  const transferSnapshotKey = getTransferDetailsSnapshotKey(orgId, transferId)
  const {
    activeCount: localPaymentCount,
    blockedCount: blockedLocalPaymentCount,
    failedCount: failedLocalPaymentCount,
    pendingPayments,
    refreshPendingPayments,
    totalAmountRub: localPendingAmountRub,
  } = usePendingPayments(transferId)
  const { isSyncing: queueSyncing, replayPaymentsNow } = useReplayQueue()
  const activeSection = activeSections[transferId] || 'summary'

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return undefined
    }

    const mediaQuery = window.matchMedia(MOBILE_TRANSFER_DETAILS_QUERY)
    const handleChange = (event) => {
      setIsCompactMobileLayout(event.matches)
    }

    setIsCompactMobileLayout(mediaQuery.matches)
    mediaQuery.addEventListener('change', handleChange)

    return () => {
      mediaQuery.removeEventListener('change', handleChange)
    }
  }, [])

  useEffect(() => {
    setIsSecondaryInfoOpen(!isCompactMobileLayout)
  }, [transferId, isCompactMobileLayout])

  const handleSectionChange = (nextSection) => {
    setActiveSections((current) => {
      if (current[transferId] === nextSection) {
        return current
      }

      return {
        ...current,
        [transferId]: nextSection,
      }
    })
  }

  useEffect(() => {
    setIsEditingTransfer(false)
    setTransferEditForm(emptyTransferEditForm)
    setTransferEditSubmitting(false)
    setTransferEditSubmitError('')
    setTransferEditSubmitSuccess('')
    setTransferCustomerOptions([])
    setTransferCustomerOptionsLoading(false)
    setTransferCustomerOptionsError('')
  }, [transferId])

  useEffect(() => {
    if (isEditingTransfer) {
      return
    }

    setTransferEditForm(createTransferEditForm(transfer))
  }, [isEditingTransfer, transfer])

  useEffect(() => {
    if (!isConfigured || !supabase || !transferId) {
      return undefined
    }

    let isMounted = true

    const hydrateTransferFromSnapshot = async (options = {}) => {
      const { fallbackErrorMessage = '' } = options

      setTransferLoading(true)
      setTransferError('')

      const snapshot = await loadReadSnapshot(transferSnapshotKey)
      const snapshotData = getTransferDetailsSnapshotData(snapshot)
      const hasTransferSnapshot = hasSavedTransferSnapshot(snapshotData)
      const hasPaymentsSnapshot = hasSavedPaymentsSnapshot(snapshotData)

      if (!isMounted) {
        return
      }

      if (!hasTransferSnapshot) {
        if (hasPaymentsSnapshot) {
          markCachedSnapshot(snapshot?.savedAt || '')
        } else {
          clearSnapshotState()
        }
        setTransfer(null)
        setCustomerName('')
        setTransferError(fallbackErrorMessage || getOfflineSnapshotMissingMessage('لهذه الحوالة'))
        setTransferLoading(false)
        return false
      }

      setTransfer(snapshotData.transfer)
      setCustomerName(snapshotData.customerName || '')
      setTransferError('')
      setTransferLoading(false)
      markCachedSnapshot(snapshot.savedAt)
      return true
    }

    const loadTransfer = async () => {
      clearSnapshotState()
      setTransferLoading(true)
      setTransferError('')

      if (!orgId) {
        setTransfer(null)
        setCustomerName('')
        setTransferError(MISSING_CURRENT_ORG_MESSAGE)
        setTransferLoading(false)
        return
      }

      try {
        const { data, error } = await withLiveReadTimeout(
          withOrgScope(
            supabase
              .schema('public')
              .from('transfers')
              .select(
                'id, reference_number, customer_id, usdt_amount, market_rate, client_rate, pricing_mode, commission_pct, commission_rub, gross_rub, payable_rub, status, notes, created_at'
              )
              .eq('id', transferId)
              .maybeSingle(),
            orgId
          ),
          {
            timeoutMessage: 'تعذر إكمال تحميل هذه الحوالة في الوقت المتوقع.',
          }
        )

        if (!isMounted) {
          return
        }

        if (error) {
          const preferSnapshot = isOffline || isBrowserOffline() || isLikelyOfflineReadFailure(error)
          await hydrateTransferFromSnapshot({
            fallbackErrorMessage: preferSnapshot ? '' : error.message,
          })
          return
        }

        if (!data) {
          setTransfer(null)
          setCustomerName('')
          setTransferError('الحوالة غير موجودة أو غير متاحة ضمن صلاحيات الجلسة الحالية.')
          setTransferLoading(false)
          return
        }

        let nextCustomerName = ''

        if (data.customer_id) {
          const { data: customerData, error: customerError } = await withLiveReadTimeout(
            withOrgScope(
              supabase
                .schema('public')
                .from('customers')
                .select('full_name')
                .eq('id', data.customer_id)
                .maybeSingle(),
              orgId
            ),
            {
              timeoutMessage: 'تعذر إكمال تحميل اسم العميل لهذه الحوالة في الوقت المتوقع.',
            }
          )

          if (!isMounted) {
            return
          }

          if (!customerError) {
            nextCustomerName = customerData?.full_name || ''
          }
        }

        setTransfer(data)
        setCustomerName(nextCustomerName)
        setTransferLoading(false)
      } catch (error) {
        if (!isMounted) {
          return
        }

        const preferSnapshot = isOffline || isBrowserOffline() || isLikelyOfflineReadFailure(error)

        await hydrateTransferFromSnapshot({
          fallbackErrorMessage: preferSnapshot ? '' : error.message,
        })
      }
    }

    if (isOffline) {
      hydrateTransferFromSnapshot()
    } else {
      loadTransfer()
    }

    return () => {
      isMounted = false
    }
  }, [
    clearSnapshotState,
    isConfigured,
    isOffline,
    markCachedSnapshot,
    orgId,
    transferRefreshKey,
    transferId,
    transferSnapshotKey,
  ])

  useEffect(() => {
    if (!isConfigured || !supabase || !transferId || transferLoading) {
      return undefined
    }

    if (!orgId) {
      setPayments([])
      setPaymentVoidRows([])
      setPaymentsError(MISSING_CURRENT_ORG_MESSAGE)
      setPaymentsLoading(false)
      return undefined
    }

    if (!transfer || transferError) {
      setPayments([])
      setPaymentVoidRows([])
      setPaymentsError('')
      setPaymentsLoading(false)
      return undefined
    }

    let isMounted = true

    const hydratePaymentsFromSnapshot = async (options = {}) => {
      const { fallbackErrorMessage = '' } = options

      setPaymentsLoading(true)
      setPaymentsError('')

      const snapshot = await loadReadSnapshot(transferSnapshotKey)
      const snapshotData = getTransferDetailsSnapshotData(snapshot)
      const hasTransferSnapshot = hasSavedTransferSnapshot(snapshotData)
      const hasPaymentsSnapshot = hasSavedPaymentsSnapshot(snapshotData)
      const hasPaymentVoidsSnapshot = hasSavedPaymentVoidsSnapshot(snapshotData)

      if (!isMounted) {
        return
      }

      if (!hasPaymentsSnapshot || !hasPaymentVoidsSnapshot) {
        if (hasTransferSnapshot) {
          markCachedSnapshot(snapshot?.savedAt || '')
        }
        setPayments([])
        setPaymentVoidRows([])
        setPaymentsError(fallbackErrorMessage || getOfflineSnapshotMissingMessage('لمدفوعات هذه الحوالة'))
        setPaymentsLoading(false)
        return false
      }

      setPayments(Array.isArray(snapshotData.payments) ? snapshotData.payments : [])
      setPaymentVoidRows(Array.isArray(snapshotData.paymentVoidRows) ? snapshotData.paymentVoidRows : [])
      setPaymentsError('')
      setPaymentsLoading(false)
      markCachedSnapshot(snapshot.savedAt)
      return true
    }

    const loadPayments = async () => {
      setPaymentsLoading(true)
      setPaymentsError('')

      try {
        const { data, error } = await withLiveReadTimeout(
          withOrgScope(
            supabase
              .schema('public')
              .from('transfer_payments')
              .select('id, amount_rub, payment_method, note, paid_at, created_at')
              .eq('transfer_id', transferId)
              .order('paid_at', { ascending: false })
              .order('created_at', { ascending: false }),
            orgId
          ),
          {
            timeoutMessage: 'تعذر إكمال تحميل مدفوعات هذه الحوالة في الوقت المتوقع.',
          }
        )

        if (!isMounted) {
          return
        }

        if (error) {
          const preferSnapshot = isOffline || isBrowserOffline() || isLikelyOfflineReadFailure(error)
          await hydratePaymentsFromSnapshot({
            fallbackErrorMessage: preferSnapshot ? '' : error.message,
          })
          return
        }

        const { data: paymentVoidData, error: paymentVoidsError } = await withLiveReadTimeout(
          withOrgScope(
            supabase
              .schema('public')
              .from('transfer_payment_voids')
              .select(TRANSFER_PAYMENT_VOID_SELECT)
              .eq('transfer_id', transferId)
              .order('created_at', { ascending: false })
              .order('id', { ascending: false }),
            orgId
          ),
          {
            timeoutMessage: 'تعذر إكمال تحميل حالات إلغاء الدفعات المؤكدة لهذه الحوالة في الوقت المتوقع.',
          }
        )

        if (!isMounted) {
          return
        }

        if (paymentVoidsError) {
          const preferSnapshot =
            isOffline || isBrowserOffline() || isLikelyOfflineReadFailure(paymentVoidsError)
          await hydratePaymentsFromSnapshot({
            fallbackErrorMessage: preferSnapshot ? '' : paymentVoidsError.message,
          })
          return
        }

        setPayments(data ?? [])
        setPaymentVoidRows(paymentVoidData ?? [])
        setPaymentsLoading(false)
      } catch (error) {
        if (!isMounted) {
          return
        }

        const preferSnapshot = isOffline || isBrowserOffline() || isLikelyOfflineReadFailure(error)

        await hydratePaymentsFromSnapshot({
          fallbackErrorMessage: preferSnapshot ? '' : error.message,
        })
      }
    }

    if (isOffline) {
      hydratePaymentsFromSnapshot()
    } else {
      loadPayments()
    }

    return () => {
      isMounted = false
    }
  }, [
    isConfigured,
    isOffline,
    markCachedSnapshot,
    orgId,
    paymentsRefreshKey,
    transfer,
    transferError,
    transferId,
    transferLoading,
    transferSnapshotKey,
  ])

  useEffect(() => {
    if (!isConfigured || !supabase || !transferId || transferLoading) {
      return undefined
    }

    if (!orgId) {
      setLatestOverpaymentResolution(null)
      setOverpaymentResolutionLoaded(false)
      setOverpaymentResolutionError(MISSING_CURRENT_ORG_MESSAGE)
      setOverpaymentResolutionLoading(false)
      return undefined
    }

    if (!transfer || transferError) {
      setLatestOverpaymentResolution(null)
      setOverpaymentResolutionLoaded(false)
      setOverpaymentResolutionError('')
      setOverpaymentResolutionLoading(false)
      return undefined
    }

    let isMounted = true

    const hydrateOverpaymentResolutionFromSnapshot = async (options = {}) => {
      const { fallbackErrorMessage = '' } = options

      setOverpaymentResolutionLoading(true)
      setOverpaymentResolutionError('')
      setOverpaymentResolutionLoaded(false)

      const snapshot = await loadReadSnapshot(transferSnapshotKey)
      const snapshotData = getTransferDetailsSnapshotData(snapshot)
      const hasTransferSnapshot = hasSavedTransferSnapshot(snapshotData)
      const hasOverpaymentResolutionSnapshot = hasSavedOverpaymentResolutionSnapshot(snapshotData)

      if (!isMounted) {
        return
      }

      if (!hasOverpaymentResolutionSnapshot) {
        if (hasTransferSnapshot) {
          markCachedSnapshot(snapshot?.savedAt || '')
        }

        setLatestOverpaymentResolution(null)
        setOverpaymentResolutionLoaded(false)
        setOverpaymentResolutionError(
          fallbackErrorMessage ||
            getOfflineSnapshotMissingMessage('لآخر معالجة زيادة الدفع على هذه الحوالة')
        )
        setOverpaymentResolutionLoading(false)
        return false
      }

      setLatestOverpaymentResolution(snapshotData.latestOverpaymentResolution || null)
      setOverpaymentResolutionLoaded(true)
      setOverpaymentResolutionError('')
      setOverpaymentResolutionLoading(false)
      markCachedSnapshot(snapshot.savedAt)
      return true
    }

    const loadLatestOverpaymentResolution = async () => {
      setOverpaymentResolutionLoading(true)
      setOverpaymentResolutionError('')
      setOverpaymentResolutionLoaded(false)

      try {
        const { data, error } = await withLiveReadTimeout(
          withOrgScope(
            supabase
              .schema('public')
              .from('transfer_overpayment_resolutions')
              .select('id, transfer_id, resolution_type, resolved_overpaid_amount_rub, note, created_at')
              .eq('transfer_id', transferId)
              .order('created_at', { ascending: false })
              .order('id', { ascending: false })
              .limit(1)
              .maybeSingle(),
            orgId
          ),
          {
            timeoutMessage:
              'تعذر إكمال تحميل آخر معالجة زيادة دفع لهذه الحوالة في الوقت المتوقع.',
          }
        )

        if (!isMounted) {
          return
        }

        if (error) {
          const preferSnapshot = isOffline || isBrowserOffline() || isLikelyOfflineReadFailure(error)

          await hydrateOverpaymentResolutionFromSnapshot({
            fallbackErrorMessage: preferSnapshot ? '' : error.message,
          })
          return
        }

        setLatestOverpaymentResolution(data ?? null)
        setOverpaymentResolutionLoaded(true)
        setOverpaymentResolutionError('')
        setOverpaymentResolutionLoading(false)
      } catch (error) {
        if (!isMounted) {
          return
        }

        const preferSnapshot = isOffline || isBrowserOffline() || isLikelyOfflineReadFailure(error)

        await hydrateOverpaymentResolutionFromSnapshot({
          fallbackErrorMessage: preferSnapshot ? '' : error.message,
        })
      }
    }

    if (isOffline) {
      hydrateOverpaymentResolutionFromSnapshot()
    } else {
      loadLatestOverpaymentResolution()
    }

    return () => {
      isMounted = false
    }
  }, [
    isConfigured,
    isOffline,
    markCachedSnapshot,
    orgId,
    overpaymentResolutionRefreshKey,
    transfer,
    transferError,
    transferId,
    transferLoading,
    transferSnapshotKey,
  ])

  const handleTransferRefresh = () => {
    setTransferRefreshKey((current) => current + 1)
  }

  const handlePaymentsRefresh = () => {
    setPaymentsRefreshKey((current) => current + 1)
  }

  const handleOverpaymentResolutionRefresh = () => {
    setOverpaymentResolutionRefreshKey((current) => current + 1)
  }

  useEffect(() => {
    const previousPendingCount = previousPendingCountRef.current

    if (!isOffline && previousPendingCount > 0 && localPaymentCount < previousPendingCount) {
      const scheduleRefresh = () => {
        setTransferRefreshKey((current) => current + 1)
        setPaymentsRefreshKey((current) => current + 1)
      }

      if (typeof queueMicrotask === 'function') {
        queueMicrotask(scheduleRefresh)
      } else {
        Promise.resolve().then(scheduleRefresh)
      }
    }

    previousPendingCountRef.current = localPaymentCount
  }, [isOffline, localPaymentCount])

  useEffect(() => {
    if (isOffline || !transferId || transferLoading || !transfer || transferError) {
      return
    }

    let isMounted = true

    const persistTransferSnapshot = async () => {
      const nextTransferSavedAt = new Date().toISOString()

      snapshotPersistQueueRef.current = snapshotPersistQueueRef.current
        .catch(() => null)
        .then(async () => {
          const currentSnapshot = await loadReadSnapshot(transferSnapshotKey)
          const currentData = getTransferDetailsSnapshotData(currentSnapshot)

          return saveReadSnapshot({
            key: transferSnapshotKey,
            scope: `transfer-details:${transferId}`,
            type: 'transfer_details',
            data: {
              ...currentData,
              ...(customerName ? { customerName } : {}),
              hasTransferSnapshot: true,
              transfer,
              transferSavedAt: nextTransferSavedAt,
            },
          })
        })

      const savedSnapshot = await snapshotPersistQueueRef.current

      if (!isMounted) {
        return
      }

      markLiveSnapshot(savedSnapshot?.savedAt || '')
    }

    persistTransferSnapshot()

    return () => {
      isMounted = false
    }
  }, [
    customerName,
    isOffline,
    markLiveSnapshot,
    transfer,
    transferError,
    transferId,
    transferLoading,
    transferSnapshotKey,
  ])

  useEffect(() => {
    if (isOffline || !transferId || paymentsLoading || paymentsError) {
      return
    }

    let isMounted = true

    const persistPaymentsSnapshot = async () => {
      const nextPaymentsSavedAt = new Date().toISOString()

      snapshotPersistQueueRef.current = snapshotPersistQueueRef.current
        .catch(() => null)
        .then(async () => {
          const currentSnapshot = await loadReadSnapshot(transferSnapshotKey)
          const currentData = getTransferDetailsSnapshotData(currentSnapshot)

          return saveReadSnapshot({
            key: transferSnapshotKey,
            scope: `transfer-details:${transferId}`,
            type: 'transfer_details',
              data: {
                ...currentData,
                hasPaymentsSnapshot: true,
                hasPaymentVoidsSnapshot: true,
                payments,
                paymentVoidRows,
                paymentsSavedAt: nextPaymentsSavedAt,
              },
            })
        })

      const savedSnapshot = await snapshotPersistQueueRef.current

      if (!isMounted) {
        return
      }

      markLiveSnapshot(savedSnapshot?.savedAt || '')
    }

    persistPaymentsSnapshot()

    return () => {
      isMounted = false
    }
  }, [
    isOffline,
    markLiveSnapshot,
    payments,
    paymentsError,
    paymentsLoading,
    paymentVoidRows,
    transferId,
    transferSnapshotKey,
  ])

  useEffect(() => {
    if (
      isOffline ||
      !transferId ||
      overpaymentResolutionLoading ||
      overpaymentResolutionError ||
      !overpaymentResolutionLoaded
    ) {
      return
    }

    let isMounted = true

    const persistOverpaymentResolutionSnapshot = async () => {
      const nextOverpaymentResolutionSavedAt = new Date().toISOString()

      snapshotPersistQueueRef.current = snapshotPersistQueueRef.current
        .catch(() => null)
        .then(async () => {
          const currentSnapshot = await loadReadSnapshot(transferSnapshotKey)
          const currentData = getTransferDetailsSnapshotData(currentSnapshot)

          return saveReadSnapshot({
            key: transferSnapshotKey,
            scope: `transfer-details:${transferId}`,
            type: 'transfer_details',
            data: {
              ...currentData,
              hasOverpaymentResolutionSnapshot: true,
              latestOverpaymentResolution,
              overpaymentResolutionSavedAt: nextOverpaymentResolutionSavedAt,
            },
          })
        })

      const savedSnapshot = await snapshotPersistQueueRef.current

      if (!isMounted) {
        return
      }

      markLiveSnapshot(savedSnapshot?.savedAt || '')
    }

    persistOverpaymentResolutionSnapshot()

    return () => {
      isMounted = false
    }
  }, [
    isOffline,
    latestOverpaymentResolution,
    markLiveSnapshot,
    overpaymentResolutionError,
    overpaymentResolutionLoaded,
    overpaymentResolutionLoading,
    transferId,
    transferSnapshotKey,
  ])

  useEffect(() => {
    const resetOverpaymentResolutionState = () => {
      setLatestOverpaymentResolution(null)
      setOverpaymentResolutionLoading(Boolean(isConfigured))
      setOverpaymentResolutionLoaded(false)
      setOverpaymentResolutionError(isConfigured ? '' : configError)
      setOverpaymentResolutionForm(emptyOverpaymentResolutionForm)
      setOverpaymentResolutionFormOpen(false)
      setOverpaymentResolutionSubmitError('')
      setOverpaymentResolutionSubmitSuccess('')
    }

    if (typeof queueMicrotask === 'function') {
      queueMicrotask(resetOverpaymentResolutionState)
      return
    }

    Promise.resolve().then(resetOverpaymentResolutionState)
  }, [configError, isConfigured, transferId])

  useEffect(() => {
    const resetPaymentVoidState = () => {
      setPaymentVoidForm(emptyPaymentVoidForm)
      setPaymentVoidFormPaymentId('')
      setPaymentVoidSubmitting(false)
      setPaymentVoidSubmitError('')
      setPaymentVoidSubmitSuccess('')
    }

    if (typeof queueMicrotask === 'function') {
      queueMicrotask(resetPaymentVoidState)
      return
    }

    Promise.resolve().then(resetPaymentVoidState)
  }, [transferId])

  useEffect(() => {
    const resetReplacementPaymentState = () => {
      setReplacementPaymentForm(emptyReplacementPaymentForm)
      setReplacementPaymentFormPaymentId('')
      setReplacementPaymentSubmitting(false)
      setReplacementPaymentSubmitError('')
      setReplacementPaymentSubmitSuccess('')
      setReplacementPaymentLinks({})
    }

    if (typeof queueMicrotask === 'function') {
      queueMicrotask(resetReplacementPaymentState)
      return
    }

    Promise.resolve().then(resetReplacementPaymentState)
  }, [transferId])

  const handlePaymentChange = (event) => {
    const { name, value } = event.target

    setPaymentForm((current) => ({
      ...current,
      [name]: value,
    }))
  }

  const handlePaymentVoidFormChange = (event) => {
    const { name, value } = event.target

    setPaymentVoidForm((current) => ({
      ...current,
      [name]: value,
    }))

    if (paymentVoidSubmitError) {
      setPaymentVoidSubmitError('')
    }

    if (paymentVoidSubmitSuccess) {
      setPaymentVoidSubmitSuccess('')
    }
  }

  const handleReplacementPaymentFormChange = (event) => {
    const { name, value } = event.target

    setReplacementPaymentForm((current) => ({
      ...current,
      [name]: value,
    }))

    if (replacementPaymentSubmitError) {
      setReplacementPaymentSubmitError('')
    }

    if (replacementPaymentSubmitSuccess) {
      setReplacementPaymentSubmitSuccess('')
    }
  }

  const handleOverpaymentResolutionFormChange = (event) => {
    const { name, value } = event.target

    setOverpaymentResolutionForm((current) => ({
      ...current,
      [name]: value,
    }))

    if (overpaymentResolutionSubmitError) {
      setOverpaymentResolutionSubmitError('')
    }

    if (overpaymentResolutionSubmitSuccess) {
      setOverpaymentResolutionSubmitSuccess('')
    }
  }

  const handleTransferEditFormChange = (event) => {
    const { name, value } = event.target

    setTransferEditForm((current) => ({
      ...current,
      [name]: value,
    }))

    if (transferEditSubmitError) {
      setTransferEditSubmitError('')
    }

    if (transferEditSubmitSuccess) {
      setTransferEditSubmitSuccess('')
    }
  }

  const handleCloseTransferEdit = () => {
    setIsEditingTransfer(false)
    setTransferEditSubmitting(false)
    setTransferEditSubmitError('')
    setTransferEditSubmitSuccess('')
    setTransferEditForm(createTransferEditForm(transfer))
  }

  const handleOpenTransferEdit = () => {
    if (!transfer || transferEditActionDisabledReason) {
      return
    }

    handleSectionChange('summary')
    setIsEditingTransfer(true)
    setTransferEditSubmitting(false)
    setTransferEditSubmitError('')
    setTransferEditSubmitSuccess('')
    setTransferEditForm(createTransferEditForm(transfer))
  }

  const hasResolvedPayments = !paymentsLoading && !paymentsError
  const {
    activePayments,
    latestActivePayment,
    totalActivePaidRub,
    latestPaymentVoidByPaymentId,
  } = deriveConfirmedPaymentState({
    payments,
    paymentVoids: paymentVoidRows,
  })
  const totalPaidRub = hasResolvedPayments ? totalActivePaidRub : null
  const {
    remainingRub,
    isOverpaid,
    overpaidAmountRub,
    isResolvedOverpaid,
    isUnresolvedOverpaid,
  } = deriveTransferOverpaymentState({
    payableRub: transfer?.payable_rub,
    confirmedPaidRub: totalPaidRub,
    latestResolution: latestOverpaymentResolution,
  })
  const valueBeforePercentage =
    transfer && transfer.gross_rub !== null && transfer.gross_rub !== undefined
      ? roundCurrency(Number(transfer.gross_rub))
      : transfer && transfer.usdt_amount !== null && transfer.market_rate !== null
        ? roundCurrency(Number(transfer.usdt_amount) * Number(transfer.market_rate))
        : null
  const valueAfterPercentage =
    transfer && transfer.payable_rub !== null && transfer.payable_rub !== undefined
      ? roundCurrency(Number(transfer.payable_rub))
      : null
  const percentageValue =
    transfer && transfer.commission_pct !== null && transfer.commission_pct !== undefined
      ? Number(transfer.commission_pct)
      : 0
  const finalClientRate =
    transfer && transfer.client_rate !== null && transfer.client_rate !== undefined
      ? roundRate(Number(transfer.client_rate))
      : valueAfterPercentage !== null &&
          transfer &&
          transfer.usdt_amount !== null &&
          Number(transfer.usdt_amount) > 0
        ? roundRate(valueAfterPercentage / Number(transfer.usdt_amount))
        : null
  const isSettled = remainingRub !== null && Math.abs(remainingRub) <= 0.009
  const hasPayments = hasResolvedPayments && activePayments.length > 0
  const normalizedStatus = String(transfer?.status || '').toLowerCase()
  const isCancelled = normalizedStatus === 'cancelled' || normalizedStatus === 'canceled'
  const remainingMessage =
    remainingRub === null
      ? '--'
      : isOverpaid
        ? `زيادة دفع بمقدار ${formatNumber(overpaidAmountRub, 2)} RUB`
        : isSettled
          ? 'مسددة'
          : `${formatNumber(remainingRub, 2)} RUB`
  const balanceCardClass = isOverpaid
    ? 'info-card--danger'
    : isSettled
      ? 'info-card--success'
      : 'info-card--accent'
  const balanceValueClass = isOverpaid
    ? 'info-card-value--danger'
    : isSettled
      ? 'info-card-value--success'
      : ''
  const printRemainingClass = isOverpaid
    ? 'text-danger'
    : isSettled
      ? 'text-success'
      : 'text-strong'
  const remainingSupportClass = [
    'support-text',
    isOverpaid ? 'text-danger' : isSettled ? 'text-success' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print()
    }
  }

  const handleOpenPaymentVoidForm = (paymentId) => {
    if (!paymentId) {
      return
    }

    setReplacementPaymentFormPaymentId('')
    setReplacementPaymentForm(emptyReplacementPaymentForm)
    setReplacementPaymentSubmitError('')
    setPaymentVoidFormPaymentId(paymentId)
    setPaymentVoidForm(emptyPaymentVoidForm)
    setPaymentVoidSubmitError('')
    setPaymentVoidSubmitSuccess('')
  }

  const handleCancelPaymentVoidForm = () => {
    setPaymentVoidFormPaymentId('')
    setPaymentVoidForm(emptyPaymentVoidForm)
    setPaymentVoidSubmitError('')
  }

  const handleOpenReplacementPaymentForm = (payment) => {
    if (!payment?.id) {
      return
    }

    setPaymentVoidFormPaymentId('')
    setPaymentVoidSubmitError('')
    setReplacementPaymentFormPaymentId(payment.id)
    setReplacementPaymentForm(buildReplacementPaymentForm(payment))
    setReplacementPaymentSubmitError('')
    setReplacementPaymentSubmitSuccess('')
  }

  const handleCancelReplacementPaymentForm = () => {
    setReplacementPaymentFormPaymentId('')
    setReplacementPaymentForm(emptyReplacementPaymentForm)
    setReplacementPaymentSubmitError('')
  }

  const handleReplacementPaymentSubmit = async (event) => {
    event.preventDefault()
    setReplacementPaymentSubmitError('')
    setReplacementPaymentSubmitSuccess('')

    if (!isConfigured || !supabase) {
      setReplacementPaymentSubmitError(configError)
      return
    }

    if (!orgId) {
      setReplacementPaymentSubmitError(MISSING_CURRENT_ORG_MESSAGE)
      return
    }

    if (!transferId || !transfer) {
      setReplacementPaymentSubmitError('معرّف الحوالة غير متاح حاليا لتسجيل دفعة بديلة مصححة.')
      return
    }

    if (!replacementPaymentFormPaymentId) {
      setReplacementPaymentSubmitError('اختر دفعة ملغاة صالحة قبل تسجيل الدفعة البديلة.')
      return
    }

    if (replacementPaymentActionDisabledReason) {
      setReplacementPaymentSubmitError(replacementPaymentActionDisabledReason)
      return
    }

    const targetPayment = payments.find((payment) => payment?.id === replacementPaymentFormPaymentId)

    if (!targetPayment?.id) {
      setReplacementPaymentSubmitError('تعذر العثور على الدفعة الملغاة المطلوبة داخل السجل الحالي.')
      return
    }

    if (!latestPaymentVoidByPaymentId[targetPayment.id]) {
      setReplacementPaymentSubmitError('لا يمكن تسجيل دفعة بديلة إلا بعد إلغاء الدفعة الأصلية أولا.')
      return
    }

    if (replacementPaymentLinks[targetPayment.id]) {
      setReplacementPaymentSubmitError('تم تسجيل دفعة بديلة من هذه البطاقة بالفعل في هذه الجلسة.')
      return
    }

    const amountRub = Number(replacementPaymentForm.amount_rub)
    const paymentMethod = replacementPaymentForm.payment_method.trim()
    const noteValue = replacementPaymentForm.note.trim()
    const paidAtIso = normalizeDateTimeLocalInput(replacementPaymentForm.paid_at)

    if (!Number.isFinite(amountRub) || amountRub <= 0) {
      setReplacementPaymentSubmitError('يجب أن يكون مبلغ الدفعة البديلة أكبر من صفر.')
      return
    }

    if (!paymentMethod) {
      setReplacementPaymentSubmitError('يرجى اختيار وسيلة التحصيل للدفعة البديلة.')
      return
    }

    if (!paidAtIso) {
      setReplacementPaymentSubmitError('يرجى تحديد وقت اقتصادي صالح للدفعة البديلة.')
      return
    }

    setReplacementPaymentSubmitting(true)

    const payload = {
      transfer_id: transferId,
      amount_rub: roundCurrency(amountRub),
      payment_method: paymentMethod,
      note: noteValue || null,
      paid_at: paidAtIso,
    }

    const { data, error: insertError } = await supabase
      .schema('public')
      .from('transfer_payments')
      .insert([withStampedOrg(payload, orgId)])
      .select('id, amount_rub, payment_method, note, paid_at, created_at')
      .single()

    if (insertError) {
      setReplacementPaymentSubmitError(insertError.message)
      setReplacementPaymentSubmitting(false)
      return
    }

    const savedReplacementPayment = data || {
      id: '',
      ...payload,
      created_at: new Date().toISOString(),
    }

    setPayments((current) => sortConfirmedPaymentsDescending([savedReplacementPayment, ...current]))
    setReplacementPaymentLinks((current) => ({
      ...current,
      [targetPayment.id]: savedReplacementPayment.id,
    }))
    setReplacementPaymentSubmitting(false)
    setReplacementPaymentForm(emptyReplacementPaymentForm)
    setReplacementPaymentFormPaymentId('')
    handleTransferRefresh()
    setReplacementPaymentSubmitSuccess(
      `تم تسجيل دفعة بديلة مصححة بقيمة ${formatNumber(savedReplacementPayment.amount_rub, 2)} RUB بنجاح.`
    )
  }

  const handlePaymentVoidSubmit = async (event) => {
    event.preventDefault()
    setPaymentVoidSubmitError('')
    setPaymentVoidSubmitSuccess('')

    if (!isConfigured || !supabase) {
      setPaymentVoidSubmitError(configError)
      return
    }

    if (!orgId) {
      setPaymentVoidSubmitError(MISSING_CURRENT_ORG_MESSAGE)
      return
    }

    if (!transferId || !transfer) {
      setPaymentVoidSubmitError('معرّف الحوالة غير متاح حاليا لاعتماد إلغاء دفعة مؤكدة.')
      return
    }

    if (!paymentVoidFormPaymentId) {
      setPaymentVoidSubmitError('اختر دفعة مؤكدة صالحة قبل تسجيل الإلغاء.')
      return
    }

    if (paymentVoidActionDisabledReason) {
      setPaymentVoidSubmitError(paymentVoidActionDisabledReason)
      return
    }

    const targetPayment = payments.find((payment) => payment?.id === paymentVoidFormPaymentId)

    if (!targetPayment?.id) {
      setPaymentVoidSubmitError('تعذر العثور على الدفعة المؤكدة المطلوبة داخل السجل الحالي.')
      return
    }

    if (latestPaymentVoidByPaymentId[targetPayment.id]) {
      setPaymentVoidSubmitError('تم تسجيل إلغاء لهذه الدفعة المؤكدة بالفعل.')
      return
    }

    const voidReasonType = paymentVoidForm.void_reason_type.trim()
    const note = paymentVoidForm.note.trim()

    if (!voidReasonType) {
      setPaymentVoidSubmitError('يرجى اختيار سبب واضح لإلغاء هذه الدفعة المؤكدة.')
      return
    }

    if (!PAYMENT_VOID_REASON_TYPE_OPTIONS.some((option) => option.value === voidReasonType)) {
      setPaymentVoidSubmitError('سبب الإلغاء المختار غير مدعوم في هذه المرحلة.')
      return
    }

    if (!note) {
      setPaymentVoidSubmitError('يرجى كتابة ملاحظة تفسيرية واضحة قبل حفظ إلغاء الدفعة.')
      return
    }

    setPaymentVoidSubmitting(true)

    const payload = {
      payment_id: targetPayment.id,
      transfer_id: transferId,
      void_reason_type: voidReasonType,
      note,
    }

    const { data, error: insertError } = await supabase
      .schema('public')
      .from('transfer_payment_voids')
      .insert([withStampedOrg(payload, orgId)])
      .select(TRANSFER_PAYMENT_VOID_SELECT)
      .single()

    if (insertError) {
      setPaymentVoidSubmitError(insertError.message)
      setPaymentVoidSubmitting(false)
      return
    }

    const savedPaymentVoid = data || {
      id: '',
      ...payload,
      created_at: new Date().toISOString(),
    }

    setPaymentVoidRows((current) => [
      savedPaymentVoid,
      ...current.filter((paymentVoid) => paymentVoid?.payment_id !== savedPaymentVoid.payment_id),
    ])
    setPaymentVoidSubmitting(false)
    setPaymentVoidForm(emptyPaymentVoidForm)
    setPaymentVoidFormPaymentId('')
    handleTransferRefresh()
    setPaymentVoidSubmitSuccess(
      `تم إلغاء اعتماد الدفعة المؤكدة ${formatNumber(targetPayment.amount_rub, 2)} RUB بنجاح.`
    )
  }

  const handleOpenOverpaymentResolutionForm = () => {
    setOverpaymentResolutionFormOpen(true)
    setOverpaymentResolutionSubmitError('')
    setOverpaymentResolutionSubmitSuccess('')
  }

  const handleCancelOverpaymentResolutionForm = () => {
    setOverpaymentResolutionFormOpen(false)
    setOverpaymentResolutionForm(emptyOverpaymentResolutionForm)
    setOverpaymentResolutionSubmitError('')
  }

  const handleOverpaymentResolutionSubmit = async (event) => {
    event.preventDefault()
    setOverpaymentResolutionSubmitError('')
    setOverpaymentResolutionSubmitSuccess('')

    if (!isConfigured || !supabase) {
      setOverpaymentResolutionSubmitError(configError)
      return
    }

    if (!orgId) {
      setOverpaymentResolutionSubmitError(MISSING_CURRENT_ORG_MESSAGE)
      return
    }

    if (!transferId || !transfer) {
      setOverpaymentResolutionSubmitError('معرّف الحوالة غير متاح حاليا لاعتماد معالجة الزيادة.')
      return
    }

    if (isOffline) {
      setOverpaymentResolutionSubmitError('تسجيل معالجة زيادة الدفع متاح أثناء الاتصال فقط حاليا.')
      return
    }

    if (!isOverpaid) {
      setOverpaymentResolutionSubmitError('هذه الحوالة لا تحمل حاليا زيادة دفع قابلة للمعالجة.')
      return
    }

    if (hasResolvedCurrentOverpayment) {
      setOverpaymentResolutionSubmitError('تم تسجيل معالجة مطابقة للزيادة الحالية بالفعل.')
      return
    }

    if (overpaymentResolutionActionDisabledReason) {
      setOverpaymentResolutionSubmitError(overpaymentResolutionActionDisabledReason)
      return
    }

    const resolutionType = overpaymentResolutionForm.resolution_type.trim()
    const note = overpaymentResolutionForm.note.trim()

    if (!resolutionType) {
      setOverpaymentResolutionSubmitError('يرجى اختيار نوع معالجة واضح للزيادة الحالية.')
      return
    }

    if (!OVERPAYMENT_RESOLUTION_TYPE_OPTIONS.some((option) => option.value === resolutionType)) {
      setOverpaymentResolutionSubmitError('نوع المعالجة المختار غير مدعوم في هذه المرحلة.')
      return
    }

    if (!note) {
      setOverpaymentResolutionSubmitError('يرجى كتابة ملاحظة تفسيرية واضحة قبل الحفظ.')
      return
    }

    setOverpaymentResolutionSubmitting(true)

    const payload = {
      transfer_id: transferId,
      resolution_type: resolutionType,
      resolved_overpaid_amount_rub: overpaidAmountRub,
      note,
    }

    const { data, error: insertError } = await supabase
      .schema('public')
      .from('transfer_overpayment_resolutions')
      .insert([withStampedOrg(payload, orgId)])
      .select('id, transfer_id, resolution_type, resolved_overpaid_amount_rub, note, created_at')
      .single()

    if (insertError) {
      setOverpaymentResolutionSubmitError(insertError.message)
      setOverpaymentResolutionSubmitting(false)
      return
    }

    const savedResolution = data || {
      id: '',
      ...payload,
      created_at: new Date().toISOString(),
    }

    setLatestOverpaymentResolution(savedResolution)
    setOverpaymentResolutionLoaded(true)
    setOverpaymentResolutionError('')
    setOverpaymentResolutionSubmitting(false)
    setOverpaymentResolutionForm(emptyOverpaymentResolutionForm)
    setOverpaymentResolutionFormOpen(false)
    setOverpaymentResolutionSubmitSuccess(
      `تم تسجيل معالجة زيادة الدفع كـ ${getOverpaymentResolutionTypeLabel(
        savedResolution.resolution_type
      )} بنجاح.`
    )
  }

  const handleTransferEditSubmit = async (event) => {
    event.preventDefault()
    setTransferEditSubmitError('')
    setTransferEditSubmitSuccess('')

    if (isOffline) {
      setTransferEditSubmitError('تعديل بيانات الحوالة متاح أثناء الاتصال فقط حاليا.')
      return
    }

    if (!isConfigured || !supabase) {
      setTransferEditSubmitError(configError || 'تعذر الاتصال بقاعدة البيانات حاليا.')
      return
    }

    if (!orgId) {
      setTransferEditSubmitError(MISSING_CURRENT_ORG_MESSAGE)
      return
    }

    if (!transferId || !transfer) {
      setTransferEditSubmitError('تعذر تحديد الحوالة المطلوب تعديلها حاليا.')
      return
    }

    if (transferEditActionDisabledReason) {
      setTransferEditSubmitError(transferEditActionDisabledReason)
      return
    }

    const statusValue = String(transferEditForm.status || '').trim()
    const notesValue = transferEditForm.notes.trim()

    if (!statusValue) {
      setTransferEditSubmitError('اختر حالة واضحة للحوالة قبل حفظ التعديلات.')
      return
    }

    let payload = {
      notes: notesValue || null,
      status: statusValue,
    }

    if (canUseBroaderTransferEdit) {
      const amountValue = parseOptionalNumber(transferEditForm.amount)
      const marketRateValue = parseOptionalNumber(transferEditForm.global_rate)
      const percentageInputValue = parseOptionalNumber(transferEditForm.percentage)
      const percentageValue = percentageInputValue ?? 0

      if (!transferEditForm.customer_id) {
        setTransferEditSubmitError('اختر العميل قبل حفظ الحوالة المعدلة.')
        return
      }

      if (amountValue === null || amountValue <= 0) {
        setTransferEditSubmitError('أدخل كمية USDT أكبر من صفر.')
        return
      }

      if (marketRateValue === null || marketRateValue <= 0) {
        setTransferEditSubmitError('أدخل سعرا عاما أكبر من صفر.')
        return
      }

      if (transferEditForm.percentage !== '' && percentageInputValue === null) {
        setTransferEditSubmitError('أدخل نسبة صحيحة.')
        return
      }

      if (percentageValue < 0) {
        setTransferEditSubmitError('النسبة لا يمكن أن تكون سالبة.')
        return
      }

      if (
        transferEditValueBeforePercentage === null ||
        transferEditValueAfterPercentage === null ||
        transferEditClientRate === null ||
        transferEditCommissionRub === null
      ) {
        setTransferEditSubmitError('أكمل حقول التسعير المطلوبة قبل حفظ التعديلات.')
        return
      }

      payload = {
        ...payload,
        client_rate: transferEditClientRate,
        commission_pct: percentageValue,
        commission_rub: transferEditCommissionRub,
        customer_id: transferEditForm.customer_id,
        gross_rub: transferEditValueBeforePercentage,
        market_rate: roundRate(marketRateValue),
        payable_rub: transferEditValueAfterPercentage,
        pricing_mode: 'hybrid',
        usdt_amount: amountValue,
      }
    }

    setTransferEditSubmitting(true)

    try {
      const { data, error } = await supabase
        .schema('public')
        .from('transfers')
        .update(withStampedOrg(payload, orgId))
        .eq('id', transferId)
        .eq('org_id', orgId)
        .select(
          'id, reference_number, customer_id, usdt_amount, market_rate, client_rate, pricing_mode, commission_pct, commission_rub, gross_rub, payable_rub, status, notes, created_at'
        )
        .maybeSingle()

      if (error) {
        throw error
      }

      if (!data) {
        throw new Error('تعذر حفظ تعديلات الحوالة في الوقت الحالي.')
      }

      const nextCustomerName =
        selectedTransferEditCustomerOption?.full_name ||
        (data.customer_id === transfer.customer_id ? customerName : '') ||
        customerName

      setTransfer(data)
      setCustomerName(nextCustomerName)
      setTransferEditForm(createTransferEditForm(data))
      setIsEditingTransfer(false)
      setTransferEditSubmitSuccess(
        canUseBroaderTransferEdit
          ? 'تم تحديث بيانات الحوالة والتسعير بنجاح.'
          : 'تم تحديث حالة الحوالة وملاحظاتها بنجاح.'
      )
    } catch (error) {
      const isPaymentLockError = String(error?.message || '').includes(
        'Core transfer fields are locked after payments exist'
      )

      if (isPaymentLockError) {
        handlePaymentsRefresh()
        setIsEditingTransfer(false)
        setTransferEditSubmitError(
          'أصبحت الحقول المالية مقفلة لأن الحوالة تحتوي الآن على دفعات مؤكدة. تم الاحتفاظ بالتاريخ المالي كما هو، ويمكن تعديل الحالة والملاحظات فقط بعد تحديث سجل الدفعات.'
        )
      } else {
        setTransferEditSubmitError(
          error?.message || 'تعذر حفظ تعديلات الحوالة في الوقت الحالي.'
        )
      }
    } finally {
      setTransferEditSubmitting(false)
    }
  }

  const handlePaymentSubmit = async (event) => {
    event.preventDefault()
    setPaymentSubmitError('')
    setPaymentSubmitSuccess('')

    if (!isConfigured || !supabase) {
      setPaymentSubmitError(configError)
      return
    }

    if (!orgId) {
      setPaymentSubmitError(MISSING_CURRENT_ORG_MESSAGE)
      return
    }

    if (!transferId) {
      setPaymentSubmitError('معرّف الحوالة غير موجود في المسار الحالي.')
      return
    }

    const amountRub = Number(paymentForm.amount_rub)
    const paymentMethod = paymentForm.payment_method.trim()

    if (!Number.isFinite(amountRub) || amountRub <= 0) {
      setPaymentSubmitError('يجب أن يكون مبلغ الدفعة أكبر من صفر.')
      return
    }

    if (!paymentMethod) {
      setPaymentSubmitError('يرجى اختيار وسيلة الدفع أو البنك المستلم.')
      return
    }

    const noteValue = paymentForm.note.trim()
    const payload = {
      transfer_id: transferId,
      amount_rub: roundCurrency(amountRub),
      payment_method: paymentMethod,
      note: noteValue || null,
    }
    const queuedPayload = {
      ...payload,
      paid_at: new Date().toISOString(),
    }

    setPaymentSubmitting(true)

    if (isOffline) {
      const queuedPayment = await queueOfflinePayment({
        localMeta: {
          customerName,
          referenceNumber: transfer?.reference_number || '',
        },
        payload: withStampedOrg(queuedPayload, orgId),
        transferId,
      })

      if (!queuedPayment) {
        setPaymentSubmitError('تعذر حفظ الدفعة محليا داخل هذا المتصفح. أعد المحاولة بعد التأكد من دعم التخزين المحلي.')
        setPaymentSubmitting(false)
        return
      }

      setPaymentForm(emptyPaymentForm)
      setPaymentSubmitting(false)
      setPaymentSubmitSuccess(
        transfer?.reference_number
          ? `تم حفظ الدفعة محليا للحوالة ${transfer.reference_number} بانتظار المزامنة. لن تدخل في الإجماليات المؤكدة قبل إرسالها إلى الخادم.`
          : 'تم حفظ الدفعة محليا بانتظار المزامنة. لن تدخل في الإجماليات المؤكدة قبل إرسالها إلى الخادم.'
      )
      refreshPendingPayments()
      return
    }

    const { error: insertError } = await supabase
      .schema('public')
      .from('transfer_payments')
      .insert([withStampedOrg(payload, orgId)])

    if (insertError) {
      setPaymentSubmitError(insertError.message)
      setPaymentSubmitting(false)
      return
    }

    setPaymentForm(emptyPaymentForm)
    setPaymentSubmitting(false)
    setPaymentSubmitSuccess(
      transfer?.reference_number
        ? `تم تسجيل الدفعة بنجاح للحوالة ${transfer.reference_number}.`
        : 'تم تسجيل الدفعة بنجاح.'
    )
    handleTransferRefresh()
    handlePaymentsRefresh()
  }

  const handleSyncPendingPayments = async () => {
    setPaymentSubmitError('')
    setPaymentSubmitSuccess('')

    if (isOffline) {
      setPaymentSubmitError('أعد الاتصال أولا قبل محاولة إرسال الدفعات المحلية إلى الخادم.')
      return
    }

    const result = await replayPaymentsNow()
    await refreshPendingPayments()

    if (!result?.started) {
      if (localPaymentCount > 0) {
        setPaymentSubmitError('تعذر بدء المزامنة الآن. أعد المحاولة بعد التأكد من الاتصال وصلاحية الجلسة.')
      }

      return
    }

    if (result.failedCount > 0) {
      setPaymentSubmitError(`تعذر إرسال ${result.failedCount} دفعة محلية. راجع العناصر المعلّقة ثم أعد المحاولة.`)
      return
    }

    if (result.blockedCount > 0) {
      setPaymentSubmitSuccess(
        `بقيت ${result.blockedCount} دفعة محلية بانتظار اعتماد حوالة مرتبطة قبل إرسالها. ستظل ظاهرة محليا حتى تصبح جاهزة للمزامنة.`
      )
    }

    if (result.replayedCount > 0 || result.dedupedCount > 0) {
      const syncedCount = result.replayedCount + result.dedupedCount
      setPaymentSubmitSuccess(
        result.blockedCount > 0
          ? `تمت مزامنة ${syncedCount} دفعة محلية بنجاح، بينما بقيت ${result.blockedCount} دفعة بانتظار اعتماد مرتبط.`
          : `تمت مزامنة ${syncedCount} دفعة محلية بنجاح مع الخادم.`
      )
      handleTransferRefresh()
      handlePaymentsRefresh()
    }
  }

  const referenceNumber = transfer?.reference_number || 'قيد التخصيص'
  const displayTransferId = transfer?.id || '--'
  const displayCustomerName = customerName || 'عميل غير معروف'
  const transferCreatedAtLabel = formatDate(transfer?.created_at)
  const statusLabel = getTransferStatusMeta(transfer?.status).label
  const latestPayment = hasResolvedPayments ? latestActivePayment || null : null
  const latestPaymentLabel = latestPayment ? formatDate(latestPayment.paid_at || latestPayment.created_at) : ''
  const latestPaymentMethod = latestPayment ? extractPaymentMethod(latestPayment) : ''
  const latestPaymentAmountValue = latestPayment
    ? `${formatNumber(latestPayment.amount_rub, 2)} RUB`
    : 'لا توجد حركة مالية مسجلة'
  const paymentCountLabel = hasResolvedPayments ? `${activePayments.length} دفعة مسجلة` : 'سجل الدفعات غير مكتمل'
  const hasLocalPendingPayments = localPaymentCount > 0
  const hasUnconfirmedLocalPayments =
    localPaymentCount > 0 || blockedLocalPaymentCount > 0 || failedLocalPaymentCount > 0
  const hasConfirmedServerPayments = !paymentsLoading && !paymentsError && payments.length > 0
  const transferEditScopeKnown = !paymentsLoading && !paymentsError
  const supportsBroaderTransferEdit =
    !transfer?.pricing_mode || String(transfer.pricing_mode).trim().toLowerCase() === 'hybrid'
  const broaderTransferEditBlockedByLocalPayments =
    transferEditScopeKnown && !hasConfirmedServerPayments && hasUnconfirmedLocalPayments
  const canUseBroaderTransferEdit =
    transferEditScopeKnown &&
    !hasConfirmedServerPayments &&
    supportsBroaderTransferEdit &&
    !broaderTransferEditBlockedByLocalPayments
  const isRestrictedTransferEdit = transferEditScopeKnown && hasConfirmedServerPayments
  const selectedTransferEditCustomerOption =
    transferCustomerOptions.find((customer) => customer.id === transferEditForm.customer_id) || null
  const transferStatusEditOptions = buildTransferStatusEditOptions(
    transferEditForm.status || transfer?.status || 'open'
  )
  const transferEditParsedAmount = parseOptionalNumber(transferEditForm.amount)
  const transferEditParsedMarketRate = parseOptionalNumber(transferEditForm.global_rate)
  const transferEditParsedPercentageInput = parseOptionalNumber(transferEditForm.percentage)
  const transferEditParsedPercentage = transferEditParsedPercentageInput ?? 0
  const transferEditValueBeforePercentage =
    transferEditParsedAmount !== null && transferEditParsedMarketRate !== null
      ? roundCurrency(transferEditParsedAmount * transferEditParsedMarketRate)
      : null
  const transferEditValueAfterPercentage =
    transferEditValueBeforePercentage !== null
      ? roundCurrency(transferEditValueBeforePercentage * (1 + transferEditParsedPercentage / 100))
      : null
  const transferEditClientRate =
    transferEditParsedMarketRate !== null
      ? roundRate(transferEditParsedMarketRate * (1 + transferEditParsedPercentage / 100))
      : null
  const transferEditCommissionRub =
    transferEditValueBeforePercentage !== null && transferEditValueAfterPercentage !== null
      ? roundCurrency(transferEditValueAfterPercentage - transferEditValueBeforePercentage)
      : null
  const transferEditActionDisabledReason = isOffline
    ? 'تعديل بيانات الحوالة متاح أثناء الاتصال فقط حاليا.'
    : transferLoading
      ? 'جار تحميل بيانات الحوالة قبل إتاحة التعديل.'
      : transferError
        ? 'لا يمكن فتح تعديل الحوالة لأن بياناتها الأساسية غير مكتملة حاليا.'
        : paymentsLoading
          ? 'جار التحقق من سجل الدفعات المؤكدة قبل تحديد نطاق التعديل المتاح.'
          : paymentsError
            ? 'لا يمكن اعتماد تعديل الحوالة لأن سجل الدفعات المؤكدة غير مكتمل حاليا.'
            : !hasConfirmedServerPayments && !supportsBroaderTransferEdit
              ? 'هذه الحوالة لا تستخدم وضع التسعير المدعوم في واجهة الإنشاء الحالية، لذلك لا يتاح تعديلها المباشر من هذه الشاشة.'
              : broaderTransferEditBlockedByLocalPayments
                ? failedLocalPaymentCount > 0
                  ? `توجد ${failedLocalPaymentCount} دفعة محلية فشلت مزامنتها. راجعها أولا قبل تعديل بيانات الحوالة.`
                  : blockedLocalPaymentCount > 0
                    ? `توجد ${blockedLocalPaymentCount} دفعة محلية ما زالت بانتظار اعتماد حوالة مرتبطة. لا تعدل بيانات الحوالة قبل حسمها.`
                    : `توجد ${localPaymentCount} دفعة محلية بانتظار الإرسال. لا تعدل بيانات الحوالة قبل مزامنتها.`
                : ''
  const paymentVoidActionDisabledReason = isOffline
    ? 'إلغاء الدفعة المؤكدة متاح أثناء الاتصال فقط.'
    : paymentsLoading
      ? 'جار التحقق من سجل الدفعات المؤكدة قبل إتاحة الإلغاء.'
      : paymentsError
        ? 'لا يمكن اعتماد إلغاء دفعة لأن سجل الدفعات المؤكدة غير مكتمل حاليا.'
        : hasUnconfirmedLocalPayments
          ? failedLocalPaymentCount > 0
            ? `توجد ${failedLocalPaymentCount} دفعة محلية فشلت مزامنتها. راجعها أولا قبل إلغاء دفعة مؤكدة.`
            : blockedLocalPaymentCount > 0
              ? `توجد ${blockedLocalPaymentCount} دفعة محلية ما زالت بانتظار اعتماد حوالة مرتبطة. لا تعتمد إلغاء دفعة مؤكدة قبل حسمها.`
              : `توجد ${localPaymentCount} دفعة محلية بانتظار الإرسال. لا تعتمد إلغاء دفعة مؤكدة قبل مزامنتها.`
          : ''
  const replacementPaymentActionDisabledReason = isOffline
    ? 'تسجيل الدفعة البديلة المصححة متاح أثناء الاتصال فقط.'
    : paymentsLoading
      ? 'جار التحقق من سجل الدفعات المؤكدة قبل إتاحة تسجيل الدفعة البديلة.'
      : paymentsError
        ? 'لا يمكن اعتماد دفعة بديلة لأن سجل الدفعات المؤكدة غير مكتمل حاليا.'
        : hasUnconfirmedLocalPayments
          ? failedLocalPaymentCount > 0
            ? `توجد ${failedLocalPaymentCount} دفعة محلية فشلت مزامنتها. راجعها أولا قبل تسجيل دفعة بديلة.`
            : blockedLocalPaymentCount > 0
              ? `توجد ${blockedLocalPaymentCount} دفعة محلية ما زالت بانتظار اعتماد حوالة مرتبطة. لا تسجل دفعة بديلة قبل حسمها.`
              : `توجد ${localPaymentCount} دفعة محلية بانتظار الإرسال. لا تسجل دفعة بديلة قبل مزامنتها.`
          : ''
  const hasEligibleConfirmedPaymentForVoid = payments.some(
    (payment) => payment?.id && !latestPaymentVoidByPaymentId[payment.id]
  )
  const hasEligibleVoidedPaymentForReplacement = payments.some(
    (payment) => payment?.id && latestPaymentVoidByPaymentId[payment.id]
  )
  const localPendingAmountLabel =
    localPendingAmountRub > 0 ? `${formatNumber(localPendingAmountRub, 2)} RUB محلي` : ''
  const latestLocalPayment = pendingPayments[0] || null
  const hasPartialTransferOnlyOfflineState =
    Boolean(transfer) && !paymentsLoading && Boolean(paymentsError)
  const overpaymentResolutionStateKnown =
    overpaymentResolutionLoaded && !overpaymentResolutionLoading && !overpaymentResolutionError
  const hasResolvedCurrentOverpayment =
    isOverpaid && overpaymentResolutionStateKnown && isResolvedOverpaid
  const hasUnresolvedCurrentOverpayment =
    isOverpaid && overpaymentResolutionStateKnown && isUnresolvedOverpaid
  const hasUnknownOverpaymentResolutionState = isOverpaid && !overpaymentResolutionStateKnown
  const latestOverpaymentResolutionTypeLabel = latestOverpaymentResolution
    ? getOverpaymentResolutionTypeLabel(latestOverpaymentResolution.resolution_type)
    : '--'
  const latestOverpaymentResolutionCreatedAtLabel = latestOverpaymentResolution
    ? formatDate(latestOverpaymentResolution.created_at)
    : '--'
  const latestOverpaymentResolutionNote =
    latestOverpaymentResolution?.note || 'لا توجد ملاحظة مسجلة على هذه المعالجة.'
  const overpaymentResolutionRecordedAmountLabel = latestOverpaymentResolution
    ? `${formatNumber(latestOverpaymentResolution.resolved_overpaid_amount_rub, 2)} RUB`
    : '--'
  const overpaymentResolutionActionDisabledReason = !isOverpaid
    ? ''
    : isOffline
      ? 'تسجيل معالجة زيادة الدفع متاح أثناء الاتصال فقط.'
      : paymentsLoading
        ? 'جار التحقق من سجل الدفعات المؤكد قبل إتاحة المعالجة.'
        : paymentsError
          ? 'لا يمكن اعتماد معالجة جديدة لأن سجل الدفعات المؤكد غير مكتمل حاليا.'
          : hasUnconfirmedLocalPayments
            ? failedLocalPaymentCount > 0
              ? `توجد ${failedLocalPaymentCount} دفعة محلية فشلت مزامنتها. راجعها أولا قبل اعتماد معالجة الزيادة الحالية.`
              : blockedLocalPaymentCount > 0
                ? `توجد ${blockedLocalPaymentCount} دفعة محلية ما زالت بانتظار اعتماد حوالة مرتبطة. لا تعتمد معالجة الزيادة قبل حسمها.`
                : `توجد ${localPaymentCount} دفعة محلية بانتظار الإرسال. لا تعتمد معالجة الزيادة قبل مزامنتها.`
            : overpaymentResolutionLoading
              ? 'جار التحقق من آخر معالجة مسجلة لهذه الزيادة.'
              : overpaymentResolutionError
                ? `${overpaymentResolutionError} لا يمكن اعتماد معالجة جديدة قبل التحقق من آخر سجل.`
                : ''

  useEffect(() => {
    if (!isEditingTransfer || !canUseBroaderTransferEdit) {
      return undefined
    }

    if (!isConfigured || !supabase || !transfer) {
      return undefined
    }

    let isMounted = true

    const loadTransferCustomerOptions = async () => {
      setTransferCustomerOptionsLoading(true)
      setTransferCustomerOptionsError('')

      try {
        const { data, error } = await withLiveReadTimeout(
          withOrgScope(
            supabase
              .schema('public')
              .from('customers')
              .select('id, full_name, is_archived')
              .order('full_name', { ascending: true }),
            orgId
          ),
          {
            timeoutMessage: 'تعذر إكمال تحميل قائمة العملاء لتعديل الحوالة في الوقت المتوقع.',
          }
        )

        if (!isMounted) {
          return
        }

        if (error) {
          throw error
        }

        setTransferCustomerOptions(
          normalizeTransferCustomerOptions(data ?? [], transfer, customerName)
        )
        setTransferCustomerOptionsLoading(false)
      } catch (error) {
        if (!isMounted) {
          return
        }

        setTransferCustomerOptions(
          normalizeTransferCustomerOptions([], transfer, customerName)
        )
        setTransferCustomerOptionsLoading(false)
        setTransferCustomerOptionsError(
          error?.message || 'تعذر تحميل قائمة العملاء لتعديل الحوالة حاليا.'
        )
      }
    }

    loadTransferCustomerOptions()

    return () => {
      isMounted = false
    }
  }, [
    canUseBroaderTransferEdit,
    customerName,
    isConfigured,
    isEditingTransfer,
    orgId,
    transfer,
  ])

  const showOverpaymentResolutionForm =
    overpaymentResolutionFormOpen && hasUnresolvedCurrentOverpayment

  const followUpState = isOverpaid
    ? hasResolvedCurrentOverpayment
      ? 'success'
      : hasUnknownOverpaymentResolutionState
        ? 'warning'
        : 'danger'
    : isCancelled
      ? 'neutral'
      : hasPartialTransferOnlyOfflineState
        ? 'warning'
      : isSettled
        ? 'success'
        : hasPayments
          ? 'warning'
          : 'accent'

  const pageDescription = !transfer
    ? 'راجع بيانات الحوالة والمدفوعات والرصيد الحالي من شاشة تشغيل واحدة واضحة.'
    : hasPartialTransferOnlyOfflineState
      ? 'تفاصيل الحوالة الأساسية متاحة محليا، لكن سجل المدفوعات المؤكد غير متوفر حاليا. قد تكون الأرصدة والإجماليات غير مكتملة إلى أن يعود الاتصال أو يتوفر سجل محفوظ محليا.'
    : hasResolvedCurrentOverpayment
      ? `يوجد رصيد سالب تاريخي بمقدار ${formatNumber(overpaidAmountRub, 2)} RUB، لكن تم تسجيل معالجة هذه الزيادة كـ ${latestOverpaymentResolutionTypeLabel} بتاريخ ${latestOverpaymentResolutionCreatedAtLabel}.`
    : hasUnknownOverpaymentResolutionState
      ? `يوجد رصيد سالب بمقدار ${formatNumber(overpaidAmountRub, 2)} RUB، لكن تعذر التحقق من آخر معالجة مسجلة لهذه الزيادة حاليا.`
    : hasLocalPendingPayments && !hasPayments
      ? `توجد ${localPaymentCount} دفعة محفوظة محليا بانتظار الإرسال إلى الخادم. ستبقى منفصلة عن الإجماليات المؤكدة الحالية حتى تنجح المزامنة.`
    : hasUnresolvedCurrentOverpayment
      ? `يوجد دفع زائد بمقدار ${formatNumber(overpaidAmountRub, 2)} RUB ويتطلب مراجعة فورية قبل أي إجراء إضافي.`
      : isCancelled
        ? 'الحوالة ملغاة. راجع سجل الدفعات وحالة الملف قبل أي إجراء جديد.'
        : isSettled
          ? 'الحوالة مسددة حاليا. يمكنك الرجوع إلى سجل الدفعات أو طباعة الكشف عند الحاجة.'
          : hasPayments
            ? `تم تسجيل دفعات جزئية وما زال المتبقي ${formatNumber(remainingRub, 2)} RUB. تتطلب الحوالة متابعة واستكمال تحصيل.${hasLocalPendingPayments ? ` يوجد أيضا ${localPaymentCount} دفعة محلية بانتظار الإرسال.` : ''}`
            : 'لم تُسجل أي دفعة بعد. هذه الحوالة تنتظر أول حركة تحصيل.'

  const resolvedPageDescription = isCompactMobileLayout
    ? !transfer
      ? 'راجع الحوالة ورصيدها الحالي بسرعة.'
      : hasPartialTransferOnlyOfflineState
        ? 'تفاصيل الحوالة متاحة، لكن سجل الدفعات المؤكد غير مكتمل حاليا.'
        : hasResolvedCurrentOverpayment
          ? 'الزيادة الحالية عليها معالجة مسجلة.'
          : hasUnknownOverpaymentResolutionState
            ? 'الرصيد السالب يحتاج تحققًا من آخر معالجة.'
            : hasLocalPendingPayments && !hasPayments
              ? `توجد ${localPaymentCount} دفعة محلية بانتظار الإرسال.`
              : hasUnresolvedCurrentOverpayment
                ? `يوجد دفع زائد بمقدار ${formatNumber(overpaidAmountRub, 2)} RUB.`
                : isCancelled
                  ? 'الحوالة ملغاة حاليا.'
                  : isSettled
                    ? 'الحوالة مسددة حاليا.'
                    : hasPayments
                      ? `المتبقي الحالي ${formatNumber(remainingRub, 2)} RUB.`
                      : 'بانتظار أول دفعة.'
    : pageDescription
  const followUpDisplayTone = followUpState === 'neutral' ? 'muted' : followUpState

  const highlightItems = transfer
    ? [
        {
          title: 'مبلغ التسوية',
          value: `${formatNumber(valueAfterPercentage, 2)} RUB`,
          className: 'info-card--accent',
          valueClassName: 'info-card-value--metric',
        },
        {
          title: 'إجمالي المدفوع',
          value:
            paymentsLoading && payments.length === 0
              ? 'جار تحميل المدفوعات...'
              : `${formatNumber(totalPaidRub, 2)} RUB`,
          valueClassName: 'info-card-value--metric',
        },
        {
          title: isOverpaid ? 'الرصيد الحالي' : isSettled ? 'حالة التسوية' : 'المتبقي للتحصيل',
          value: remainingMessage,
          className: balanceCardClass,
          valueClassName: ['info-card-value--metric', balanceValueClass].filter(Boolean).join(' '),
        },
        isOverpaid
          ? {
              title: 'زيادة الدفع',
              value: `${formatNumber(overpaidAmountRub, 2)} RUB`,
              className: 'info-card--danger',
              valueClassName: 'info-card-value--metric info-card-value--danger',
            }
          : {
              title: 'عدد الدفعات',
              value: paymentCountLabel,
              className: hasPayments ? '' : 'info-card--accent',
              valueClassName: 'info-card-value--metric',
            },
      ]
    : []

  const overviewHighlightItems = isCompactMobileLayout
    ? highlightItems.slice(0, 3).map((item, index) => {
        if (index !== 2 || !isOverpaid) {
          return item
        }

        return {
          ...item,
          title: 'زيادة الدفع',
          value: `${formatNumber(overpaidAmountRub, 2)} RUB`,
        }
      })
    : highlightItems

  const summaryItems = transfer
    ? [
        { title: 'كمية USDT', value: formatNumber(transfer.usdt_amount, 2) },
        { title: 'السعر العام', value: formatNumber(transfer.market_rate, 4) },
        { title: 'القيمة قبل النسبة', value: formatNumber(valueBeforePercentage, 2) },
        { title: 'النسبة', value: `${formatNumber(percentageValue, 2)}%` },
        { title: 'السعر النهائي للعميل', value: formatNumber(finalClientRate, 6) },
        { title: 'وضع التسعير', value: transfer.pricing_mode || '--' },
        {
          title: 'ملاحظات داخلية',
          value: transfer.notes || 'لا توجد ملاحظات داخلية.',
          className: 'info-card--full',
        },
      ]
    : []

  const followUpTitle = !transfer
    ? 'جاري تجهيز المتابعة'
    : hasPartialTransferOnlyOfflineState
      ? 'تفاصيل الحوالة متاحة لكن سجل الدفعات غير مكتمل'
    : hasResolvedCurrentOverpayment
      ? 'تمت معالجة زيادة الدفع الحالية'
    : hasUnknownOverpaymentResolutionState
      ? 'تعذر التحقق من معالجة الزيادة الحالية'
    : hasUnresolvedCurrentOverpayment
      ? 'مراجعة مالية مطلوبة فورا'
      : isCancelled
        ? 'الملف متوقف حاليا'
        : isSettled
          ? 'الحوالة في وضع مستقر'
          : hasLocalPendingPayments && !hasPayments
            ? 'توجد دفعات محلية بانتظار الإرسال'
          : hasPayments
            ? 'المتابعة مطلوبة لاستكمال التحصيل'
            : 'بانتظار أول دفعة'

  const followUpDescription = !transfer
    ? 'يتم تجهيز حالة المتابعة الحالية للحوالة.'
    : hasPartialTransferOnlyOfflineState
      ? 'تم استرجاع تفاصيل الحوالة، لكن سجل الدفعات المؤكد غير متوفر محليا حاليا. استخدم الشاشة كمرجع للحوالة نفسها، ثم حدّث سجل الدفعات عند عودة الاتصال أو بعد توفر نسخة محلية محفوظة.'
    : hasResolvedCurrentOverpayment
      ? `يبقى الرصيد الحالي سالبا تاريخيا بقيمة ${formatNumber(overpaidAmountRub, 2)} RUB، لكن تمت معالجة هذه الزيادة كـ ${latestOverpaymentResolutionTypeLabel} في ${latestOverpaymentResolutionCreatedAtLabel}. الملاحظة المسجلة: ${latestOverpaymentResolutionNote}`
    : hasUnknownOverpaymentResolutionState
      ? `يوجد رصيد سالب بمقدار ${formatNumber(overpaidAmountRub, 2)} RUB، لكن أحدث سجل معالجة غير متاح حاليا. أعد التحقق بعد عودة الاتصال أو تحديث الصفحة قبل اعتماد الحالة التشغيلية.`
    : hasUnresolvedCurrentOverpayment
      ? `الرصيد الحالي سالب وهناك زيادة دفع بمقدار ${formatNumber(overpaidAmountRub, 2)} RUB. راجع التسويات والدفعات المسجلة قبل إضافة أي حركة جديدة.`
      : isCancelled
        ? 'الحوالة تحمل حالة إلغاء. أي حركة جديدة يجب أن تتم بعد مراجعة الملف وسجل الدفعات.'
      : isSettled
        ? 'تمت تغطية مبلغ التسوية بالكامل. الخطوة التالية غالبا هي تأكيد الإغلاق أو مشاركة الكشف مع العميل.'
        : hasLocalPendingPayments && !hasPayments
          ? `تم حفظ ${localPaymentCount} دفعة محليا داخل هذا المتصفح. راجعها ثم أرسلها إلى الخادم عند توفر الاتصال قبل اعتمادها كدفعات مؤكدة.`
        : hasPayments
            ? `تم تسجيل دفعات جزئية وما زال على الحوالة ${formatNumber(remainingRub, 2)} RUB. الخطوة التالية هي متابعة العميل وتسجيل التحصيل التالي.${hasLocalPendingPayments ? ` توجد أيضا ${localPaymentCount} دفعة محلية بانتظار الإرسال.` : ''}`
            : 'لم تُسجل أي دفعة بعد. الخطوة التالية الطبيعية هي تسجيل أول دفعة أو متابعة العميل لبدء التحصيل.'

  const compactFollowUpDescription = !transfer
    ? 'يتم تجهيز حالة الحوالة.'
    : hasPartialTransferOnlyOfflineState
      ? 'سجل الدفعات غير مكتمل حاليا.'
      : hasResolvedCurrentOverpayment
        ? 'المعالجة التشغيلية مسجلة لهذه الزيادة.'
        : hasUnknownOverpaymentResolutionState
          ? 'تحقق من آخر معالجة قبل اعتماد الحالة.'
          : hasUnresolvedCurrentOverpayment
            ? `زيادة دفع حالية: ${formatNumber(overpaidAmountRub, 2)} RUB.`
            : isCancelled
              ? 'راجع الإلغاء قبل أي حركة جديدة.'
              : isSettled
                ? 'لا توجد متابعة مالية عاجلة حاليا.'
                : hasLocalPendingPayments && !hasPayments
                  ? `توجد ${localPaymentCount} دفعة محلية بانتظار الإرسال.`
                  : hasPayments
                    ? `المتبقي ${formatNumber(remainingRub, 2)} RUB.`
                    : 'الخطوة التالية هي تسجيل أول دفعة.'

  const followUpChips = [
    {
      label: 'حالة المتابعة',
      value: hasResolvedCurrentOverpayment
        ? 'معالجة مسجلة'
        : hasUnknownOverpaymentResolutionState
          ? 'بحاجة إلى تحقق'
        : hasUnresolvedCurrentOverpayment
        ? 'مراجعة فورية'
        : isCancelled
          ? 'ملف ملغى'
          : hasPartialTransferOnlyOfflineState
            ? 'سجل دفعات غير مكتمل'
          : isSettled
            ? 'تمت التسوية'
            : hasPayments
              ? 'استكمال التحصيل'
              : 'بانتظار أول دفعة',
      className: hasResolvedCurrentOverpayment
        ? 'queue-chip--success'
        : hasUnknownOverpaymentResolutionState
          ? 'queue-chip--warning'
        : hasUnresolvedCurrentOverpayment
          ? 'queue-chip--danger'
        : isSettled
          ? 'queue-chip--success'
          : hasPartialTransferOnlyOfflineState
            ? 'queue-chip--warning'
          : hasPayments
            ? 'queue-chip--warning'
            : 'queue-chip--neutral',
    },
    {
      label: 'الدفعات',
      value: paymentCountLabel,
      className: 'queue-chip--neutral',
    },
    {
      label: 'آخر حركة',
      value: hasPartialTransferOnlyOfflineState
        ? 'غير متاح محليا'
        : latestPayment
          ? latestPaymentLabel
          : 'لا توجد',
      className: latestPayment ? '' : 'queue-chip--neutral',
    },
    ...(hasResolvedCurrentOverpayment
      ? [
          {
            label: 'نوع المعالجة',
            value: latestOverpaymentResolutionTypeLabel,
            className: 'queue-chip--success',
          },
        ]
      : []),
    ...(hasLocalPendingPayments
      ? [
          {
            label: 'محلي',
            value:
              failedLocalPaymentCount > 0
                ? `${failedLocalPaymentCount} بحاجة لإعادة محاولة`
                : `${localPaymentCount} بانتظار الإرسال`,
            className: failedLocalPaymentCount > 0 ? 'queue-chip--danger' : 'queue-chip--warning',
          },
        ]
      : []),
  ]

  const followUpItems = [
    {
      title: 'الإجراء التالي',
      value: hasResolvedCurrentOverpayment
        ? 'راقب فقط إذا تغيّر الرصيد الحالي'
        : hasUnknownOverpaymentResolutionState
          ? 'تحقق من آخر معالجة مسجلة'
        : hasUnresolvedCurrentOverpayment
        ? 'أوقف التحصيل وراجع الملف'
        : isCancelled
          ? 'لا تضف حركة جديدة قبل المراجعة'
          : hasPartialTransferOnlyOfflineState
            ? 'حدّث سجل الدفعات المؤكد قبل الاعتماد على الرصيد'
          : isSettled
            ? 'يمكن طباعة الكشف أو إغلاق المتابعة'
            : hasLocalPendingPayments && !hasPayments
              ? 'أرسل الدفعات المحلية أو راجعها'
            : hasPayments
              ? 'سجّل دفعة متابعة بعد التحقق'
              : 'سجّل أول دفعة على الحوالة',
      className: hasResolvedCurrentOverpayment
        ? 'info-card--success'
        : hasUnknownOverpaymentResolutionState
          ? 'info-card--accent'
          : isOverpaid
            ? 'info-card--danger'
            : isSettled
              ? 'info-card--success'
              : 'info-card--accent',
      children: (
        <p
          className={[
            'support-text',
            hasUnresolvedCurrentOverpayment ? 'text-danger' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {hasResolvedCurrentOverpayment
            ? 'تم تسجيل معالجة تشغيلية منفصلة لهذه الزيادة. سيعود الملف إلى حالة غير محسومة فقط إذا تغيّر مقدار الزيادة الحالية لاحقا.'
            : hasUnknownOverpaymentResolutionState
              ? 'تعذر التحقق من آخر معالجة مسجلة لهذه الزيادة حاليا. حدّث الصفحة أو أعد الاتصال قبل اعتماد الوضع التشغيلي النهائي.'
            : hasUnresolvedCurrentOverpayment
            ? 'يوصى بمراجعة قيمة الحوالة وسجل الدفعات قبل أي إضافة جديدة.'
            : hasPartialTransferOnlyOfflineState
              ? 'تفاصيل الحوالة نفسها محفوظة، لكن سجل الدفعات المؤكد غير متوفر حاليا. لا تعتمد على الرصيد أو حالة القفل حتى يعود سجل الدفعات.'
            : isSettled
              ? 'لا توجد متابعة مالية عاجلة حاليا.'
              : hasLocalPendingPayments && !hasPayments
                ? 'تم حفظ دفعات محلية لكنها لم تعتمد بعد من الخادم. الخطوة التالية هي المزامنة أو إعادة المحاولة قبل اعتبار التحصيل مؤكدا.'
              : hasPayments
                ? 'المتبقي ما زال قائما والحوالة تتطلب متابعة تشغيلية.'
                : 'ابدأ بسجل الدفعة الأولى لتفعيل متابعة التحصيل.'}
        </p>
      ),
    },
    {
      title: 'آخر حركة مالية',
      value: latestPayment
        ? latestPaymentAmountValue
        : hasPartialTransferOnlyOfflineState
          ? 'سجل الدفعات غير متوفر محليا'
        : latestLocalPayment
          ? `${formatNumber(latestLocalPayment.payload.amount_rub, 2)} RUB`
          : latestPaymentAmountValue,
      children: (
        <p className="support-text">
          {latestPayment
            ? `${latestPaymentMethod} • ${latestPaymentLabel}`
            : hasPartialTransferOnlyOfflineState
              ? 'لا توجد نسخة محلية مؤكدة لسجل الدفعات حاليا. قد تظهر فقط الدفعات المحلية المعلقة إن وجدت.'
            : latestLocalPayment
              ? `دفعة محلية ${getPaymentMethodLabel(latestLocalPayment.payload.payment_method)} بانتظار الإرسال منذ ${formatDate(latestLocalPayment.payload.paid_at || latestLocalPayment.createdAt)}.`
              : 'لا توجد دفعات مسجلة على الحوالة حتى الآن.'}
        </p>
      ),
    },
    {
      title: 'الوضع الحالي',
      value: statusLabel,
      children: (
        <p className="support-text">
          {remainingRub === null
            ? 'سيظهر الرصيد بعد تحميل البيانات.'
            : hasResolvedCurrentOverpayment
              ? `يوجد رصيد سالب بقيمة ${formatNumber(overpaidAmountRub, 2)} RUB، لكن توجد معالجة مسجلة لهذه الزيادة.`
              : hasUnknownOverpaymentResolutionState
                ? `يوجد رصيد سالب بقيمة ${formatNumber(overpaidAmountRub, 2)} RUB، ولم يتم التحقق بعد من آخر معالجة مسجلة.`
              : isOverpaid
              ? `يوجد رصيد سالب بقيمة ${formatNumber(overpaidAmountRub, 2)} RUB.`
              : isSettled
                ? 'الرصيد الحالي صفر والحوالة مسددة.'
                : `المتبقي الحالي ${formatNumber(remainingRub, 2)} RUB.`}
        </p>
      ),
    },
  ]

  const overviewFollowUpItems = isCompactMobileLayout ? followUpItems.slice(0, 1) : followUpItems
  const compactOverviewFollowUpChips = [
    followUpChips[0],
    hasLocalPendingPayments ? followUpChips.find((chip) => chip.label === 'محلي') : null,
    hasResolvedCurrentOverpayment
      ? followUpChips.find((chip) => chip.label === 'نوع المعالجة')
      : null,
    followUpChips.find((chip) => chip.label === 'آخر حركة'),
    followUpChips.find((chip) => chip.label === 'الدفعات'),
  ]
    .filter(Boolean)
    .filter(
      (chip, index, chips) => chips.findIndex((candidate) => candidate.label === chip.label) === index
    )
    .slice(0, 2)
  const overviewFollowUpChips = isCompactMobileLayout ? compactOverviewFollowUpChips : followUpChips

  const paymentEntries = payments.map((payment, index) => ({
    id: payment.id ?? `${payment.created_at}-${payment.amount_rub}`,
    amountLabel: `${formatNumber(payment.amount_rub, 2)} RUB`,
    methodLabel: extractPaymentMethod(payment),
    paidAtLabel: isCompactMobileLayout ? formatAgeLabel(payment.paid_at) : formatDate(payment.paid_at),
    createdAtLabel: isCompactMobileLayout
      ? formatAgeLabel(payment.created_at)
      : formatDate(payment.created_at),
    noteText: isCompactMobileLayout ? '' : extractPaymentNote(payment),
    activityLabel: isCompactMobileLayout
      ? index === 0
        ? 'أحدث دفعة'
        : 'دفعة'
      : index === 0
        ? 'آخر تحصيل مسجل'
        : 'دفعة متابعة',
    isLatest: index === 0,
    badgeClassName: isOverpaid
      ? 'activity-chip--danger'
      : isSettled
        ? 'activity-chip--success'
        : 'activity-chip--warning',
    className:
      index === 0
        ? isOverpaid
          ? 'payment-entry--danger'
          : isSettled
            ? 'payment-entry--success'
            : 'payment-entry--warning'
        : '',
  }))
  const latestActivePaymentId = latestActivePayment?.id || ''
  const paymentEntriesWithVoidState = paymentEntries.map((entry, index) => {
    const payment = payments[index]
    const paymentId = payment?.id || ''
    const latestPaymentVoid = paymentId ? latestPaymentVoidByPaymentId[paymentId] || null : null
    const replacementPaymentId = paymentId ? replacementPaymentLinks[paymentId] || '' : ''
    const replacementPayment = replacementPaymentId
      ? payments.find((candidatePayment) => candidatePayment?.id === replacementPaymentId) || null
      : null
    const isVoidedPayment = Boolean(latestPaymentVoid)
    const isLatestActivePayment = Boolean(paymentId) && paymentId === latestActivePaymentId
    const isVoidFormOpen = Boolean(paymentId) && paymentId === paymentVoidFormPaymentId && !isVoidedPayment
    const isReplacementFormOpen =
      Boolean(paymentId) && paymentId === replacementPaymentFormPaymentId && isVoidedPayment

    return {
      ...entry,
      activityLabel: isVoidedPayment
        ? isCompactMobileLayout
          ? 'ملغاة'
          : 'دفعة مؤكدة ملغاة'
        : isLatestActivePayment
          ? isCompactMobileLayout
            ? 'نشطة'
            : 'آخر دفعة مؤكدة فعالة'
          : isCompactMobileLayout
            ? 'دفعة'
            : 'دفعة متابعة',
      isLatest: isLatestActivePayment,
      badgeLabel: isVoidedPayment ? 'دفعة ملغاة' : '',
      badgeClassName: isVoidedPayment ? 'activity-chip--warning' : '',
      className: isVoidedPayment
        ? 'payment-entry--warning'
        : isLatestActivePayment
          ? isOverpaid
            ? 'payment-entry--danger'
            : isSettled
              ? 'payment-entry--success'
              : 'payment-entry--warning'
          : '',
      extraContent: isVoidedPayment ? (
        <>
          <InlineMessage kind="warning">
            {isCompactMobileLayout
              ? 'هذه الدفعة ملغاة ولا تدخل في الإجمالي الحالي.'
              : 'تم إلغاء اعتماد هذه الدفعة المؤكدة. لم تعد تدخل في إجمالي التحصيل الحالي.'}
          </InlineMessage>
          {!isCompactMobileLayout ? (
            <>
              <div className="payment-entry-grid detail-mobile-secondary">
                <RecordMeta
                  label="سبب الإلغاء"
                  value={getPaymentVoidReasonTypeLabel(latestPaymentVoid?.void_reason_type)}
                />
                <RecordMeta label="وقت الإلغاء" value={formatDate(latestPaymentVoid?.created_at)} />
              </div>
              <p className="support-text">
                ملاحظة الإلغاء: {latestPaymentVoid?.note || 'لا توجد ملاحظة إلغاء إضافية.'}
              </p>
            </>
          ) : null}
          {replacementPayment ? (
            <>
              <InlineMessage kind="success">
                {isCompactMobileLayout
                  ? 'تم تسجيل دفعة بديلة مصححة لهذه البطاقة.'
                  : 'تم تسجيل دفعة بديلة مصححة من هذه البطاقة في هذه الجلسة، مع بقاء الدفعة الأصلية ملغاة.'}
              </InlineMessage>
              {!isCompactMobileLayout ? (
                <div className="payment-entry-grid detail-mobile-secondary">
                  <RecordMeta
                    label="الدفعة البديلة"
                    value={`${formatNumber(replacementPayment.amount_rub, 2)} RUB`}
                  />
                  <RecordMeta
                    label="وقت الدفعة البديلة"
                    value={formatDate(replacementPayment.paid_at || replacementPayment.created_at)}
                  />
                </div>
              ) : null}
            </>
          ) : isReplacementFormOpen ? (
            <form className="form-grid" onSubmit={handleReplacementPaymentSubmit}>
              <InlineMessage kind="info">
                {isCompactMobileLayout
                  ? 'ستُسجل هذه الدفعة كسطر جديد مستقل.'
                  : 'ستُسجل هذه الدفعة كسطر جديد مستقل، ولن يجري تعديل الدفعة الملغاة أو حذفها.'}
              </InlineMessage>
              {replacementPaymentActionDisabledReason ? (
                <InlineMessage kind="warning">{replacementPaymentActionDisabledReason}</InlineMessage>
              ) : null}
              {replacementPaymentSubmitError ? (
                <InlineMessage kind="error">{replacementPaymentSubmitError}</InlineMessage>
              ) : null}
              {!isCompactMobileLayout ? (
                <div className="payment-entry-grid detail-mobile-secondary">
                  <RecordMeta label="مرجع التصحيح" value={`${formatNumber(payment.amount_rub, 2)} RUB`} />
                  <RecordMeta label="الوقت الاقتصادي الأصلي" value={formatDate(payment.paid_at)} />
                </div>
              ) : null}
              <div className="field">
                <label htmlFor={`replacement-payment-amount-${entry.id}`}>المبلغ البديل بالروبل</label>
                <input
                  id={`replacement-payment-amount-${entry.id}`}
                  name="amount_rub"
                  type="number"
                  step="any"
                  min="0.01"
                  value={replacementPaymentForm.amount_rub}
                  onChange={handleReplacementPaymentFormChange}
                  disabled={replacementPaymentSubmitting || paymentVoidSubmitting}
                  required
                />
              </div>
              <div className="field">
                <label htmlFor={`replacement-payment-method-${entry.id}`}>وسيلة التحصيل</label>
                <select
                  id={`replacement-payment-method-${entry.id}`}
                  name="payment_method"
                  value={replacementPaymentForm.payment_method}
                  onChange={handleReplacementPaymentFormChange}
                  disabled={replacementPaymentSubmitting || paymentVoidSubmitting}
                  required
                >
                  <option value="">اختر وسيلة التحصيل</option>
                  {PAYMENT_METHOD_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor={`replacement-payment-paid-at-${entry.id}`}>وقت الدفع الاقتصادي</label>
                <input
                  id={`replacement-payment-paid-at-${entry.id}`}
                  name="paid_at"
                  type="datetime-local"
                  value={replacementPaymentForm.paid_at}
                  onChange={handleReplacementPaymentFormChange}
                  disabled={replacementPaymentSubmitting || paymentVoidSubmitting}
                  required
                />
                <p className="support-text">
                  {isCompactMobileLayout
                    ? 'يمكن تعديل هذا الوقت عند الحاجة.'
                    : 'هذا الحقل مملوء افتراضيا من وقت الدفعة الأصلية الملغاة، ويمكن تعديله عند الحاجة.'}
                </p>
              </div>
              <div className="field">
                <label htmlFor={`replacement-payment-note-${entry.id}`}>ملاحظة الدفعة البديلة</label>
                <textarea
                  id={`replacement-payment-note-${entry.id}`}
                  name="note"
                  value={replacementPaymentForm.note}
                  onChange={handleReplacementPaymentFormChange}
                  placeholder="يمكنك تعديل ملاحظة الدفعة البديلة بما يشرح التصحيح الحالي."
                  disabled={replacementPaymentSubmitting || paymentVoidSubmitting}
                />
              </div>
              <div className="inline-actions">
                <button
                  type="submit"
                  className="button primary"
                  disabled={
                    replacementPaymentSubmitting ||
                    paymentVoidSubmitting ||
                    Boolean(replacementPaymentActionDisabledReason)
                  }
                >
                  {replacementPaymentSubmitting
                    ? 'جار حفظ الدفعة البديلة...'
                    : isCompactMobileLayout
                      ? 'حفظ البديلة'
                      : 'حفظ الدفعة البديلة المصححة'}
                </button>
                <button
                  type="button"
                  className="button secondary"
                  onClick={handleCancelReplacementPaymentForm}
                  disabled={replacementPaymentSubmitting}
                >
                  إلغاء
                </button>
              </div>
            </form>
          ) : (
            <div className="inline-actions">
              <button
                type="button"
                className="button secondary"
                onClick={() => handleOpenReplacementPaymentForm(payment)}
                disabled={
                  replacementPaymentSubmitting ||
                  paymentVoidSubmitting ||
                  !paymentId ||
                  Boolean(replacementPaymentActionDisabledReason)
                }
                title={replacementPaymentActionDisabledReason || ''}
              >
                {isCompactMobileLayout ? 'دفعة بديلة' : 'تسجيل دفعة بديلة مصححة'}
              </button>
            </div>
          )}
        </>
      ) : isVoidFormOpen ? (
        <form className="form-grid" onSubmit={handlePaymentVoidSubmit}>
          {paymentVoidActionDisabledReason ? (
            <InlineMessage kind="warning">{paymentVoidActionDisabledReason}</InlineMessage>
          ) : null}
          {paymentVoidSubmitError ? (
            <InlineMessage kind="error">{paymentVoidSubmitError}</InlineMessage>
          ) : null}
          {!isCompactMobileLayout ? (
            <>
              <div className="payment-entry-grid detail-mobile-secondary">
                <RecordMeta label="المبلغ الأصلي" value={`${formatNumber(payment.amount_rub, 2)} RUB`} />
                <RecordMeta label="وسيلة التحصيل" value={extractPaymentMethod(payment)} />
                <RecordMeta label="وقت الدفع" value={formatDate(payment.paid_at)} />
                <RecordMeta label="وقت التسجيل" value={formatDate(payment.created_at)} />
              </div>
              <p className="support-text">ملاحظة الدفع الأصلية: {extractPaymentNote(payment)}</p>
            </>
          ) : null}
          <div className="field">
            <label htmlFor={`payment-void-reason-${entry.id}`}>سبب الإلغاء</label>
            <select
              id={`payment-void-reason-${entry.id}`}
              name="void_reason_type"
              value={paymentVoidForm.void_reason_type}
              onChange={handlePaymentVoidFormChange}
              disabled={paymentVoidSubmitting}
              required
            >
              <option value="">اختر سبب الإلغاء</option>
              {PAYMENT_VOID_REASON_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor={`payment-void-note-${entry.id}`}>ملاحظة الإلغاء</label>
            <textarea
              id={`payment-void-note-${entry.id}`}
              name="note"
              value={paymentVoidForm.note}
              onChange={handlePaymentVoidFormChange}
              placeholder="اكتب سببا واضحا لعدم اعتماد هذه الدفعة ضمن الإجماليات الحالية."
              disabled={paymentVoidSubmitting}
              required
            />
          </div>
          <div className="inline-actions">
            <button
              type="submit"
              className="button primary"
              disabled={
                paymentVoidSubmitting ||
                replacementPaymentSubmitting ||
                Boolean(paymentVoidActionDisabledReason)
              }
            >
              {paymentVoidSubmitting
                ? 'جار حفظ إلغاء الدفعة...'
                : isCompactMobileLayout
                  ? 'حفظ الإلغاء'
                  : 'حفظ إلغاء الدفعة'}
            </button>
            <button
              type="button"
              className="button secondary"
              onClick={handleCancelPaymentVoidForm}
              disabled={paymentVoidSubmitting}
            >
              إلغاء
            </button>
          </div>
        </form>
      ) : (
        <div className="inline-actions">
          <button
            type="button"
            className="button secondary"
            onClick={() => handleOpenPaymentVoidForm(paymentId)}
            disabled={
              paymentVoidSubmitting ||
              replacementPaymentSubmitting ||
              !paymentId ||
              Boolean(paymentVoidActionDisabledReason)
            }
            title={paymentVoidActionDisabledReason || ''}
          >
            {isCompactMobileLayout ? 'إلغاء' : 'إلغاء الدفعة'}
          </button>
        </div>
      ),
    }
  })
  const _activePaymentEntries = activePayments.map((payment, index) => ({
    id: payment.id ?? `${payment.created_at}-${payment.amount_rub}`,
    amountLabel: `${formatNumber(payment.amount_rub, 2)} RUB`,
    methodLabel: extractPaymentMethod(payment),
    paidAtLabel: isCompactMobileLayout ? formatAgeLabel(payment.paid_at) : formatDate(payment.paid_at),
    createdAtLabel: isCompactMobileLayout
      ? formatAgeLabel(payment.created_at)
      : formatDate(payment.created_at),
    noteText: isCompactMobileLayout ? '' : extractPaymentNote(payment),
    activityLabel: isCompactMobileLayout
      ? index === 0
        ? 'أحدث دفعة'
        : 'دفعة'
      : index === 0
        ? 'آخر تحصيل مسجل'
        : 'دفعة متابعة',
    isLatest: index === 0,
    badgeClassName: isOverpaid
      ? 'activity-chip--danger'
      : isSettled
        ? 'activity-chip--success'
        : 'activity-chip--warning',
    className:
      index === 0
        ? isOverpaid
          ? 'payment-entry--danger'
          : isSettled
            ? 'payment-entry--success'
            : 'payment-entry--warning'
        : '',
  }))

  const printPaymentRows = activePayments.map((payment) => ({
    id: payment.id ?? `${payment.created_at}-${payment.amount_rub}`,
    amountLabel: `${formatNumber(payment.amount_rub, 2)} RUB`,
    methodLabel: extractPaymentMethod(payment),
    paidAtLabel: formatDate(payment.paid_at),
    createdAtLabel: formatDate(payment.created_at),
    noteText: extractPaymentNote(payment),
  }))

  const pendingPaymentEntries = pendingPayments.map((payment) => ({
    id: payment.id,
    amountLabel: `${formatNumber(payment.payload.amount_rub, 2)} RUB`,
    methodLabel: getPaymentMethodLabel(payment.payload.payment_method),
    paidAtLabel: isCompactMobileLayout
      ? formatAgeLabel(payment.payload.paid_at || payment.createdAt)
      : formatDate(payment.payload.paid_at || payment.createdAt),
    createdAtLabel: isCompactMobileLayout
      ? formatAgeLabel(payment.updatedAt || payment.createdAt)
      : formatDate(payment.updatedAt || payment.createdAt),
    noteText: isCompactMobileLayout
      ? ''
      : payment.status === 'failed'
        ? `${payment.payload.note || 'لا توجد ملاحظة على الدفعة.'} ${payment.lastError ? `• ${payment.lastError}` : ''}`
        : payment.status === 'blocked'
          ? payment.blockedReason || payment.payload.note || 'هذه الدفعة المحلية بانتظار اعتماد حوالة مرتبطة قبل إرسالها.'
          : payment.payload.note || 'دفعة محفوظة محليا داخل هذا المتصفح بانتظار الإرسال.',
    activityLabel:
      isCompactMobileLayout
        ? payment.status === 'failed'
          ? 'فشل'
          : payment.status === 'blocked'
            ? 'محجوبة'
            : payment.status === 'syncing'
              ? 'جار الإرسال'
              : 'محلية'
        : payment.status === 'failed'
          ? 'فشلت المزامنة'
          : payment.status === 'blocked'
            ? 'بانتظار حوالة مرتبطة'
            : payment.status === 'syncing'
              ? 'جار الإرسال الآن'
              : 'محفوظة محليا بانتظار الإرسال',
    badgeClassName:
      payment.status === 'failed'
        ? 'activity-chip--danger'
        : payment.status === 'blocked'
          ? 'activity-chip--warning'
        : payment.status === 'syncing'
          ? 'activity-chip--warning'
          : 'activity-chip--warning',
    badgeLabel:
      isCompactMobileLayout
        ? payment.status === 'failed'
          ? 'إعادة'
          : payment.status === 'blocked'
            ? 'محجوبة'
            : payment.status === 'syncing'
              ? 'إرسال'
              : 'محلية'
        : payment.status === 'failed'
          ? 'تحتاج إعادة محاولة'
          : payment.status === 'blocked'
            ? 'محجوبة مؤقتا'
            : payment.status === 'syncing'
              ? 'جار الإرسال'
              : 'محفوظة محليا',
    className:
      payment.status === 'failed'
        ? 'payment-entry--danger'
        : payment.status === 'blocked'
          ? 'payment-entry--warning'
          : payment.status === 'syncing'
            ? 'payment-entry--warning'
            : 'payment-entry--warning',
    isBlocked: payment.status === 'blocked',
    isLatest: false,
  }))

  const transferRows = transfer
    ? [
        { label: 'رقم المرجع', value: referenceNumber },
        { label: 'المعرّف الداخلي', value: displayTransferId },
        { label: 'العميل', value: displayCustomerName },
        { label: 'الحالة', value: statusLabel },
        { label: 'ملاحظات', value: transfer.notes || 'لا توجد ملاحظات.' },
      ]
    : []

  const pricingRows = transfer
    ? [
        { label: 'كمية USDT', value: formatNumber(transfer.usdt_amount, 2) },
        { label: 'السعر العام', value: formatNumber(transfer.market_rate, 4) },
        { label: 'القيمة قبل النسبة', value: formatNumber(valueBeforePercentage, 2) },
        { label: 'النسبة', value: `${formatNumber(percentageValue, 2)}%` },
        { label: 'مبلغ التسوية', value: formatNumber(valueAfterPercentage, 2) },
        { label: 'السعر النهائي', value: formatNumber(finalClientRate, 6) },
      ]
    : []

  const remainingHelpText =
    remainingRub === null
      ? ''
      : isOverpaid
        ? `الرصيد سالب. زيادة دفع بمقدار ${formatNumber(overpaidAmountRub, 2)} RUB.`
        : isSettled
          ? 'الحوالة مسددة حاليا. ما زال بإمكانك تسجيل دفعة أخرى إذا لزم الأمر.'
          : `المبلغ المتبقي قبل الإجراء التالي: ${formatNumber(remainingRub, 2)} RUB`

  const paymentActionTitle = isOverpaid
    ? 'راجع الملف قبل تسجيل أي دفعة جديدة'
    : isCancelled
      ? 'الحوالة ملغاة حاليا'
      : hasPartialTransferOnlyOfflineState
        ? 'سجّل دفعة جديدة مع بقاء سجل الدفعات المؤكد غير مكتمل'
      : isSettled
        ? 'الحوالة مسددة حاليا'
        : hasLocalPendingPayments && !hasPayments
          ? 'توجد دفعات محلية بانتظار الإرسال'
        : hasPayments
          ? 'سجّل دفعة المتابعة التالية'
          : 'سجّل أول دفعة على الحوالة'

  const paymentActionDescription = isOverpaid
    ? 'توجد زيادة دفع مسجلة. استخدم هذه المنطقة فقط بعد مراجعة سبب الزيادة والحاجة الفعلية لأي حركة جديدة.'
    : isCancelled
      ? 'لا يوصى بإضافة حركة جديدة قبل مراجعة حالة الإلغاء وسجل الدفعات.'
      : hasPartialTransferOnlyOfflineState
        ? 'تفاصيل الحوالة نفسها متاحة، لكن سجل الدفعات المؤكد غير محفوظ محليا بالكامل حاليا. يمكنك حفظ دفعة جديدة محليا عند الحاجة، مع بقاء الإجماليات المؤكدة بحاجة إلى تحديث لاحق.'
    : isSettled
      ? 'استخدم هذه المنطقة فقط إذا كانت هناك حركة مالية إضافية فعلية يجب تسجيلها على الحوالة.'
      : hasLocalPendingPayments && !hasPayments
        ? 'يمكنك إضافة دفعة محلية جديدة عند الحاجة، لكن توجد بالفعل دفعات محفوظة داخل هذا المتصفح بانتظار الإرسال إلى الخادم.'
      : hasPayments
          ? `أضف الدفعة التالية مع وسيلة الدفع المناسبة، وسيتم تحديث الرصيد الحالي مباشرة.${hasLocalPendingPayments ? ' توجد أيضا دفعات محلية بانتظار الإرسال بشكل منفصل.' : ''}`
          : 'هذه هي منطقة الإجراء الأساسية لبدء التحصيل على الحوالة الحالية.'

  const compactPaymentActionDescription = isOverpaid
    ? 'راجع الزيادة الحالية قبل أي دفعة جديدة.'
    : isCancelled
      ? 'راجع حالة الإلغاء قبل أي حركة جديدة.'
      : hasPartialTransferOnlyOfflineState
        ? 'يمكن تسجيل حركة جديدة مع بقاء السجل المؤكد غير مكتمل.'
        : isSettled
          ? 'استخدم هذا القسم فقط عند وجود حركة إضافية فعلية.'
          : hasLocalPendingPayments && !hasPayments
            ? `توجد ${localPaymentCount} دفعة محلية بانتظار الإرسال.`
            : hasPayments
              ? 'سجّل الدفعة التالية وراجع الرصيد مباشرة.'
              : 'ابدأ بتسجيل أول دفعة.'

  const paymentActionMeta = [
    { label: 'مبلغ التسوية', value: `${formatNumber(valueAfterPercentage, 2)} RUB` },
    { label: 'الرصيد الحالي', value: remainingMessage },
    {
      label: hasPartialTransferOnlyOfflineState
        ? 'سجل الدفعات المؤكد'
        : hasLocalPendingPayments
          ? 'محلي بانتظار الإرسال'
          : 'آخر حركة',
      value: hasLocalPendingPayments
        ? `${localPaymentCount} دفعة • ${localPendingAmountLabel || '--'}`
        : hasPartialTransferOnlyOfflineState
          ? 'غير متاح محليا حاليا'
        : latestPayment
          ? `${latestPaymentMethod} • ${latestPaymentLabel}`
          : 'لا توجد دفعات بعد',
    },
  ]

  const resolvedPaymentActionMeta = isCompactMobileLayout
    ? paymentActionMeta.filter((_, index) => index < 2)
    : paymentActionMeta

  const paymentSubmitLabel =
    !hasPartialTransferOnlyOfflineState &&
    !hasPayments &&
    !hasLocalPendingPayments &&
    !isOverpaid &&
    !isSettled
      ? 'تسجيل أول دفعة'
      : 'تسجيل دفعة متابعة'

  const hiddenPaymentStateNotice =
    activeSection !== 'payments' && activeSection !== 'history'
      ? failedLocalPaymentCount > 0
        ? `توجد ${failedLocalPaymentCount} دفعة محلية تحتاج إلى إعادة محاولة. افتح قسم الدفعات للمزامنة أو قسم السجل للمراجعة.`
        : blockedLocalPaymentCount > 0
          ? `توجد ${blockedLocalPaymentCount} دفعة محلية ما زالت بانتظار اعتماد حوالة مرتبطة. افتح قسم الدفعات أو السجل للمراجعة قبل اعتماد النتيجة المالية.`
          : hasLocalPendingPayments
            ? `توجد ${localPaymentCount} دفعة محلية محفوظة بانتظار الإرسال. افتح قسم الدفعات للمزامنة أو قسم السجل لمراجعة العناصر المحلية.`
            : hasPartialTransferOnlyOfflineState
              ? 'سجل الدفعات المؤكد غير مكتمل محليًا حاليًا. افتح قسم السجل لمراجعة المتاح أو قسم الدفعات لتسجيل الحركات المحلية الجديدة.'
              : ''
      : ''

  const hiddenPaymentStateKind =
    failedLocalPaymentCount > 0 ? 'error' : hiddenPaymentStateNotice ? 'warning' : 'info'

  const compactLockMessage = !paymentsLoading && paymentsError
    ? `${paymentsError} لا يمكن تأكيد حالة القفل بالكامل حاليا.`
    : !paymentsLoading && hasConfirmedServerPayments
      ? `الحوالة تحتوي على ${payments.length} دفعة، لذلك القيم الأساسية مقفلة.`
      : !paymentsLoading && !paymentsError && !hasConfirmedServerPayments
        ? 'لا توجد دفعات مؤكدة بعد، لذلك لم يُفعَّل القفل التشغيلي بعد.'
        : ''

  return (
    <div className="stack transfer-details-page">
      <PageHeader
        eyebrow={isCompactMobileLayout ? '' : 'الحوالة'}
        title={transfer?.reference_number || (transferId ? `حوالة #${transferId}` : 'حوالة')}
        description={isCompactMobileLayout ? '' : resolvedPageDescription}
        className="no-print transfer-details-page-hero"
        actions={
          <div className="transfer-details-hero-actions">
            <div className="transfer-details-hero-utility-row">
              <Link className="button secondary transfer-details-utility-action" to="/transfers">
                {isCompactMobileLayout ? 'رجوع' : 'العودة'}
              </Link>
              <button
                type="button"
                className="button secondary transfer-details-utility-action"
                onClick={handleOpenTransferEdit}
                disabled={
                  transferLoading ||
                  Boolean(transferError) ||
                  !transfer ||
                  Boolean(transferEditActionDisabledReason)
                }
                title={transferEditActionDisabledReason || ''}
              >
                تعديل
              </button>
              <button
                type="button"
                className="button secondary transfer-details-utility-action transfer-details-refresh-icon"
                onClick={handlePaymentsRefresh}
                aria-label={paymentsLoading ? 'جار تحديث تفاصيل الحوالة' : 'تحديث تفاصيل الحوالة'}
                title={paymentsLoading ? 'جار التحديث...' : 'تحديث'}
              >
                <RefreshIcon />
              </button>
            </div>
          </div>
        }
      >
        {transfer ? (
          isCompactMobileLayout ? (
            <div className="transfer-details-hero-mobile-meta">
              <p
                className={[
                  'transfer-details-hero-status',
                  `transfer-details-hero-status--${followUpDisplayTone}`,
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                {statusLabel}
              </p>
              <p className="transfer-details-hero-mobile-subline">{displayCustomerName}</p>
            </div>
          ) : (
            <div className="page-hero-highlights transfer-details-hero-highlights">
              <p
                className={[
                  'support-text',
                  'support-text-inline',
                  'page-hero-highlight',
                  `page-hero-highlight--${followUpDisplayTone}`,
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                {statusLabel}
              </p>
              <p className="support-text support-text-inline page-hero-highlight">{displayCustomerName}</p>
              <p className="support-text support-text-inline page-hero-highlight page-hero-highlight--accent">
                المتبقي {remainingMessage}
              </p>
              <p className="support-text support-text-inline page-hero-highlight">
                المحصل {totalPaidRub === null ? '--' : `${formatNumber(totalPaidRub, 2)} RUB`}
              </p>
            </div>
          )
        ) : null}
      </PageHeader>

      <InlineMessage kind="success" className="no-print">
        {location.state?.successMessage}
      </InlineMessage>

      <OfflineSnapshotNotice className="no-print" snapshotState={snapshotState} />

      <div className="app-section-nav-shell no-print">
        <nav className="app-section-nav" aria-label="أقسام صفحة الحوالة">
          {TRANSFER_DETAILS_SECTIONS.map((section) => {
            const isActiveSection = activeSection === section.key

            return (
              <button
                key={section.key}
                type="button"
                className={['app-section-tab app-section-tab--stack', isActiveSection ? 'active' : '']
                  .filter(Boolean)
                  .join(' ')}
                aria-pressed={isActiveSection}
                onClick={() => handleSectionChange(section.key)}
              >
                <span className="app-section-tab-copy">
                  <strong>{section.label}</strong>
                  <small>{section.description}</small>
                </span>
              </button>
            )
          })}
        </nav>
      </div>

      {hiddenPaymentStateNotice ? (
        <InlineMessage
          kind={hiddenPaymentStateKind}
          className="no-print app-section-inline-status"
        >
          {hiddenPaymentStateNotice}
        </InlineMessage>
      ) : null}

      <div className="app-section-workspace no-print">
        <SectionCard
          title="نظرة عامة"
          description={isCompactMobileLayout ? '' : 'ملخص سريع لوضع الحوالة.'}
          className={[
            'app-section-panel',
            'transfer-details-summary-section',
            activeSection === 'summary' ? 'is-active' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <TransferSummary
            errorMessage={transferError}
            loading={transferLoading}
            hasTransfer={Boolean(transfer)}
            customerId={transfer?.customer_id || ''}
            customerName={displayCustomerName}
            status={transfer?.status || ''}
            metaItems={[]}
            recordHeaderClassName="transfer-details-summary-identity"
            asideChildren={
              <RecordMeta
                label="تاريخ الإنشاء"
                value={transferCreatedAtLabel}
                className="detail-mobile-secondary"
              />
            }
            highlightItems={overviewHighlightItems}
            items={[]}
          />

          {!transferError && !transferLoading && transfer ? (
            <TransferFollowUpPanel
              title={followUpTitle}
              description={isCompactMobileLayout ? compactFollowUpDescription : followUpDescription}
              status={transfer.status}
              tone={followUpState}
              chips={overviewFollowUpChips}
              items={overviewFollowUpItems}
              compactView={isCompactMobileLayout}
            />
          ) : null}
        </SectionCard>

        {!isCompactMobileLayout ? (
          <SectionCard
            title="الوضع المالي الحالي"
            description="يتم احتساب الرصيد من مبلغ التسوية وجميع المدفوعات الجزئية المسجلة على الحوالة."
            className={[
              'app-section-panel',
              'transfer-details-balance-section',
              activeSection === 'summary' ? 'is-active' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {hasPartialTransferOnlyOfflineState ? (
              <InlineMessage kind="warning" className="transfer-details-partial-offline-notice">
                {paymentsError} لذلك تُعرض تفاصيل الحوالة الأساسية فقط، بينما تبقى إجماليات التحصيل والرصيد الحالي غير مكتملة حتى يعود سجل المدفوعات المؤكد.
              </InlineMessage>
            ) : null}
            <BalanceSummary
              settlementValue={formatNumber(valueAfterPercentage, 2)}
              totalPaidValue={
                paymentsLoading && payments.length === 0
                  ? 'جار تحميل المدفوعات...'
                  : formatNumber(totalPaidRub, 2)
              }
              remainingTitle={isOverpaid ? 'رصيد سالب' : isSettled ? 'حالة التسوية' : 'المتبقي بالروبل'}
              remainingValue={remainingMessage}
              remainingCardClass={balanceCardClass}
              remainingValueClass={balanceValueClass}
              remainingNote={isOverpaid ? 'المبلغ المدفوع تجاوز بالفعل القيمة النهائية للحوالة.' : ''}
            />
          </SectionCard>
        ) : null}

        <SectionCard
          title={isCompactMobileLayout ? 'تسجيل دفعة' : 'إجراء التحصيل'}
          description={isCompactMobileLayout ? '' : 'منطقة التحصيل التالية.'}
          className={[
            'app-section-panel',
            'transfer-details-action-section',
            activeSection === 'payments' ? 'is-active' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <PendingMutationNotice
            activeCount={localPaymentCount}
            blockedCount={blockedLocalPaymentCount}
            failedCount={failedLocalPaymentCount}
            isOffline={isOffline}
            syncing={queueSyncing}
            totalAmountLabel={localPendingAmountLabel}
            onSyncNow={handleSyncPendingPayments}
          />
          <PaymentForm
            actionTitle={paymentActionTitle}
            actionDescription={
              isCompactMobileLayout ? compactPaymentActionDescription : paymentActionDescription
            }
            actionTone={followUpState}
            actionMeta={resolvedPaymentActionMeta}
            errorMessage={paymentSubmitError}
            successMessage={paymentSubmitSuccess}
            values={paymentForm}
            paymentMethodOptions={PAYMENT_METHOD_OPTIONS}
            onChange={handlePaymentChange}
            onSubmit={handlePaymentSubmit}
            remainingHelpText={remainingHelpText}
            remainingHelpClassName={remainingSupportClass}
            submitting={paymentSubmitting}
            disabled={paymentSubmitting || Boolean(transferError) || !transfer || !isConfigured}
            submitLabel={paymentSubmitLabel}
            compactView={isCompactMobileLayout}
          />
        </SectionCard>

        <SectionCard
          title={isCompactMobileLayout ? 'سجل الدفعات' : 'سجل التحصيل والحركة المالية'}
          description={isCompactMobileLayout ? '' : 'قائمة موجزة للحركات المالية.'}
          className={[
            'app-section-panel',
            'transfer-details-history-section',
            activeSection === 'history' ? 'is-active' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {hasPartialTransferOnlyOfflineState ? (
            <InlineMessage kind="warning" className="transfer-details-history-inline-status">
              {isCompactMobileLayout
                ? `${paymentsError} يظهر المتاح فقط من السجل.`
                : `${paymentsError} سيظهر أدناه ما توفر فقط من السجل المؤكد والعناصر المحلية.`}
            </InlineMessage>
          ) : null}
          {paymentVoidSubmitSuccess ? (
            <InlineMessage kind="success" className="transfer-details-history-inline-status">
              {isCompactMobileLayout ? 'تم حفظ إلغاء الدفعة.' : paymentVoidSubmitSuccess}
            </InlineMessage>
          ) : null}
          {replacementPaymentSubmitSuccess ? (
            <InlineMessage kind="success" className="transfer-details-history-inline-status">
              {isCompactMobileLayout ? 'تم حفظ الدفعة البديلة.' : replacementPaymentSubmitSuccess}
            </InlineMessage>
          ) : null}
          {paymentVoidActionDisabledReason && hasEligibleConfirmedPaymentForVoid ? (
            <InlineMessage kind="warning" className="transfer-details-history-inline-status">
              {paymentVoidActionDisabledReason}
            </InlineMessage>
          ) : null}
          {replacementPaymentActionDisabledReason && hasEligibleVoidedPaymentForReplacement ? (
            <InlineMessage kind="warning" className="transfer-details-history-inline-status">
              {replacementPaymentActionDisabledReason}
            </InlineMessage>
          ) : null}
          <PaymentList
            errorMessage={paymentsError}
            loading={paymentsLoading}
            payments={paymentEntriesWithVoidState}
            pendingPayments={pendingPaymentEntries}
            onRetry={handlePaymentsRefresh}
            compactView={isCompactMobileLayout}
          />
        </SectionCard>

        {transfer ? (
          <SectionCard
            title="معلومات الملف"
            description={isCompactMobileLayout ? '' : 'مرجع وتسعير وملاحظات الحوالة.'}
            actions={
              <button
                type="button"
                className="button secondary transfer-details-section-toggle"
                aria-expanded={isSecondaryInfoOpen}
                aria-controls="transfer-secondary-details"
                onClick={() => setIsSecondaryInfoOpen((current) => !current)}
              >
                {isSecondaryInfoOpen ? 'إخفاء' : 'إظهار'}
              </button>
            }
            className={[
              'app-section-panel',
              'transfer-details-secondary-section',
              !isSecondaryInfoOpen ? 'is-collapsed' : '',
              activeSection === 'summary' ? 'is-active' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {isSecondaryInfoOpen ? (
              <InfoGrid id="transfer-secondary-details" className="transfer-details-secondary-grid">
                <InfoCard title="رقم المرجع" value={referenceNumber} />
                <InfoCard title="المعرّف الداخلي" value={displayTransferId} />
                <InfoCard title="تاريخ إنشاء الحوالة" value={transferCreatedAtLabel} />
                {summaryItems.map((item) => (
                  <InfoCard
                    key={item.title}
                    title={item.title}
                    value={item.value}
                    className={item.className}
                    valueClassName={item.valueClassName}
                  >
                    {item.children}
                  </InfoCard>
                ))}
              </InfoGrid>
            ) : null}
          </SectionCard>
        ) : null}

        <SectionCard
          title={isCompactMobileLayout ? 'قفل البيانات' : 'قفل البيانات الأساسية'}
          description={isCompactMobileLayout ? '' : 'حالة قفل الحقول الأساسية.'}
          className={[
            'app-section-panel',
            'transfer-details-lock-section',
            activeSection === 'summary' ? 'is-active' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {paymentsLoading && payments.length === 0 ? (
            <p>جار التحقق من حالة قفل الحوالة...</p>
          ) : null}
          {!paymentsLoading && paymentsError ? (
            <InlineMessage kind="warning">
              {isCompactMobileLayout
                ? compactLockMessage
                : `${paymentsError} لذلك لا يمكن تأكيد حالة قفل الحوالة محليًا بشكل كامل حتى يعود سجل المدفوعات المؤكد أو يُعاد تحميله من الخادم.`}
            </InlineMessage>
          ) : null}
          {!paymentsLoading && hasConfirmedServerPayments ? (
            <InlineMessage kind="warning">
              {isCompactMobileLayout
                ? compactLockMessage
                : `تحتوي هذه الحوالة بالفعل على ${payments.length} دفعة. يجب اعتبار الحقول الأساسية مثل العميل والكمية والأسعار ووضع التسعير والعمولة والإجمالي والمبلغ المستحق مقفلة. كما أن قاعدة البيانات تمنع تعديل هذه القيم بعد وجود دفعات.`}
            </InlineMessage>
          ) : null}
          {!paymentsLoading && !paymentsError && !hasConfirmedServerPayments ? (
            <p className="support-text">
              {isCompactMobileLayout
                ? compactLockMessage
                : 'لا توجد مدفوعات مسجلة بعد. إذا تمت إضافة واجهة تعديل لاحقًا فيمكن إبقاء القيم الأساسية قابلة للتعديل حتى أول دفعة.'}
            </p>
          ) : null}
        </SectionCard>

        {transfer ? (
        <SectionCard
          title="تعديل الحوالة"
          description={isCompactMobileLayout ? '' : 'تعديل آمن لبيانات الحوالة.'}
            className={[
              'app-section-panel',
              'transfer-details-edit-section',
              activeSection === 'summary' ? 'is-active' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {transferEditSubmitSuccess ? (
              <InlineMessage kind="success">{transferEditSubmitSuccess}</InlineMessage>
            ) : null}
            {transferEditSubmitError ? (
              <InlineMessage kind="error">{transferEditSubmitError}</InlineMessage>
            ) : null}

            {!isEditingTransfer ? (
              <>
                {transferEditActionDisabledReason ? (
                  <InlineMessage kind="warning">{transferEditActionDisabledReason}</InlineMessage>
                ) : canUseBroaderTransferEdit ? (
                  <InlineMessage kind="info">
                    {isCompactMobileLayout
                      ? 'يمكن تعديل العميل والتسعير قبل أول دفعة.'
                      : 'لا توجد دفعات مؤكدة على هذه الحوالة بعد، لذلك يمكن تعديل العميل وقيم التسعير الأساسية وإعادة احتساب مبلغ التسوية قبل الحفظ.'}
                  </InlineMessage>
                ) : transferEditScopeKnown ? (
                  <InlineMessage kind="warning">
                    {isCompactMobileLayout
                      ? 'التعديل الآن محصور في الحالة والملاحظات فقط.'
                      : 'تحتوي هذه الحوالة على دفعات مؤكدة، لذلك يبقى التعديل محصورا في الحالة والملاحظات فقط، بينما تبقى الحقول المالية وبيانات العميل مقفلة.'}
                  </InlineMessage>
                ) : null}

                <div className="inline-actions">
                  <button
                    type="button"
                    className="button secondary"
                    onClick={handleOpenTransferEdit}
                    disabled={Boolean(transferEditActionDisabledReason)}
                  >
                    {isCompactMobileLayout ? 'فتح التعديل' : 'فتح نموذج التعديل'}
                  </button>
                </div>
              </>
            ) : (
              <form className="form-grid transfer-details-edit-form" onSubmit={handleTransferEditSubmit}>
                <ReadonlyField
                  id="transfer-edit-reference"
                  label="رقم المرجع"
                  value={referenceNumber}
                  helpText="يبقى رقم المرجع ثابتا ولا يمكن تعديله من هذه الشاشة."
                />
                <ReadonlyField
                  id="transfer-edit-created-at"
                  label="تاريخ الإنشاء"
                  value={transferCreatedAtLabel}
                  helpText="يبقى تاريخ إنشاء الحوالة كما سُجل أول مرة للحفاظ على المرجعية والطباعة."
                />

                {canUseBroaderTransferEdit ? (
                  <>
                    <InlineMessage kind="info">
                      سيعاد احتساب القيم التالية بنفس منطق إنشاء الحوالة الحالي قبل حفظ التعديلات.
                    </InlineMessage>

                    {transferCustomerOptionsError ? (
                      <InlineMessage kind="warning">{transferCustomerOptionsError}</InlineMessage>
                    ) : null}

                    <FieldShell
                      label="العميل"
                      htmlFor="transfer-edit-customer"
                      helpText="يمكن تغيير ربط الحوالة بعميل آخر فقط قبل تسجيل أي دفعة مؤكدة عليها."
                    >
                      <select
                        id="transfer-edit-customer"
                        name="customer_id"
                        value={transferEditForm.customer_id}
                        onChange={handleTransferEditFormChange}
                        disabled={transferEditSubmitting || transferCustomerOptionsLoading}
                        required
                      >
                        <option value="" disabled>
                          {transferCustomerOptionsLoading
                            ? 'جار تحميل العملاء...'
                            : transferCustomerOptions.length === 0
                              ? 'لا توجد خيارات عميل متاحة'
                              : 'اختر العميل'}
                        </option>
                        {transferCustomerOptions.map((customerOption) => (
                          <option key={customerOption.id} value={customerOption.id}>
                            {customerOption.full_name}
                            {customerOption.isArchived ? ' (مؤرشف)' : ''}
                          </option>
                        ))}
                      </select>
                    </FieldShell>

                    <FieldShell
                      label="كمية USDT"
                      htmlFor="transfer-edit-amount"
                      helpText="أدخل كمية الحوالة المطلوبة تسويتها بعد التعديل."
                    >
                      <input
                        id="transfer-edit-amount"
                        name="amount"
                        type="number"
                        step="any"
                        min="0"
                        value={transferEditForm.amount}
                        onChange={handleTransferEditFormChange}
                        disabled={transferEditSubmitting}
                        required
                      />
                    </FieldShell>

                    <FieldShell
                      label="السعر العام"
                      htmlFor="transfer-edit-global-rate"
                      helpText="السعر الأساسي قبل تطبيق نسبة الزيادة على الحوالة."
                    >
                      <input
                        id="transfer-edit-global-rate"
                        name="global_rate"
                        type="number"
                        step="any"
                        min="0"
                        value={transferEditForm.global_rate}
                        onChange={handleTransferEditFormChange}
                        disabled={transferEditSubmitting}
                        required
                      />
                    </FieldShell>

                    <ReadonlyField
                      id="transfer-edit-value-before-percentage"
                      label="القيمة قبل النسبة"
                      value={formatNumber(transferEditValueBeforePercentage, 2)}
                      placeholder="يتم احتسابها تلقائيا"
                    />

                    <FieldShell
                      label="نسبة الزيادة"
                      htmlFor="transfer-edit-percentage"
                      helpText="إدخال 2 يعني 2%."
                    >
                      <input
                        id="transfer-edit-percentage"
                        name="percentage"
                        type="number"
                        step="any"
                        min="0"
                        value={transferEditForm.percentage}
                        onChange={handleTransferEditFormChange}
                        disabled={transferEditSubmitting}
                      />
                    </FieldShell>

                    <ReadonlyField
                      id="transfer-edit-value-after-percentage"
                      label="مبلغ التسوية"
                      value={formatNumber(transferEditValueAfterPercentage, 2)}
                      placeholder="يتم احتسابه تلقائيا"
                    />
                  </>
                ) : isRestrictedTransferEdit ? (
                  <>
                    <InlineMessage kind="warning">
                      تم تسجيل دفعات مؤكدة على هذه الحوالة، لذلك تبقى الحقول المالية وبيانات العميل للقراءة
                      فقط بينما يبقى تعديل الحالة والملاحظات متاحا.
                    </InlineMessage>
                    <InfoGrid className="transfer-details-secondary-grid">
                      <InfoCard title="العميل" value={displayCustomerName} />
                      <InfoCard title="USDT" value={formatNumber(transfer?.usdt_amount, 2)} />
                      <InfoCard title="السعر العام" value={formatNumber(transfer?.market_rate, 4)} />
                      <InfoCard title="نسبة الزيادة" value={`${formatNumber(percentageValue, 2)}%`} />
                      <InfoCard
                        title="مبلغ التسوية"
                        value={`${formatNumber(valueAfterPercentage, 2)} RUB`}
                        className="info-card--accent"
                      />
                    </InfoGrid>
                  </>
                ) : (
                  <InlineMessage kind="warning">
                    {transferEditActionDisabledReason ||
                      'لا يمكن متابعة تعديل الحوالة حاليا قبل اكتمال التحقق من نطاق التعديل الآمن.'}
                  </InlineMessage>
                )}

                <FieldShell
                  label="الحالة"
                  htmlFor="transfer-edit-status"
                  helpText="تنعكس الحالة التشغيلية مباشرة في العرض الحالي والصفحات المرتبطة."
                >
                  <select
                    id="transfer-edit-status"
                    name="status"
                    value={transferEditForm.status}
                    onChange={handleTransferEditFormChange}
                    disabled={transferEditSubmitting}
                    required
                  >
                    {transferStatusEditOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </FieldShell>

                <FieldShell label="ملاحظات" htmlFor="transfer-edit-notes">
                  <textarea
                    id="transfer-edit-notes"
                    name="notes"
                    value={transferEditForm.notes}
                    onChange={handleTransferEditFormChange}
                    placeholder="ملاحظات داخلية على الحوالة"
                    disabled={transferEditSubmitting}
                  />
                </FieldShell>

                <div className="inline-actions">
                  <button
                    type="submit"
                    className="button primary"
                    disabled={
                      transferEditSubmitting ||
                      (!canUseBroaderTransferEdit &&
                        !isRestrictedTransferEdit &&
                        Boolean(transferEditActionDisabledReason))
                    }
                  >
                    {transferEditSubmitting ? 'جار حفظ تعديلات الحوالة...' : 'حفظ تعديلات الحوالة'}
                  </button>
                  <button
                    type="button"
                    className="button secondary"
                    onClick={handleCloseTransferEdit}
                    disabled={transferEditSubmitting}
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            )}
          </SectionCard>
        ) : null}

        {isOverpaid ? (
        <SectionCard
          title={isCompactMobileLayout ? 'معالجة الزيادة' : 'معالجة زيادة الدفع'}
          description={isCompactMobileLayout ? '' : 'تسجيل المعالجة التشغيلية للزيادة الحالية.'}
            className={[
              'app-section-panel',
              'transfer-details-resolution-section',
              activeSection === 'summary' ? 'is-active' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {overpaymentResolutionSubmitSuccess ? (
              <InlineMessage kind="success">{overpaymentResolutionSubmitSuccess}</InlineMessage>
            ) : null}

            {overpaymentResolutionLoading ? (
              <InlineMessage kind="info">
                {isCompactMobileLayout
                  ? 'جار التحقق من آخر معالجة لهذه الزيادة.'
                  : 'جار التحقق من آخر معالجة مسجلة لهذه الزيادة قبل عرض الإجراء المتاح.'}
              </InlineMessage>
            ) : hasResolvedCurrentOverpayment ? (
              <>
                <InlineMessage kind="success">
                  {isCompactMobileLayout
                    ? 'الزيادة الحالية لها معالجة مسجلة بالفعل.'
                    : 'تم تسجيل معالجة مطابقة للزيادة الحالية، لذلك أصبحت هذه الزيادة محلولة تشغيليا مع بقاء التاريخ المالي كما هو.'}
                </InlineMessage>
                <InfoGrid className="transfer-details-secondary-grid">
                  <InfoCard
                    title="نوع المعالجة"
                    value={latestOverpaymentResolutionTypeLabel}
                    className="info-card--success"
                  />
                  <InfoCard
                    title="المبلغ المعالج"
                    value={overpaymentResolutionRecordedAmountLabel}
                    className="info-card--success"
                    valueClassName="info-card-value--metric info-card-value--success"
                  />
                  <InfoCard title="وقت التسجيل" value={latestOverpaymentResolutionCreatedAtLabel} />
                  <InfoCard
                    title="ملاحظة المعالجة"
                    value={latestOverpaymentResolutionNote}
                    className="info-card--full"
                  />
                </InfoGrid>
              </>
            ) : hasUnknownOverpaymentResolutionState ? (
              <>
                <InlineMessage kind="warning">
                  {overpaymentResolutionError ||
                    'تعذر التحقق من آخر معالجة مسجلة لهذه الزيادة حاليا.'}
                </InlineMessage>
                {!isCompactMobileLayout ? (
                  <p className="support-text">
                    لا يتم فتح إجراء معالجة جديد قبل معرفة أحدث سجل معالجة محفوظ لهذه الحوالة. حدّث الصفحة أو أعد التحقق بعد عودة الاتصال.
                  </p>
                ) : null}
                {!isOffline ? (
                  <div className="inline-actions">
                    <button
                      type="button"
                      className="button secondary"
                      onClick={handleOverpaymentResolutionRefresh}
                    >
                      {isCompactMobileLayout ? 'إعادة التحقق' : 'إعادة التحقق من آخر معالجة'}
                    </button>
                  </div>
                ) : null}
              </>
            ) : (
              <>
                <InlineMessage kind="warning">
                  توجد زيادة دفع حالية بمقدار {formatNumber(overpaidAmountRub, 2)} RUB ولم تُسجل لها بعد معالجة مطابقة لهذه القيمة.
                </InlineMessage>

                {overpaymentResolutionSubmitError ? (
                  <InlineMessage kind="error">{overpaymentResolutionSubmitError}</InlineMessage>
                ) : null}

                {overpaymentResolutionActionDisabledReason ? (
                  <InlineMessage kind="warning">{overpaymentResolutionActionDisabledReason}</InlineMessage>
                ) : null}

                {showOverpaymentResolutionForm ? (
                  <form className="stack" onSubmit={handleOverpaymentResolutionSubmit}>
                    <div className="field">
                      <label htmlFor="overpayment-resolution-amount">قيمة الزيادة الحالية</label>
                      <input
                        id="overpayment-resolution-amount"
                        type="text"
                        value={`${formatNumber(overpaidAmountRub, 2)} RUB`}
                        readOnly
                      />
                      <p className="support-text">
                        هذا المبلغ يُلتقط من الرصيد السالب الحالي فقط، ولا يغيّر أي دفعة أو مبلغ تسوية محفوظ.
                      </p>
                    </div>

                    <div className="field">
                      <label htmlFor="overpayment-resolution-type">نوع المعالجة</label>
                      <select
                        id="overpayment-resolution-type"
                        name="resolution_type"
                        value={overpaymentResolutionForm.resolution_type}
                        onChange={handleOverpaymentResolutionFormChange}
                        disabled={overpaymentResolutionSubmitting}
                        required
                      >
                        <option value="" disabled>
                          اختر نوع معالجة واضح
                        </option>
                        {OVERPAYMENT_RESOLUTION_TYPE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="field">
                      <label htmlFor="overpayment-resolution-note">ملاحظة المعالجة</label>
                      <textarea
                        id="overpayment-resolution-note"
                        name="note"
                        value={overpaymentResolutionForm.note}
                        onChange={handleOverpaymentResolutionFormChange}
                        placeholder="اكتب تفسيرا واضحا لكيفية حسم الزيادة الحالية ولماذا لم تعد تحتاج متابعة تشغيلية."
                        disabled={overpaymentResolutionSubmitting}
                        required
                      />
                    </div>

                    <div className="inline-actions">
                      <button
                        type="submit"
                        className="button primary"
                        disabled={
                          overpaymentResolutionSubmitting ||
                          Boolean(overpaymentResolutionActionDisabledReason)
                        }
                      >
                        {overpaymentResolutionSubmitting
                          ? 'جار حفظ معالجة الزيادة...'
                          : 'حفظ معالجة زيادة الدفع'}
                      </button>
                      <button
                        type="button"
                        className="button secondary"
                        onClick={handleCancelOverpaymentResolutionForm}
                        disabled={overpaymentResolutionSubmitting}
                      >
                        إلغاء
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    {!isCompactMobileLayout ? (
                      <p className="support-text">
                        استخدم هذا الإجراء فقط بعد مراجعة الدفعات المؤكدة والتأكد من أن الزيادة الحالية قد استردت أو تمت تسويتها خارج هذا السجل، من دون تعديل الحقيقة المالية التاريخية.
                      </p>
                    ) : null}
                    <div className="inline-actions">
                      <button
                        type="button"
                        className="button primary"
                        onClick={handleOpenOverpaymentResolutionForm}
                        disabled={Boolean(overpaymentResolutionActionDisabledReason)}
                      >
                        {isCompactMobileLayout ? 'فتح المعالجة' : 'معالجة زيادة الدفع'}
                      </button>
                    </div>
                  </>
                )}
              </>
            )}
          </SectionCard>
        ) : null}
      </div>

      <PrintStatement
        className={['transfer-details-print-section', activeSection === 'print' ? 'is-active' : '']
          .filter(Boolean)
          .join(' ')}
        errorMessage={transferError}
        loading={transferLoading}
        hasTransfer={Boolean(transfer)}
        referenceNumber={referenceNumber}
        customerName={displayCustomerName}
        status={transfer?.status || ''}
        createdAtLabel={transferCreatedAtLabel}
        transferRows={transferRows}
        pricingRows={pricingRows}
        paymentsError={paymentsError}
        paymentsLoading={paymentsLoading}
        paymentRows={printPaymentRows}
        totalPaidValue={`${formatNumber(totalPaidRub, 2)} RUB`}
        remainingValue={remainingMessage}
        remainingClassName={printRemainingClass}
        finalAmountValue={`${formatNumber(valueAfterPercentage, 2)} RUB`}
        compactView={isCompactMobileLayout}
        onPrint={handlePrint}
      />
    </div>
  )
}

export default TransferDetailsPage
