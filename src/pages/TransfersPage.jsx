import { useEffect, useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import TransfersFilterBar from '../components/transfers/TransfersFilterBar.jsx'
import TransfersHeader from '../components/transfers/TransfersHeader.jsx'
import TransfersList from '../components/transfers/TransfersList.jsx'
import TransfersQueueSummary from '../components/transfers/TransfersQueueSummary.jsx'
import InlineMessage from '../components/ui/InlineMessage.jsx'
import OfflineSnapshotNotice from '../components/ui/OfflineSnapshotNotice.jsx'
import SectionCard from '../components/ui/SectionCard.jsx'
import { useAuth } from '../context/auth-context.js'
import { useTenant } from '../context/tenant-context.js'
import useNetworkStatus from '../hooks/useNetworkStatus.js'
import useOfflineSnapshot from '../hooks/useOfflineSnapshot.js'
import { MISSING_CURRENT_ORG_MESSAGE, withOrgScope } from '../lib/orgScope.js'
import { getTransfersListSnapshotKey } from '../lib/offline/cacheKeys.js'
import { getOfflineSnapshotMissingMessage } from '../lib/offline/freshness.js'
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
  matchesTransferStatusFilter,
  TRANSFER_STATUS_FILTER_OPTIONS,
} from '../lib/transfer-ui.js'
import { supabase } from '../lib/supabase.js'

const QUEUE_FILTER_OPTIONS = [
  { value: 'all', label: 'الكل' },
  { value: 'needs_follow_up', label: 'يتطلب متابعة' },
  { value: 'overpaid', label: 'فوق المطلوب' },
  { value: 'partial_outstanding', label: 'مدفوعة جزئيا' },
  { value: 'open_outstanding', label: 'مفتوحة' },
]

const DASHBOARD_FOCUS_LABELS = {
  remaining: 'الرصيد القائم',
  open: 'الحوالات المفتوحة',
  partial: 'الحوالات المدفوعة جزئيا',
  paid: 'الحوالات المسددة',
  overpaid: 'الحوالات فوق المطلوب',
  todayPaid: 'مدفوع اليوم',
  urgent_attention: 'ملفات المتابعة العاجلة',
  recent_transfers: 'أحدث الحوالات',
}

const TRANSFERS_PAGE_SECTIONS = [
  { key: 'summary', label: 'المؤشرات', description: 'ملخص الصف' },
  { key: 'queue', label: 'المتابعة', description: 'البحث والقائمة' },
]

function getValidFilterValue(rawValue, options, fallback = 'all') {
  const normalizedValue = String(rawValue || '').trim()

  if (!normalizedValue) {
    return fallback
  }

  return options.some((option) => option.value === normalizedValue) ? normalizedValue : fallback
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

function formatDate(value) {
  const parsedDate = parseDateValue(value)

  if (!parsedDate) {
    return value || '--'
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(parsedDate)
}

function getOptionLabel(options, value, fallback = '') {
  return options.find((option) => option.value === value)?.label || fallback
}

function formatRelativeAge(value) {
  const parsedDate = parseDateValue(value)

  if (!parsedDate) {
    return '--'
  }

  const now = new Date()
  const daysDifference = Math.max(
    0,
    Math.floor((now.getTime() - parsedDate.getTime()) / (24 * 60 * 60 * 1000))
  )

  return new Intl.RelativeTimeFormat('ar', { numeric: 'auto' }).format(-daysDifference, 'day')
}

function normalizeStatus(status) {
  return String(status || '').toLowerCase()
}

function isPartialStatus(status) {
  const normalizedStatus = normalizeStatus(status)

  return normalizedStatus === 'partial' || normalizedStatus === 'partially_paid'
}

function isOpenStatus(status) {
  return normalizeStatus(status) === 'open'
}

function isCancelledStatus(status) {
  const normalizedStatus = normalizeStatus(status)

  return normalizedStatus === 'cancelled' || normalizedStatus === 'canceled'
}

function getQueuePriority(transfer) {
  if (transfer.isUnresolvedOverpaid) {
    return 0
  }

  if (transfer.isPartial && transfer.hasOutstanding) {
    return 1
  }

  if (transfer.isOpen && transfer.hasOutstanding) {
    return 2
  }

  return 3
}

function matchesQueueFilter(transfer, queueFilter) {
  if (queueFilter === 'all') {
    return true
  }

  if (queueFilter === 'needs_follow_up') {
    return transfer.isUnresolvedOverpaid || transfer.hasOutstanding
  }

  if (queueFilter === 'overpaid') {
    return transfer.isUnresolvedOverpaid
  }

  if (queueFilter === 'partial_outstanding') {
    return transfer.isPartial && transfer.hasOutstanding
  }

  if (queueFilter === 'open_outstanding') {
    return transfer.isOpen && transfer.hasOutstanding
  }

  return true
}

function getRemainingValueClassName(transfer) {
  if (transfer.isOverpaid) {
    return 'info-card-value--danger'
  }

  if (!transfer.hasOutstanding) {
    return 'info-card-value--success'
  }

  return ''
}

function getRemainingCardClassName(transfer) {
  if (transfer.isOverpaid) {
    return 'info-card--danger'
  }

  if (transfer.hasOutstanding) {
    return 'info-card--accent'
  }

  return 'info-card--success'
}

function getQueueMeta(transfer) {
  if (transfer.isUnresolvedOverpaid) {
    return {
      eyebrow: 'أولوية مالية',
      queueLabel: 'فوق المطلوب',
      queueClassName: 'queue-chip--danger',
      cardClassName: 'transfer-queue-card--danger',
      followUpNote: `المدفوعات المسجلة أعلى من المبلغ النهائي بمقدار ${formatNumber(
        Math.abs(transfer.remainingRub),
        2
      )} RUB. تحتاج هذه الحوالة إلى مراجعة مالية مباشرة.`,
    }
  }

  if (transfer.isResolvedOverpaid) {
    return {
      eyebrow: 'زيادة معالجة',
      queueLabel: 'معالجة مسجلة',
      queueClassName: 'queue-chip--neutral',
      cardClassName: '',
      followUpNote: `يظل الرصيد الحالي سالبا تاريخيا بمقدار ${formatNumber(
        Math.abs(transfer.remainingRub),
        2
      )} RUB، لكن تم تسجيل معالجة تشغيلية مطابقة لهذه الزيادة.`,
    }
  }

  if (transfer.isPartial && transfer.hasOutstanding) {
    return {
      eyebrow: 'استكمال التحصيل',
      queueLabel: 'مدفوعة جزئيا',
      queueClassName: 'queue-chip--warning',
      cardClassName: 'transfer-queue-card--warning',
      followUpNote: `تم تحصيل ${formatNumber(transfer.totalPaidRub, 2)} RUB وما زال المتبقي ${formatNumber(
        transfer.remainingRub,
        2
      )} RUB.`,
    }
  }

  if (transfer.isOpen && transfer.hasOutstanding) {
    return {
      eyebrow: 'بانتظار أول دفعة',
      queueLabel: 'مفتوحة',
      queueClassName: 'queue-chip--neutral',
      cardClassName: 'transfer-queue-card--open',
      followUpNote: `الحوالة ما زالت مفتوحة ولم يبدأ التحصيل عليها بعد. المطلوب الحالي ${formatNumber(
        transfer.remainingRub,
        2
      )} RUB.`,
    }
  }

  if (isCancelledStatus(transfer.status)) {
    return {
      eyebrow: 'سجل غير نشط',
      queueLabel: 'ملغاة',
      queueClassName: 'queue-chip--neutral',
      cardClassName: 'transfer-queue-card--inactive',
      followUpNote: 'هذه الحوالة ملغاة ولا تحتاج متابعة تشغيلية حاليا.',
    }
  }

  return {
    eyebrow: 'سجل حديث',
    queueLabel: 'مغلقة',
    queueClassName: 'queue-chip--success',
    cardClassName: 'transfer-queue-card--settled',
    followUpNote: 'الحوالة مغلقة حاليا ولا يظهر عليها رصيد مفتوح يحتاج متابعة.',
  }
}

function compareTransfersByPriority(left, right) {
  const priorityDifference = getQueuePriority(left) - getQueuePriority(right)

  if (priorityDifference !== 0) {
    return priorityDifference
  }

  return (
    (parseDateValue(right.created_at)?.getTime() || 0) -
    (parseDateValue(left.created_at)?.getTime() || 0)
  )
}

function TransfersPage() {
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const { configError, isConfigured } = useAuth()
  const { orgId } = useTenant()
  const { isOffline } = useNetworkStatus()
  const { clearSnapshotState, markCachedSnapshot, markLiveSnapshot, snapshotState } =
    useOfflineSnapshot()
  const [transfers, setTransfers] = useState([])
  const [loading, setLoading] = useState(Boolean(isConfigured))
  const [loadError, setLoadError] = useState(isConfigured ? '' : configError)
  const [refreshKey, setRefreshKey] = useState(0)
  const [searchQuery, setSearchQuery] = useState(() => searchParams.get('q') || '')
  const [statusFilter, setStatusFilter] = useState(() =>
    getValidFilterValue(searchParams.get('statusFilter'), TRANSFER_STATUS_FILTER_OPTIONS)
  )
  const [queueFilter, setQueueFilter] = useState(() =>
    getValidFilterValue(searchParams.get('queueFilter'), QUEUE_FILTER_OPTIONS)
  )
  const [createdAfter, setCreatedAfter] = useState(() => searchParams.get('createdAfter') || '')
  const [activeSection, setActiveSection] = useState('queue')
  const [advancedFiltersOpen, setAdvancedFiltersOpen] = useState(() => {
    const initialStatus = getValidFilterValue(
      searchParams.get('statusFilter'),
      TRANSFER_STATUS_FILTER_OPTIONS
    )
    return initialStatus !== 'all' || Boolean(searchParams.get('createdAfter'))
  })
  const transfersListSnapshotKey = getTransfersListSnapshotKey(orgId)

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const nextStatusFilter = getValidFilterValue(
        searchParams.get('statusFilter'),
        TRANSFER_STATUS_FILTER_OPTIONS
      )
      const nextCreatedAfter = searchParams.get('createdAfter') || ''

      setSearchQuery(searchParams.get('q') || '')
      setStatusFilter(nextStatusFilter)
      setQueueFilter(getValidFilterValue(searchParams.get('queueFilter'), QUEUE_FILTER_OPTIONS))
      setCreatedAfter(nextCreatedAfter)
      setAdvancedFiltersOpen(nextStatusFilter !== 'all' || Boolean(nextCreatedAfter))
    }, 0)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [searchParams])

  useEffect(() => {
    if (!isConfigured || !supabase) {
      return undefined
    }

    let isMounted = true

    const hydrateFromSnapshot = async (options = {}) => {
      const { fallbackErrorMessage = '' } = options

      setLoading(true)
      setLoadError('')

      const snapshot = await loadReadSnapshot(transfersListSnapshotKey)

      if (!isMounted) {
        return
      }

      if (!snapshot?.data?.transfers) {
        clearSnapshotState()
        setTransfers([])
        setLoadError(fallbackErrorMessage || getOfflineSnapshotMissingMessage('لصف الحوالات'))
        setLoading(false)
        return false
      }

      setTransfers(snapshot.data.transfers)
      setLoadError('')
      setLoading(false)
      markCachedSnapshot(snapshot.savedAt)
      return true
    }

    const loadTransfers = async () => {
      clearSnapshotState()
      setLoading(true)
      setLoadError('')

      if (!orgId) {
        setTransfers([])
        setLoadError(MISSING_CURRENT_ORG_MESSAGE)
        setLoading(false)
        return
      }

      try {
        const [transfersResult, paymentsResult] = await withLiveReadTimeout(
          Promise.all([
            withOrgScope(
              supabase
                .schema('public')
                .from('transfers')
                .select(
                  'id, reference_number, customer_id, usdt_amount, payable_rub, status, created_at'
                )
                .order('created_at', { ascending: false }),
              orgId
            ),
            withOrgScope(
              supabase
                .schema('public')
                .from('transfer_payments')
                .select('id, transfer_id, amount_rub'),
              orgId
            ),
          ]),
          {
            timeoutMessage: 'تعذر إكمال تحميل صف الحوالات في الوقت المتوقع.',
          }
        )

        if (!isMounted) {
          return
        }

        if (transfersResult.error || paymentsResult.error) {
          const loadError =
            transfersResult.error ||
            paymentsResult.error ||
            new Error('تعذر تحميل صف الحوالات.')
          const preferSnapshot = isOffline || isBrowserOffline() || isLikelyOfflineReadFailure(loadError)

          await hydrateFromSnapshot({
            fallbackErrorMessage: preferSnapshot ? '' : loadError.message,
          })
          return
        }

        const transfersData = transfersResult.data ?? []
        const paymentsData = paymentsResult.data ?? []
        const transferIds = transfersData.map((transfer) => transfer.id).filter(Boolean)
        let paymentVoidRows = []

        if (transferIds.length > 0) {
          const { data: nextPaymentVoidRows, error: paymentVoidsError } = await withLiveReadTimeout(
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
              timeoutMessage:
                'تعذر إكمال تحميل حالات إلغاء الدفعات المؤكدة للحوالات في الوقت المتوقع.',
            }
          )

          if (!isMounted) {
            return
          }

          if (paymentVoidsError) {
            const preferSnapshot =
              isOffline || isBrowserOffline() || isLikelyOfflineReadFailure(paymentVoidsError)
            await hydrateFromSnapshot({
              fallbackErrorMessage: preferSnapshot ? '' : paymentVoidsError.message,
            })
            return
          }

          paymentVoidRows = nextPaymentVoidRows ?? []
        }

        const { activePayments } = deriveConfirmedPaymentState({
          payments: paymentsData,
          paymentVoids: paymentVoidRows,
        })
        const paymentTotalsByTransfer = buildActivePaymentTotalsByTransfer(activePayments)

        let latestOverpaymentResolutionByTransferId = {}

        if (transferIds.length > 0) {
          const {
            data: overpaymentResolutionRows,
            error: overpaymentResolutionError,
          } = await withLiveReadTimeout(
            withOrgScope(
              supabase
                .schema('public')
                .from('transfer_overpayment_resolutions')
                .select(TRANSFER_OVERPAYMENT_RESOLUTION_SELECT)
                .in('transfer_id', transferIds)
                .order('created_at', { ascending: false })
                .order('id', { ascending: false }),
              orgId
            ),
            {
              timeoutMessage:
                'تعذر إكمال تحميل حالات معالجة زيادة الدفع للحوالات في الوقت المتوقع.',
            }
          )

          if (!isMounted) {
            return
          }

          if (overpaymentResolutionError) {
            const preferSnapshot =
              isOffline || isBrowserOffline() || isLikelyOfflineReadFailure(overpaymentResolutionError)
            await hydrateFromSnapshot({
              fallbackErrorMessage: preferSnapshot ? '' : overpaymentResolutionError.message,
            })
            return
          }

          latestOverpaymentResolutionByTransferId = buildLatestOverpaymentResolutionMap(
            overpaymentResolutionRows ?? []
          )
        }

        const customerIds = [
          ...new Set(transfersData.map((transfer) => transfer.customer_id).filter(Boolean)),
        ]
        let customerNames = {}

        if (customerIds.length > 0) {
          const { data: customersData, error: customersError } = await withLiveReadTimeout(
            withOrgScope(
              supabase.schema('public').from('customers').select('id, full_name').in('id', customerIds),
              orgId
            ),
            {
              timeoutMessage: 'تعذر إكمال تحميل أسماء العملاء للحوالات في الوقت المتوقع.',
            }
          )

          if (!isMounted) {
            return
          }

          if (customersError) {
            const preferSnapshot =
              isOffline || isBrowserOffline() || isLikelyOfflineReadFailure(customersError)
            await hydrateFromSnapshot({
              fallbackErrorMessage: preferSnapshot ? '' : customersError.message,
            })
            return
          }

          customerNames = Object.fromEntries(
            (customersData ?? []).map((customer) => [customer.id, customer.full_name])
          )
        }

        const nextTransfers = transfersData.map((transfer, index) => {
          const customerName = customerNames[transfer.customer_id] || 'عميل غير متاح'
          const payableRub = Number(transfer.payable_rub) || 0
          const totalPaidRub = paymentTotalsByTransfer[transfer.id] || 0
          const latestOverpaymentResolution =
            latestOverpaymentResolutionByTransferId[transfer.id] || null
          const {
            remainingRub,
            isOverpaid,
            overpaidAmountRub,
            isResolvedOverpaid,
            isUnresolvedOverpaid,
          } = deriveTransferOverpaymentState({
            payableRub,
            confirmedPaidRub: totalPaidRub,
            latestResolution: latestOverpaymentResolution,
          })
          const isOpen = isOpenStatus(transfer.status)
          const isPartial = isPartialStatus(transfer.status)
          const hasOutstanding = remainingRub > 0.009
          const queueMeta = getQueueMeta({
            ...transfer,
            payableRub,
            totalPaidRub,
            remainingRub,
            isOpen,
            isPartial,
            isOverpaid,
            isResolvedOverpaid,
            isUnresolvedOverpaid,
            hasOutstanding,
          })

          return {
            id: transfer.id ?? transfer.created_at ?? transfer.reference_number ?? `transfer-${index}`,
            transferId: transfer.id || '--',
            to: transfer.id ? `/transfers/${transfer.id}` : '/transfers',
            title: transfer.reference_number || 'المرجع قيد التخصيص',
            referenceNumber: transfer.reference_number || 'قيد التخصيص',
            customerName,
            internalId: transfer.id || '--',
            createdAt: transfer.created_at || '',
            createdAtLabel: formatDate(transfer.created_at),
            ageLabel: formatRelativeAge(transfer.created_at),
            status: transfer.status,
            usdtAmountLabel: formatNumber(transfer.usdt_amount, 2),
            payableRub,
            payableRubLabel: `${formatNumber(payableRub, 2)} RUB`,
            totalPaidRub,
            totalPaidRubLabel: `${formatNumber(totalPaidRub, 2)} RUB`,
            remainingRub,
            remainingRubLabel: `${formatNumber(remainingRub, 2)} RUB`,
            remainingCardClassName: getRemainingCardClassName({
              isOverpaid,
              hasOutstanding,
            }),
            remainingValueClassName: getRemainingValueClassName({
              isOverpaid,
              hasOutstanding,
            }),
            isOpen,
            isPartial,
            isOverpaid,
            isResolvedOverpaid,
            isUnresolvedOverpaid,
            overpaidAmountRub,
            hasOutstanding,
            latestOverpaymentResolution,
            ...queueMeta,
          }
        })

        setTransfers(nextTransfers)
        setLoading(false)

        const savedSnapshot = await saveReadSnapshot({
          key: transfersListSnapshotKey,
          scope: 'transfers-list',
          type: 'transfers_list',
          data: {
            transfers: nextTransfers,
          },
        })

        if (!isMounted) {
          return
        }

        markLiveSnapshot(savedSnapshot?.savedAt || '')
      } catch (error) {
        if (!isMounted) {
          return
        }

        const preferSnapshot = isOffline || isBrowserOffline() || isLikelyOfflineReadFailure(error)

        await hydrateFromSnapshot({
          fallbackErrorMessage: preferSnapshot ? '' : error.message,
        })
      }
    }

    if (isOffline) {
      hydrateFromSnapshot()
    } else {
      loadTransfers()
    }

    return () => {
      isMounted = false
    }
  }, [
    clearSnapshotState,
    isConfigured,
    isOffline,
    markCachedSnapshot,
    markLiveSnapshot,
    orgId,
    refreshKey,
    transfersListSnapshotKey,
  ])

  const handleRefresh = () => {
    setRefreshKey((current) => current + 1)
  }

  const normalizedSearchQuery = searchQuery.trim().toLowerCase()
  const filteredTransfers = transfers.filter((transfer) => {
    const customerName = String(transfer.customerName || '').toLowerCase()
    const referenceNumber = String(transfer.referenceNumber || '').toLowerCase()
    const status = String(transfer.status || '').toLowerCase()
    const createdAt = parseDateValue(transfer.createdAt)
    const matchesSearch =
      !normalizedSearchQuery ||
      referenceNumber.includes(normalizedSearchQuery) ||
      customerName.includes(normalizedSearchQuery)
    const matchesStatus = matchesTransferStatusFilter(status, statusFilter)
    const matchesQueue = matchesQueueFilter(transfer, queueFilter)
    const matchesDate =
      !createdAfter ||
      (createdAt instanceof Date &&
        !Number.isNaN(createdAt.getTime()) &&
        createdAt >= new Date(`${createdAfter}T00:00:00`))

    return matchesSearch && matchesStatus && matchesQueue && matchesDate
  })

  const prioritizedTransfers = [...filteredTransfers].sort(compareTransfersByPriority)
  const queueGroups = [
    {
      key: 'urgent',
      title: 'أولوية عاجلة',
      description: 'الحوالات الأعلى خطورة ماليا، وعلى رأسها الحوالات فوق المطلوب.',
      tone: 'danger',
      items: prioritizedTransfers.filter((transfer) => transfer.isUnresolvedOverpaid),
    },
    {
      key: 'partial',
      title: 'تحصيل جزئي يحتاج استكمالا',
      description: 'حوالات بدأ تحصيلها وما زالت تحتاج متابعة مالية حتى الإغلاق.',
      tone: 'warning',
      items: prioritizedTransfers.filter(
        (transfer) =>
          transfer.isPartial && transfer.hasOutstanding && !transfer.isUnresolvedOverpaid
      ),
    },
    {
      key: 'open',
      title: 'مفتوحة بانتظار التحصيل',
      description: 'حوالات مفتوحة لم يبدأ عليها التحصيل بعد وما زال رصيدها كاملا أو شبه كاملا.',
      tone: 'neutral',
      items: prioritizedTransfers.filter(
        (transfer) => transfer.isOpen && transfer.hasOutstanding && !transfer.isUnresolvedOverpaid
      ),
    },
    {
      key: 'other',
      title: 'سجلات أخرى',
      description: 'حوالات حديثة أخرى للاطلاع، بما فيها المدفوعة أو غير النشطة.',
      tone: 'default',
      items: prioritizedTransfers.filter(
        (transfer) =>
          !transfer.isUnresolvedOverpaid &&
          !(transfer.isPartial && transfer.hasOutstanding) &&
          !(transfer.isOpen && transfer.hasOutstanding)
      ),
    },
  ].filter((group) => group.items.length > 0)

  const hasActiveFilters =
    normalizedSearchQuery.length > 0 ||
    statusFilter !== 'all' ||
    queueFilter !== 'all' ||
    Boolean(createdAfter)
  const activeFilterItems = [
    normalizedSearchQuery
      ? {
          key: 'search',
          label: `بحث: ${searchQuery.trim()}`,
        }
      : null,
    queueFilter !== 'all'
      ? {
          key: 'queue',
          label: getOptionLabel(QUEUE_FILTER_OPTIONS, queueFilter, queueFilter),
        }
      : null,
    statusFilter !== 'all'
      ? {
          key: 'status',
          label: getOptionLabel(TRANSFER_STATUS_FILTER_OPTIONS, statusFilter, statusFilter),
        }
      : null,
    createdAfter
      ? {
          key: 'createdAfter',
          label: `من ${createdAfter}`,
        }
      : null,
  ].filter(Boolean)
  const openedFromDashboard = searchParams.get('from') === 'dashboard'
  const dashboardFocus = String(searchParams.get('focus') || '').trim()
  const dashboardFocusLabel = DASHBOARD_FOCUS_LABELS[dashboardFocus] || ''
  const dashboardContextMessage = openedFromDashboard
    ? dashboardFocusLabel
      ? `تم فتح صف الحوالات من لوحة التشغيل على مؤشر: ${dashboardFocusLabel}. يمكنك المتابعة من هنا أو تعديل التصفية حسب الحاجة.`
      : 'تم فتح صف الحوالات من لوحة التشغيل مع تهيئة متابعة جاهزة. يمكنك تعديل البحث والتصفية أو فتح أي حوالة مباشرة.'
    : ''
  const actionableTransfers = prioritizedTransfers.filter(
    (transfer) => transfer.hasOutstanding || transfer.isUnresolvedOverpaid
  )
  const summaryCards = [
    {
      key: 'total',
      label: 'إجمالي الحوالات',
      value: loading ? '...' : prioritizedTransfers.length,
      copy: hasActiveFilters
        ? 'ضمن البحث والتصفية الحالية.'
        : 'ضمن صف العمل الحالي بأكمله.',
      tone: 'brand',
      onClick: () => {
        setStatusFilter('all')
        setQueueFilter('all')
      },
      ariaLabel: 'عرض كل الحوالات في صف المتابعة',
    },
    {
      key: 'open',
      label: 'مفتوحة',
      value: loading ? '...' : prioritizedTransfers.filter((transfer) => transfer.isOpen).length,
      copy: 'بانتظار أول دفعة أو أول متابعة.',
      tone: prioritizedTransfers.some((transfer) => transfer.isOpen) ? 'warning' : 'success',
      onClick: () => {
        setStatusFilter('open')
        setQueueFilter('open_outstanding')
      },
      ariaLabel: 'تصفية الصف على الحوالات المفتوحة',
    },
    {
      key: 'partial',
      label: 'مدفوعة جزئيا',
      value: loading ? '...' : prioritizedTransfers.filter((transfer) => transfer.isPartial).length,
      copy: 'تحتاج استكمال التحصيل حتى الإغلاق.',
      tone: prioritizedTransfers.some((transfer) => transfer.isPartial) ? 'warning' : 'success',
      onClick: () => {
        setStatusFilter('partial_group')
        setQueueFilter('partial_outstanding')
      },
      ariaLabel: 'تصفية الصف على الحوالات المدفوعة جزئيا',
    },
    {
      key: 'overpaid',
      label: 'فوق المطلوب',
      value: loading
        ? '...'
        : prioritizedTransfers.filter((transfer) => transfer.isUnresolvedOverpaid).length,
      copy: 'تحتاج مراجعة مالية مباشرة.',
      tone: prioritizedTransfers.some((transfer) => transfer.isUnresolvedOverpaid)
        ? 'danger'
        : 'success',
      onClick: () => {
        setStatusFilter('all')
        setQueueFilter('overpaid')
      },
      ariaLabel: 'تصفية الصف على الحوالات فوق المطلوب',
    },
    {
      key: 'remaining',
      label: 'إجمالي المتبقي القابل للمتابعة',
      value: loading
        ? '...'
        : `${formatNumber(
            actionableTransfers.reduce(
              (total, transfer) => total + (transfer.hasOutstanding ? transfer.remainingRub : 0),
              0
            ),
            2
          )} RUB`,
      copy: 'الرصيد المفتوح عبر الحوالات التي تحتاج متابعة.',
      tone: actionableTransfers.some((transfer) => transfer.hasOutstanding) ? 'warning' : 'success',
      onClick: () => {
        setStatusFilter('all')
        setQueueFilter('needs_follow_up')
      },
      ariaLabel: 'عرض كل الحوالات التي ما زالت تحتاج متابعة مالية',
    },
    {
      key: 'payable',
      label: 'إجمالي المبلغ النهائي',
      value: loading
        ? '...'
        : `${formatNumber(
            prioritizedTransfers.reduce((total, transfer) => total + transfer.payableRub, 0),
            2
          )} RUB`,
      copy: 'مجموع مبالغ التسوية في هذا العرض.',
      tone: 'brand',
      onClick: () => {
        setStatusFilter('all')
        setQueueFilter('all')
      },
      ariaLabel: 'إعادة عرض كل الحوالات في هذا الصف',
    },
  ]

  const transferCountLabel = loading
    ? 'جار تحميل صف الحوالات...'
    : `${filteredTransfers.length} من ${transfers.length} • ${actionableTransfers.length} متابعة`
  const queueScopeLabel = hasActiveFilters
    ? 'الأولوية الحالية مبنية على نتائج البحث والتصفية المعروضة أمامك.'
    : 'الحوالات مرتبة هنا حسب أولوية المتابعة اليومية: فوق المطلوب، ثم الجزئية، ثم المفتوحة.'
  const transferMobileCountLabel = loading
    ? transferCountLabel
    : `${filteredTransfers.length} من ${transfers.length} • ${actionableTransfers.length} متابعة`
  const compactQueueContextTitle = hasActiveFilters ? 'النتائج الحالية' : 'ترتيب المتابعة'
  const compactQueueContextSummary = hasActiveFilters
    ? transferMobileCountLabel
    : 'فوق المطلوب، ثم الجزئية، ثم المفتوحة.'
  const handleClearFilters = () => {
    setSearchQuery('')
    setStatusFilter('all')
    setQueueFilter('all')
    setCreatedAfter('')
    setAdvancedFiltersOpen(false)
  }

  const sectionNavItems = TRANSFERS_PAGE_SECTIONS.map((section) => {
    if (section.key === 'summary') {
      return {
        ...section,
        countLabel: loading ? '...' : prioritizedTransfers.length,
        tone: 'brand',
      }
    }

    return {
      ...section,
      countLabel: loading ? '...' : filteredTransfers.length,
      tone: filteredTransfers.length > 0 ? 'brand' : 'neutral',
    }
  })

  return (
    <div className="stack transfers-queue-page">
      <TransfersHeader transferCountLabel={transferCountLabel} onRefresh={handleRefresh} />

      <InlineMessage kind="success">{location.state?.successMessage}</InlineMessage>
      <InlineMessage kind="info" className="transfers-page-context-banner">
        {dashboardContextMessage}
      </InlineMessage>
      <OfflineSnapshotNotice
        className="transfers-page-snapshot-banner"
        snapshotState={snapshotState}
      />

      <div className="transfers-mobile-utility" aria-label="إجراءات سريعة لصفحة الحوالات">
        <Link className="button primary transfers-mobile-primary-action" to="/transfers/new">
          حوالة جديدة
        </Link>

        <div className="transfers-mobile-utility-meta">
          <div className="transfers-mobile-utility-copy">
            <strong>الحوالات</strong>
            <p className="support-text transfers-mobile-count">{transferMobileCountLabel}</p>
          </div>

          <button
            type="button"
            className="button secondary transfers-mobile-refresh-button"
            onClick={handleRefresh}
            disabled={loading}
          >
            تحديث
          </button>
        </div>
      </div>

      <div className="app-section-nav-shell">
        <nav className="app-section-nav app-section-nav--two" aria-label="أقسام صفحة الحوالات">
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
          title="المؤشرات"
          description="ملخص الصف الحالي."
          className={[
            'app-section-panel',
            'transfers-queue-summary-panel',
            activeSection === 'summary' ? 'is-active' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <TransfersQueueSummary cards={summaryCards} />
          <p className="support-text transfers-queue-note">{queueScopeLabel}</p>
        </SectionCard>

        <SectionCard
          title="صف المتابعة"
          description="ابحث ثم افتح الحوالة المطلوبة."
          className={[
            'app-section-panel',
            'transfers-queue-panel',
            activeSection === 'queue' ? 'is-active' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <div className="transfers-queue-context-strip" aria-label="سياق صف المتابعة">
            <strong>{compactQueueContextTitle}</strong>
            <p>{compactQueueContextSummary}</p>
          </div>

          <TransfersFilterBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            queueFilter={queueFilter}
            onQueueFilterChange={setQueueFilter}
            createdAfter={createdAfter}
            onCreatedAfterChange={setCreatedAfter}
            statusOptions={TRANSFER_STATUS_FILTER_OPTIONS}
            queueOptions={QUEUE_FILTER_OPTIONS}
            advancedOpen={advancedFiltersOpen}
            onToggleAdvanced={() => setAdvancedFiltersOpen((current) => !current)}
            onClearFilters={handleClearFilters}
            hasActiveFilters={hasActiveFilters}
            activeFilterItems={activeFilterItems}
          />

          <TransfersList
            errorMessage={loadError}
            loading={loading}
            hasTransfers={transfers.length > 0}
            hasFilteredTransfers={filteredTransfers.length > 0}
            groups={queueGroups}
            onRetry={handleRefresh}
          />
        </SectionCard>
      </div>
    </div>
  )
}

export default TransfersPage
