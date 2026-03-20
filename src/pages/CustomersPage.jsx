import { useEffect, useState } from 'react'
import CustomersAttentionSection from '../components/customers/CustomersAttentionSection.jsx'
import CustomerRecordCard from '../components/customers/CustomerRecordCard.jsx'
import CustomersFormSection from '../components/customers/CustomersFormSection.jsx'
import CustomersHeader from '../components/customers/CustomersHeader.jsx'
import CustomersList from '../components/customers/CustomersList.jsx'
import CustomersPortfolioSummary from '../components/customers/CustomersPortfolioSummary.jsx'
import CustomersRecentActivitySection from '../components/customers/CustomersRecentActivitySection.jsx'
import InlineMessage from '../components/ui/InlineMessage.jsx'
import OfflineSnapshotNotice from '../components/ui/OfflineSnapshotNotice.jsx'
import OperationsDrillDownSheet from '../components/ui/OperationsDrillDownSheet.jsx'
import PendingMutationNotice from '../components/ui/PendingMutationNotice.jsx'
import RecordCard from '../components/ui/RecordCard.jsx'
import RecordHeader from '../components/ui/RecordHeader.jsx'
import SectionCard from '../components/ui/SectionCard.jsx'
import { useAuth } from '../context/auth-context.js'
import useNetworkStatus from '../hooks/useNetworkStatus.js'
import useOfflineSnapshot from '../hooks/useOfflineSnapshot.js'
import usePendingCustomers from '../hooks/usePendingCustomers.js'
import useReplayQueue from '../hooks/useReplayQueue.js'
import { CUSTOMERS_LIST_SNAPSHOT_KEY } from '../lib/offline/cacheKeys.js'
import { queueOfflineCustomer } from '../lib/offline/customerQueue.js'
import { getOfflineSnapshotMissingMessage } from '../lib/offline/freshness.js'
import {
  isBrowserOffline,
  isLikelyOfflineReadFailure,
  loadReadSnapshot,
  saveReadSnapshot,
  withLiveReadTimeout,
} from '../lib/offline/readCache.js'
import { getPaymentMethodLabel, getTransferStatusMeta } from '../lib/transfer-ui.js'
import {
  createEmptyCustomerForm,
  normalizeCustomerProfilePayload,
  validateCustomerProfilePayload,
} from '../lib/customerProfile.js'
import { supabase } from '../lib/supabase.js'

const emptyForm = createEmptyCustomerForm()

const emptyPortfolioStats = {
  totalCustomers: 0,
  activeCollectionCustomers: null,
  openAwaitingCustomers: null,
  overpaidCustomers: null,
  followUpCustomers: null,
  todayFollowUpCustomers: null,
  totalOutstandingRub: null,
}

const PORTFOLIO_FILTER_LABELS = {
  all: '',
  needs_follow_up: 'عملاء بحاجة متابعة الآن',
  active_collection: 'عملاء التحصيل النشط',
  open_waiting: 'عملاء بانتظار أول دفعة',
  overpaid: 'عملاء فوق المطلوب',
  recent_activity: 'عملاء عليهم حركة اليوم وما زالوا يحتاجون متابعة',
}

const CUSTOMER_PAGE_SECTIONS = [
  {
    key: 'customers',
    label: 'العملاء',
    description: 'إنشاء العميل والبحث والقائمة',
  },
  {
    key: 'portfolio',
    label: 'المحفظة',
    description: 'مؤشرات المحفظة والصورة العامة',
  },
  {
    key: 'attention',
    label: 'متابعة',
    description: 'الحالات ذات الأولوية الأعلى',
  },
  {
    key: 'activity',
    label: 'النشاط',
    description: 'آخر الحركة عبر العملاء',
  },
]

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

function isToday(value, referenceDate = new Date()) {
  const parsedDate = parseDateValue(value)

  if (!parsedDate) {
    return false
  }

  const startOfDay = new Date(referenceDate)
  startOfDay.setHours(0, 0, 0, 0)

  const endOfDay = new Date(startOfDay)
  endOfDay.setDate(endOfDay.getDate() + 1)

  return parsedDate >= startOfDay && parsedDate < endOfDay
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

function isOpenWaitingCustomer(customer) {
  return customer.openAwaitingCount > 0 && customer.partialCount === 0 && !customer.hasOverpaid
}

function isActiveCollectionCustomer(customer) {
  return customer.hasActiveCollection && !customer.hasOverpaid
}

function getPortfolioFilterMatch(customer, portfolioFilter) {
  if (portfolioFilter === 'all') {
    return true
  }

  if (portfolioFilter === 'needs_follow_up') {
    return customer.needsFollowUp
  }

  if (portfolioFilter === 'active_collection') {
    return isActiveCollectionCustomer(customer)
  }

  if (portfolioFilter === 'open_waiting') {
    return isOpenWaitingCustomer(customer)
  }

  if (portfolioFilter === 'overpaid') {
    return customer.hasOverpaid
  }

  if (portfolioFilter === 'recent_activity') {
    return customer.needsFollowUp && customer.hasActivityToday
  }

  return true
}

function getCustomerPriorityRank(customer) {
  if (customer.hasOverpaid) {
    return 0
  }

  if (customer.partialCount > 0) {
    return 1
  }

  if (customer.openAwaitingCount > 0) {
    return 2
  }

  return 3
}

function compareCustomersByPriority(left, right) {
  const priorityDifference = getCustomerPriorityRank(left) - getCustomerPriorityRank(right)

  if (priorityDifference !== 0) {
    return priorityDifference
  }

  const outstandingDifference = (right.outstandingRub || 0) - (left.outstandingRub || 0)

  if (Math.abs(outstandingDifference) > 0.009) {
    return outstandingDifference
  }

  return (right.lastActivityAtTs || 0) - (left.lastActivityAtTs || 0)
}

function compareArchivedCustomers(left, right) {
  const rightArchivedAt = parseDateValue(right?.archivedAt)?.getTime() || 0
  const leftArchivedAt = parseDateValue(left?.archivedAt)?.getTime() || 0

  if (rightArchivedAt !== leftArchivedAt) {
    return rightArchivedAt - leftArchivedAt
  }

  return String(left?.name || '').localeCompare(String(right?.name || ''), 'ar')
}

function getStateSummary({ totalTransfers, overpaidCount, partialCount, openAwaitingCount }) {
  if (!totalTransfers) {
    return 'بدون حوالات بعد'
  }

  const parts = []

  if (overpaidCount > 0) {
    parts.push(`${overpaidCount} فوق المطلوب`)
  }

  if (partialCount > 0) {
    parts.push(`${partialCount} جزئية`)
  }

  if (openAwaitingCount > 0) {
    parts.push(`${openAwaitingCount} مفتوحة`)
  }

  if (parts.length === 0) {
    return 'ملف مستقر'
  }

  return parts.join(' • ')
}

function getCustomerPortfolioMeta(customer) {
  if (customer.isArchived) {
    return {
      eyebrow: 'ملف مؤرشف',
      queueLabel: 'مؤرشف',
      queueClassName: 'queue-chip--neutral',
      cardClassName: 'customer-portfolio-card--archived',
      followUpNote: customer.archivedAt
        ? `تمت أرشفة هذا العميل في ${formatDate(customer.archivedAt)} وأصبح متاحا للمراجعة التاريخية فقط.`
        : 'تمت أرشفة هذا العميل وأصبح متاحا للمراجعة التاريخية فقط.',
    }
  }

  if (customer.hasOverpaid) {
    return {
      eyebrow: 'مراجعة مالية عاجلة',
      queueLabel: 'فوق المطلوب',
      queueClassName: 'queue-chip--danger',
      cardClassName: 'customer-portfolio-card--danger',
      followUpNote: `يوجد ${customer.overpaidCount} حوالة فوق المطلوب لهذا العميل بإجمالي زيادة ${customer.overpaidAmountRubLabel}. افتح ملف العميل للمراجعة المالية قبل أي إجراء جديد.`,
    }
  }

  if (customer.partialCount > 0) {
    return {
      eyebrow: 'تحصيل قيد المتابعة',
      queueLabel: 'تحصيل جزئي',
      queueClassName: 'queue-chip--warning',
      cardClassName: 'customer-portfolio-card--warning',
      followUpNote: `لدى هذا العميل ${customer.partialCount} حوالة مدفوعة جزئيا وما زال المتبقي المفتوح ${customer.outstandingRubLabel}.`,
    }
  }

  if (customer.openAwaitingCount > 0) {
    return {
      eyebrow: 'بانتظار بدء التحصيل',
      queueLabel: 'مفتوح',
      queueClassName: 'queue-chip--neutral',
      cardClassName: 'customer-portfolio-card--open',
      followUpNote: `لدى هذا العميل ${customer.openAwaitingCount} حوالة مفتوحة بانتظار أول دفعة. الرصيد المفتوح الحالي ${customer.outstandingRubLabel}.`,
    }
  }

  if (!customer.totalTransfers) {
    return {
      eyebrow: 'ملف جديد',
      queueLabel: 'بدون حوالات',
      queueClassName: 'queue-chip--neutral',
      cardClassName: 'customer-portfolio-card--neutral',
      followUpNote: 'ملف عميل جديد بدون حوالات مسجلة حتى الآن.',
    }
  }

  return {
    eyebrow: 'ملف مستقر',
    queueLabel: 'مستقر',
    queueClassName: 'queue-chip--success',
    cardClassName: 'customer-portfolio-card--success',
    followUpNote: 'لا يظهر على هذا العميل حاليا رصيد مفتوح يحتاج متابعة أو مراجعة مالية.',
  }
}

function buildBaseCustomerEntry(customer, index) {
  const meta = getCustomerPortfolioMeta({
    archivedAt: customer.archived_at || '',
    totalTransfers: 0,
    overpaidCount: 0,
    partialCount: 0,
    openAwaitingCount: 0,
    hasOverpaid: false,
    isArchived: Boolean(customer.is_archived),
    outstandingRubLabel: '--',
    overpaidAmountRubLabel: '--',
  })

  return {
    archivedAt: customer.archived_at || '',
    id: customer.id ?? `${customer.full_name}-${customer.phone ?? 'no-phone'}-${index}`,
    isArchived: Boolean(customer.is_archived),
    to: customer.id ? `/customers/${customer.id}` : '/customers',
    name: customer.full_name || 'عميل بدون اسم',
    phone: customer.phone || 'غير مضاف',
    internalId: customer.id || '',
    note: customer.notes || 'لا توجد ملاحظات داخلية.',
    totalTransfers: 0,
    totalTransfersLabel: '0',
    activeTransfersLabel: '0',
    totalPayableRub: 0,
    totalPayableRubLabel: '--',
    totalPaidRub: 0,
    totalPaidRubLabel: '--',
    outstandingRub: 0,
    outstandingRubLabel: '--',
    overpaidAmountRub: 0,
    overpaidAmountRubLabel: '--',
    openCount: 0,
    partialCount: 0,
    openAwaitingCount: 0,
    overpaidCount: 0,
    hasOverpaid: false,
    hasActiveCollection: false,
    needsFollowUp: false,
    hasActivityToday: false,
    lastActivityAt: '',
    lastActivityAtTs: 0,
    lastActivityLabel: 'لا توجد حركة بعد',
    stateSummary: 'بدون حوالات بعد',
    remainingCardClassName: '',
    remainingValueClassName: '',
    searchText: `${customer.full_name || ''} ${customer.phone || ''} ${customer.is_archived ? 'عميل مؤرشف' : ''}`.toLowerCase(),
    ...meta,
  }
}

function renderCustomerActivityDrillDownCompactItem(item) {
  return (
    <RecordCard
      key={item.id}
      to={item.to}
      className={['customer-activity-card', item.cardClassName, 'record-card--mobile-priority', 'customer-activity-card--compact']
        .filter(Boolean)
        .join(' ')}
    >
      <RecordHeader
        eyebrow={item.eyebrow}
        title={item.title}
        subtitle={item.subtitle}
        subtitleClassName="record-muted-strong"
        metaItems={item.metaItems.slice(0, 1)}
        aside={
          <>
            {item.badgeLabel ? (
              <span className={['activity-chip', item.badgeClassName].filter(Boolean).join(' ')}>
                {item.badgeLabel}
              </span>
            ) : null}
            <span className="record-compact-meta">{item.timeLabel}</span>
            <span className="record-compact-action">فتح الملف</span>
          </>
        }
      />

      {item.noteText ? <p className="record-note record-note--compact customer-activity-note">{item.noteText}</p> : null}
    </RecordCard>
  )
}

function getPendingCustomerStatusMeta(status) {
  if (status === 'failed') {
    return {
      chipClassName: 'offline-snapshot-chip--warning',
      label: 'فشل الإرسال',
      note: 'يحتاج هذا العميل المحلي إلى إعادة محاولة عند توفر الاتصال.',
    }
  }

  if (status === 'syncing') {
    return {
      chipClassName: 'offline-snapshot-chip--info',
      label: 'جار الإرسال',
      note: 'يجري الآن إرسال ملف العميل المحلي إلى الخادم.',
    }
  }

  return {
    chipClassName: 'offline-snapshot-chip--warning',
    label: 'بانتظار الإرسال',
    note: 'سيبقى هذا العميل محليا فقط حتى تنجح المزامنة ويصبح ملفه مؤكدا على الخادم.',
  }
}

function buildPendingCustomerNote(record) {
  if (record.status === 'failed' && record.lastError) {
    return `آخر خطأ: ${record.lastError}`
  }

  if (record.payload?.notes) {
    return record.payload.notes
  }

  return getPendingCustomerStatusMeta(record.status).note
}

function CustomersPage() {
  const { configError, isConfigured } = useAuth()
  const { isOffline } = useNetworkStatus()
  const { clearSnapshotState, markCachedSnapshot, markLiveSnapshot, snapshotState } =
    useOfflineSnapshot()
  const [customers, setCustomers] = useState([])
  const [archivedCustomers, setArchivedCustomers] = useState([])
  const [loading, setLoading] = useState(Boolean(isConfigured))
  const [loadError, setLoadError] = useState(isConfigured ? '' : configError)
  const [portfolioWarning, setPortfolioWarning] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [portfolioFilter, setPortfolioFilter] = useState('all')
  const [portfolioStats, setPortfolioStats] = useState(emptyPortfolioStats)
  const [attentionCustomers, setAttentionCustomers] = useState([])
  const [recentActivityItems, setRecentActivityItems] = useState([])
  const [activeSection, setActiveSection] = useState('customers')
  const [activeDrillDownKey, setActiveDrillDownKey] = useState('')
  const [formValues, setFormValues] = useState(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [submitSuccess, setSubmitSuccess] = useState('')
  const {
    activeCount: pendingCustomerCount,
    failedCount: failedPendingCustomerCount,
    pendingCustomers,
    pendingCustomersLoading,
    refreshPendingCustomers,
  } = usePendingCustomers()
  const {
    customerQueueCount,
    isSyncing,
    replayCustomersNow,
  } = useReplayQueue()

  useEffect(() => {
    if (!isConfigured || !supabase) {
      return undefined
    }

    let isMounted = true

    const hydrateFromSnapshot = async (options = {}) => {
      const { fallbackErrorMessage = '' } = options

      setLoading(true)
      setLoadError('')
      setPortfolioWarning('')

      const snapshot = await loadReadSnapshot(CUSTOMERS_LIST_SNAPSHOT_KEY)

      if (!isMounted) {
        return
      }

      if (!snapshot?.data) {
        clearSnapshotState()
        setCustomers([])
        setArchivedCustomers([])
        setAttentionCustomers([])
        setRecentActivityItems([])
        setPortfolioStats(emptyPortfolioStats)
        setLoadError(fallbackErrorMessage || getOfflineSnapshotMissingMessage('لملفات العملاء'))
        setLoading(false)
        return false
      }

      setCustomers(snapshot.data.customers || [])
      setArchivedCustomers(snapshot.data.archivedCustomers || [])
      setAttentionCustomers(snapshot.data.attentionCustomers || [])
      setRecentActivityItems(snapshot.data.recentActivityItems || [])
      setPortfolioStats(snapshot.data.portfolioStats || emptyPortfolioStats)
      setPortfolioWarning(snapshot.data.portfolioWarning || '')
      setLoadError('')
      setLoading(false)
      markCachedSnapshot(snapshot.savedAt)
      return true
    }

    const loadCustomers = async () => {
      clearSnapshotState()
      setLoading(true)
      setLoadError('')
      setPortfolioWarning('')

      try {
        const { data: customersData, error: customersError } = await withLiveReadTimeout(
          supabase.schema('public').from('customers').select('*').order('full_name', { ascending: true }),
          {
            timeoutMessage: 'تعذر إكمال تحميل ملفات العملاء في الوقت المتوقع.',
          }
        )

        if (!isMounted) {
          return
        }

        if (customersError) {
          const preferSnapshot = isOffline || isBrowserOffline() || isLikelyOfflineReadFailure(customersError)
          await hydrateFromSnapshot({
            fallbackErrorMessage: preferSnapshot ? '' : customersError.message,
          })
          return
        }

        const customerMap = Object.fromEntries((customersData ?? []).map((customer) => [customer.id, customer]))
        const baseEntries = (customersData ?? []).map((customer, index) =>
          buildBaseCustomerEntry(customer, index)
        )
        const activeBaseEntries = baseEntries.filter((customer) => !customer.isArchived)
        const archivedBaseEntries = baseEntries
          .filter((customer) => customer.isArchived)
          .sort(compareArchivedCustomers)

        const [transfersResult, paymentsResult] = await withLiveReadTimeout(
          Promise.all([
            supabase
              .schema('public')
              .from('transfers')
              .select('id, customer_id, reference_number, status, payable_rub, created_at')
              .order('created_at', { ascending: false }),
            supabase
              .schema('public')
              .from('transfer_payments')
              .select('id, transfer_id, amount_rub, payment_method, note, paid_at, created_at')
              .order('created_at', { ascending: false }),
          ]),
          {
            timeoutMessage: 'تعذر إكمال تحميل مؤشرات متابعة العملاء في الوقت المتوقع.',
          }
        )

        if (!isMounted) {
          return
        }

        if (transfersResult.error || paymentsResult.error) {
          const metricsError =
            transfersResult.error ||
            paymentsResult.error ||
            new Error('تم تحميل العملاء، لكن تعذر بناء مؤشرات المتابعة المالية حاليا.')
          const preferSnapshot = isOffline || isBrowserOffline() || isLikelyOfflineReadFailure(metricsError)

          if (preferSnapshot) {
            await hydrateFromSnapshot()
            return
          }

          setCustomers(activeBaseEntries)
          setArchivedCustomers(archivedBaseEntries)
          setAttentionCustomers([])
          setRecentActivityItems([])
          setPortfolioStats({
            ...emptyPortfolioStats,
            totalCustomers: activeBaseEntries.length,
          })
          setPortfolioFilter('all')
          setPortfolioWarning(
            transfersResult.error?.message ||
              paymentsResult.error?.message ||
              'تم تحميل العملاء، لكن تعذر بناء مؤشرات المتابعة المالية حاليا.'
          )
          setLoading(false)
          return
        }

        const transfers = transfersResult.data ?? []
        const payments = paymentsResult.data ?? []
        const transferMap = {}
        const paymentTotalsByTransfer = {}
        const latestPaymentByTransfer = {}
        const paymentsByCustomerId = {}

        payments.forEach((payment) => {
          if (!payment.transfer_id) {
            return
          }

          const activityAt = payment.paid_at || payment.created_at
          paymentTotalsByTransfer[payment.transfer_id] = roundCurrency(
            (paymentTotalsByTransfer[payment.transfer_id] || 0) + (Number(payment.amount_rub) || 0)
          )

          const currentLatest = latestPaymentByTransfer[payment.transfer_id]
          const nextTimestamp = parseDateValue(activityAt)?.getTime() || 0
          const currentTimestamp = parseDateValue(currentLatest?.activityAt)?.getTime() || 0

          if (!currentLatest || nextTimestamp >= currentTimestamp) {
            latestPaymentByTransfer[payment.transfer_id] = {
              ...payment,
              activityAt,
            }
          }
        })

        const transferRecords = transfers.map((transfer) => {
          const payableRub = Number(transfer.payable_rub) || 0
          const totalPaidRub = paymentTotalsByTransfer[transfer.id] || 0
          const remainingRub = roundCurrency(payableRub - totalPaidRub)
          const normalizedStatus = normalizeStatus(transfer.status)
          const isOverpaid = remainingRub < -0.009
          const isPartialOutstanding = isPartialStatus(normalizedStatus) && remainingRub > 0.009
          const isOpenOutstanding = isOpenStatus(normalizedStatus) && remainingRub > 0.009
          const latestPayment = latestPaymentByTransfer[transfer.id] || null

          const record = {
            ...transfer,
            payableRub,
            totalPaidRub,
            remainingRub,
            normalizedStatus,
            isOverpaid,
            isPartialOutstanding,
            isOpenOutstanding,
            latestPayment,
          }

          transferMap[transfer.id] = record
          return record
        })

        const transfersByCustomerId = {}

        transferRecords.forEach((transfer) => {
          if (!transfer.customer_id) {
            return
          }

          if (!transfersByCustomerId[transfer.customer_id]) {
            transfersByCustomerId[transfer.customer_id] = []
          }

          transfersByCustomerId[transfer.customer_id].push(transfer)

          if (transfer.latestPayment) {
            if (!paymentsByCustomerId[transfer.customer_id]) {
              paymentsByCustomerId[transfer.customer_id] = []
            }

            paymentsByCustomerId[transfer.customer_id].push({
              ...transfer.latestPayment,
              transfer,
            })
          }
        })

      const portfolioEntries = (customersData ?? [])
        .map((customer, index) => {
          const customerTransfers = transfersByCustomerId[customer.id] || []
          const totalTransfers = customerTransfers.length
          const totalPayableRub = roundCurrency(
            customerTransfers.reduce((sum, transfer) => sum + transfer.payableRub, 0)
          )
          const totalPaidRub = roundCurrency(
            customerTransfers.reduce((sum, transfer) => sum + transfer.totalPaidRub, 0)
          )
          const outstandingRub = roundCurrency(
            customerTransfers.reduce(
              (sum, transfer) => sum + (transfer.remainingRub > 0.009 ? transfer.remainingRub : 0),
              0
            )
          )
          const overpaidAmountRub = roundCurrency(
            customerTransfers.reduce(
              (sum, transfer) => sum + (transfer.isOverpaid ? Math.abs(transfer.remainingRub) : 0),
              0
            )
          )
          const partialCount = customerTransfers.filter((transfer) => transfer.isPartialOutstanding).length
          const openAwaitingCount = customerTransfers.filter(
            (transfer) => transfer.isOpenOutstanding
          ).length
          const overpaidCount = customerTransfers.filter((transfer) => transfer.isOverpaid).length
          const followUpTransfersCount = customerTransfers.filter(
            (transfer) =>
              transfer.isOverpaid || transfer.isPartialOutstanding || transfer.isOpenOutstanding
          ).length
          const hasOverpaid = overpaidCount > 0
          const hasActiveCollection = partialCount > 0 || openAwaitingCount > 0
          const needsFollowUp = hasOverpaid || hasActiveCollection
          const latestTransfer = [...customerTransfers].sort(
            (left, right) =>
              (parseDateValue(right.created_at)?.getTime() || 0) -
              (parseDateValue(left.created_at)?.getTime() || 0)
          )[0]
          const latestPayment = [...(paymentsByCustomerId[customer.id] || [])].sort(
            (left, right) =>
              (parseDateValue(right.activityAt)?.getTime() || 0) -
              (parseDateValue(left.activityAt)?.getTime() || 0)
          )[0]
          const latestTransferTs = parseDateValue(latestTransfer?.created_at)?.getTime() || 0
          const latestPaymentTs = parseDateValue(latestPayment?.activityAt)?.getTime() || 0
          const lastActivityAtTs = Math.max(latestTransferTs, latestPaymentTs, 0)
          const lastActivityAt =
            lastActivityAtTs === latestPaymentTs && latestPaymentTs > 0
              ? latestPayment.activityAt
              : latestTransfer?.created_at || ''
          const lastActivityLabel =
            lastActivityAtTs > 0 ? formatDate(lastActivityAt) : 'لا توجد حركة بعد'
          const hasActivityToday = lastActivityAtTs > 0 ? isToday(lastActivityAt) : false
          const remainingCardClassName = hasOverpaid
            ? 'info-card--danger'
            : outstandingRub > 0.009
              ? 'info-card--accent'
              : 'info-card--success'
          const remainingValueClassName = hasOverpaid
            ? 'info-card-value--danger'
            : outstandingRub > 0.009
              ? ''
              : 'info-card-value--success'
          const stateSummary = getStateSummary({
            totalTransfers,
            overpaidCount,
            partialCount,
            openAwaitingCount,
          })
          const baseEntry = {
            archivedAt: customer.archived_at || '',
            id: customer.id ?? `${customer.full_name}-${customer.phone ?? 'no-phone'}-${index}`,
            isArchived: Boolean(customer.is_archived),
            to: customer.id ? `/customers/${customer.id}` : '/customers',
            name: customer.full_name || 'عميل بدون اسم',
            phone: customer.phone || 'غير مضاف',
            internalId: customer.id || '',
            note: customer.notes || 'لا توجد ملاحظات داخلية.',
            totalTransfers,
            totalTransfersLabel: String(totalTransfers),
            activeTransfersLabel: String(followUpTransfersCount),
            totalPayableRub,
            totalPayableRubLabel: `${formatNumber(totalPayableRub, 2)} RUB`,
            totalPaidRub,
            totalPaidRubLabel: `${formatNumber(totalPaidRub, 2)} RUB`,
            outstandingRub,
            outstandingRubLabel:
              outstandingRub > 0.009 ? `${formatNumber(outstandingRub, 2)} RUB` : 'لا يوجد',
            overpaidAmountRub,
            overpaidAmountRubLabel:
              overpaidAmountRub > 0.009 ? `${formatNumber(overpaidAmountRub, 2)} RUB` : 'لا يوجد',
            partialCount,
            openAwaitingCount,
            overpaidCount,
            hasOverpaid,
            hasActiveCollection,
            needsFollowUp,
            hasActivityToday,
            lastActivityAt,
            lastActivityAtTs,
            lastActivityLabel,
            stateSummary,
            remainingCardClassName,
            remainingValueClassName,
            searchText: `${customer.full_name || ''} ${customer.phone || ''} ${stateSummary} ${customer.notes || ''} ${customer.is_archived ? 'عميل مؤرشف' : ''}`.toLowerCase(),
          }

          return {
            ...baseEntry,
            ...getCustomerPortfolioMeta(baseEntry),
          }
        })
      const activePortfolioEntries = portfolioEntries
        .filter((customer) => !customer.isArchived)
        .sort(compareCustomersByPriority)
      const archivedPortfolioEntries = portfolioEntries
        .filter((customer) => customer.isArchived)
        .sort(compareArchivedCustomers)

      const portfolioActivityItems = [
        ...payments
          .map((payment) => {
            const transfer = transferMap[payment.transfer_id]

            if (!transfer?.customer_id) {
              return null
            }

            const customer = customerMap[transfer.customer_id]

            if (!customer || customer.is_archived) {
              return null
            }

            const activityAt = payment.paid_at || payment.created_at
            const customerName = customer.full_name || 'عميل بدون اسم'
            const referenceLabel = transfer.reference_number || `حوالة #${transfer.id}`
            const methodLabel = getPaymentMethodLabel(payment.payment_method)

            return {
              id: `payment-${payment.id}`,
              to: `/customers/${customer.id}`,
              eyebrow: 'دفعة مرتبطة بعميل',
              title: customerName,
              subtitle: `دفعة على ${referenceLabel}`,
              metaItems: [
                { label: 'المرجع', value: referenceLabel },
                { label: 'المبلغ', value: `${formatNumber(payment.amount_rub, 2)} RUB`, ltr: true },
                { label: 'وسيلة الدفع', value: methodLabel },
              ],
              badgeLabel: 'دفعة',
              badgeClassName: transfer.isOverpaid ? 'activity-chip--danger' : 'activity-chip--warning',
              timeLabel: formatDate(activityAt),
              noteText: payment.note || '',
              cardClassName: 'customer-activity-card--payment',
              eventAt: parseDateValue(activityAt)?.getTime() || 0,
              searchText: `${customerName} ${referenceLabel} ${methodLabel} ${payment.note || ''}`.toLowerCase(),
            }
          })
          .filter(Boolean),
        ...transferRecords
          .map((transfer) => {
            if (!transfer.customer_id) {
              return null
            }

            const customer = customerMap[transfer.customer_id]

            if (!customer || customer.is_archived) {
              return null
            }

            const customerName = customer.full_name || 'عميل بدون اسم'
            const statusMeta = getTransferStatusMeta(transfer.status)
            const referenceLabel = transfer.reference_number || `حوالة #${transfer.id}`

            return {
              id: `transfer-${transfer.id}`,
              to: `/customers/${customer.id}`,
              eyebrow: 'حوالة مرتبطة بعميل',
              title: customerName,
              subtitle: `حوالة ${referenceLabel}`,
              metaItems: [
                { label: 'المرجع', value: referenceLabel },
                { label: 'الحالة', value: statusMeta.label },
                { label: 'المبلغ النهائي', value: `${formatNumber(transfer.payableRub, 2)} RUB`, ltr: true },
              ],
              badgeLabel: transfer.isOverpaid ? 'مراجعة' : 'حوالة',
              badgeClassName: transfer.isOverpaid
                ? 'activity-chip--danger'
                : transfer.isPartialOutstanding || transfer.isOpenOutstanding
                  ? 'activity-chip--warning'
                  : 'activity-chip--success',
              timeLabel: formatDate(transfer.created_at),
              noteText: transfer.isOverpaid
                ? `توجد زيادة دفع على هذه الحوالة بمقدار ${formatNumber(Math.abs(transfer.remainingRub), 2)} RUB.`
                : transfer.isPartialOutstanding || transfer.isOpenOutstanding
                  ? `ما زال على هذه الحوالة رصيد مفتوح مقداره ${formatNumber(Math.max(transfer.remainingRub, 0), 2)} RUB.`
                  : '',
              cardClassName: 'customer-activity-card--transfer',
              eventAt: parseDateValue(transfer.created_at)?.getTime() || 0,
              searchText: `${customerName} ${referenceLabel} ${statusMeta.label}`.toLowerCase(),
            }
          })
          .filter(Boolean),
      ]
        .sort((left, right) => right.eventAt - left.eventAt)
        .slice(0, 6)

        const followUpCustomers = activePortfolioEntries.filter((customer) => customer.needsFollowUp)
        const activeCollectionCustomers = activePortfolioEntries.filter(isActiveCollectionCustomer)
        const openAwaitingCustomers = activePortfolioEntries.filter(isOpenWaitingCustomer)

        setCustomers(activePortfolioEntries)
        setArchivedCustomers(archivedPortfolioEntries)
        setPortfolioStats({
          totalCustomers: activePortfolioEntries.length,
          activeCollectionCustomers: activeCollectionCustomers.length,
          openAwaitingCustomers: openAwaitingCustomers.length,
          overpaidCustomers: activePortfolioEntries.filter((customer) => customer.hasOverpaid).length,
          followUpCustomers: followUpCustomers.length,
          todayFollowUpCustomers: activePortfolioEntries.filter(
            (customer) => customer.needsFollowUp && customer.hasActivityToday
          ).length,
          totalOutstandingRub: roundCurrency(
            activePortfolioEntries.reduce((sum, customer) => sum + customer.outstandingRub, 0)
          ),
        })
        setAttentionCustomers(followUpCustomers.slice(0, 4))
        setRecentActivityItems(portfolioActivityItems)
        setLoading(false)

        const savedSnapshot = await saveReadSnapshot({
          key: CUSTOMERS_LIST_SNAPSHOT_KEY,
          scope: 'customers-list',
          type: 'customers_list',
          data: {
            archivedCustomers: archivedPortfolioEntries,
            customers: activePortfolioEntries,
            portfolioStats: {
              totalCustomers: activePortfolioEntries.length,
              activeCollectionCustomers: activeCollectionCustomers.length,
              openAwaitingCustomers: openAwaitingCustomers.length,
              overpaidCustomers: activePortfolioEntries.filter((customer) => customer.hasOverpaid).length,
              followUpCustomers: followUpCustomers.length,
              todayFollowUpCustomers: activePortfolioEntries.filter(
                (customer) => customer.needsFollowUp && customer.hasActivityToday
              ).length,
              totalOutstandingRub: roundCurrency(
                activePortfolioEntries.reduce((sum, customer) => sum + customer.outstandingRub, 0)
              ),
            },
            attentionCustomers: followUpCustomers.slice(0, 4),
            recentActivityItems: portfolioActivityItems,
            portfolioWarning: '',
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
      loadCustomers()
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

  const handleChange = (event) => {
    const { name, value } = event.target

    setFormValues((current) => ({
      ...current,
      [name]: value,
    }))
  }

  const handleRefresh = () => {
    setRefreshKey((current) => current + 1)
  }

  const handleSyncPendingCustomers = async () => {
    setSubmitError('')
    setSubmitSuccess('')

    const result = await replayCustomersNow()

    if (!result.started) {
      setSubmitSuccess('لا توجد ملفات عملاء محلية جاهزة للمزامنة حاليا.')
      return
    }

    if (result.failedCount > 0) {
      setSubmitError(
        `تعذر إرسال ${result.failedCount} ملف عميل محلي. راجع العناصر المحلية ثم أعد المحاولة.`
      )
      return
    }

    const messages = []

    if (result.replayedCount > 0) {
      messages.push(`تم إرسال ${result.replayedCount} ملف عميل محلي إلى الخادم`)
    }

    if (result.dedupedCount > 0) {
      messages.push(`تمت تسوية ${result.dedupedCount} ملف عميل موجود مسبقا على الخادم`)
    }

    setSubmitSuccess(messages.join('، ') || 'اكتملت مزامنة ملفات العملاء المحلية.')
    await refreshPendingCustomers()
    handleRefresh()
  }

  const openDrillDown = (key) => {
    setActiveDrillDownKey(key)
  }

  const closeDrillDown = () => {
    setActiveDrillDownKey('')
  }

  const applyPortfolioFilter = (nextFilter) => {
    setPortfolioFilter(nextFilter)
    setActiveSection('customers')
    closeDrillDown()
  }

  const normalizedSearchQuery = searchQuery.trim().toLowerCase()
  const filteredCustomers = customers.filter((customer) => {
    const matchesSearch =
      !normalizedSearchQuery ||
      String(customer.name || '').toLowerCase().includes(normalizedSearchQuery) ||
      String(customer.phone || '').toLowerCase().includes(normalizedSearchQuery)

    return matchesSearch && getPortfolioFilterMatch(customer, portfolioFilter)
  })
  const filteredArchivedCustomers = archivedCustomers.filter((customer) => {
    return (
      !normalizedSearchQuery ||
      String(customer.name || '').toLowerCase().includes(normalizedSearchQuery) ||
      String(customer.phone || '').toLowerCase().includes(normalizedSearchQuery)
    )
  })

  const followUpCustomers = customers.filter((customer) => customer.needsFollowUp)
  const activeCollectionCustomers = customers.filter(isActiveCollectionCustomer)
  const overpaidCustomers = customers.filter((customer) => customer.hasOverpaid)
  const openAwaitingCustomers = customers.filter(isOpenWaitingCustomer)
  const outstandingCustomers = customers.filter((customer) => customer.outstandingRub > 0.009)
  const todayFollowUpCustomers = customers.filter(
    (customer) => customer.needsFollowUp && customer.hasActivityToday
  )

  const customerGroups = (portfolioWarning
    ? [
        {
          key: 'all',
          title: 'قائمة العملاء',
          description: 'تم تحميل العملاء، لكن مؤشرات المتابعة المالية غير متاحة حاليا. افتح أي عميل لمراجعة ملفه مباشرة.',
          tone: 'default',
          items: filteredCustomers,
        },
      ]
    : [
        {
          key: 'urgent',
          title: 'مراجعة مالية عاجلة',
          description: 'عملاء لديهم حوالات فوق المطلوب وتحتاج ملفاتهم تدقيقا مباشرا.',
          tone: 'danger',
          items: filteredCustomers.filter((customer) => customer.hasOverpaid),
        },
        {
          key: 'partial',
          title: 'تحصيل جزئي يحتاج استكمالا',
          description: 'عملاء بدأ التحصيل على ملفاتهم وما زالت لديهم مبالغ مفتوحة تحتاج متابعة.',
          tone: 'warning',
          items: filteredCustomers.filter(
            (customer) => !customer.hasOverpaid && customer.partialCount > 0
          ),
        },
        {
          key: 'open',
          title: 'ملفات مفتوحة بانتظار أول دفعة',
          description: 'عملاء لديهم حوالات مفتوحة لم يبدأ عليها التحصيل بعد.',
          tone: 'neutral',
          items: filteredCustomers.filter(
            (customer) =>
              !customer.hasOverpaid &&
              customer.partialCount === 0 &&
              customer.openAwaitingCount > 0
          ),
        },
        {
          key: 'other',
          title: 'بقية المحفظة',
          description: 'ملفات مستقرة أو أقل أولوية للمتابعة الآن.',
          tone: 'default',
          items: filteredCustomers.filter(
            (customer) =>
              !customer.hasOverpaid &&
              customer.partialCount === 0 &&
              customer.openAwaitingCount === 0
          ),
        },
      ])
    .filter((group) => group.items.length > 0)

  if (filteredArchivedCustomers.length > 0) {
    customerGroups.push({
      key: 'archived',
      title: 'عملاء مؤرشفون',
      description: 'ملفات تاريخية لم تعد تظهر ضمن الاختيارات التشغيلية النشطة أو إنشاء الحوالات الجديدة.',
      tone: 'default',
      items: filteredArchivedCustomers,
    })
  }

  const activePortfolioFilterLabel = PORTFOLIO_FILTER_LABELS[portfolioFilter] || ''
  const followUpCustomersInView = filteredCustomers.filter((customer) => customer.needsFollowUp).length
  const pendingCustomerLabel =
    pendingCustomerCount > 0 ? ` • ${pendingCustomerCount} محلي بانتظار الإرسال` : ''
  const customerQueueSyncing = isSyncing && customerQueueCount > 0
  const totalVisibleCustomers = filteredCustomers.length + filteredArchivedCustomers.length
  const customerCountLabel = loading
    ? 'جار تحميل محفظة العملاء...'
    : `عرض ${filteredCustomers.length} من أصل ${customers.length} عميل • ${followUpCustomersInView} بحاجة متابعة${pendingCustomerLabel}`
  const listScopeLabel = activePortfolioFilterLabel
    ? `يتم الآن التركيز على: ${activePortfolioFilterLabel}. ما زال بإمكانك استخدام البحث أو إلغاء التركيز للعودة إلى كل المحفظة.`
    : 'العملاء مرتبون هنا حسب أولوية المتابعة: فوق المطلوب، ثم التحصيل الجزئي، ثم الملفات المفتوحة.'
  void customerCountLabel
  void listScopeLabel
  const visibleCustomerCountLabel = loading
    ? '\u062c\u0627\u0631 \u062a\u062d\u0645\u064a\u0644 \u0645\u062d\u0641\u0638\u0629 \u0627\u0644\u0639\u0645\u0644\u0627\u0621...'
    : `Ø¹Ø±Ø¶ ${totalVisibleCustomers} Ù…Ù† Ø£ØµÙ„ ${customers.length + archivedCustomers.length} Ø¹Ù…ÙŠÙ„ â€¢ ${followUpCustomersInView} Ø¨Ø­Ø§Ø¬Ø© Ù…ØªØ§Ø¨Ø¹Ø©${archivedCustomers.length > 0 ? ` â€¢ ${archivedCustomers.length} Ù…Ø¤Ø±Ø´Ù` : ''}${pendingCustomerLabel}`
  const visibleListScopeLabel = activePortfolioFilterLabel
    ? `ÙŠØªÙ… Ø§Ù„Ø¢Ù† Ø§Ù„ØªØ±ÙƒÙŠØ² Ø¹Ù„Ù‰: ${activePortfolioFilterLabel}. Ù…Ø§ Ø²Ø§Ù„ Ø¨Ø¥Ù…ÙƒØ§Ù†Ùƒ Ø§Ø³ØªØ®Ø¯Ø§Ù… Ø§Ù„Ø¨Ø­Ø« Ø£Ùˆ Ø¥Ù„ØºØ§Ø¡ Ø§Ù„ØªØ±ÙƒÙŠØ² Ù„Ù„Ø¹ÙˆØ¯Ø© Ø¥Ù„Ù‰ ÙƒÙ„ Ø§Ù„Ù…Ø­ÙØ¸Ø©ØŒ Ù…Ø¹ Ø¨Ù‚Ø§Ø¡ Ø§Ù„Ù…Ù„ÙØ§Øª Ø§Ù„Ù…Ø¤Ø±Ø´ÙØ© Ø¶Ù…Ù† Ù…Ø¬Ù…ÙˆØ¹Ø© Ù…Ø³ØªÙ‚Ù„Ø© Ø¹Ù†Ø¯ ÙˆØ¬ÙˆØ¯Ù‡Ø§.`
    : 'Ø§Ù„Ø¹Ù…Ù„Ø§Ø¡ Ø§Ù„Ù†Ø´Ø·ÙˆÙ† Ù…Ø±ØªØ¨ÙˆÙ† Ù‡Ù†Ø§ Ø­Ø³Ø¨ Ø£ÙˆÙ„ÙˆÙŠØ© Ø§Ù„Ù…ØªØ§Ø¨Ø¹Ø©: ÙÙˆÙ‚ Ø§Ù„Ù…Ø·Ù„ÙˆØ¨ØŒ Ø«Ù… Ø§Ù„ØªØ­ØµÙŠÙ„ Ø§Ù„Ø¬Ø²Ø¦ÙŠØŒ Ø«Ù… Ø§Ù„Ù…Ù„ÙØ§Øª Ø§Ù„Ù…ÙØªÙˆØ­Ø©ØŒ Ù…Ø¹ Ø¹Ø±Ø¶ Ø§Ù„Ù…Ù„ÙØ§Øª Ø§Ù„Ù…Ø¤Ø±Ø´ÙØ© ÙÙŠ Ù…Ø¬Ù…ÙˆØ¹Ø© Ù…Ø³ØªÙ‚Ù„Ø© Ø¹Ù†Ø¯ ÙˆØ¬ÙˆØ¯Ù‡Ø§.'
  void visibleCustomerCountLabel
  void visibleListScopeLabel
  const customerHeaderCountLabel = loading
    ? '\u062c\u0627\u0631 \u062a\u062d\u0645\u064a\u0644 \u0645\u062d\u0641\u0638\u0629 \u0627\u0644\u0639\u0645\u0644\u0627\u0621...'
    : `\u0639\u0631\u0636 ${totalVisibleCustomers} \u0645\u0646 \u0623\u0635\u0644 ${customers.length + archivedCustomers.length} \u0639\u0645\u064a\u0644 \u2022 ${followUpCustomersInView} \u0628\u062d\u0627\u062c\u0629 \u0645\u062a\u0627\u0628\u0639\u0629${archivedCustomers.length > 0 ? ` \u2022 ${archivedCustomers.length} \u0645\u0624\u0631\u0634\u0641` : ''}${pendingCustomerLabel}`
  const customersListScopeLabel = activePortfolioFilterLabel
    ? `\u064a\u062a\u0645 \u0627\u0644\u0622\u0646 \u0627\u0644\u062a\u0631\u0643\u064a\u0632 \u0639\u0644\u0649: ${activePortfolioFilterLabel}. \u0645\u0627 \u0632\u0627\u0644 \u0628\u0625\u0645\u0643\u0627\u0646\u0643 \u0627\u0633\u062a\u062e\u062f\u0627\u0645 \u0627\u0644\u0628\u062d\u062b \u0623\u0648 \u0625\u0644\u063a\u0627\u0621 \u0627\u0644\u062a\u0631\u0643\u064a\u0632 \u0644\u0644\u0639\u0648\u062f\u0629 \u0625\u0644\u0649 \u0643\u0644 \u0627\u0644\u0645\u062d\u0641\u0638\u0629\u060c \u0645\u0639 \u0628\u0642\u0627\u0621 \u0627\u0644\u0645\u0644\u0641\u0627\u062a \u0627\u0644\u0645\u0624\u0631\u0634\u0641\u0629 \u0636\u0645\u0646 \u0645\u062c\u0645\u0648\u0639\u0629 \u0645\u0633\u062a\u0642\u0644\u0629 \u0639\u0646\u062f \u0648\u062c\u0648\u062f\u0647\u0627.`
    : '\u0627\u0644\u0639\u0645\u0644\u0627\u0621 \u0627\u0644\u0646\u0634\u0637\u0648\u0646 \u0645\u0631\u062a\u0628\u0648\u0646 \u0647\u0646\u0627 \u062d\u0633\u0628 \u0623\u0648\u0644\u0648\u064a\u0629 \u0627\u0644\u0645\u062a\u0627\u0628\u0639\u0629: \u0641\u0648\u0642 \u0627\u0644\u0645\u0637\u0644\u0648\u0628\u060c \u062b\u0645 \u0627\u0644\u062a\u062d\u0635\u064a\u0644 \u0627\u0644\u062c\u0632\u0626\u064a\u060c \u062b\u0645 \u0627\u0644\u0645\u0644\u0641\u0627\u062a \u0627\u0644\u0645\u0641\u062a\u0648\u062d\u0629\u060c \u0645\u0639 \u0639\u0631\u0636 \u0627\u0644\u0645\u0644\u0641\u0627\u062a \u0627\u0644\u0645\u0624\u0631\u0634\u0641\u0629 \u0641\u064a \u0645\u062c\u0645\u0648\u0639\u0629 \u0645\u0633\u062a\u0642\u0644\u0629 \u0639\u0646\u062f \u0648\u062c\u0648\u062f\u0647\u0627.'
  const customerFormDescription = isOffline
    ? 'يمكنك حفظ ملف عميل محليا أثناء انقطاع الاتصال. سيبقى منفصلا عن ملفات العملاء المؤكدة حتى تنجح المزامنة.'
    : 'أضف عميلا جديدا حتى يتمكن فريق التشغيل من إنشاء الحوالات ومتابعة التسويات له.'
  const customerFormInfoMessage = isOffline
    ? 'سيحفظ هذا العميل داخل المتصفح فقط ولن يصبح متاحا كسجل مؤكد أو كعميل صالح لإنشاء حوالة محلية جديدة حتى تنجح المزامنة.'
    : ''

  const customersSectionDescription =
    failedPendingCustomerCount > 0
      ? `يضم أيضا ${failedPendingCustomerCount} ملف عميل محلي يحتاج إعادة محاولة.`
      : pendingCustomerCount > 0
        ? `يضم أيضا ${pendingCustomerCount} ملف عميل محلي بانتظار الإرسال.`
        : activePortfolioFilterLabel
          ? `يتم التركيز الآن على ${activePortfolioFilterLabel}.`
          : 'إنشاء العملاء والبحث وقائمة المتابعة في مساحة واحدة.'
  const showCrossSectionQueueNotice = activeSection !== 'customers' && pendingCustomerCount > 0

  const summaryCards = [
    {
      key: 'customers',
      label: 'إجمالي العملاء',
      value: loading ? '...' : portfolioStats.totalCustomers,
      copy: 'كل ملفات العملاء المتاحة للمشغل حاليا.',
      tone: 'brand',
      onClick: () => openDrillDown('allCustomers'),
      ariaLabel: 'فتح تفصيل كل ملفات العملاء',
    },
    {
      key: 'follow-up',
      label: 'بحاجة متابعة الآن',
      value: loading ? '...' : portfolioStats.followUpCustomers ?? '--',
      copy: 'عملاء لديهم رصيد مفتوح أو مراجعة مالية مطلوبة.',
      tone:
        portfolioStats.followUpCustomers && portfolioStats.followUpCustomers > 0 ? 'warning' : 'success',
      onClick: portfolioWarning ? undefined : () => openDrillDown('followUp'),
      ariaLabel: 'فتح تفصيل العملاء الذين يحتاجون متابعة الآن',
    },
    {
      key: 'active-collection',
      label: 'تحصيل نشط',
      value: loading ? '...' : portfolioStats.activeCollectionCustomers ?? '--',
      copy: 'عملاء لديهم حوالات مفتوحة أو جزئية قيد التحصيل.',
      tone:
        portfolioStats.activeCollectionCustomers && portfolioStats.activeCollectionCustomers > 0
          ? 'warning'
          : 'success',
      onClick: portfolioWarning ? undefined : () => openDrillDown('activeCollection'),
      ariaLabel: 'فتح تفصيل العملاء الذين لديهم تحصيل نشط',
    },
    {
      key: 'open-awaiting',
      label: 'بانتظار أول دفعة',
      value: loading ? '...' : portfolioStats.openAwaitingCustomers ?? '--',
      copy: 'عملاء لديهم ملفات مفتوحة لم يبدأ عليها التحصيل بعد.',
      tone:
        portfolioStats.openAwaitingCustomers && portfolioStats.openAwaitingCustomers > 0
          ? 'brand'
          : 'success',
      onClick: portfolioWarning ? undefined : () => openDrillDown('openAwaiting'),
      ariaLabel: 'فتح تفصيل العملاء الذين ينتظرون أول دفعة',
    },
    {
      key: 'overpaid',
      label: 'عملاء فوق المطلوب',
      value: loading ? '...' : portfolioStats.overpaidCustomers ?? '--',
      copy: 'ملفات تحتاج مراجعة مالية فورية.',
      tone:
        portfolioStats.overpaidCustomers && portfolioStats.overpaidCustomers > 0 ? 'danger' : 'success',
      onClick: portfolioWarning ? undefined : () => openDrillDown('overpaid'),
      ariaLabel: 'فتح تفصيل العملاء الذين لديهم حوالات فوق المطلوب',
    },
    {
      key: 'outstanding',
      label: 'إجمالي المتبقي المفتوح',
      value: loading
        ? '...'
        : portfolioStats.totalOutstandingRub === null
          ? '--'
          : `${formatNumber(portfolioStats.totalOutstandingRub, 2)} RUB`,
      copy: 'مجموع الأرصدة الموجبة المفتوحة عبر كل العملاء.',
      tone:
        portfolioStats.totalOutstandingRub && portfolioStats.totalOutstandingRub > 0 ? 'warning' : 'success',
      onClick: portfolioWarning ? undefined : () => openDrillDown('outstanding'),
      ariaLabel: 'فتح تفصيل العملاء الذين يشكلون الرصيد المفتوح الحالي',
    },
    {
      key: 'today',
      label: 'متابعة اليوم',
      value: loading ? '...' : portfolioStats.todayFollowUpCustomers ?? '--',
      copy: 'عملاء لديهم حركة اليوم وما زال ملفهم يحتاج متابعة.',
      tone:
        portfolioStats.todayFollowUpCustomers && portfolioStats.todayFollowUpCustomers > 0
          ? 'brand'
          : 'success',
      onClick: portfolioWarning ? undefined : () => openDrillDown('todayFollowUp'),
      ariaLabel: 'فتح تفصيل العملاء الذين لديهم حركة حديثة اليوم',
    },
  ]

  const compactCardCopyByKey = {
    customers: 'كل ملفات العملاء الحالية.',
    'follow-up': 'ملفات تتطلب حركة أو مراجعة.',
    'active-collection': 'التحصيل ما زال جاريا.',
    'open-awaiting': 'ملفات مفتوحة بدون أول دفعة.',
    overpaid: 'حالات تتطلب مراجعة مالية.',
    outstanding: 'الرصيد المفتوح عبر المحفظة.',
    today: 'حركة اليوم مع متابعة مفتوحة.',
  }

  summaryCards.forEach((card) => {
    if (compactCardCopyByKey[card.key]) {
      card.copy = compactCardCopyByKey[card.key]
    }
  })

  const sectionNavItems = CUSTOMER_PAGE_SECTIONS.map((section) => {
    if (section.key === 'customers') {
      return {
        ...section,
        description: customersSectionDescription,
        countLabel: loading ? '...' : pendingCustomerCount > 0 ? pendingCustomerCount : filteredCustomers.length,
        tone:
          failedPendingCustomerCount > 0
            ? 'danger'
            : pendingCustomerCount > 0
              ? 'warning'
              : 'neutral',
      }
    }

    if (section.key === 'portfolio') {
      return {
        ...section,
        countLabel: summaryCards.length,
        tone: 'brand',
      }
    }

    if (section.key === 'attention') {
      return {
        ...section,
        countLabel: loading ? '...' : attentionCustomers.length,
        tone: attentionCustomers.length > 0 ? 'warning' : 'neutral',
      }
    }

    return {
      ...section,
      countLabel: loading ? '...' : recentActivityItems.length,
      tone: recentActivityItems.length > 0 ? 'brand' : 'neutral',
    }
  })

  const drillDownConfigs = {
    allCustomers: {
      title: 'كل ملفات العملاء',
      totalValue: customers.length,
      subtitle: 'جميع العملاء المتاحين حاليا ضمن مساحة العمل.',
      description: 'يمكن من هنا فتح أي ملف عميل مباشرة أو تضييق القائمة بالبحث المحلي داخل اللوحة.',
      items: customers,
      emptyMessage: 'لا توجد ملفات عملاء حاليا.',
      searchPlaceholder: 'ابحث باسم العميل أو الهاتف',
      viewAllLabel: 'عرض كل المحفظة',
      onViewAll: () => applyPortfolioFilter('all'),
      renderItem: (item) => <CustomerRecordCard key={item.id} customer={item} compact />,
    },
    followUp: {
      title: 'العملاء المحتاجون متابعة الآن',
      totalValue: followUpCustomers.length,
      subtitle: 'كل العملاء الذين لديهم رصيد مفتوح أو مراجعة مالية مطلوبة حاليا.',
      description: 'يتضمن هذا المؤشر العملاء ذوي overpaid أو التحصيل الجزئي أو الملفات المفتوحة التي لم تغلق بعد.',
      items: followUpCustomers,
      emptyMessage: 'لا يوجد حاليا عملاء يحتاجون متابعة مباشرة.',
      searchPlaceholder: 'ابحث داخل العملاء المحتاجين متابعة',
      viewAllLabel: 'عرض هذه الشريحة داخل المحفظة',
      onViewAll: () => applyPortfolioFilter('needs_follow_up'),
      renderItem: (item) => <CustomerRecordCard key={item.id} customer={item} compact />,
    },
    activeCollection: {
      title: 'عملاء التحصيل النشط',
      totalValue: activeCollectionCustomers.length,
      subtitle: 'عملاء لديهم ملفات جزئية أو مفتوحة وما زال التحصيل جاريا عليها.',
      description: 'هذه القائمة مفيدة لمراجعة من هم داخل دورة التحصيل الحالية حتى لو لم يصلوا بعد إلى وضع overpaid.',
      items: activeCollectionCustomers,
      emptyMessage: 'لا يوجد حاليا عملاء ضمن دورة تحصيل نشطة.',
      searchPlaceholder: 'ابحث داخل عملاء التحصيل النشط',
      viewAllLabel: 'تركيز المحفظة على التحصيل النشط',
      onViewAll: () => applyPortfolioFilter('active_collection'),
      renderItem: (item) => <CustomerRecordCard key={item.id} customer={item} compact />,
    },
    openAwaiting: {
      title: 'عملاء بانتظار أول دفعة',
      totalValue: openAwaitingCustomers.length,
      subtitle: 'عملاء لديهم ملفات مفتوحة لم يبدأ التحصيل عليها بعد.',
      description: 'هذه القائمة تبرز من يحتاج أول اتصال أو أول خطوة تحصيل قبل أن يتحول الملف إلى متابعة أقدم أو أكثر تعقيدا.',
      items: openAwaitingCustomers,
      emptyMessage: 'لا يوجد حاليا عملاء ينتظرون أول دفعة كأولوية رئيسية.',
      searchPlaceholder: 'ابحث داخل العملاء المنتظرين لأول دفعة',
      viewAllLabel: 'تركيز المحفظة على الملفات المفتوحة',
      onViewAll: () => applyPortfolioFilter('open_waiting'),
      renderItem: (item) => <CustomerRecordCard key={item.id} customer={item} compact />,
    },
    overpaid: {
      title: 'العملاء ذوو الحوالات فوق المطلوب',
      totalValue: overpaidCustomers.length,
      subtitle: 'العملاء الذين تحتوي ملفاتهم حاليا على حوالة واحدة أو أكثر بحالة overpaid.',
      description: 'هذه القائمة تشرح بالضبط من يصنع مؤشر overpaid الحالي على مستوى المحفظة، مع إبراز قيمة الزيادة وحالة المتابعة.',
      items: overpaidCustomers,
      emptyMessage: 'لا يوجد حاليا عملاء لديهم حوالات فوق المطلوب.',
      searchPlaceholder: 'ابحث داخل العملاء فوق المطلوب',
      viewAllLabel: 'تركيز المحفظة على ملفات المراجعة المالية',
      onViewAll: () => applyPortfolioFilter('overpaid'),
      renderItem: (item) => <CustomerRecordCard key={item.id} customer={item} compact />,
    },
    outstanding: {
      title: 'العملاء الذين يشكلون الرصيد المفتوح',
      totalValue: `${formatNumber(portfolioStats.totalOutstandingRub, 2)} RUB`,
      subtitle: 'كل العملاء الذين لديهم رصيد موجب مفتوح بانتظار التحصيل.',
      description: 'المبلغ المعروض في أعلى الصفحة هو مجموع الأرصدة المفتوحة عبر هؤلاء العملاء فقط، بدون احتساب الزيادات السالبة فوق المطلوب.',
      items: outstandingCustomers,
      emptyMessage: 'لا يوجد حاليا رصيد مفتوح موجب على مستوى العملاء.',
      searchPlaceholder: 'ابحث داخل العملاء ذوي الرصيد المفتوح',
      viewAllLabel: 'تركيز المحفظة على العملاء ذوي الرصيد المفتوح',
      onViewAll: () => applyPortfolioFilter('needs_follow_up'),
      renderItem: (item) => <CustomerRecordCard key={item.id} customer={item} compact />,
    },
    todayFollowUp: {
      title: 'عملاء حركة اليوم + متابعة مطلوبة',
      totalValue: todayFollowUpCustomers.length,
      subtitle: 'عملاء حدثت لهم حركة اليوم وما زال ملفهم غير محسوم بالكامل.',
      description: 'يعتمد هذا المؤشر على أحدث حركة معروفة للعميل، سواء كانت دفعة أو حوالة جديدة، ثم يتحقق أن ملفه ما زال يحتاج متابعة.',
      items: todayFollowUpCustomers,
      emptyMessage: 'لا يوجد حاليا عملاء تنطبق عليهم حركة اليوم مع الحاجة إلى متابعة.',
      searchPlaceholder: 'ابحث داخل عملاء متابعة اليوم',
      viewAllLabel: 'تركيز المحفظة على متابعة اليوم',
      onViewAll: () => applyPortfolioFilter('recent_activity'),
      renderItem: (item) => <CustomerRecordCard key={item.id} customer={item} compact />,
    },
    recentActivity: {
      title: 'الحركة الأخيرة عبر العملاء',
      totalValue: `${recentActivityItems.length} حركة`,
      subtitle: 'أحدث دفعات وحوالات مرتبطة بالعملاء مع سياق تشغيل واضح.',
      description: 'يمكن من هنا معرفة من تحرك ملفه أخيرا، ثم الانتقال مباشرة إلى ملف العميل لاستكمال المتابعة.',
      items: recentActivityItems,
      emptyMessage: 'لا توجد حاليا حركة حديثة على مستوى محفظة العملاء.',
      searchPlaceholder: 'ابحث بالعميل أو المرجع أو وسيلة الدفع',
      viewAllLabel: 'تركيز المحفظة على حركة اليوم',
      onViewAll: () => applyPortfolioFilter('recent_activity'),
      renderItem: renderCustomerActivityDrillDownCompactItem,
    },
  }

  const activeDrillDown = activeDrillDownKey ? drillDownConfigs[activeDrillDownKey] : null

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSubmitError('')
    setSubmitSuccess('')

    if (!isConfigured || !supabase) {
      setSubmitError(configError)
      return
    }

    const payload = {
      ...normalizeCustomerProfilePayload(formValues),
    }

    const validationError = validateCustomerProfilePayload(payload)

    if (validationError) {
      setSubmitError(validationError)
      return
    }

    setSubmitting(true)

    if (isOffline) {
      try {
        const queuedRecord = await queueOfflineCustomer({
          payload,
        })

        if (!queuedRecord) {
          throw new Error('تعذر حفظ ملف العميل المحلي داخل المتصفح.')
        }

        setFormValues(emptyForm)
        setSubmitSuccess(
          queuedRecord?.localMeta?.localReference
            ? `تم حفظ ملف العميل محليا بمرجع مؤقت ${queuedRecord.localMeta.localReference}. سيبقى منفصلا عن ملفات العملاء المؤكدة حتى تنجح المزامنة.`
            : 'تم حفظ ملف العميل محليا بانتظار المزامنة مع الخادم.'
        )
        await refreshPendingCustomers()
      } catch (error) {
        setSubmitError(error?.message || 'تعذر حفظ ملف العميل المحلي.')
      } finally {
        setSubmitting(false)
      }

      return
    }

    const { error } = await supabase.schema('public').from('customers').insert([payload])

    if (error) {
      setSubmitError(error.message)
      setSubmitting(false)
      return
    }

    setFormValues(emptyForm)
    setSubmitting(false)
    setSubmitSuccess('تم إنشاء ملف العميل بنجاح.')
    handleRefresh()
  }

  return (
    <>
      <div className="stack customers-portfolio-page">
        <CustomersHeader customerCountLabel={customerHeaderCountLabel} onRefresh={handleRefresh} />

        <OfflineSnapshotNotice snapshotState={snapshotState} />
        <InlineMessage kind="warning" className="customers-portfolio-metrics-warning">
          {portfolioWarning}
        </InlineMessage>

        <div className="app-section-nav-shell">
          <nav className="app-section-nav" aria-label="أقسام صفحة العملاء">
            {sectionNavItems.map((section) => {
              const isActiveSection = activeSection === section.key

              return (
                <button
                  key={section.key}
                  type="button"
                  className={['app-section-tab app-section-tab--row', isActiveSection ? 'active' : '']
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

        <InlineMessage
          kind={failedPendingCustomerCount > 0 ? 'warning' : 'info'}
          className="app-section-inline-status customers-portfolio-queue-inline"
        >
          {showCrossSectionQueueNotice
            ? failedPendingCustomerCount > 0
              ? `يوجد ${failedPendingCustomerCount} ملف عميل محلي يحتاج إعادة محاولة. افتح قسم العملاء لمراجعته وتشغيل المزامنة يدويا عند الحاجة.`
              : `يوجد ${pendingCustomerCount} ملف عميل محلي بانتظار الإرسال. افتح قسم العملاء لرؤيته ومتابعة المزامنة.`
            : ''}
        </InlineMessage>

        <div className="app-section-workspace">

        {activeSection === 'portfolio' ? (
        <CustomersPortfolioSummary
          cards={summaryCards}
          note="يمكنك النقر على أي مؤشر لفتح تفصيله أولا، ثم تركيز محفظة العملاء على نفس الشريحة إذا أردت المتابعة من الصفحة نفسها."
        />
        ) : null}

        {activeSection === 'attention' ? (
        <CustomersAttentionSection
          loading={loading}
          customers={attentionCustomers}
          onOpenPortfolioDrillDown={portfolioWarning ? undefined : () => openDrillDown('followUp')}
        />
        ) : null}

        {activeSection === 'activity' ? (
        <CustomersRecentActivitySection
          loading={loading}
          errorMessage=""
          warningMessage=""
          items={recentActivityItems}
          onRetry={handleRefresh}
          onOpenActivityDrillDown={portfolioWarning ? undefined : () => openDrillDown('recentActivity')}
        />
        ) : null}

        {activeSection === 'customers' ? (
          <>
        <CustomersFormSection
          description={customerFormDescription}
          submitError={submitError}
          submitLabel={isOffline ? 'حفظ العميل محليا' : 'إنشاء العميل'}
          submitSuccess={submitSuccess}
          submittingLabel={isOffline ? 'جار الحفظ المحلي...' : 'جار الحفظ...'}
          formValues={formValues}
          infoMessage={customerFormInfoMessage}
          onChange={handleChange}
          onSubmit={handleSubmit}
          submitting={submitting}
          isConfigured={isConfigured}
        />

        {pendingCustomersLoading || pendingCustomerCount > 0 ? (
          <SectionCard
            title="عملاء محليون بانتظار الإرسال"
            description="هذه الملفات محفوظة داخل المتصفح فقط. لن تصبح ملفات عملاء مؤكدة أو صالحة للاعتماد الكامل أو لإنشاء حوالة محلية جديدة حتى تنجح المزامنة مع الخادم."
            className="pending-transfer-section"
          >
            <PendingMutationNotice
              activeCount={pendingCustomerCount}
              failedCount={failedPendingCustomerCount}
              isOffline={isOffline}
              syncing={customerQueueSyncing}
              onSyncNow={handleSyncPendingCustomers}
              variant="customer"
            />

            {pendingCustomersLoading && pendingCustomerCount === 0 ? (
              <p className="support-text">جار فحص ملفات العملاء المحلية المحفوظة...</p>
            ) : (
              <div className="pending-transfer-list">
                {pendingCustomers.map((record) => {
                  const statusMeta = getPendingCustomerStatusMeta(record.status)
                  const phoneLabel = record.payload?.phone || 'بدون هاتف'

                  return (
                    <RecordCard
                      key={record.id}
                      className={[
                        'pending-transfer-card',
                        record.status === 'failed' ? 'pending-transfer-card--failed' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                    >
                      <RecordHeader
                        eyebrow="عميل محلي"
                        title={record.payload?.full_name || 'عميل محفوظ محليا'}
                        subtitle={phoneLabel}
                        metaItems={[
                          {
                            label: 'وقت الحفظ',
                            value: formatDate(record.createdAt),
                          },
                        ]}
                        aside={
                          <span
                            className={[
                              'offline-snapshot-chip',
                              statusMeta.chipClassName,
                              'pending-transfer-status-chip',
                            ]
                              .filter(Boolean)
                              .join(' ')}
                          >
                            {statusMeta.label}
                          </span>
                        }
                      />

                      <dl className="pending-transfer-grid">
                        <div>
                          <dt>المرجع المحلي</dt>
                          <dd>{record.localMeta?.localReference || 'مرجع محلي مؤقت'}</dd>
                        </div>
                        <div>
                          <dt>الهاتف</dt>
                          <dd>{phoneLabel}</dd>
                        </div>
                      </dl>

                      <p className="record-note pending-transfer-note">{buildPendingCustomerNote(record)}</p>
                    </RecordCard>
                  )
                })}
              </div>
            )}
          </SectionCard>
        ) : null}

        <CustomersList
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          errorMessage={loadError}
          loading={loading}
          hasCustomers={customers.length + archivedCustomers.length > 0}
          hasFilteredCustomers={filteredCustomers.length + filteredArchivedCustomers.length > 0}
          groups={customerGroups}
          scopeLabel={customersListScopeLabel}
          activePortfolioFilterLabel={activePortfolioFilterLabel}
          onClearPortfolioFilter={() => setPortfolioFilter('all')}
          onRetry={handleRefresh}
        />
          </>
        ) : null}
        </div>
      </div>

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
        searchLabel="البحث داخل التفصيل"
        viewAllLabel={activeDrillDown?.viewAllLabel || 'عرض هذه الشريحة داخل المحفظة'}
        onViewAll={activeDrillDown?.onViewAll}
        onClose={closeDrillDown}
        renderItem={activeDrillDown?.renderItem || (() => null)}
      />
    </>
  )
}

export default CustomersPage
