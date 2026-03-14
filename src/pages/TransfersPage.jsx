import { useEffect, useState } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import TransfersFilterBar from '../components/transfers/TransfersFilterBar.jsx'
import TransfersHeader from '../components/transfers/TransfersHeader.jsx'
import TransfersList from '../components/transfers/TransfersList.jsx'
import TransfersQueueSummary from '../components/transfers/TransfersQueueSummary.jsx'
import InlineMessage from '../components/ui/InlineMessage.jsx'
import OfflineSnapshotNotice from '../components/ui/OfflineSnapshotNotice.jsx'
import SectionCard from '../components/ui/SectionCard.jsx'
import { useAuth } from '../context/auth-context.js'
import useNetworkStatus from '../hooks/useNetworkStatus.js'
import useOfflineSnapshot from '../hooks/useOfflineSnapshot.js'
import { TRANSFERS_LIST_SNAPSHOT_KEY } from '../lib/offline/cacheKeys.js'
import { getOfflineSnapshotMissingMessage } from '../lib/offline/freshness.js'
import { loadReadSnapshot, saveReadSnapshot } from '../lib/offline/readCache.js'
import {
  matchesTransferStatusFilter,
  TRANSFER_STATUS_FILTER_OPTIONS,
} from '../lib/transfer-ui.js'
import { supabase } from '../lib/supabase.js'

const QUEUE_FILTER_OPTIONS = [
  { value: 'all', label: 'كل السجل' },
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

function getValidFilterValue(rawValue, options, fallback = 'all') {
  const normalizedValue = String(rawValue || '').trim()

  if (!normalizedValue) {
    return fallback
  }

  return options.some((option) => option.value === normalizedValue) ? normalizedValue : fallback
}

function roundCurrency(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100
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
  if (transfer.isOverpaid) {
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
    return transfer.isOverpaid || transfer.hasOutstanding
  }

  if (queueFilter === 'overpaid') {
    return transfer.isOverpaid
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
  if (transfer.isOverpaid) {
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

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setSearchQuery(searchParams.get('q') || '')
      setStatusFilter(
        getValidFilterValue(searchParams.get('statusFilter'), TRANSFER_STATUS_FILTER_OPTIONS)
      )
      setQueueFilter(getValidFilterValue(searchParams.get('queueFilter'), QUEUE_FILTER_OPTIONS))
      setCreatedAfter(searchParams.get('createdAfter') || '')
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

    const hydrateFromSnapshot = async () => {
      setLoading(true)
      setLoadError('')

      const snapshot = await loadReadSnapshot(TRANSFERS_LIST_SNAPSHOT_KEY)

      if (!isMounted) {
        return
      }

      if (!snapshot?.data?.transfers) {
        clearSnapshotState()
        setTransfers([])
        setLoadError(getOfflineSnapshotMissingMessage('لصف الحوالات'))
        setLoading(false)
        return
      }

      setTransfers(snapshot.data.transfers)
      setLoadError('')
      setLoading(false)
      markCachedSnapshot(snapshot.savedAt)
    }

    const loadTransfers = async () => {
      clearSnapshotState()
      setLoading(true)
      setLoadError('')

      const [transfersResult, paymentsResult] = await Promise.all([
        supabase
          .schema('public')
          .from('transfers')
          .select(
            'id, reference_number, customer_id, usdt_amount, payable_rub, status, created_at'
          )
          .order('created_at', { ascending: false }),
        supabase
          .schema('public')
          .from('transfer_payments')
          .select('transfer_id, amount_rub'),
      ])

      if (!isMounted) {
        return
      }

      if (transfersResult.error || paymentsResult.error) {
        setTransfers([])
        setLoadError(
          transfersResult.error?.message ||
            paymentsResult.error?.message ||
            'تعذر تحميل صف الحوالات.'
        )
        setLoading(false)
        return
      }

      const transfersData = transfersResult.data ?? []
      const paymentsData = paymentsResult.data ?? []
      const paymentTotalsByTransfer = {}

      paymentsData.forEach((payment) => {
        if (!payment.transfer_id) {
          return
        }

        paymentTotalsByTransfer[payment.transfer_id] = roundCurrency(
          (paymentTotalsByTransfer[payment.transfer_id] || 0) + (Number(payment.amount_rub) || 0)
        )
      })

      const customerIds = [
        ...new Set(transfersData.map((transfer) => transfer.customer_id).filter(Boolean)),
      ]
      let customerNames = {}

      if (customerIds.length > 0) {
        const { data: customersData, error: customersError } = await supabase
          .schema('public')
          .from('customers')
          .select('id, full_name')
          .in('id', customerIds)

        if (!isMounted) {
          return
        }

        if (customersError) {
          setTransfers([])
          setLoadError(customersError.message)
          setLoading(false)
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
        const remainingRub = roundCurrency(payableRub - totalPaidRub)
        const isOpen = isOpenStatus(transfer.status)
        const isPartial = isPartialStatus(transfer.status)
        const isOverpaid = remainingRub < -0.009
        const hasOutstanding = remainingRub > 0.009
        const queueMeta = getQueueMeta({
          ...transfer,
          payableRub,
          totalPaidRub,
          remainingRub,
          isOpen,
          isPartial,
          isOverpaid,
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
          hasOutstanding,
          ...queueMeta,
        }
      })

      setTransfers(nextTransfers)
      setLoading(false)

      const savedSnapshot = await saveReadSnapshot({
        key: TRANSFERS_LIST_SNAPSHOT_KEY,
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
    refreshKey,
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
      items: prioritizedTransfers.filter((transfer) => transfer.isOverpaid),
    },
    {
      key: 'partial',
      title: 'تحصيل جزئي يحتاج استكمالا',
      description: 'حوالات بدأ تحصيلها وما زالت تحتاج متابعة مالية حتى الإغلاق.',
      tone: 'warning',
      items: prioritizedTransfers.filter(
        (transfer) => transfer.isPartial && transfer.hasOutstanding && !transfer.isOverpaid
      ),
    },
    {
      key: 'open',
      title: 'مفتوحة بانتظار التحصيل',
      description: 'حوالات مفتوحة لم يبدأ عليها التحصيل بعد وما زال رصيدها كاملا أو شبه كاملا.',
      tone: 'neutral',
      items: prioritizedTransfers.filter(
        (transfer) => transfer.isOpen && transfer.hasOutstanding && !transfer.isOverpaid
      ),
    },
    {
      key: 'other',
      title: 'سجلات أخرى',
      description: 'حوالات حديثة أخرى للاطلاع، بما فيها المدفوعة أو غير النشطة.',
      tone: 'default',
      items: prioritizedTransfers.filter(
        (transfer) =>
          !transfer.isOverpaid &&
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
  const openedFromDashboard = searchParams.get('from') === 'dashboard'
  const dashboardFocus = String(searchParams.get('focus') || '').trim()
  const dashboardFocusLabel = DASHBOARD_FOCUS_LABELS[dashboardFocus] || ''
  const dashboardContextMessage = openedFromDashboard
    ? dashboardFocusLabel
      ? `تم فتح صف الحوالات من لوحة التشغيل على مؤشر: ${dashboardFocusLabel}. يمكنك المتابعة من هنا أو تعديل التصفية حسب الحاجة.`
      : 'تم فتح صف الحوالات من لوحة التشغيل مع تهيئة متابعة جاهزة. يمكنك تعديل البحث والتصفية أو فتح أي حوالة مباشرة.'
    : ''
  const actionableTransfers = prioritizedTransfers.filter(
    (transfer) => transfer.hasOutstanding || transfer.isOverpaid
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
      value: loading ? '...' : prioritizedTransfers.filter((transfer) => transfer.isOverpaid).length,
      copy: 'تحتاج مراجعة مالية مباشرة.',
      tone: prioritizedTransfers.some((transfer) => transfer.isOverpaid) ? 'danger' : 'success',
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
    : `عرض ${filteredTransfers.length} من أصل ${transfers.length} حوالة • ${actionableTransfers.length} بحاجة متابعة`
  const queueScopeLabel = hasActiveFilters
    ? 'الأولوية الحالية مبنية على نتائج البحث والتصفية المعروضة أمامك.'
    : 'الحوالات مرتبة هنا حسب أولوية المتابعة اليومية: فوق المطلوب، ثم الجزئية، ثم المفتوحة.'

  return (
    <div className="stack transfers-queue-page">
      <TransfersHeader transferCountLabel={transferCountLabel} onRefresh={handleRefresh} />

      <InlineMessage kind="success">{location.state?.successMessage}</InlineMessage>
      <InlineMessage kind="info">{dashboardContextMessage}</InlineMessage>
      <OfflineSnapshotNotice snapshotState={snapshotState} />

      <TransfersQueueSummary cards={summaryCards} />

      <SectionCard
        title="صف المتابعة"
        description="استخدم البحث والتصفية والعرض التشغيلي للوصول بسرعة إلى الحوالات التي تحتاج حركة اليوم."
        className="transfers-queue-panel"
      >
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
        />

        <p className="support-text transfers-queue-note">{queueScopeLabel}</p>

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
  )
}

export default TransfersPage
