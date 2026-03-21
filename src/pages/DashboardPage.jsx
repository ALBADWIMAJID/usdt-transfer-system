import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import DashboardAttentionSection from '../components/dashboard/DashboardAttentionSection.jsx'
import DashboardFinancialSnapshotSection from '../components/dashboard/DashboardFinancialSnapshotSection.jsx'
import DashboardMobileLite from '../components/dashboard/DashboardMobileLite.jsx'
import DashboardQuickActions from '../components/dashboard/DashboardQuickActions.jsx'
import DashboardRecentActivitySection from '../components/dashboard/DashboardRecentActivitySection.jsx'
import DashboardWorkQueueSection from '../components/dashboard/DashboardWorkQueueSection.jsx'
import TransferRecordCard from '../components/transfers/TransferRecordCard.jsx'
import InlineMessage from '../components/ui/InlineMessage.jsx'
import OfflineSnapshotNotice from '../components/ui/OfflineSnapshotNotice.jsx'
import OperationsDrillDownSheet from '../components/ui/OperationsDrillDownSheet.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import RecordCard from '../components/ui/RecordCard.jsx'
import RecordHeader from '../components/ui/RecordHeader.jsx'
import RetryBlock from '../components/ui/RetryBlock.jsx'
import { useAuth } from '../context/auth-context.js'
import { useTenant } from '../context/tenant-context.js'
import useDashboardMobileLiteLayout from '../hooks/useDashboardMobileLiteLayout.js'
import useNetworkStatus from '../hooks/useNetworkStatus.js'
import useOfflineSnapshot from '../hooks/useOfflineSnapshot.js'
import { MISSING_CURRENT_ORG_MESSAGE, withOrgScope } from '../lib/orgScope.js'
import { getDashboardSnapshotKey } from '../lib/offline/cacheKeys.js'
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
import { ACTIVE_TRANSFER_STATUSES, getPaymentMethodLabel, getTransferStatusMeta } from '../lib/transfer-ui.js'
import { supabase } from '../lib/supabase.js'

const DAY_IN_MS = 24 * 60 * 60 * 1000
const emptyDashboardStats = {
  customers: null,
  transfers: null,
  activeTransfers: null,
  openTransfers: null,
  partialTransfers: null,
  paidTransfers: null,
  totalPayableRub: null,
  totalRemainingRub: null,
  totalPaidRub: null,
  overpaidTransfers: null,
  overpaidAmountRub: null,
  todayPaidRub: null,
  todayPaymentCount: null,
  todayPaymentTransferCount: null,
  totalProfitRub: null,
  todayProfitRub: null,
  todayProfitTransferCount: null,
}
const emptyDashboardQueueItems = { partial: [], open: [] }
const emptyDashboardDrillDownData = {
  allTransfers: [],
  remainingTransfers: [],
  openTransfers: [],
  partialTransfers: [],
  paidTransfers: [],
  overpaidTransfers: [],
  urgentTransfers: [],
  recentTransfers: [],
  recentPayments: [],
  todayPayments: [],
  profitTransfers: [],
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

function getStartOfDay(value = new Date()) {
  const date = parseDateValue(value) || new Date()
  const nextDate = new Date(date)
  nextDate.setHours(0, 0, 0, 0)
  return nextDate
}

function isToday(value, referenceDate = new Date()) {
  const parsedDate = parseDateValue(value)

  if (!parsedDate) {
    return false
  }

  const startOfDay = getStartOfDay(referenceDate)
  const startOfNextDay = new Date(startOfDay)
  startOfNextDay.setDate(startOfNextDay.getDate() + 1)

  return parsedDate >= startOfDay && parsedDate < startOfNextDay
}

function getAgeInDays(value, referenceDate = new Date()) {
  const parsedDate = parseDateValue(value)

  if (!parsedDate) {
    return 0
  }

  return Math.max(
    0,
    Math.floor((getStartOfDay(referenceDate).getTime() - getStartOfDay(parsedDate).getTime()) / DAY_IN_MS)
  )
}

function formatRelativeAge(value, referenceDate = new Date()) {
  const ageInDays = getAgeInDays(value, referenceDate)
  const formatter = new Intl.RelativeTimeFormat('ar', { numeric: 'auto' })

  return formatter.format(-ageInDays, 'day')
}

function normalizeStatus(status) {
  return String(status || '').toLowerCase()
}

function isPartialStatus(status) {
  const normalizedStatus = normalizeStatus(status)

  return normalizedStatus === 'partial' || normalizedStatus === 'partially_paid'
}

function isPaidStatus(status) {
  return normalizeStatus(status) === 'paid'
}

function isCancelledStatus(status) {
  const normalizedStatus = normalizeStatus(status)

  return normalizedStatus === 'cancelled' || normalizedStatus === 'canceled'
}

function getRemainingClassName(remainingRub) {
  if (remainingRub < -0.009) {
    return 'record-muted-strong text-danger'
  }

  if (remainingRub > 0.009) {
    return 'record-muted-strong'
  }

  return 'record-muted-strong text-success'
}

function getTransferQueuePriority(transfer) {
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

function compareTransfersByPriority(left, right) {
  const priorityDifference = getTransferQueuePriority(left) - getTransferQueuePriority(right)

  if (priorityDifference !== 0) {
    return priorityDifference
  }

  return (parseDateValue(right.created_at)?.getTime() || 0) - (parseDateValue(left.created_at)?.getTime() || 0)
}

function compareTransfersByProfit(left, right) {
  const profitDifference = (Number(right.commissionRub) || 0) - (Number(left.commissionRub) || 0)

  if (Math.abs(profitDifference) > 0.009) {
    return profitDifference
  }

  return (parseDateValue(right.createdAt)?.getTime() || 0) - (parseDateValue(left.createdAt)?.getTime() || 0)
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
    eyebrow: 'سجل مستقر',
    queueLabel: 'مغلقة',
    queueClassName: 'queue-chip--success',
    cardClassName: 'transfer-queue-card--settled',
    followUpNote: 'الحوالة مستقرة حاليا ولا يظهر عليها رصيد مفتوح يحتاج متابعة.',
  }
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

function getRemainingValueClassName(transfer) {
  if (transfer.isOverpaid) {
    return 'info-card-value--danger'
  }

  if (!transfer.hasOutstanding) {
    return 'info-card-value--success'
  }

  return ''
}

function buildTransfersQueueHref({
  focus = '',
  queueFilter = 'all',
  statusFilter = 'all',
  createdAfter = '',
  search = '',
}) {
  const params = new URLSearchParams()
  params.set('from', 'dashboard')

  if (focus) {
    params.set('focus', focus)
  }

  if (queueFilter && queueFilter !== 'all') {
    params.set('queueFilter', queueFilter)
  }

  if (statusFilter && statusFilter !== 'all') {
    params.set('statusFilter', statusFilter)
  }

  if (createdAfter) {
    params.set('createdAfter', createdAfter)
  }

  if (search) {
    params.set('q', search)
  }

  return `/transfers?${params.toString()}`
}

function renderPaymentDrillDownItem(item, compact = false) {
  return (
    <RecordCard
      key={item.id}
      to={item.transferTo}
      className={[
        'dashboard-activity-card',
        'dashboard-money-card',
        item.cardClassName,
        compact ? 'record-card--mobile-priority dashboard-activity-card--compact' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <RecordHeader
        eyebrow={item.eyebrow}
        title={item.amountLabel}
        subtitle={item.customerName}
        subtitleClassName="record-muted-strong"
        metaItems={
          compact
            ? [
                { label: 'المرجع', value: item.referenceLabel },
                { label: 'الوقت', value: item.activityAtLabel },
              ]
            : [
                { label: 'مرجع الحوالة', value: item.referenceLabel },
                { label: 'السياق', value: item.contextLabel },
                { label: 'وقت الحركة', value: item.activityAtLabel },
              ]
        }
        aside={
          <>
            <span className={['activity-chip', item.badgeClassName].filter(Boolean).join(' ')}>
              {item.methodLabel}
            </span>
            {compact ? <span className="record-compact-action">فتح الحوالة</span> : null}
          </>
        }
      />

      {item.note ? <p className={compact ? 'record-note record-note--compact' : 'record-note'}>{item.note}</p> : null}
    </RecordCard>
  )
}

function renderProfitDrillDownItem(item) {
  return (
    <RecordCard key={item.id} to={item.to} className="dashboard-activity-card dashboard-money-card">
      <RecordHeader
        eyebrow={item.isProfitToday ? 'ربح اليوم' : 'ربح الحوالة'}
        title={item.referenceNumber}
        subtitle={item.customerName}
        subtitleClassName="record-muted-strong"
        metaItems={[
          { label: 'الإنشاء', value: item.createdAtLabel },
          { label: 'الحالة', value: item.statusLabel },
        ]}
        aside={
          <>
            <span
              className={[
                'activity-chip',
                item.isProfitToday ? 'activity-chip--warning' : 'activity-chip--success',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {item.commissionRubLabel}
            </span>
            <span className="record-compact-action">فتح الحوالة</span>
          </>
        }
      />

      <p className="record-note record-note--compact">{item.profitNote}</p>
    </RecordCard>
  )
}

function DashboardPage() {
  const { configError, isConfigured } = useAuth()
  const { orgId } = useTenant()
  const { isOffline } = useNetworkStatus()
  const dashboardMobileLite = useDashboardMobileLiteLayout()
  const { clearSnapshotState, markCachedSnapshot, markLiveSnapshot, snapshotState } =
    useOfflineSnapshot()
  const [stats, setStats] = useState(emptyDashboardStats)
  const [recentTransfers, setRecentTransfers] = useState([])
  const [recentPayments, setRecentPayments] = useState([])
  const [attentionItems, setAttentionItems] = useState([])
  const [queueItems, setQueueItems] = useState(emptyDashboardQueueItems)
  const [drillDownData, setDrillDownData] = useState(emptyDashboardDrillDownData)
  const [activeDrillDownKey, setActiveDrillDownKey] = useState('')
  const [loading, setLoading] = useState(Boolean(isConfigured))
  const [loadError, setLoadError] = useState(isConfigured ? '' : configError)
  const [lastUpdatedAt, setLastUpdatedAt] = useState('')
  const dashboardSnapshotKey = getDashboardSnapshotKey(orgId)

  const hydrateFromSnapshot = useCallback(
    async (options = {}) => {
      const { fallbackErrorMessage = '' } = options

      setLoading(true)
      setLoadError('')

      const snapshot = await loadReadSnapshot(dashboardSnapshotKey)

      if (!snapshot?.data) {
        clearSnapshotState()
        setStats(emptyDashboardStats)
        setRecentTransfers([])
        setRecentPayments([])
        setAttentionItems([])
        setQueueItems(emptyDashboardQueueItems)
        setDrillDownData(emptyDashboardDrillDownData)
        setLastUpdatedAt('')
        setLoadError(fallbackErrorMessage || getOfflineSnapshotMissingMessage('للوحة التشغيل المالية'))
        setLoading(false)
        return false
      }

      setStats({
        ...emptyDashboardStats,
        ...(snapshot.data.stats || {}),
      })
      setRecentTransfers(snapshot.data.recentTransfers || [])
      setRecentPayments(snapshot.data.recentPayments || [])
      setAttentionItems(snapshot.data.attentionItems || [])
      setQueueItems(snapshot.data.queueItems || emptyDashboardQueueItems)
      setDrillDownData({
        ...emptyDashboardDrillDownData,
        ...(snapshot.data.drillDownData || {}),
      })
      setLastUpdatedAt(snapshot.data.lastUpdatedAt || '')
      setLoadError('')
      setLoading(false)
      markCachedSnapshot(snapshot.savedAt)
      return true
    },
    [clearSnapshotState, dashboardSnapshotKey, markCachedSnapshot]
  )

  const loadDashboard = useCallback(async () => {
    if (!isConfigured || !supabase) {
      setLoadError(configError || 'إعدادات Supabase غير مكتملة.')
      setLoading(false)
      return
    }

    if (!orgId) {
      setLoadError(MISSING_CURRENT_ORG_MESSAGE)
      setLoading(false)
      return
    }

    if (isOffline) {
      await hydrateFromSnapshot()
      return
    }

    try {
      clearSnapshotState()
      setLoading(true)
      setLoadError('')

      const now = new Date()

      const [customersResult, transfersResult, paymentsResult] = await withLiveReadTimeout(Promise.all([
        withOrgScope(
          supabase.schema('public').from('customers').select('*', { count: 'exact', head: true }),
          orgId
        ),
        withOrgScope(
          supabase
            .schema('public')
            .from('transfers')
            .select('id, reference_number, customer_id, status, usdt_amount, payable_rub, commission_rub, created_at')
            .order('created_at', { ascending: false }),
          orgId
        ),
        withOrgScope(
          supabase
            .schema('public')
            .from('transfer_payments')
            .select('id, transfer_id, amount_rub, payment_method, note, paid_at, created_at')
            .order('created_at', { ascending: false }),
          orgId
        ),
      ]), {
        timeoutMessage: 'تعذر إكمال تحميل لوحة التشغيل المالية في الوقت المتوقع.',
      })

      if (customersResult.error || transfersResult.error || paymentsResult.error) {
        const dashboardError =
          customersResult.error ||
          transfersResult.error ||
          paymentsResult.error ||
          new Error('ØªØ¹Ø°Ø± ØªØ­Ù…ÙŠÙ„ Ø¨ÙŠØ§Ù†Ø§Øª Ù„ÙˆØ­Ø© Ø§Ù„ØªØ­ÙƒÙ….')
        const preferSnapshot = isOffline || isBrowserOffline() || isLikelyOfflineReadFailure(dashboardError)

        if (preferSnapshot) {
          await hydrateFromSnapshot()
          return
        }

        setLoadError(
          customersResult.error?.message ||
            transfersResult.error?.message ||
            paymentsResult.error?.message ||
            'تعذر تحميل بيانات لوحة التحكم.'
        )
        setLoading(false)
        setDrillDownData(emptyDashboardDrillDownData)
        return
      }

      const transfers = transfersResult.data ?? []
      const payments = paymentsResult.data ?? []
      const transferIds = transfers.map((transfer) => transfer.id).filter(Boolean)
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
              'تعذر إكمال تحميل حالات إلغاء الدفعات المؤكدة للوحة التشغيل في الوقت المتوقع.',
          }
        )

        if (paymentVoidsError) {
          const preferSnapshot =
            isOffline || isBrowserOffline() || isLikelyOfflineReadFailure(paymentVoidsError)

          if (preferSnapshot) {
            await hydrateFromSnapshot()
            return
          }

          setLoadError(paymentVoidsError.message)
          setLoading(false)
          setDrillDownData(emptyDashboardDrillDownData)
          return
        }

        paymentVoidRows = nextPaymentVoidRows ?? []
      }

      const { activePayments, totalActivePaidRub } = deriveConfirmedPaymentState({
        payments,
        paymentVoids: paymentVoidRows,
      })
      const paymentsWithActivity = activePayments.map((payment) => ({
        ...payment,
        activityAt: payment.paid_at || payment.created_at,
      }))
      const paymentsToday = paymentsWithActivity.filter((payment) => isToday(payment.activityAt, now))
      const paymentTotalsByTransfer = buildActivePaymentTotalsByTransfer(activePayments)

      let latestOverpaymentResolutionByTransferId = {}

      if (transferIds.length > 0) {
        const { data: overpaymentResolutionRows, error: overpaymentResolutionError } =
          await withLiveReadTimeout(
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
                'تعذر إكمال تحميل حالات معالجة زيادة الدفع للوحة التشغيل في الوقت المتوقع.',
            }
          )

        if (overpaymentResolutionError) {
          const preferSnapshot =
            isOffline || isBrowserOffline() || isLikelyOfflineReadFailure(overpaymentResolutionError)

          if (preferSnapshot) {
            await hydrateFromSnapshot()
            return
          }

          setLoadError(overpaymentResolutionError.message)
          setLoading(false)
          setDrillDownData(emptyDashboardDrillDownData)
          return
        }

        latestOverpaymentResolutionByTransferId = buildLatestOverpaymentResolutionMap(
          overpaymentResolutionRows ?? []
        )
      }

      const transferRecords = transfers.map((transfer) => {
        const payableRub = Number(transfer.payable_rub) || 0
        const commissionRub = roundCurrency(Number(transfer.commission_rub) || 0)
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
        const normalizedStatus = normalizeStatus(transfer.status)
        const ageInDays = getAgeInDays(transfer.created_at, now)
        const isOpen = normalizedStatus === 'open'
        const isPartial = isPartialStatus(normalizedStatus)
        const isPaid = isPaidStatus(normalizedStatus)
        const isActive = ACTIVE_TRANSFER_STATUSES.includes(normalizedStatus)
        const hasOutstanding = remainingRub > 0.009
        const requiresUrgentAttention =
          isUnresolvedOverpaid ||
          (isPartial && ageInDays >= 1 && hasOutstanding) ||
          (isOpen && ageInDays >= 2 && hasOutstanding)

        return {
          ...transfer,
          normalizedStatus,
          payableRub,
          commissionRub,
          totalPaidRub,
          remainingRub,
          ageInDays,
          isOpen,
          isPartial,
          isPaid,
          isActive,
          isOverpaid,
          isResolvedOverpaid,
          isUnresolvedOverpaid,
          overpaidAmountRub,
          hasOutstanding,
          requiresUrgentAttention,
          latestOverpaymentResolution,
        }
      })

      const transferMap = Object.fromEntries(transferRecords.map((transfer) => [transfer.id, transfer]))
      const relevantCustomerIds = [
        ...new Set(
          [
            ...transferRecords.map((transfer) => transfer.customer_id),
            ...paymentsWithActivity.map((payment) => transferMap[payment.transfer_id]?.customer_id),
          ].filter(Boolean)
        ),
      ]

      let customerNames = {}

      if (relevantCustomerIds.length > 0) {
        const { data: customersData, error: customersDataError } = await withLiveReadTimeout(
          withOrgScope(
            supabase
              .schema('public')
              .from('customers')
              .select('id, full_name')
              .in('id', relevantCustomerIds),
            orgId
          ),
          {
            timeoutMessage: 'تعذر إكمال تحميل أسماء العملاء للوحة التشغيل في الوقت المتوقع.',
          }
        )

        if (customersDataError) {
          const preferSnapshot =
            isOffline || isBrowserOffline() || isLikelyOfflineReadFailure(customersDataError)

          if (preferSnapshot) {
            await hydrateFromSnapshot()
            return
          }

          setLoadError(customersDataError.message)
          setLoading(false)
          return
        }

        customerNames = Object.fromEntries((customersData ?? []).map((customer) => [customer.id, customer.full_name]))
      }

      const transferQueueItems = transferRecords
        .map((transfer, index) => {
          const customerName = customerNames[transfer.customer_id] || 'عميل غير متاح'
          const queueMeta = getQueueMeta(transfer)
          const statusLabel = getTransferStatusMeta(transfer.status).label

          return {
            id: transfer.id ?? transfer.created_at ?? `dashboard-transfer-${index}`,
            to: transfer.id ? `/transfers/${transfer.id}` : '/transfers',
            title: transfer.reference_number || `حوالة #${transfer.id}`,
            referenceNumber: transfer.reference_number || `حوالة #${transfer.id}`,
            customerName,
            internalId: transfer.id || '--',
            createdAt: transfer.created_at || '',
            createdAtLabel: formatDate(transfer.created_at),
            ageLabel: formatRelativeAge(transfer.created_at, now),
            status: transfer.status,
            statusLabel,
            usdtAmountLabel: formatNumber(transfer.usdt_amount, 2),
            payableRubLabel: `${formatNumber(transfer.payableRub, 2)} RUB`,
            totalPaidRubLabel: `${formatNumber(transfer.totalPaidRub, 2)} RUB`,
            commissionRubLabel: `${formatNumber(transfer.commissionRub, 2)} RUB`,
            isProfitToday: isToday(transfer.created_at, now),
            profitNote: `قيمة التسوية ${formatNumber(transfer.payableRub, 2)} RUB لكمية ${formatNumber(
              transfer.usdt_amount,
              2
            )} USDT.`,
            remainingRubLabel: transfer.isOverpaid
              ? `-${formatNumber(Math.abs(transfer.remainingRub), 2)} RUB`
              : transfer.hasOutstanding
                ? `${formatNumber(transfer.remainingRub, 2)} RUB`
                : 'مسددة',
            remainingCardClassName: getRemainingCardClassName(transfer),
            remainingValueClassName: getRemainingValueClassName(transfer),
            searchText: `${customerName} ${transfer.reference_number || ''} ${transfer.id || ''}`.toLowerCase(),
            ...queueMeta,
            ...transfer,
          }
        })
        .sort(compareTransfersByPriority)

      const remainingTransfers = transferQueueItems.filter(
        (transfer) => Math.abs(transfer.remainingRub) > 0.009
      )
      const openTransferItems = transferQueueItems.filter((transfer) => transfer.isOpen)
      const partialTransferItems = transferQueueItems.filter((transfer) => transfer.isPartial)
      const paidTransferItems = transferQueueItems.filter((transfer) => transfer.isPaid)
      const overpaidTransferItems = transferQueueItems.filter(
        (transfer) => transfer.isUnresolvedOverpaid
      )
      const urgentTransfers = transferQueueItems.filter((transfer) => transfer.requiresUrgentAttention)
      const partialQueueSource = transferQueueItems.filter(
        (transfer) => transfer.isPartial && transfer.hasOutstanding
      )
      const openQueueSource = transferQueueItems.filter((transfer) => transfer.isOpen && transfer.hasOutstanding)
      const recentTransfersSource = [...transferQueueItems].sort(
        (left, right) =>
          (parseDateValue(right.createdAt)?.getTime() || 0) - (parseDateValue(left.createdAt)?.getTime() || 0)
      )
      const profitTransfers = transferQueueItems
        .filter((transfer) => Math.abs(transfer.commissionRub) > 0.009)
        .sort(compareTransfersByProfit)

      const recentPaymentsSource = paymentsWithActivity
        .map((payment, index) => {
          const transfer = transferMap[payment.transfer_id]

          if (!transfer) {
            return null
          }

          const customerName = customerNames[transfer.customer_id] || 'عميل غير متاح'

          return {
            id: payment.id ?? `payment-${index}`,
            transferTo: transfer.id ? `/transfers/${transfer.id}` : '/transfers',
            customerTo: transfer.customer_id ? `/customers/${transfer.customer_id}` : '',
            referenceLabel: transfer.reference_number || `حوالة #${transfer.id}`,
            customerName,
            amountLabel: `${formatNumber(payment.amount_rub, 2)} RUB`,
            methodLabel: getPaymentMethodLabel(payment.payment_method),
            activityAtLabel: formatDate(payment.activityAt),
            contextLabel: payment.note ? 'مع ملاحظة تشغيلية' : 'حركة مباشرة',
            note: payment.note || '',
            badgeClassName: transfer.isUnresolvedOverpaid
              ? 'activity-chip--danger'
              : isToday(payment.activityAt, now)
                ? 'activity-chip--warning'
                : 'activity-chip--success',
            eyebrow: isToday(payment.activityAt, now) ? 'تحصيل اليوم' : 'حركة مالية',
            searchText: `${customerName} ${transfer.reference_number || ''} ${payment.payment_method || ''} ${payment.note || ''}`.toLowerCase(),
            eventAt: parseDateValue(payment.activityAt)?.getTime() || 0,
          }
        })
        .filter(Boolean)
        .sort((left, right) => right.eventAt - left.eventAt)

      const todayPaymentTransferCount = new Set(
        paymentsToday.map((payment) => payment.transfer_id).filter(Boolean)
      ).size
      const totalPaidTodayRub = roundCurrency(
        paymentsToday.reduce((total, payment) => total + (Number(payment.amount_rub) || 0), 0)
      )
      const totalPaidRub = totalActivePaidRub
      const overpaidAmountRub = roundCurrency(
        transferRecords.reduce(
          (total, transfer) =>
            total + (transfer.isUnresolvedOverpaid ? transfer.overpaidAmountRub : 0),
          0
        )
      )
      const todayProfitTransfers = profitTransfers.filter((transfer) => transfer.isProfitToday)
      const totalProfitRub = roundCurrency(
        transferRecords.reduce((total, transfer) => total + (Number(transfer.commissionRub) || 0), 0)
      )
      const todayProfitRub = roundCurrency(
        todayProfitTransfers.reduce((total, transfer) => total + (Number(transfer.commissionRub) || 0), 0)
      )

      const nextStats = {
        customers: customersResult.count ?? 0,
        transfers: transferRecords.length,
        activeTransfers: transferRecords.filter((transfer) => transfer.isActive).length,
        openTransfers: transferRecords.filter((transfer) => transfer.isOpen).length,
        partialTransfers: transferRecords.filter((transfer) => transfer.isPartial).length,
        paidTransfers: transferRecords.filter((transfer) => transfer.isPaid).length,
        totalPayableRub: roundCurrency(
          transferRecords.reduce((total, transfer) => total + transfer.payableRub, 0)
        ),
        totalRemainingRub: roundCurrency(
          transferRecords.reduce((total, transfer) => total + transfer.remainingRub, 0)
        ),
        totalPaidRub,
        overpaidTransfers: overpaidTransferItems.length,
        overpaidAmountRub,
        todayPaidRub: totalPaidTodayRub,
        todayPaymentCount: paymentsToday.length,
        todayPaymentTransferCount,
        totalProfitRub,
        todayProfitRub,
        todayProfitTransferCount: todayProfitTransfers.length,
      }

      const nextAttentionItems = urgentTransfers.slice(0, 6).map((transfer) => ({
          id: transfer.id,
          transferTo: transfer.to,
          customerTo: transfer.customer_id ? `/customers/${transfer.customer_id}` : '',
          referenceLabel: transfer.referenceNumber,
          customerName: transfer.customerName,
          status: transfer.status,
          createdAtLabel: transfer.createdAtLabel,
          payableLabel: transfer.payableRubLabel,
          remainingLabel: transfer.remainingRubLabel,
          remainingClassName: getRemainingClassName(transfer.remainingRub),
          eyebrow: transfer.isUnresolvedOverpaid ? 'مخاطر مالية' : 'متابعة مستحقة',
          attentionLabel: transfer.isUnresolvedOverpaid
            ? 'فوق المطلوب'
            : transfer.isPartial
              ? `جزئية منذ ${transfer.ageLabel}`
              : `مفتوحة منذ ${transfer.ageLabel}`,
          chipClassName: transfer.isUnresolvedOverpaid ? 'attention-chip--danger' : 'attention-chip--warning',
          className: transfer.isUnresolvedOverpaid ? 'dashboard-attention-card--danger' : '',
          note: transfer.isUnresolvedOverpaid
            ? `المدفوعات المسجلة تتجاوز قيمة التسوية النهائية بمقدار ${formatNumber(Math.abs(transfer.remainingRub), 2)} RUB وتتطلب مراجعة فورية.`
            : transfer.isPartial
              ? `هذه الحوالة ما زالت تحتاج ${formatNumber(transfer.remainingRub, 2)} RUB بعد ${transfer.ageLabel} من إنشائها.`
              : `الحوالة ما زالت مفتوحة دون إغلاق، وما زال المطلوب ${formatNumber(transfer.remainingRub, 2)} RUB.`,
        }))

      const nextQueueItems = {
        partial: partialQueueSource.slice(0, 5).map((transfer) => ({
          id: transfer.id,
          transferTo: transfer.to,
          customerTo: transfer.customer_id ? `/customers/${transfer.customer_id}` : '',
          referenceLabel: transfer.referenceNumber,
          customerName: transfer.customerName,
          status: transfer.status,
          ageLabel: transfer.ageLabel,
          createdAtLabel: transfer.createdAtLabel,
          remainingLabel: transfer.remainingRubLabel,
          remainingClassName: getRemainingClassName(transfer.remainingRub),
          queueLabel: 'استكمال التحصيل',
          chipClassName: 'queue-chip--warning',
          eyebrow: 'قائمة العمل',
          note: `تم تسجيل ${transfer.totalPaidRubLabel} وما زال المتبقي ${formatNumber(transfer.remainingRub, 2)} RUB.`,
        })),
        open: openQueueSource.slice(0, 5).map((transfer) => ({
          id: transfer.id,
          transferTo: transfer.to,
          customerTo: transfer.customer_id ? `/customers/${transfer.customer_id}` : '',
          referenceLabel: transfer.referenceNumber,
          customerName: transfer.customerName,
          status: transfer.status,
          ageLabel: transfer.ageLabel,
          createdAtLabel: transfer.createdAtLabel,
          remainingLabel: transfer.remainingRubLabel,
          remainingClassName: getRemainingClassName(transfer.remainingRub),
          queueLabel: 'بانتظار أول دفعة',
          chipClassName: 'queue-chip--neutral',
          eyebrow: 'قائمة العمل',
          note: `لم تبدأ حركة التحصيل على هذه الحوالة بعد. المطلوب الحالي ${formatNumber(transfer.remainingRub, 2)} RUB.`,
        })),
      }

      const nextRecentTransfers = recentTransfersSource.slice(0, 5).map((transfer) => ({
          id: transfer.id,
          transferTo: transfer.to,
          customerTo: transfer.customer_id ? `/customers/${transfer.customer_id}` : '',
          referenceLabel: transfer.referenceNumber,
          customerName: transfer.customerName,
          status: transfer.status,
          createdAtLabel: transfer.createdAtLabel,
          payableLabel: transfer.payableRubLabel,
          remainingLabel: transfer.remainingRubLabel,
          remainingClassName: getRemainingClassName(transfer.remainingRub),
        }))
      
      const nextRecentPayments = recentPaymentsSource.slice(0, 5)

      const nextDrillDownData = {
        allTransfers: transferQueueItems,
        remainingTransfers,
        openTransfers: openTransferItems,
        partialTransfers: partialTransferItems,
        paidTransfers: paidTransferItems,
        overpaidTransfers: overpaidTransferItems,
        urgentTransfers,
        recentTransfers: recentTransfersSource,
        recentPayments: recentPaymentsSource,
        todayPayments: recentPaymentsSource.filter((payment) =>
          paymentsToday.some((sourcePayment) => sourcePayment.id === payment.id)
        ),
        profitTransfers,
      }

      const nextLastUpdatedAt = new Date().toISOString()

      setStats(nextStats)
      setAttentionItems(nextAttentionItems)
      setQueueItems(nextQueueItems)
      setRecentTransfers(nextRecentTransfers)
      setRecentPayments(nextRecentPayments)
      setDrillDownData(nextDrillDownData)
      setLastUpdatedAt(nextLastUpdatedAt)
      setLoading(false)

      const savedSnapshot = await saveReadSnapshot({
        key: dashboardSnapshotKey,
        scope: 'dashboard-main',
        type: 'dashboard_main',
        data: {
          stats: nextStats,
          attentionItems: nextAttentionItems,
          queueItems: nextQueueItems,
          recentTransfers: nextRecentTransfers,
          recentPayments: nextRecentPayments,
          drillDownData: nextDrillDownData,
          lastUpdatedAt: nextLastUpdatedAt,
        },
      })

      markLiveSnapshot(savedSnapshot?.savedAt || '')
    } catch (error) {
      const preferSnapshot = isOffline || isBrowserOffline() || isLikelyOfflineReadFailure(error)

      if (preferSnapshot) {
        await hydrateFromSnapshot()
        return
      }

      setLoadError(error?.message || 'حدث خطأ غير متوقع أثناء تحميل لوحة التحكم.')
      setLoading(false)
    }
  }, [
    clearSnapshotState,
    configError,
    dashboardSnapshotKey,
    hydrateFromSnapshot,
    isConfigured,
    isOffline,
    markLiveSnapshot,
    orgId,
  ])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      if (isOffline) {
        hydrateFromSnapshot()
      } else {
        loadDashboard()
      }
    }, 0)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [hydrateFromSnapshot, isOffline, loadDashboard])

  const openDrillDown = (key) => {
    setActiveDrillDownKey(key)
  }

  const closeDrillDown = () => {
    setActiveDrillDownKey('')
  }

  const drillDownConfigs = {
    remaining: {
      title: 'تفصيل الرصيد القائم',
      totalValue: `${formatNumber(stats.totalRemainingRub, 2)} RUB`,
      subtitle: 'كل الحوالات التي تحمل رصيدا غير صفري حاليا، سواء كان متبقيا للتحصيل أو زيادة دفع تحتاج مراجعة.',
      description: 'صافي المؤشر يساوي مجموع الأرصدة المفتوحة مطروحا منه أي زيادات دفع حالية.',
      items: drillDownData.remainingTransfers,
      emptyMessage: 'لا توجد حاليا حوالات تحمل رصيدا مفتوحا أو سالبا.',
      searchPlaceholder: 'ابحث بالعميل أو مرجع الحوالة',
      viewAllTo: buildTransfersQueueHref({ queueFilter: 'needs_follow_up', focus: 'remaining' }),
      viewAllLabel: 'فتح صف المتابعة المفتوح',
      renderItem: (item) => <TransferRecordCard key={item.id} transfer={item} compact />,
    },
    open: {
      title: 'الحوالات المفتوحة',
      totalValue: stats.openTransfers ?? 0,
      subtitle: 'كل الحوالات التي تحمل حالة مفتوحة حاليا.',
      description: 'هذه القائمة تشرح العدد الظاهر في لوحة التشغيل للحوالات المفتوحة.',
      items: drillDownData.openTransfers,
      emptyMessage: 'لا توجد حاليا حوالات مفتوحة.',
      searchPlaceholder: 'ابحث في الحوالات المفتوحة',
      viewAllTo: buildTransfersQueueHref({ statusFilter: 'open', focus: 'open' }),
      viewAllLabel: 'فتح الحوالات المفتوحة في الصف',
      renderItem: (item) => <TransferRecordCard key={item.id} transfer={item} compact />,
    },
    partial: {
      title: 'الحوالات المدفوعة جزئيا',
      totalValue: stats.partialTransfers ?? 0,
      subtitle: 'حوالات بدأ عليها التحصيل وما زال فيها رصيد مفتوح أو حالة جزئية قيد المتابعة.',
      description: 'هذه القائمة تشرح عدد الحوالات الجزئية الحالي على مستوى النظام.',
      items: drillDownData.partialTransfers,
      emptyMessage: 'لا توجد حاليا حوالات مدفوعة جزئيا.',
      searchPlaceholder: 'ابحث في الحوالات الجزئية',
      viewAllTo: buildTransfersQueueHref({ statusFilter: 'partial_group', focus: 'partial' }),
      viewAllLabel: 'فتح الحوالات الجزئية في الصف',
      renderItem: (item) => <TransferRecordCard key={item.id} transfer={item} compact />,
    },
    paid: {
      title: 'الحوالات المسددة',
      totalValue: stats.paidTransfers ?? 0,
      subtitle: 'الحوالات التي تظهر حاليا في وضع مدفوعة بالكامل.',
      description: 'يمكن استخدام هذه القائمة كمرجع سريع للحوالات المستقرة حاليا.',
      items: drillDownData.paidTransfers,
      emptyMessage: 'لا توجد حاليا حوالات تظهر بحالة مدفوعة.',
      searchPlaceholder: 'ابحث في الحوالات المسددة',
      viewAllTo: buildTransfersQueueHref({ statusFilter: 'paid', focus: 'paid' }),
      viewAllLabel: 'فتح الحوالات المدفوعة في الصف',
      renderItem: (item) => <TransferRecordCard key={item.id} transfer={item} compact />,
    },
    profit: {
      title: 'تفصيل الربح',
      totalValue: `${formatNumber(stats.totalProfitRub, 2)} RUB`,
      subtitle: `ربح اليوم ${formatNumber(stats.todayProfitRub, 2)} RUB عبر ${stats.todayProfitTransferCount ?? 0} حوالة`,
      description: 'يعتمد هذا المؤشر على الحقل المخزن commission_rub لكل حوالة، ويُحسب ربح اليوم بحسب وقت إنشاء الحوالة.',
      items: drillDownData.profitTransfers,
      emptyMessage: 'لا توجد حاليا حوالات تحمل ربحا محفوظا ضمن السجلات الحالية.',
      searchPlaceholder: 'ابحث بالعميل أو مرجع الحوالة',
      renderItem: (item) => renderProfitDrillDownItem(item),
    },
    overpaid: {
      title: 'الحوالات فوق المطلوب',
      totalValue: stats.overpaidTransfers ?? 0,
      subtitle: 'حوالات يوجد فيها رصيد سالب أو زيادة دفع حالية وتتطلب مراجعة.',
      description: 'هذه القائمة تشرح السجلات التي تسببت في حالة overpaid الحالية.',
      items: drillDownData.overpaidTransfers,
      emptyMessage: 'لا توجد حاليا حوالات فوق المطلوب.',
      searchPlaceholder: 'ابحث في الحوالات فوق المطلوب',
      viewAllTo: buildTransfersQueueHref({ queueFilter: 'overpaid', focus: 'overpaid' }),
      viewAllLabel: 'فتح الحوالات فوق المطلوب في الصف',
      renderItem: (item) => <TransferRecordCard key={item.id} transfer={item} compact />,
    },
    todayPaid: {
      title: 'مدفوع اليوم',
      totalValue: `${formatNumber(stats.todayPaidRub, 2)} RUB`,
      subtitle: `${stats.todayPaymentCount ?? 0} دفعة مسجلة اليوم على ${stats.todayPaymentTransferCount ?? 0} حوالة`,
      description: 'يعتمد هذا التفصيل على وقت الدفع المسجل للحركة، ثم على وقت إنشاء الدفعة عند غياب ذلك الوقت.',
      items: drillDownData.todayPayments,
      emptyMessage: 'لا توجد مدفوعات مسجلة اليوم حتى الآن.',
      searchPlaceholder: 'ابحث بالعميل أو المرجع أو وسيلة الدفع',
      renderItem: (item) => renderPaymentDrillDownItem(item, true),
    },
    recentPayments: {
      title: 'كل المدفوعات الحديثة',
      totalValue: `${drillDownData.recentPayments.length} حركة`,
      subtitle: 'أحدث الحركات المالية عبر النظام مع وسيلة الدفع والمرجع المرتبط بها.',
      description: 'هذا التفصيل يعرض أحدث المدفوعات ليسهل تتبع الحركة المالية المباشرة.',
      items: drillDownData.recentPayments,
      emptyMessage: 'لا توجد مدفوعات حديثة حاليا.',
      searchPlaceholder: 'ابحث في المدفوعات الحديثة',
      renderItem: (item) => renderPaymentDrillDownItem(item, true),
    },
    recentTransfers: {
      title: 'كل الحوالات الحديثة',
      totalValue: `${drillDownData.recentTransfers.length} حوالة`,
      subtitle: 'أحدث الحوالات التي دخلت النظام مع وضعها التشغيلي الحالي.',
      description: 'يمكن من هنا الانتقال مباشرة إلى الحوالة الأحدث أو مراجعة قائمة أوسع في صف الحوالات.',
      items: drillDownData.recentTransfers,
      emptyMessage: 'لا توجد حوالات حديثة حاليا.',
      searchPlaceholder: 'ابحث بالعميل أو المرجع',
      viewAllTo: buildTransfersQueueHref({ focus: 'recent_transfers' }),
      viewAllLabel: 'فتح صف الحوالات الكامل',
      renderItem: (item) => <TransferRecordCard key={item.id} transfer={item} compact />,
    },
    urgentAttention: {
      title: 'ملفات المتابعة العاجلة',
      totalValue: `${drillDownData.urgentTransfers.length} ملف`,
      subtitle: 'الحوالات التي تحمل مخاطرة أعلى الآن: overpaid أو حالات قديمة ما زالت غير محسومة.',
      description: 'هذه القائمة تعكس نفس منطق التنبيهات العاجلة الظاهر في اللوحة الرئيسية.',
      items: drillDownData.urgentTransfers,
      emptyMessage: 'لا توجد حاليا ملفات متابعة عاجلة.',
      searchPlaceholder: 'ابحث في الملفات العاجلة',
      viewAllTo: buildTransfersQueueHref({ queueFilter: 'needs_follow_up', focus: 'urgent_attention' }),
      viewAllLabel: 'فتح صف المتابعة العاجلة',
      renderItem: (item) => <TransferRecordCard key={item.id} transfer={item} compact />,
    },
  }

  const activeDrillDown = activeDrillDownKey ? drillDownConfigs[activeDrillDownKey] : null

  const headlineCards = [
    {
      key: 'today-paid',
      label: 'مدفوع اليوم',
      value: loading ? '...' : `${formatNumber(stats.todayPaidRub, 2)} RUB`,
      copy: loading
        ? 'جار احتساب حركة التحصيل اليومية...'
        : `${stats.todayPaymentCount ?? 0} دفعة على ${stats.todayPaymentTransferCount ?? 0} حوالة`,
      className: 'dashboard-snapshot-card--primary',
      valueClassName: 'dashboard-snapshot-value--brand',
      onClick: () => openDrillDown('todayPaid'),
    },
    {
      key: 'remaining',
      label: 'المتبقي القائم',
      value: loading ? '...' : `${formatNumber(stats.totalRemainingRub, 2)} RUB`,
      copy: loading
        ? 'جار احتساب الرصيد المفتوح...'
        : `${stats.activeTransfers ?? 0} حوالة ما زالت مفتوحة أو جزئية`,
      className:
        stats.totalRemainingRub < -0.009
          ? 'dashboard-snapshot-card--danger'
          : stats.totalRemainingRub > 0.009
            ? 'dashboard-snapshot-card--warning'
            : 'dashboard-snapshot-card--success',
      valueClassName:
        stats.totalRemainingRub < -0.009
          ? 'text-danger'
          : stats.totalRemainingRub > 0.009
            ? 'dashboard-snapshot-value--warning'
            : 'text-success',
      onClick: () => openDrillDown('remaining'),
    },
    {
      key: 'overpaid-amount',
      label: 'قيمة الزيادة الحالية',
      value: loading ? '...' : `${formatNumber(stats.overpaidAmountRub, 2)} RUB`,
      copy: loading
        ? 'جار فحص الحوالات فوق المطلوب...'
        : `${stats.overpaidTransfers ?? 0} حوالة فوق المطلوب حاليا`,
      className: stats.overpaidTransfers > 0 ? 'dashboard-snapshot-card--danger' : 'dashboard-snapshot-card--success',
      valueClassName: stats.overpaidTransfers > 0 ? 'text-danger' : 'text-success',
      onClick: () => openDrillDown('overpaid'),
    },
    {
      key: 'profit',
      label: 'إجمالي الربح',
      value: loading ? '...' : `${formatNumber(stats.totalProfitRub, 2)} RUB`,
      copy: loading
        ? 'جار احتساب الربح المحفوظ...'
        : `اليوم ${formatNumber(stats.todayProfitRub, 2)} RUB على ${stats.todayProfitTransferCount ?? 0} حوالة`,
      className: 'dashboard-snapshot-card--success dashboard-snapshot-card--wide',
      valueClassName: 'text-success',
      onClick: () => openDrillDown('profit'),
    },
  ]

  const supportingCards = [
    {
      key: 'open',
      title: 'مفتوحة',
      value: loading ? '...' : stats.openTransfers ?? '--',
      copy: 'حوالات لم يبدأ عليها التحصيل بعد.',
      onClick: () => openDrillDown('open'),
    },
    {
      key: 'partial',
      title: 'مدفوعة جزئيا',
      value: loading ? '...' : stats.partialTransfers ?? '--',
      copy: 'تحتاج استكمال تسجيل التحصيل.',
      className: 'info-card--accent',
      onClick: () => openDrillDown('partial'),
    },
    {
      key: 'paid',
      title: 'مدفوعة بالكامل',
      value: loading ? '...' : stats.paidTransfers ?? '--',
      copy: 'الحالات التي تظهر حاليا بوضع مدفوعة.',
      className: 'info-card--success',
      valueClassName: 'info-card-value--success',
      onClick: () => openDrillDown('paid'),
    },
    {
      key: 'today-transfer-movement',
      title: 'حوالات عليها تحصيل اليوم',
      value: loading ? '...' : stats.todayPaymentTransferCount ?? '--',
      copy: 'عدد الحوالات التي سجلت عليها دفعات اليوم.',
      onClick: () => openDrillDown('todayPaid'),
    },
  ]

  const overviewCards = [
    {
      key: 'customers',
      label: 'إجمالي العملاء',
      value: loading ? '...' : stats.customers ?? '--',
      copy: 'ملفات العملاء المتاحة للمشغل حاليا.',
      tone: 'brand',
    },
    {
      key: 'transfers',
      label: 'إجمالي الحوالات',
      value: loading ? '...' : stats.transfers ?? '--',
      copy: 'كل الحوالات المتاحة ضمن مساحة العمل الحالية.',
      onClick: () => openDrillDown('recentTransfers'),
    },
    {
      key: 'total-payable',
      label: 'إجمالي المستحق',
      value: loading ? '...' : `${formatNumber(stats.totalPayableRub, 2)} RUB`,
      copy: 'مجموع مبالغ التسوية النهائية عبر كل الحوالات.',
      tone: 'brand',
    },
    {
      key: 'total-paid',
      label: 'المحصل حتى الآن',
      value: loading ? '...' : `${formatNumber(stats.totalPaidRub, 2)} RUB`,
      copy: 'إجمالي كل المدفوعات المسجلة في النظام.',
      tone: 'success',
      onClick: () => openDrillDown('recentPayments'),
    },
  ]

  const urgentSummaryCards = [
    {
      key: 'overpaid-count',
      title: 'حوالات فوق المطلوب',
      value: loading ? '...' : stats.overpaidTransfers ?? '--',
      copy: 'تحتاج مراجعة مالية مباشرة.',
      className: stats.overpaidTransfers > 0 ? 'info-card--danger' : '',
      valueClassName: stats.overpaidTransfers > 0 ? 'info-card-value--danger' : '',
      onClick: () => openDrillDown('overpaid'),
    },
    {
      key: 'overpaid-amount',
      title: 'قيمة الزيادة',
      value: loading ? '...' : `${formatNumber(stats.overpaidAmountRub, 2)} RUB`,
      copy: 'إجمالي الزيادة الحالية فوق المطلوب.',
      className: stats.overpaidAmountRub > 0 ? 'info-card--danger' : '',
      valueClassName: stats.overpaidAmountRub > 0 ? 'info-card-value--danger' : '',
      onClick: () => openDrillDown('overpaid'),
    },
    {
      key: 'urgent-follow-up',
      title: 'ملفات متابعة مستحقة',
      value: loading ? '...' : attentionItems.length,
      copy: 'حوالات تحتاج اتصالا أو مراجعة اليوم.',
      className: attentionItems.length > 0 ? 'info-card--accent' : '',
      onClick: () => openDrillDown('urgentAttention'),
    },
    {
      key: 'active',
      title: 'الرصيد المفتوح',
      value: loading ? '...' : `${formatNumber(stats.totalRemainingRub, 2)} RUB`,
      copy: 'صافي الرصيد الذي ما زال بانتظار التحصيل أو المراجعة.',
      className: stats.totalRemainingRub < -0.009 ? 'info-card--danger' : 'info-card--success',
      valueClassName:
        stats.totalRemainingRub < -0.009 ? 'info-card-value--danger' : 'info-card-value--success',
      onClick: () => openDrillDown('remaining'),
    },
  ]

  const nextActionItem = attentionItems[0] || queueItems.partial[0] || queueItems.open[0] || null
  const quickActionItem = nextActionItem
    ? {
        transferTo: nextActionItem.transferTo,
        referenceLabel: nextActionItem.referenceLabel,
        customerName: nextActionItem.customerName,
        recommendation: attentionItems[0]
          ? 'ابدأ بهذه الحوالة لأنها تحمل أولوية متابعة أعلى الآن.'
          : 'هذه الحوالة أقرب عنصر يحتاج متابعة تشغيلية حاليا.',
        cardClassName: attentionItems[0] ? 'info-card--danger' : 'info-card--accent',
        valueClassName: attentionItems[0] ? 'info-card-value--danger' : '',
      }
    : null

  const lastUpdatedLabel = lastUpdatedAt ? `آخر تحديث: ${formatDate(lastUpdatedAt)}` : ''

  return (
    <>
      {dashboardMobileLite ? (
        <DashboardMobileLite
          loading={loading}
          loadDashboard={loadDashboard}
          lastUpdatedLabel={lastUpdatedLabel}
          snapshotState={snapshotState}
          isConfigured={isConfigured}
          loadError={loadError}
          headlineCards={headlineCards}
          openDrillDown={openDrillDown}
          attentionItems={attentionItems}
          queueItems={queueItems}
          recentTransfers={recentTransfers}
          recentPayments={recentPayments}
          quickActionItem={quickActionItem}
          stats={stats}
          buildTransfersQueueHref={buildTransfersQueueHref}
        />
      ) : (
        <div className="stack dashboard-page">
          <PageHeader
            eyebrow="مركز العمليات المالية اليومية"
            title="لوحة التشغيل المالي"
            description="ابدأ يوم العمل من هنا: ماذا دُفع اليوم، ما المتبقي القائم، أين توجد المخاطر، وما الحوالات التي تحتاج حركة مباشرة الآن."
            actions={
              <>
                <button type="button" className="button secondary" onClick={loadDashboard} disabled={loading}>
                  {loading ? 'جار التحديث...' : 'تحديث الآن'}
                </button>
                <Link className="button primary" to="/transfers/new">
                  إنشاء حوالة جديدة
                </Link>
              </>
            }
          >
            {lastUpdatedAt ? <p className="support-text">آخر تحديث: {formatDate(lastUpdatedAt)}</p> : null}
          </PageHeader>

          <OfflineSnapshotNotice snapshotState={snapshotState} />

          {!isConfigured ? <InlineMessage kind="error">{loadError}</InlineMessage> : null}
          {isConfigured && loadError ? <RetryBlock message={loadError} onRetry={loadDashboard} /> : null}

          <DashboardFinancialSnapshotSection
            headlineCards={headlineCards}
            supportingCards={supportingCards}
            overviewCards={overviewCards}
            note="يمكن النقر على المؤشرات الأساسية لفتح تفصيل مباشر يوضح السجلات التي تصنع هذا الرقم."
          />

          <DashboardAttentionSection
            loading={loading}
            summaryCards={urgentSummaryCards}
            attentionItems={attentionItems}
            onOpenAttentionPanel={() => openDrillDown('urgentAttention')}
          />

          <DashboardWorkQueueSection
            loading={loading}
            partialItems={queueItems.partial}
            openItems={queueItems.open}
            onOpenPartialDrillDown={() => openDrillDown('partial')}
            onOpenOpenDrillDown={() => openDrillDown('open')}
          />

          <DashboardRecentActivitySection
            loading={loading}
            recentTransfers={recentTransfers}
            recentPayments={recentPayments}
            paymentsSummary={
              loading
                ? 'جار تحميل حركة المدفوعات...'
                : `اليوم تم تسجيل ${stats.todayPaymentCount ?? 0} دفعة بقيمة ${formatNumber(stats.todayPaidRub, 2)} RUB.`
            }
            transfersSummary="أحدث الحوالات التي دخلت النظام مع حالتها الحالية ورصيدها المفتوح."
            onOpenPaymentsDrillDown={() => openDrillDown('recentPayments')}
            onOpenTransfersDrillDown={() => openDrillDown('recentTransfers')}
          />

          <DashboardQuickActions latestTransfer={recentTransfers[0]} nextActionItem={quickActionItem} />
        </div>
      )}

      <OperationsDrillDownSheet
        key={activeDrillDownKey || 'closed'}
        open={Boolean(activeDrillDown)}
        title={activeDrillDown?.title || ''}
        totalValue={activeDrillDown?.totalValue || '--'}
        subtitle={activeDrillDown?.subtitle || ''}
        description={activeDrillDown?.description || ''}
        items={activeDrillDown?.items || []}
        emptyMessage={activeDrillDown?.emptyMessage || ''}
        searchPlaceholder={activeDrillDown?.searchPlaceholder || 'ابحث داخل القائمة'}
        viewAllTo={activeDrillDown?.viewAllTo || ''}
        viewAllLabel={activeDrillDown?.viewAllLabel || 'فتح الكل في صف الحوالات'}
        onClose={closeDrillDown}
        renderItem={activeDrillDown?.renderItem || (() => null)}
      />
    </>
  )
}

export default DashboardPage
