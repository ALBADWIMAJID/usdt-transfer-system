import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import CustomerFollowUpPanel from '../components/customer-details/CustomerFollowUpPanel.jsx'
import CustomerRecentActivity from '../components/customer-details/CustomerRecentActivity.jsx'
import CustomerSummary from '../components/customer-details/CustomerSummary.jsx'
import CustomerTotals from '../components/customer-details/CustomerTotals.jsx'
import CustomerTransfersList from '../components/customer-details/CustomerTransfersList.jsx'
import CustomersFormSection from '../components/customers/CustomersFormSection.jsx'
import InfoCard from '../components/ui/InfoCard.jsx'
import InfoGrid from '../components/ui/InfoGrid.jsx'
import InlineMessage from '../components/ui/InlineMessage.jsx'
import OfflineSnapshotNotice from '../components/ui/OfflineSnapshotNotice.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import SectionCard from '../components/ui/SectionCard.jsx'
import { useAuth } from '../context/auth-context.js'
import { useTenant } from '../context/tenant-context.js'
import useNetworkStatus from '../hooks/useNetworkStatus.js'
import useOfflineSnapshot from '../hooks/useOfflineSnapshot.js'
import {
  createCustomerFormValues,
  createEmptyCustomerForm,
  normalizeCustomerProfilePayload,
  validateCustomerProfilePayload,
} from '../lib/customerProfile.js'
import { getCustomerDetailsSnapshotKey } from '../lib/offline/cacheKeys.js'
import { getOfflineSnapshotMissingMessage } from '../lib/offline/freshness.js'
import {
  syncArchivedCustomerSnapshots,
  syncDeletedCustomerSnapshots,
  syncEditedCustomerSnapshots,
} from '../lib/offline/customerSnapshots.js'
import {
  isBrowserOffline,
  isLikelyOfflineReadFailure,
  loadReadSnapshot,
  saveReadSnapshot,
  withLiveReadTimeout,
} from '../lib/offline/readCache.js'
import {
  buildLatestOverpaymentResolutionMap,
  deriveTransferOverpaymentState,
  TRANSFER_OVERPAYMENT_RESOLUTION_SELECT,
} from '../lib/transfer-overpayment.js'
import {
  buildActivePaymentTotalsByTransfer,
  deriveConfirmedPaymentState,
  TRANSFER_PAYMENT_VOID_SELECT,
} from '../lib/transfer-payment-state.js'
import {
  TRANSFER_STATUS_FILTER_OPTIONS,
  getPaymentMethodLabel,
  getTransferStatusMeta,
  matchesTransferStatusFilter,
} from '../lib/transfer-ui.js'
import { MISSING_CURRENT_ORG_MESSAGE, withOrgScope, withStampedOrg } from '../lib/orgScope.js'
import { supabase } from '../lib/supabase.js'

const CUSTOMER_DETAILS_SECTIONS = [
  {
    key: 'overview',
    label: 'النظرة',
    description: 'ملف العميل والصورة المالية',
  },
  {
    key: 'transfers',
    label: 'الحوالات',
    description: 'طابور حوالات العميل',
  },
  {
    key: 'activity',
    label: 'النشاط',
    description: 'آخر الحركة عبر العميل',
  },
  {
    key: 'actions',
    label: 'الإجراءات',
    description: 'اختصارات متابعة العميل',
  },
]

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

function roundCurrency(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

function getTransferPriority(entry) {
  if (entry.isUnresolvedOverpaid) {
    return 0
  }

  if (entry.isPartialFollowUp) {
    return 1
  }

  if (entry.isOpenFollowUp) {
    return 2
  }

  return 3
}

function CustomerDetailsPage() {
  const { customerId } = useParams()
  const navigate = useNavigate()
  const { configError, isConfigured } = useAuth()
  const { orgId } = useTenant()
  const { isOffline } = useNetworkStatus()
  const { clearSnapshotState, markCachedSnapshot, markLiveSnapshot, snapshotState } =
    useOfflineSnapshot()
  const [customer, setCustomer] = useState(null)
  const [customerLoading, setCustomerLoading] = useState(Boolean(isConfigured))
  const [customerError, setCustomerError] = useState(isConfigured ? '' : configError)
  const [customerNotFound, setCustomerNotFound] = useState(false)
  const [transfers, setTransfers] = useState([])
  const [transfersLoading, setTransfersLoading] = useState(Boolean(isConfigured))
  const [transfersError, setTransfersError] = useState(isConfigured ? '' : configError)
  const [transfersRefreshKey, setTransfersRefreshKey] = useState(0)
  const [transferStatusFilter, setTransferStatusFilter] = useState('all')
  const [paymentTotalsLoading, setPaymentTotalsLoading] = useState(Boolean(isConfigured))
  const [paymentTotalsError, setPaymentTotalsError] = useState(isConfigured ? '' : configError)
  const [customerPayments, setCustomerPayments] = useState([])
  const [paymentVoidRows, setPaymentVoidRows] = useState([])
  const [totalPaidRub, setTotalPaidRub] = useState(0)
  const customerSnapshotKey = getCustomerDetailsSnapshotKey(orgId, customerId)
  const [activeSection, setActiveSection] = useState('overview')
  const [isEditingCustomer, setIsEditingCustomer] = useState(false)
  const [editFormValues, setEditFormValues] = useState(() => createEmptyCustomerForm())
  const [editSubmitting, setEditSubmitting] = useState(false)
  const [editSubmitError, setEditSubmitError] = useState('')
  const [editSubmitSuccess, setEditSubmitSuccess] = useState('')
  const [pendingLifecycleAction, setPendingLifecycleAction] = useState('')
  const [lifecycleSubmitting, setLifecycleSubmitting] = useState(false)
  const [lifecycleSubmitError, setLifecycleSubmitError] = useState('')
  const [lifecycleSubmitSuccess, setLifecycleSubmitSuccess] = useState('')

  useEffect(() => {
    if (!isConfigured || !supabase || !customerId) {
      return undefined
    }

    let isMounted = true

    const hydrateCustomerFromSnapshot = async (options = {}) => {
      const { fallbackErrorMessage = '' } = options

      setCustomerLoading(true)
      setCustomerError('')
      setCustomerNotFound(false)

      const snapshot = await loadReadSnapshot(customerSnapshotKey)

      if (!isMounted) {
        return
      }

      if (!snapshot?.data?.customer) {
        clearSnapshotState()
        setCustomer(null)
        setCustomerNotFound(false)
        setCustomerError(fallbackErrorMessage || getOfflineSnapshotMissingMessage('لملف هذا العميل'))
        setCustomerLoading(false)
        return false
      }

      setCustomer(snapshot.data.customer)
      setCustomerError('')
      setCustomerNotFound(false)
      setCustomerLoading(false)
      markCachedSnapshot(snapshot.savedAt)
      return true
    }

    const loadCustomer = async () => {
      clearSnapshotState()
      setCustomerLoading(true)
      setCustomerError('')
      setCustomerNotFound(false)

      if (!orgId) {
        setCustomer(null)
        setCustomerError(MISSING_CURRENT_ORG_MESSAGE)
        setCustomerNotFound(false)
        setCustomerLoading(false)
        return
      }

      try {
        const { data, error } = await withLiveReadTimeout(
          withOrgScope(
            supabase
              .schema('public')
              .from('customers')
              .select('id, full_name, phone, notes, is_archived, archived_at, created_at')
              .eq('id', customerId)
              .maybeSingle(),
            orgId
          ),
          {
            timeoutMessage: 'تعذر إكمال تحميل ملف العميل في الوقت المتوقع.',
          }
        )

        /*
        const transferIds = (data ?? []).map((transfer) => transfer.id).filter(Boolean)
        const overpaymentResolutionTransferIds =
          transferIds.length > 0
            ? transferIds
            : ['00000000-0000-0000-0000-000000000000']
        const overpaymentResolutionTransferIds =
          transferIds.length > 0
            ? transferIds
            : ['00000000-0000-0000-0000-000000000000']
        const overpaymentResolutionTransferIds =
          transferIds.length > 0
            ? transferIds
            : ['00000000-0000-0000-0000-000000000000']
        const overpaymentResolutionTransferIds =
          transferIds.length > 0
            ? transferIds
            : ['00000000-0000-0000-0000-000000000000']
        const {
          data: overpaymentResolutionRows,
          error: overpaymentResolutionError,
        } = await withLiveReadTimeout(
          supabase
            .schema('public')
            .from('transfer_overpayment_resolutions')
            .select(TRANSFER_OVERPAYMENT_RESOLUTION_SELECT)
            .in('transfer_id', overpaymentResolutionTransferIds)
            .order('created_at', { ascending: false })
            .order('id', { ascending: false }),
          {
            timeoutMessage:
              'تعذر إكمال تحميل حالات معالجة زيادة الدفع لهذا العميل في الوقت المتوقع.',
          }
        )

        */
        if (!isMounted) {
          return
        }

        if (error) {
          const preferSnapshot = isOffline || isBrowserOffline() || isLikelyOfflineReadFailure(error)
          await hydrateCustomerFromSnapshot({
            fallbackErrorMessage: preferSnapshot ? '' : error.message,
          })
          return
        }

        if (!data) {
          setCustomer(null)
          setCustomerError('')
          setCustomerNotFound(true)
          setCustomerLoading(false)
          return
        }

        setCustomer(data)
        setCustomerLoading(false)
      } catch (error) {
        if (!isMounted) {
          return
        }

        const preferSnapshot = isOffline || isBrowserOffline() || isLikelyOfflineReadFailure(error)

        await hydrateCustomerFromSnapshot({
          fallbackErrorMessage: preferSnapshot ? '' : error.message,
        })
      }
    }

    if (isOffline) {
      hydrateCustomerFromSnapshot()
    } else {
      loadCustomer()
    }

    return () => {
      isMounted = false
    }
  }, [
    clearSnapshotState,
    customerId,
    customerSnapshotKey,
    isConfigured,
    isOffline,
    markCachedSnapshot,
    orgId,
  ])

  useEffect(() => {
    if (!isConfigured || !supabase || !customerId || customerLoading) {
      return undefined
    }

    if (!orgId) {
      setTransfers([])
      setCustomerPayments([])
      setPaymentVoidRows([])
      setTotalPaidRub(0)
      setTransfersError(MISSING_CURRENT_ORG_MESSAGE)
      setPaymentTotalsError(MISSING_CURRENT_ORG_MESSAGE)
      setTransfersLoading(false)
      setPaymentTotalsLoading(false)
      return undefined
    }

    if (!customer || customerNotFound || customerError) {
      setTransfers([])
      setCustomerPayments([])
      setPaymentVoidRows([])
      setTotalPaidRub(0)
      setTransfersError('')
      setPaymentTotalsError('')
      setTransfersLoading(false)
      setPaymentTotalsLoading(false)
      return undefined
    }

    let isMounted = true

    const hydrateTransfersFromSnapshot = async (options = {}) => {
      const { fallbackPaymentTotalsError = '', fallbackTransfersError = '' } = options

      setTransfersLoading(true)
      setTransfersError('')
      setPaymentTotalsLoading(true)
      setPaymentTotalsError('')
      setCustomerPayments([])
      setPaymentVoidRows([])
      setTotalPaidRub(0)

      const snapshot = await loadReadSnapshot(customerSnapshotKey)

      if (!isMounted) {
        return
      }

      if (!snapshot?.data) {
        setTransfers([])
        setCustomerPayments([])
        setTransfersError(fallbackTransfersError || getOfflineSnapshotMissingMessage('لحوالات هذا العميل'))
        setPaymentTotalsError(fallbackPaymentTotalsError)
        setTransfersLoading(false)
        setPaymentTotalsLoading(false)
        return false
      }

      setTransfers(snapshot.data.transfers || [])
      setCustomerPayments(snapshot.data.customerPayments || [])
      setPaymentVoidRows(snapshot.data.paymentVoidRows || [])
      setTotalPaidRub(Number(snapshot.data.totalPaidRub) || 0)
      setTransfersError('')
      setPaymentTotalsError('')
      setTransfersLoading(false)
      setPaymentTotalsLoading(false)
      return true
    }

    const loadTransfers = async () => {
      setTransfersLoading(true)
      setTransfersError('')
      setPaymentTotalsLoading(true)
      setPaymentTotalsError('')
      setCustomerPayments([])
      setPaymentVoidRows([])
      setTotalPaidRub(0)

      try {
        const { data, error } = await withLiveReadTimeout(
          withOrgScope(
            supabase
              .schema('public')
              .from('transfers')
              .select('id, reference_number, status, usdt_amount, market_rate, payable_rub, created_at')
              .eq('customer_id', customerId)
              .order('created_at', { ascending: false }),
            orgId
          ),
          {
            timeoutMessage: 'تعذر إكمال تحميل حوالات هذا العميل في الوقت المتوقع.',
          }
        )

        const transferIds = (data ?? []).map((transfer) => transfer.id).filter(Boolean)
        const overpaymentResolutionTransferIds =
          transferIds.length > 0
            ? transferIds
            : ['00000000-0000-0000-0000-000000000000']

        const {
          data: overpaymentResolutionRows,
          error: overpaymentResolutionError,
        } = await withLiveReadTimeout(
          withOrgScope(
            supabase
              .schema('public')
              .from('transfer_overpayment_resolutions')
              .select(TRANSFER_OVERPAYMENT_RESOLUTION_SELECT)
              .in('transfer_id', overpaymentResolutionTransferIds)
              .order('created_at', { ascending: false })
              .order('id', { ascending: false }),
            orgId
          ),
          {
            timeoutMessage:
              'تعذر إكمال تحميل حالات معالجة زيادة الدفع لهذا العميل في الوقت المتوقع.',
          }
        )

        if (!isMounted) {
          return
        }

        if (error) {
          const preferSnapshot = isOffline || isBrowserOffline() || isLikelyOfflineReadFailure(error)
          await hydrateTransfersFromSnapshot({
            fallbackTransfersError: preferSnapshot ? '' : error.message,
          })
          return
        }

        const nextTransfers = data ?? []
        setTransfers(nextTransfers)
        setTransfersLoading(false)

        if (transferIds.length === 0) {
          setCustomerPayments([])
          setPaymentVoidRows([])
          setTotalPaidRub(0)
          setPaymentTotalsLoading(false)
          return
        }

        const { data: paymentsData, error: paymentsError } = await withLiveReadTimeout(
          withOrgScope(
            supabase
              .schema('public')
              .from('transfer_payments')
              .select('id, transfer_id, amount_rub, payment_method, note, paid_at, created_at')
              .in('transfer_id', transferIds)
              .order('paid_at', { ascending: false })
              .order('created_at', { ascending: false }),
            orgId
          ),
          {
            timeoutMessage: 'تعذر إكمال تحميل سجل المدفوعات لهذا العميل في الوقت المتوقع.',
          }
        )

        const { data: paymentVoidData, error: paymentVoidsError } = await withLiveReadTimeout(
          withOrgScope(
            supabase
              .schema('public')
              .from('transfer_payment_voids')
              .select(TRANSFER_PAYMENT_VOID_SELECT)
              .in('transfer_id', transferIds)
              .order('created_at', { ascending: false })
              .order('id', { ascending: false }),
            orgId
          ),
          {
            timeoutMessage: 'تعذر إكمال تحميل حالات إلغاء الدفعات المؤكدة لهذا العميل في الوقت المتوقع.',
          }
        )

        if (!isMounted) {
          return
        }

        if (paymentsError) {
          const preferSnapshot = isOffline || isBrowserOffline() || isLikelyOfflineReadFailure(paymentsError)

          if (preferSnapshot) {
            await hydrateTransfersFromSnapshot()
            return
          }

          setCustomerPayments([])
          setPaymentVoidRows([])
          setPaymentTotalsError(
            'تعذر تحميل سجل المدفوعات لهذا العميل. سيتم عرض الإجماليات المالية عند نجاح تحميلها.'
          )
          setPaymentTotalsLoading(false)
          return
        }

        if (paymentVoidsError) {
          const preferSnapshot =
            isOffline || isBrowserOffline() || isLikelyOfflineReadFailure(paymentVoidsError)

          if (preferSnapshot) {
            await hydrateTransfersFromSnapshot()
            return
          }

          setCustomerPayments([])
          setPaymentVoidRows([])
          setPaymentTotalsError(
            'تعذر تحميل حالات إلغاء الدفعات المؤكدة لهذا العميل. سيجري عرض الإجماليات المالية عند اكتمالها.'
          )
          setPaymentTotalsLoading(false)
          return
        }

        if (overpaymentResolutionError) {
          const preferSnapshot =
            isOffline || isBrowserOffline() || isLikelyOfflineReadFailure(overpaymentResolutionError)

          if (preferSnapshot) {
            await hydrateTransfersFromSnapshot()
            return
          }

          setTransfers([])
          setTransfersError(
            overpaymentResolutionError.message ||
              'تعذر تحميل حالات معالجة زيادة الدفع لهذا العميل في الوقت الحالي.'
          )
          setCustomerPayments([])
          setPaymentVoidRows([])
          setTotalPaidRub(0)
          setTransfersLoading(false)
          setPaymentTotalsLoading(false)
          return
        }

        const nextPayments = paymentsData ?? []
        const nextPaymentVoidRows = paymentVoidData ?? []
        const { totalActivePaidRub } = deriveConfirmedPaymentState({
          payments: nextPayments,
          paymentVoids: nextPaymentVoidRows,
        })
        const latestOverpaymentResolutionByTransferId = buildLatestOverpaymentResolutionMap(
          overpaymentResolutionRows ?? []
        )
        const nextTransfersWithOverpaymentResolution = nextTransfers.map((transfer) => ({
          ...transfer,
          latestOverpaymentResolution: latestOverpaymentResolutionByTransferId[transfer.id] || null,
        }))

        setTransfers(nextTransfersWithOverpaymentResolution)
        setCustomerPayments(nextPayments)
        setPaymentVoidRows(nextPaymentVoidRows)
        setTotalPaidRub(totalActivePaidRub)
        setPaymentTotalsLoading(false)
      } catch (error) {
        if (!isMounted) {
          return
        }

        const preferSnapshot = isOffline || isBrowserOffline() || isLikelyOfflineReadFailure(error)

        await hydrateTransfersFromSnapshot({
          fallbackTransfersError: preferSnapshot ? '' : error.message,
        })
      }
    }

    if (isOffline) {
      hydrateTransfersFromSnapshot()
    } else {
      loadTransfers()
    }

    return () => {
      isMounted = false
    }
  }, [
    customer,
    customerError,
    customerId,
    customerLoading,
    customerNotFound,
    customerSnapshotKey,
    isConfigured,
    isOffline,
    orgId,
    transfersRefreshKey,
  ])

  const handleTransfersRefresh = () => {
    setTransfersRefreshKey((current) => current + 1)
  }

  useEffect(() => {
    if (
      isOffline ||
      !customerId ||
      customerLoading ||
      transfersLoading ||
      paymentTotalsLoading ||
      customerNotFound ||
      !customer ||
      customerError ||
      transfersError ||
      paymentTotalsError
    ) {
      return
    }

    let isMounted = true

    const persistSnapshot = async () => {
      const savedSnapshot = await saveReadSnapshot({
        key: customerSnapshotKey,
        scope: `customer-details:${customerId}`,
        type: 'customer_details',
        data: {
          customer,
          customerPayments,
          paymentVoidRows,
          totalPaidRub,
          transfers,
        },
      })

      if (!isMounted) {
        return
      }

      markLiveSnapshot(savedSnapshot?.savedAt || '')
    }

    persistSnapshot()

    return () => {
      isMounted = false
    }
  }, [
    customer,
    customerError,
    customerId,
    customerLoading,
    customerNotFound,
    customerPayments,
    customerSnapshotKey,
    isOffline,
    markLiveSnapshot,
    paymentVoidRows,
    paymentTotalsError,
    paymentTotalsLoading,
    totalPaidRub,
    transfers,
    transfersError,
    transfersLoading,
  ])

  const { activePayments: activeCustomerPayments } = deriveConfirmedPaymentState({
    payments: customerPayments,
    paymentVoids: paymentVoidRows,
  })
  const paymentsByTransfer = new Map(
    Object.entries(buildActivePaymentTotalsByTransfer(activeCustomerPayments))
  )

  const totalsReady = !paymentTotalsLoading && !paymentTotalsError
  const customerUnavailable = customerNotFound || Boolean(customerError)
  const editDisabled = !isEditingCustomer && (isOffline || customerUnavailable || !customer)
  const isArchivedCustomer = Boolean(customer?.is_archived)

  useEffect(() => {
    setIsEditingCustomer(false)
    setEditFormValues(createEmptyCustomerForm())
    setEditSubmitting(false)
    setEditSubmitError('')
    setEditSubmitSuccess('')
    setPendingLifecycleAction('')
    setLifecycleSubmitting(false)
    setLifecycleSubmitError('')
    setLifecycleSubmitSuccess('')
  }, [customerId])

  useEffect(() => {
    if (isEditingCustomer) {
      return
    }

    setEditFormValues(customer ? createCustomerFormValues(customer) : createEmptyCustomerForm())
  }, [customer, isEditingCustomer])

  const handleEditFormChange = (event) => {
    const { name, value } = event.target

    setEditFormValues((current) => ({
      ...current,
      [name]: value,
    }))

    if (editSubmitError) {
      setEditSubmitError('')
    }

    if (editSubmitSuccess) {
      setEditSubmitSuccess('')
    }
  }

  const handleCloseEditCustomer = () => {
    setIsEditingCustomer(false)
    setEditSubmitting(false)
    setEditSubmitError('')
    setEditSubmitSuccess('')
    setEditFormValues(customer ? createCustomerFormValues(customer) : createEmptyCustomerForm())
  }

  const handleToggleEditCustomer = () => {
    if (isEditingCustomer) {
      handleCloseEditCustomer()
      return
    }

    setActiveSection('actions')
    setPendingLifecycleAction('')
    setLifecycleSubmitError('')
    setLifecycleSubmitSuccess('')
    setIsEditingCustomer(true)
    setEditSubmitError('')
    setEditSubmitSuccess('')
    setEditFormValues(customer ? createCustomerFormValues(customer) : createEmptyCustomerForm())
  }

  const handlePrepareLifecycleAction = (action) => {
    setActiveSection('actions')
    setIsEditingCustomer(false)
    setEditSubmitting(false)
    setEditSubmitError('')
    setEditSubmitSuccess('')
    setPendingLifecycleAction(action)
    setLifecycleSubmitError('')
    setLifecycleSubmitSuccess('')
  }

  const handleCancelLifecycleAction = () => {
    setPendingLifecycleAction('')
    setLifecycleSubmitting(false)
    setLifecycleSubmitError('')
    setLifecycleSubmitSuccess('')
  }

  const handleEditCustomerSubmit = async (event) => {
    event.preventDefault()

    if (isOffline) {
      setEditSubmitError('تعديل بيانات العميل متاح أثناء الاتصال فقط حاليا.')
      setEditSubmitSuccess('')
      return
    }

    if (!isConfigured || !supabase) {
      setEditSubmitError(configError || 'تعذر الاتصال بقاعدة البيانات حاليا.')
      setEditSubmitSuccess('')
      return
    }

    if (!orgId) {
      setEditSubmitError(MISSING_CURRENT_ORG_MESSAGE)
      setEditSubmitSuccess('')
      return
    }

    if (!customerId || !customer) {
      setEditSubmitError('تعذر تحديد ملف العميل المطلوب تحديثه.')
      setEditSubmitSuccess('')
      return
    }

    const payload = normalizeCustomerProfilePayload(editFormValues)
    const validationError = validateCustomerProfilePayload(payload)

    if (validationError) {
      setEditSubmitError(validationError)
      setEditSubmitSuccess('')
      return
    }

    setEditSubmitting(true)
    setEditSubmitError('')
    setEditSubmitSuccess('')

    try {
      const { data, error } = await supabase
        .schema('public')
        .from('customers')
        .update(withStampedOrg(payload, orgId))
        .eq('id', customerId)
        .eq('org_id', orgId)
        .select('id, full_name, phone, notes, is_archived, archived_at, created_at')
        .maybeSingle()

      if (error) {
        throw error
      }

      if (!data) {
        throw new Error('تعذر حفظ تعديلات العميل في الوقت الحالي.')
      }

      const nextCustomer = {
        ...customer,
        ...data,
      }

      setCustomer(nextCustomer)
      setEditFormValues(createCustomerFormValues(nextCustomer))
      setEditSubmitSuccess('تم تحديث بيانات العميل بنجاح.')

      try {
        await syncEditedCustomerSnapshots(nextCustomer, orgId)
      } catch (snapshotError) {
        console.error('Failed to sync edited customer snapshots', snapshotError)
      }
    } catch (error) {
      setEditSubmitError(error?.message || 'تعذر حفظ تعديلات العميل في الوقت الحالي.')
    } finally {
      setEditSubmitting(false)
    }
  }

  const handleCustomerLifecycleSubmit = async () => {
    if (isOffline) {
      setLifecycleSubmitError('إدارة أرشفة العميل أو حذفه متاحة أثناء الاتصال فقط حاليا.')
      setLifecycleSubmitSuccess('')
      return
    }

    if (!isConfigured || !supabase) {
      setLifecycleSubmitError(configError || 'تعذر الاتصال بقاعدة البيانات حاليا.')
      setLifecycleSubmitSuccess('')
      return
    }

    if (!orgId) {
      setLifecycleSubmitError(MISSING_CURRENT_ORG_MESSAGE)
      setLifecycleSubmitSuccess('')
      return
    }

    if (!customerId || !customer || !pendingLifecycleAction) {
      setLifecycleSubmitError('تعذر تحديد ملف العميل المطلوب تحديث حالته.')
      setLifecycleSubmitSuccess('')
      return
    }

    setLifecycleSubmitting(true)
    setLifecycleSubmitError('')
    setLifecycleSubmitSuccess('')

    try {
      const { count, error: countError } = await supabase
        .schema('public')
        .from('transfers')
        .select('id', { count: 'exact', head: true })
        .eq('customer_id', customerId)
        .eq('org_id', orgId)

      if (countError) {
        throw countError
      }

      const linkedTransfersCount = Number(count) || 0

      if (pendingLifecycleAction === 'delete' && linkedTransfersCount > 0) {
        setPendingLifecycleAction('archive')
        setLifecycleSubmitError('هذا العميل مرتبط بحوالات موجودة، لذلك تم تحويل الإجراء إلى الأرشفة بدلا من الحذف النهائي.')
        return
      }

      if (pendingLifecycleAction === 'archive' && linkedTransfersCount === 0) {
        setPendingLifecycleAction('delete')
        setLifecycleSubmitError('لا توجد حوالات مرتبطة بهذا العميل حاليا، ويمكنك حذفه نهائيا بدلا من أرشفته.')
        return
      }

      if (pendingLifecycleAction === 'delete') {
        const { data: deletedCustomer, error: deleteError } = await supabase
          .schema('public')
          .from('customers')
          .delete()
          .eq('id', customerId)
          .eq('org_id', orgId)
          .select('id')
          .maybeSingle()

        if (deleteError) {
          throw deleteError
        }

        if (!deletedCustomer) {
          throw new Error('تعذر حذف ملف العميل في الوقت الحالي.')
        }

        try {
          await syncDeletedCustomerSnapshots(customerId, orgId)
        } catch (snapshotError) {
          console.error('Failed to sync deleted customer snapshots', snapshotError)
        }

        navigate('/customers', {
          replace: true,
          state: {
            customerLifecycleMessage: 'تم حذف ملف العميل نهائيا لأنه لا يحتوي على حوالات مرتبطة.',
          },
        })
        return
      }

      const archivePayload = {
        archived_at: new Date().toISOString(),
        is_archived: true,
      }

      const { data, error } = await supabase
        .schema('public')
        .from('customers')
        .update(withStampedOrg(archivePayload, orgId))
        .eq('id', customerId)
        .eq('org_id', orgId)
        .select('id, full_name, phone, notes, is_archived, archived_at, created_at')
        .maybeSingle()

      if (error) {
        throw error
      }

      if (!data) {
        throw new Error('تعذر تحديث حالة أرشفة العميل في الوقت الحالي.')
      }

      const nextCustomer = {
        ...customer,
        ...data,
      }

      setCustomer(nextCustomer)
      setPendingLifecycleAction('')
      setLifecycleSubmitSuccess('تمت أرشفة العميل بنجاح. سيبقى متاحا للمراجعة التاريخية فقط ولن يظهر ضمن الاختيارات التشغيلية النشطة.')

      try {
        await syncArchivedCustomerSnapshots(nextCustomer, orgId)
      } catch (snapshotError) {
        console.error('Failed to sync archived customer snapshots', snapshotError)
      }
    } catch (error) {
      setLifecycleSubmitError(error?.message || 'تعذر تحديث حالة العميل في الوقت الحالي.')
    } finally {
      setLifecycleSubmitting(false)
    }
  }

  const enrichedTransfers = transfers
    .map((transfer) => {
      const normalizedStatus = String(transfer.status || '').toLowerCase()
      const transferPaidRub = totalsReady ? paymentsByTransfer.get(transfer.id) || 0 : null
      const {
        remainingRub,
        isOverpaid,
        isResolvedOverpaid,
        isUnresolvedOverpaid,
      } = deriveTransferOverpaymentState({
        payableRub: transfer.payable_rub,
        confirmedPaidRub: transferPaidRub,
        latestResolution: transfer.latestOverpaymentResolution || null,
      })
      const isSettled =
        remainingRub !== null ? Math.abs(remainingRub) <= 0.009 : normalizedStatus === 'paid'
      const isPartialFollowUp =
        remainingRub !== null
          ? transferPaidRub > 0.009 && remainingRub > 0.009
          : normalizedStatus === 'partial' || normalizedStatus === 'partially_paid'
      const isOpenFollowUp =
        remainingRub !== null ? transferPaidRub <= 0.009 && remainingRub > 0.009 : normalizedStatus === 'open'

      const queueLabel = isUnresolvedOverpaid
        ? 'مراجعة مالية'
        : isResolvedOverpaid
          ? 'معالجة مسجلة'
        : isResolvedOverpaid
          ? `يوجد رصيد سالب تاريخي على هذه الحوالة بمقدار ${formatNumber(Math.abs(remainingRub), 2)} RUB، لكن تمت معالجة هذه الزيادة تشغيلها بالفعل.`
        : isPartialFollowUp
          ? 'تحصيل جزئي'
          : isOpenFollowUp
            ? 'بانتظار أول دفعة'
            : isSettled
              ? 'مستقرة'
              : 'متابعة عادية'

      const queueClassName = isUnresolvedOverpaid
        ? 'queue-chip--danger'
        : isResolvedOverpaid
          ? 'queue-chip--neutral'
        : isPartialFollowUp
          ? 'queue-chip--warning'
          : isOpenFollowUp
            ? 'queue-chip--neutral'
            : 'queue-chip--success'

      const cardClassName = isUnresolvedOverpaid
        ? 'transfer-queue-card--danger'
        : isPartialFollowUp
          ? 'transfer-queue-card--warning'
          : isOpenFollowUp
            ? 'transfer-queue-card--open'
            : ''

      const remainingCardClassName = isOverpaid
        ? 'info-card--danger'
        : isSettled
          ? 'info-card--success'
          : isPartialFollowUp || isOpenFollowUp
            ? 'info-card--accent'
            : ''

      const remainingValueClassName = isOverpaid
        ? 'info-card-value--danger'
        : isSettled
          ? 'info-card-value--success'
          : 'info-card-value--metric'

      const followUpNote = isUnresolvedOverpaid
        ? `يوجد رصيد سالب على هذه الحوالة بمقدار ${formatNumber(Math.abs(remainingRub), 2)} RUB ويتطلب مراجعة.`
        : isPartialFollowUp
          ? `تم تحصيل ${formatNumber(transferPaidRub, 2)} RUB وما زال المتبقي ${formatNumber(remainingRub, 2)} RUB.`
          : isOpenFollowUp
            ? 'لم تسجل أي دفعة بعد على هذه الحوالة، وتنتظر بدء التحصيل.'
            : isSettled
              ? 'هذه الحوالة تبدو مستقرة حاليا ولا تتطلب متابعة مالية عاجلة.'
              : 'حوالة للمتابعة العامة والرجوع إلى التفاصيل عند الحاجة.'

      const operationalQueueLabel = isResolvedOverpaid ? 'معالجة مسجلة' : queueLabel
      const operationalFollowUpNote = isResolvedOverpaid
        ? `يوجد رصيد سالب تاريخي على هذه الحوالة بمقدار ${formatNumber(Math.abs(remainingRub), 2)} RUB، لكن تمت معالجة هذه الزيادة تشغيلها بالفعل.`
        : followUpNote

      return {
        id: transfer.id ?? transfer.created_at,
        to: transfer.id ? `/transfers/${transfer.id}` : '/transfers',
        title: transfer.reference_number || (transfer.id ? `حوالة #${transfer.id}` : 'حوالة'),
        internalId: transfer.id || '--',
        createdAtLabel: formatDate(transfer.created_at),
        ageLabel: formatAgeLabel(transfer.created_at),
        status: transfer.status,
        referenceNumber: transfer.reference_number || 'قيد التخصيص',
        usdtAmountLabel: formatNumber(transfer.usdt_amount, 2),
        marketRateLabel: formatNumber(transfer.market_rate, 4),
        payableRubLabel: `${formatNumber(transfer.payable_rub, 2)} RUB`,
        totalPaidRubLabel:
          transferPaidRub === null ? '--' : `${formatNumber(transferPaidRub, 2)} RUB`,
        remainingRubLabel:
          remainingRub === null
            ? '--'
            : isOverpaid
              ? `-${formatNumber(Math.abs(remainingRub), 2)} RUB`
              : isSettled
                ? 'مسددة'
                : `${formatNumber(remainingRub, 2)} RUB`,
        remainingCardClassName,
        remainingValueClassName,
        queueLabel: operationalQueueLabel,
        queueClassName,
        cardClassName,
        followUpNote: operationalFollowUpNote,
        isOverpaid,
        isResolvedOverpaid,
        isUnresolvedOverpaid,
        isPartialFollowUp,
        isOpenFollowUp,
        isSettled,
        totalPaidRub: transferPaidRub,
        remainingRub,
        createdAt: transfer.created_at,
      }
    })
    .sort((left, right) => {
      const priorityDifference = getTransferPriority(left) - getTransferPriority(right)

      if (priorityDifference !== 0) {
        return priorityDifference
      }

      return new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime()
    })

  const totalTransfers = transfers.length
  const totalPayableRub = roundCurrency(
    transfers.reduce((total, transfer) => total + (Number(transfer.payable_rub) || 0), 0)
  )
  const totalRemainingRub = totalsReady ? roundCurrency(totalPayableRub - totalPaidRub) : null
  const totalsAreOverpaid = totalsReady && totalRemainingRub < -0.009
  const totalsAreSettled = totalsReady && Math.abs(totalRemainingRub) <= 0.009
  const openTransfersCount = enrichedTransfers.filter((transfer) => transfer.isOpenFollowUp).length
  const partialTransfersCount = enrichedTransfers.filter((transfer) => transfer.isPartialFollowUp).length
  const overpaidTransfersCount = enrichedTransfers.filter(
    (transfer) => transfer.isUnresolvedOverpaid
  ).length
  const settledTransfersCount = enrichedTransfers.filter((transfer) => transfer.isSettled).length
  const activeTransfersCount = openTransfersCount + partialTransfersCount
  const canCreateTransfer = Boolean(customerId) && !customerUnavailable && !isArchivedCustomer
  const canDeleteCustomer = Boolean(customer) && !customerUnavailable && totalTransfers === 0
  const canArchiveCustomer =
    Boolean(customer) && !customerUnavailable && totalTransfers > 0 && !isArchivedCustomer
  const filteredTransfers = enrichedTransfers.filter((transfer) =>
    matchesTransferStatusFilter(transfer.status, transferStatusFilter)
  )

  const transferGroups = [
    {
      key: 'overpaid',
      title: 'تحتاج مراجعة مالية عاجلة',
      description: 'هذه الحوالات تحمل زيادة دفع أو رصيدا سالبا وتتطلب تدخلا مباشرا.',
      tone: 'danger',
      items: filteredTransfers.filter((transfer) => transfer.isUnresolvedOverpaid),
    },
    {
      key: 'partial',
      title: 'تحصيل جزئي قيد المتابعة',
      description: 'دفعات مسجلة وما زالت هذه الحوالات تحتاج استكمال التحصيل.',
      tone: 'warning',
      items: filteredTransfers.filter(
        (transfer) => !transfer.isUnresolvedOverpaid && transfer.isPartialFollowUp
      ),
    },
    {
      key: 'open',
      title: 'بانتظار أول دفعة',
      description: 'حوالات قائمة لم تبدأ عليها حركة تحصيل بعد.',
      tone: 'default',
      items: filteredTransfers.filter(
        (transfer) =>
          !transfer.isUnresolvedOverpaid && !transfer.isPartialFollowUp && transfer.isOpenFollowUp
      ),
    },
    {
      key: 'other',
      title: 'حوالات مستقرة أو أقل أولوية',
      description: 'سجلات أخرى يمكن الرجوع إليها عند الحاجة.',
      tone: 'default',
      items: filteredTransfers.filter(
        (transfer) =>
          !transfer.isUnresolvedOverpaid &&
          !transfer.isPartialFollowUp &&
          !transfer.isOpenFollowUp
      ),
    },
  ].filter((group) => group.items.length > 0)

  const recentActivityItems = [
    ...activeCustomerPayments.map((payment) => {
      const matchingTransfer = transfers.find((transfer) => transfer.id === payment.transfer_id)
      const referenceNumber =
        matchingTransfer?.reference_number || (payment.transfer_id ? `حوالة #${payment.transfer_id}` : 'حوالة')
      const activityTime = payment.paid_at || payment.created_at

      return {
        id: `payment-${payment.id ?? `${payment.transfer_id}-${payment.created_at}`}`,
        to: payment.transfer_id ? `/transfers/${payment.transfer_id}` : '/transfers',
        eyebrow: 'دفعة',
        title: `${formatNumber(payment.amount_rub, 2)} RUB`,
        subtitle: referenceNumber,
        metaItems: [
          { label: 'وسيلة الدفع', value: getPaymentMethodLabel(payment.payment_method) },
          { label: 'وقت الحركة', value: formatAgeLabel(activityTime), className: 'detail-mobile-secondary' },
        ],
        badgeLabel: 'تحصيل',
        badgeClassName: 'activity-chip--warning',
        timeLabel: formatDate(activityTime),
        noteText: payment.note || `دفعة مرتبطة بالحوالة ${referenceNumber}.`,
        eventAt: new Date(activityTime || 0).getTime(),
        cardClassName: 'customer-activity-card--payment',
      }
    }),
    ...transfers.map((transfer) => ({
      id: `transfer-${transfer.id ?? transfer.created_at}`,
      to: transfer.id ? `/transfers/${transfer.id}` : '/transfers',
      eyebrow: 'حوالة',
      title: transfer.reference_number || (transfer.id ? `حوالة #${transfer.id}` : 'حوالة جديدة'),
      subtitle: getTransferStatusMeta(transfer.status).label,
      metaItems: [
        { label: 'قيمة التسوية', value: `${formatNumber(transfer.payable_rub, 2)} RUB` },
        { label: 'العمر التشغيلي', value: formatAgeLabel(transfer.created_at), className: 'detail-mobile-secondary' },
      ],
      badgeLabel: 'حوالة جديدة',
      badgeClassName: 'activity-chip--success',
      timeLabel: formatDate(transfer.created_at),
      noteText: 'تم إنشاء حوالة ضمن ملف هذا العميل ويمكن الانتقال إلى تفاصيلها مباشرة.',
      eventAt: new Date(transfer.created_at || 0).getTime(),
      cardClassName: 'customer-activity-card--transfer',
    })),
  ]
    .sort((left, right) => right.eventAt - left.eventAt)
    .slice(0, 8)

  const customerStateTone = overpaidTransfersCount > 0
    ? 'danger'
    : partialTransfersCount > 0
      ? 'warning'
      : openTransfersCount > 0
        ? 'accent'
        : totalsAreSettled
          ? 'success'
          : 'neutral'

  const customerStateLabel = customerUnavailable
    ? 'الملف غير متاح'
    : overpaidTransfersCount > 0
      ? 'يتطلب مراجعة مالية'
      : partialTransfersCount > 0
        ? 'تحصيل جزئي قيد المتابعة'
        : openTransfersCount > 0
          ? 'بانتظار بدء التحصيل'
          : totalsAreSettled
            ? 'مستقر'
            : 'متابعة عامة'

  const pageDescription = customerUnavailable
    ? 'راجع ملف العميل وإجمالياته المالية وحركة حوالاته من شاشة تشغيل واحدة.'
    : overpaidTransfersCount > 0
      ? `يوجد ${overpaidTransfersCount} حوالة تحتاج مراجعة مالية عاجلة لهذا العميل.`
      : partialTransfersCount > 0
        ? `يوجد ${partialTransfersCount} حوالة بتحصيل جزئي وما زالت بحاجة إلى متابعة.`
        : openTransfersCount > 0
          ? `يوجد ${openTransfersCount} حوالة بانتظار أول دفعة لهذا العميل.`
          : totalsAreSettled
            ? 'هذا العميل يبدو مستقرا حاليا ولا توجد متابعة مالية عاجلة عبر حوالاته الحالية.'
            : 'راجع ملف العميل وحوالاته وإجمالياته المالية من شاشة متابعة واحدة.'

  const resolvedCustomerStateTone = isArchivedCustomer ? 'neutral' : customerStateTone
  const resolvedCustomerStateLabel = isArchivedCustomer ? 'مؤرشف' : customerStateLabel
  const resolvedPageDescription = isArchivedCustomer
    ? customer?.archived_at
      ? `تمت أرشفة هذا العميل في ${formatDate(customer.archived_at)} للاحتفاظ بسجل حوالاته ومراجعته تاريخيا. لن يظهر ضمن اختيارات إنشاء الحوالات الجديدة.`
      : 'تمت أرشفة هذا العميل للاحتفاظ بسجل حوالاته ومراجعته تاريخيا. لن يظهر ضمن اختيارات إنشاء الحوالات الجديدة.'
    : pageDescription

  const totalPaidValue = paymentTotalsLoading
    ? 'جار التحميل...'
    : paymentTotalsError
      ? '--'
      : `${formatNumber(totalPaidRub, 2)} RUB`

  const totalRemainingValue = paymentTotalsLoading
    ? 'جار التحميل...'
    : paymentTotalsError
      ? '--'
      : totalsAreOverpaid
        ? `-${formatNumber(Math.abs(totalRemainingRub), 2)} RUB`
        : totalsAreSettled
          ? 'مسدد'
          : `${formatNumber(totalRemainingRub, 2)} RUB`

  const customerSummaryHighlightItems = customerUnavailable
    ? []
    : [
        {
          title: 'إجمالي المستحق',
          value: `${formatNumber(totalPayableRub, 2)} RUB`,
          className: 'info-card--accent',
          valueClassName: 'info-card-value--metric',
        },
        {
          title: 'إجمالي المدفوع',
          value: totalPaidValue,
          valueClassName: 'info-card-value--metric',
        },
        {
          title: 'إجمالي المتبقي',
          value: totalRemainingValue,
          className: totalsAreOverpaid
            ? 'info-card--danger'
            : totalsAreSettled
              ? 'info-card--success'
              : 'info-card--accent',
          valueClassName: [
            'info-card-value--metric',
            totalsAreOverpaid
              ? 'info-card-value--danger'
              : totalsAreSettled
                ? 'info-card-value--success'
                : '',
          ]
            .filter(Boolean)
            .join(' '),
        },
        {
          title: 'الحوالات التي تتطلب متابعة',
          value: activeTransfersCount,
          className: activeTransfersCount > 0 ? 'info-card--accent' : 'info-card--success',
          valueClassName: 'info-card-value--metric',
        },
        {
          title: 'حوالات تحتاج مراجعة',
          value: overpaidTransfersCount,
          className: overpaidTransfersCount > 0 ? 'info-card--danger' : '',
          valueClassName: [
            'info-card-value--metric',
            overpaidTransfersCount > 0 ? 'info-card-value--danger' : '',
          ]
            .filter(Boolean)
            .join(' '),
        },
      ]

  const customerSummaryItems = customer
    ? [
        { title: 'رقم الهاتف', value: customer.phone || 'غير مضاف' },
        { title: 'تاريخ إنشاء الملف', value: formatDate(customer.created_at) },
        { title: 'إجمالي الحوالات', value: totalTransfers, valueClassName: 'info-card-value--metric' },
        {
          title: 'ملاحظات',
          value: customer.notes || 'لا توجد ملاحظات داخلية.',
          className: 'info-card--full',
        },
      ]
    : []

  const customerSummaryItemsResolved = customerSummaryItems.length > 0
    ? [
        { title: 'تاريخ إنشاء الملف', value: formatDate(customer.created_at) },
        { title: 'حالة الملف', value: isArchivedCustomer ? 'مؤرشف' : 'نشط' },
        ...(isArchivedCustomer
          ? [{ title: 'تاريخ الأرشفة', value: formatDate(customer.archived_at) }]
          : []),
        { title: 'إجمالي الحوالات', value: totalTransfers, valueClassName: 'info-card-value--metric' },
        {
          title: 'ملاحظات',
          value: customer.notes || 'لا توجد ملاحظات داخلية.',
          className: 'info-card--full',
        },
      ]
    : []

  const totalMetrics = [
    {
      label: 'إجمالي الحوالات',
      value: customerNotFound ? '--' : transfersLoading && transfers.length === 0 ? 'جار التحميل...' : totalTransfers,
      tone: 'brand',
    },
    {
      label: 'مفتوحة بانتظار التحصيل',
      value: customerNotFound ? '--' : openTransfersCount,
      tone: openTransfersCount > 0 ? 'warning' : 'default',
    },
    {
      label: 'تحصيل جزئي',
      value: customerNotFound ? '--' : partialTransfersCount,
      tone: partialTransfersCount > 0 ? 'warning' : 'default',
    },
    {
      label: 'تحتاج مراجعة',
      value: customerNotFound ? '--' : overpaidTransfersCount,
      tone: overpaidTransfersCount > 0 ? 'danger' : 'default',
    },
    {
      label: 'مستقرة / مسددة',
      value: customerNotFound ? '--' : settledTransfersCount,
      tone: settledTransfersCount > 0 ? 'success' : 'default',
    },
  ]

  const followUpTitle = customerUnavailable
    ? 'جار تجهيز حالة المتابعة'
    : overpaidTransfersCount > 0
      ? 'مراجعة مالية مطلوبة لهذا العميل'
      : partialTransfersCount > 0
        ? 'تحصيل جزئي قيد المتابعة'
        : openTransfersCount > 0
          ? 'هناك حوالات تنتظر أول دفعة'
          : totalsAreSettled
            ? 'لا توجد متابعة مالية عاجلة حاليا'
            : 'متابعة عامة لحساب العميل'

  const followUpDescription = customerUnavailable
    ? 'يتم تجهيز حالة متابعة العميل الحالية.'
    : overpaidTransfersCount > 0
      ? `يوجد ${overpaidTransfersCount} حوالة برصيد سالب أو زيادة دفع. الأولوية الآن لمراجعة هذه السجلات قبل أي تحصيل إضافي.`
      : partialTransfersCount > 0
        ? `يوجد ${partialTransfersCount} حوالة بتحصيل جزئي. الخطوة التالية هي متابعة العميل لاستكمال التحصيل المفتوح.`
        : openTransfersCount > 0
          ? `يوجد ${openTransfersCount} حوالة لم تبدأ عليها حركة تحصيل بعد. الخطوة التالية هي تسجيل أول دفعة أو متابعة العميل.`
          : totalsAreSettled
            ? 'كل الحوالات الحالية تبدو مستقرة أو مسددة، ولا توجد متابعة مالية عاجلة الآن.'
            : 'يوصى بمراجعة أحدث الحوالات والحركات المالية لهذا العميل عند الحاجة.'

  const followUpItems = customerUnavailable
    ? []
    : [
        {
          title: 'الإجراء التالي',
          value: overpaidTransfersCount > 0
            ? 'راجع الحوالات ذات الزيادة أولا'
            : partialTransfersCount > 0
              ? 'استكمل التحصيل على الحوالات الجزئية'
              : openTransfersCount > 0
                ? 'ابدأ أول دفعة على الحوالات المفتوحة'
                : 'لا توجد متابعة عاجلة حاليا',
          className: overpaidTransfersCount > 0
            ? 'info-card--danger'
            : partialTransfersCount > 0 || openTransfersCount > 0
              ? 'info-card--accent'
              : 'info-card--success',
          children: (
            <p
              className={[
                'support-text',
                overpaidTransfersCount > 0 ? 'text-danger' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {overpaidTransfersCount > 0
                ? 'يجب معالجة الحوالات ذات الرصيد السالب قبل أي متابعة روتينية أخرى.'
                : partialTransfersCount > 0
                  ? 'التركيز الحالي على استكمال التحصيل المفتوح عبر حوالات هذا العميل.'
                  : openTransfersCount > 0
                    ? 'ابدأ بالحوالات التي لم تسجل عليها أي دفعة حتى الآن.'
                    : 'العميل لا يظهر حالة متابعة مالية حرجة حاليا.'}
            </p>
          ),
        },
        {
          title: 'آخر حركة',
          value: recentActivityItems[0]?.title || 'لا توجد حركة حديثة',
          children: (
            <p className="support-text">
              {recentActivityItems[0]
                ? `${recentActivityItems[0].subtitle} • ${recentActivityItems[0].timeLabel}`
                : 'لا توجد دفعات أو حوالات حديثة مرتبطة بهذا العميل حتى الآن.'}
            </p>
          ),
        },
        {
          title: 'الوضع العام',
          value: customerStateLabel,
          children: (
            <p className="support-text">
              {paymentTotalsError
                ? 'تم عرض حالة المتابعة بالاعتماد على الحوالات الحالية، وسيكتمل الملخص المالي بعد تحميل المدفوعات.'
                : `إجمالي المتبقي الحالي عبر كل حوالات العميل هو ${totalRemainingValue}.`}
            </p>
          ),
        },
      ]

  const followUpChips = customerUnavailable
    ? []
    : [
        {
          label: 'مفتوحة',
          value: openTransfersCount,
          className: openTransfersCount > 0 ? 'queue-chip--neutral' : 'queue-chip--success',
        },
        {
          label: 'جزئية',
          value: partialTransfersCount,
          className: partialTransfersCount > 0 ? 'queue-chip--warning' : 'queue-chip--success',
        },
        {
          label: 'تحتاج مراجعة',
          value: overpaidTransfersCount,
          className: overpaidTransfersCount > 0 ? 'queue-chip--danger' : 'queue-chip--success',
        },
      ]

  const queueWarningMessage = paymentTotalsError
    ? 'تعذر تحميل بيانات المدفوعات؛ تم ترتيب الحوالات اعتمادا على حالتها الحالية مع إخفاء بعض الإشارات المالية الدقيقة.'
    : ''

  const recentActivityWarningMessage = paymentTotalsError
    ? 'تعذر تحميل سجل المدفوعات؛ يتم عرض أحدث الحوالات فقط، وسيظهر سجل الحركة الكامل بعد نجاح تحميل المدفوعات.'
    : ''

  const transfersSectionCount = customerNotFound ? 0 : totalTransfers
  const activitySectionCount = customerNotFound ? 0 : recentActivityItems.length
  const actionsSectionCount = customerNotFound ? 0 : canCreateTransfer ? 4 : 3

  const sectionNavItems = CUSTOMER_DETAILS_SECTIONS.map((section) => {
    if (section.key === 'overview') {
      return {
        ...section,
        countLabel: customerNotFound ? '--' : totalTransfers,
        tone:
          resolvedCustomerStateTone === 'danger'
            ? 'danger'
            : resolvedCustomerStateTone === 'warning'
              ? 'warning'
              : 'brand',
      }
    }

    if (section.key === 'transfers') {
      return {
        ...section,
        countLabel: transfersSectionCount,
        tone: transfersSectionCount > 0 ? 'brand' : 'neutral',
      }
    }

    if (section.key === 'activity') {
      return {
        ...section,
        countLabel: activitySectionCount,
        tone: activitySectionCount > 0 ? 'brand' : 'neutral',
      }
    }

    return {
      ...section,
      countLabel: actionsSectionCount,
      tone: 'neutral',
    }
  })

  return (
    <div className="stack customer-details-page">
      <PageHeader
        className="customer-details-page-hero"
        eyebrow="العميل"
        title={customer?.full_name || 'ملف العميل'}
        description={resolvedPageDescription}
        actions={
          <>
            <Link className="button secondary" to="/customers">
              العودة إلى العملاء
            </Link>
            {customerId ? (
              <Link className="button primary" to={`/transfers/new?customerId=${customerId}`}>
                حوالة جديدة للعميل
              </Link>
            ) : null}
            <button
              type="button"
              className="button secondary"
              onClick={handleToggleEditCustomer}
              disabled={editDisabled}
            >
              {isEditingCustomer
                ? '\u0625\u063a\u0644\u0627\u0642 \u0627\u0644\u062a\u0639\u062f\u064a\u0644'
                : '\u062a\u0639\u062f\u064a\u0644 \u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u0639\u0645\u064a\u0644'}
            </button>
            <button type="button" className="button secondary" onClick={handleTransfersRefresh}>
              تحديث الحوالات
            </button>
          </>
        }
      />

      <OfflineSnapshotNotice snapshotState={snapshotState} />

      <div className="app-section-nav-shell">
        <nav className="app-section-nav" aria-label="أقسام صفحة العميل">
          {sectionNavItems.map((section) => {
            const isActiveSection = activeSection === section.key

            return (
              <button
                key={section.key}
                type="button"
                className={[
                  'app-section-tab app-section-tab--row',
                  isActiveSection ? 'active' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                aria-pressed={isActiveSection}
                onClick={() => setActiveSection(section.key)}
              >
                <span className="app-section-tab-copy">
                  <strong>{section.label}</strong>
                  <small>{section.description}</small>
                </span>
                <span
                  className={[
                    'app-section-tab-count',
                    `app-section-tab-count--${section.tone}`,
                  ].join(' ')}
                >
                  {section.countLabel}
                </span>
              </button>
            )
          })}
        </nav>
      </div>

      <div className="app-section-workspace">
        <SectionCard
          title="لوحة المتابعة المالية للعميل"
          description="افهم وضع العميل المالي خلال ثوان: إجمالي المستحق، المدفوع، المتبقي، وما يحتاج متابعة الآن."
          className={[
            'app-section-panel',
            'customer-details-summary-section',
            activeSection === 'overview' ? 'is-active' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <CustomerSummary
            errorMessage={customerError}
            loading={customerLoading}
            notFound={customerNotFound}
            hasCustomer={Boolean(customer)}
            title={customer?.full_name || 'عميل بدون اسم'}
            subtitle={customer?.phone || 'لا يوجد رقم هاتف مسجل'}
            metaItems={[]}
            recordHeaderClassName="customer-details-identity"
            aside={
              <span
                className={[
                  'queue-chip',
                  `queue-chip--${resolvedCustomerStateTone === 'accent' ? 'neutral' : resolvedCustomerStateTone}`,
                ].join(' ')}
              >
                {resolvedCustomerStateLabel}
              </span>
            }
            highlightItems={customerSummaryHighlightItems}
            items={[]}
          />

          {!customerNotFound ? (
            <CustomerFollowUpPanel
              title={followUpTitle}
              description={followUpDescription}
              tone={customerStateTone}
              chips={followUpChips}
              items={followUpItems}
            />
          ) : null}

          <CustomerTotals
            metrics={totalMetrics}
            remainingCard={{
              title: 'إجمالي المتبقي بالروبل',
              value: customerNotFound ? '--' : totalRemainingValue,
              className: totalsAreOverpaid
                ? 'info-card--danger'
                : totalsAreSettled
                  ? 'info-card--success'
                  : 'info-card--accent',
              valueClassName:
                totalsAreOverpaid
                  ? 'info-card-value--metric info-card-value--danger'
                  : totalsAreSettled
                    ? 'info-card-value--metric info-card-value--success'
                    : 'info-card-value--metric',
              children:
                paymentTotalsError && !customerNotFound ? (
                  <p className="support-text text-danger">{paymentTotalsError}</p>
                ) : totalsAreOverpaid ? (
                  <p className="support-text text-danger">
                    يوجد رصيد سالب مجمّع على هذا العميل ويجب مراجعة الحوالات ذات الزيادة.
                  </p>
                ) : null,
            }}
            errorMessage=""
          />
        </SectionCard>

        <SectionCard
          title="طابور حوالات العميل"
          description="ترتيب الحوالات حسب أولوية المتابعة: مراجعة مالية ثم تحصيل جزئي ثم الحوالات المفتوحة."
          className={[
            'app-section-panel',
            'customer-details-queue-section',
            activeSection === 'transfers' ? 'is-active' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <CustomerTransfersList
            errorMessage={transfersError}
            loading={transfersLoading}
            customerNotFound={customerNotFound}
            hasTransfers={transfers.length > 0}
            hasFilteredTransfers={filteredTransfers.length > 0}
            groups={transferGroups}
            onRetry={handleTransfersRefresh}
            filterValue={transferStatusFilter}
            onFilterChange={setTransferStatusFilter}
            filterOptions={TRANSFER_STATUS_FILTER_OPTIONS}
            warningMessage={queueWarningMessage}
          />
        </SectionCard>

        <SectionCard
          title="الحركة الأخيرة لهذا العميل"
          description="سجل سريع لأحدث الدفعات والحوالات المرتبطة بالعميل لتسهيل المتابعة اليومية."
          className={[
            'app-section-panel',
            'customer-details-recent-section',
            activeSection === 'activity' ? 'is-active' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <CustomerRecentActivity
            loading={transfersLoading || paymentTotalsLoading}
            errorMessage={transfersError}
            warningMessage={recentActivityWarningMessage}
            hasItems={recentActivityItems.length > 0}
            items={recentActivityItems}
            onRetry={handleTransfersRefresh}
          />
        </SectionCard>

        <SectionCard
          title="الإجراءات على ملف العميل"
          description="اختصارات تشغيلية آمنة تسهل بدء الحركات ذات الصلة بهذا العميل."
          className={[
            'app-section-panel',
            'customer-details-actions-section',
            activeSection === 'actions' ? 'is-active' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {isOffline && !customerUnavailable ? (
            <InlineMessage kind="info" className="customer-edit-offline-note">
              {'\u062a\u0639\u062f\u064a\u0644 \u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u0639\u0645\u064a\u0644 \u0645\u062a\u0627\u062d \u0623\u062b\u0646\u0627\u0621 \u0627\u0644\u0627\u062a\u0635\u0627\u0644 \u0641\u0642\u0637 \u062d\u0627\u0644\u064a\u0627. \u064a\u0645\u0643\u0646\u0643 \u0645\u0631\u0627\u062c\u0639\u0629 \u0627\u0644\u0645\u0644\u0641 \u0645\u062d\u0644\u064a\u0627 \u062f\u0648\u0646 \u062a\u0639\u062f\u064a\u0644 \u062d\u062a\u0649 \u064a\u0639\u0648\u062f \u0627\u0644\u0627\u062a\u0635\u0627\u0644.'}
            </InlineMessage>
          ) : null}

          {lifecycleSubmitError ? (
            <InlineMessage kind="error" className="customer-lifecycle-note">
              {lifecycleSubmitError}
            </InlineMessage>
          ) : null}

          {lifecycleSubmitSuccess ? (
            <InlineMessage kind="success" className="customer-lifecycle-note">
              {lifecycleSubmitSuccess}
            </InlineMessage>
          ) : null}

          <InfoGrid className="customer-details-secondary-grid">
            <InfoCard
              title={'\u062a\u0639\u062f\u064a\u0644 \u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u0639\u0645\u064a\u0644'}
              value={
                '\u062d\u062f\u0651\u062b \u0627\u0644\u0627\u0633\u0645 \u0648\u0631\u0642\u0645 \u0627\u0644\u0647\u0627\u062a\u0641 \u0648\u0627\u0644\u0645\u0644\u0627\u062d\u0638\u0627\u062a \u0627\u0644\u062f\u0627\u062e\u0644\u064a\u0629 \u0641\u0642\u0637 \u062f\u0648\u0646 \u0627\u0644\u0645\u0633\u0627\u0633 \u0628\u0627\u0644\u062d\u0648\u0627\u0644\u0627\u062a \u0623\u0648 \u0633\u062c\u0644 \u0627\u0644\u062a\u062d\u0635\u064a\u0644.'
              }
              className={isEditingCustomer ? 'info-card--accent' : ''}
            >
              <p className="support-text">
                {isOffline
                  ? '\u0627\u0644\u062a\u062d\u062f\u064a\u062b \u0627\u0644\u0645\u0628\u0627\u0634\u0631 \u0644\u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u0639\u0645\u064a\u0644 \u0645\u062a\u0627\u062d \u0641\u0642\u0637 \u0623\u062b\u0646\u0627\u0621 \u0627\u0644\u0627\u062a\u0635\u0627\u0644\u060c \u0648\u0644\u0627 \u064a\u062a\u0645 \u0625\u0646\u0634\u0627\u0621 \u0637\u0627\u0628\u0648\u0631 \u062a\u0639\u062f\u064a\u0644 \u0645\u062d\u0644\u064a \u0641\u064a \u0647\u0630\u0627 \u0627\u0644\u0645\u0633\u0627\u0631.'
                  : '\u064a\u0628\u0642\u0649 \u0643\u0644 \u062a\u0627\u0631\u064a\u062e \u0627\u0644\u062d\u0648\u0627\u0644\u0627\u062a \u0648\u0627\u0644\u0645\u062f\u0641\u0648\u0639\u0627\u062a \u0643\u0645\u0627 \u0647\u0648\u060c \u0648\u064a\u062a\u0645 \u062a\u062d\u062f\u064a\u062b \u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u0645\u0644\u0641 \u0641\u0642\u0637.'}
              </p>
              <button
                type="button"
                className="button secondary"
                onClick={handleToggleEditCustomer}
                disabled={editDisabled}
              >
                {isEditingCustomer
                  ? '\u0625\u062e\u0641\u0627\u0621 \u0646\u0645\u0648\u0630\u062c \u0627\u0644\u062a\u0639\u062f\u064a\u0644'
                  : '\u062a\u0639\u062f\u064a\u0644 \u0645\u0644\u0641 \u0627\u0644\u0639\u0645\u064a\u0644'}
              </button>
            </InfoCard>
            {canCreateTransfer ? (
              <InfoCard
                title="إنشاء حوالة جديدة لهذا العميل"
                value="استخدم هذا الاختصار للانتقال مباشرة إلى نموذج إنشاء حوالة جديدة مع اختيار هذا العميل مسبقا."
                className="info-card--accent"
              >
                <p className="support-text">
                  لن يتم إنشاء أي حركة فعلية إلا بعد حفظ الحوالة من الشاشة التالية.
                </p>
                <Link className="button primary" to={`/transfers/new?customerId=${customerId}`}>
                  حوالة جديدة للعميل
                </Link>
              </InfoCard>
            ) : null}

            <InfoCard
              title="عرض كل حوالات العميل"
              value="يمكنك مراجعة الحوالات المرتبطة بهذا العميل من طابور الحوالات التشغيلي."
            >
              <p className="support-text">
                يتم الحفاظ على نفس منطق الصف التشغيلي، ولا يتم تغيير طريقة المتابعة المالية الحالية.
              </p>
              <Link className="button secondary" to="/transfers">
                فتح صف الحوالات
              </Link>
            </InfoCard>
          </InfoGrid>

          {isArchivedCustomer ? (
            <InfoCard
              title="الملف مؤرشف"
              value="تم إيقاف هذا العميل عن الظهور في الاختيارات التشغيلية النشطة، مع الإبقاء على ملفه وحوالاته للمراجعة التاريخية."
              className="customer-lifecycle-confirm-card"
            >
              <p className="support-text">
                {customer?.archived_at
                  ? `تاريخ الأرشفة: ${formatDate(customer.archived_at)}`
                  : 'يبقى هذا الملف متاحا للمراجعة فقط ولا يستخدم في إنشاء حوالات جديدة.'}
              </p>
            </InfoCard>
          ) : canArchiveCustomer || canDeleteCustomer ? (
            <InfoCard
              title={canDeleteCustomer ? 'حذف العميل' : 'أرشفة العميل'}
              value={
                canDeleteCustomer
                  ? 'لا توجد حوالات مرتبطة بهذا العميل حاليا، لذلك يمكن حذفه نهائيا بعد التأكيد.'
                  : 'هذا العميل مرتبط بحوالات محفوظة، لذلك لا يمكن حذفه نهائيا. يمكنك أرشفته لإخراجه من الاختيارات التشغيلية النشطة.'
              }
              className={[
                'customer-lifecycle-confirm-card',
                pendingLifecycleAction === 'delete'
                  ? 'info-card--danger'
                  : pendingLifecycleAction === 'archive'
                    ? 'info-card--accent'
                    : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <p className="support-text">
                {canDeleteCustomer
                  ? 'سيزال هذا الملف من القوائم والاختيارات النشطة بعد نجاح الحذف.'
                  : 'ستبقى كل الحوالات والسجل المالي كما هما، لكن العميل لن يظهر ضمن إنشاء الحوالات الجديدة أو القوائم النشطة.'}
              </p>
              <button
                type="button"
                className={[
                  'button',
                  canDeleteCustomer
                    ? 'secondary customer-lifecycle-danger-button'
                    : 'secondary',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => handlePrepareLifecycleAction(canDeleteCustomer ? 'delete' : 'archive')}
                disabled={isOffline || lifecycleSubmitting}
              >
                {canDeleteCustomer ? 'حذف العميل نهائيا' : 'أرشفة العميل'}
              </button>
            </InfoCard>
          ) : null}

          {pendingLifecycleAction && customer ? (
            <InfoCard
              title={pendingLifecycleAction === 'delete' ? 'تأكيد حذف العميل' : 'تأكيد أرشفة العميل'}
              value={
                pendingLifecycleAction === 'delete'
                  ? 'سيتم حذف ملف العميل نهائيا لأنه لا يملك حوالات مرتبطة. راجع الاسم قبل المتابعة.'
                  : 'سيتم تحويل هذا العميل إلى ملف مؤرشف مع الإبقاء على جميع الحوالات والسجل المرتبط به.'
              }
              className={[
                'customer-lifecycle-confirm-card',
                pendingLifecycleAction === 'delete' ? 'info-card--danger' : 'info-card--accent',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <p className="support-text">
                {pendingLifecycleAction === 'delete'
                  ? `الاسم الحالي: ${customer.full_name || 'عميل بدون اسم'}. سيختفي العميل من القوائم ومحددات الإنشاء بعد نجاح الحذف.`
                  : `الاسم الحالي: ${customer.full_name || 'عميل بدون اسم'}. بعد الأرشفة سيبقى الملف متاحا للمراجعة التاريخية فقط.`}
              </p>
              <div className="customers-form-actions customer-lifecycle-actions">
                <button
                  type="button"
                  className={[
                    'button',
                    pendingLifecycleAction === 'delete'
                      ? 'secondary customer-lifecycle-danger-button'
                      : 'primary',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onClick={handleCustomerLifecycleSubmit}
                  disabled={lifecycleSubmitting}
                >
                  {lifecycleSubmitting
                    ? pendingLifecycleAction === 'delete'
                      ? 'جار حذف العميل...'
                      : 'جار أرشفة العميل...'
                    : pendingLifecycleAction === 'delete'
                      ? 'تأكيد الحذف النهائي'
                      : 'تأكيد الأرشفة'}
                </button>
                <button
                  type="button"
                  className="button secondary"
                  onClick={handleCancelLifecycleAction}
                  disabled={lifecycleSubmitting}
                >
                  إلغاء
                </button>
              </div>
            </InfoCard>
          ) : null}

          {isEditingCustomer && customer ? (
            <CustomersFormSection
              title={'\u062a\u0639\u062f\u064a\u0644 \u0645\u0644\u0641 \u0627\u0644\u0639\u0645\u064a\u0644'}
              description={
                '\u062d\u062f\u0651\u062b \u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u0627\u0633\u0645 \u0648\u0627\u0644\u0647\u0627\u062a\u0641 \u0648\u0627\u0644\u0645\u0644\u0627\u062d\u0638\u0627\u062a \u0627\u0644\u062f\u0627\u062e\u0644\u064a\u0629 \u0644\u0644\u0639\u0645\u064a\u0644 \u0627\u0644\u062d\u0627\u0644\u064a \u0641\u0642\u0637. \u0644\u0646 \u064a\u062a\u0645 \u062a\u0639\u062f\u064a\u0644 \u0627\u0644\u062d\u0648\u0627\u0644\u0627\u062a \u0623\u0648 \u0633\u062c\u0644 \u0627\u0644\u0645\u062f\u0641\u0648\u0639\u0627\u062a.'
              }
              className="customer-edit-form-section"
              submitError={editSubmitError}
              submitSuccess={editSubmitSuccess}
              submitLabel={'\u062d\u0641\u0638 \u0627\u0644\u062a\u0639\u062f\u064a\u0644\u0627\u062a'}
              submittingLabel={'\u062c\u0627\u0631 \u062d\u0641\u0638 \u0627\u0644\u062a\u0639\u062f\u064a\u0644\u0627\u062a...'}
              formValues={editFormValues}
              infoMessage={
                isOffline
                  ? '\u062a\u0639\u062f\u064a\u0644 \u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u0639\u0645\u064a\u0644 \u0645\u062a\u0627\u062d \u0623\u062b\u0646\u0627\u0621 \u0627\u0644\u0627\u062a\u0635\u0627\u0644 \u0641\u0642\u0637 \u062d\u0627\u0644\u064a\u0627.'
                  : ''
              }
              onChange={handleEditFormChange}
              onSubmit={handleEditCustomerSubmit}
              submitting={editSubmitting}
              isConfigured={isConfigured}
              submitDisabled={isOffline}
              secondaryAction={
                <button
                  type="button"
                  className="button secondary"
                  onClick={handleCloseEditCustomer}
                  disabled={editSubmitting}
                >
                  {'\u0625\u0644\u063a\u0627\u0621'}
                </button>
              }
            />
          ) : null}
        </SectionCard>

        {customer ? (
          <SectionCard
            title="تفاصيل ملف العميل"
            description="ملاحظات الملف وبياناته الداخلية عند الحاجة إلى مراجعة أعمق."
            className={[
              'app-section-panel',
              'customer-details-secondary-section',
              activeSection === 'overview' ? 'is-active' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <InfoGrid className="customer-details-secondary-grid">
              <InfoCard title="المعرّف الداخلي" value={customer.id || '--'} />
              {customerSummaryItemsResolved
                .filter((item) => item.title !== 'رقم الهاتف')
                .map((item) => (
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
          </SectionCard>
        ) : null}
      </div>
    </div>
  )
}

export default CustomerDetailsPage
