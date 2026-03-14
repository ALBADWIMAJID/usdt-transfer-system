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
import RecordCard from '../components/ui/RecordCard.jsx'
import RecordHeader from '../components/ui/RecordHeader.jsx'
import { useAuth } from '../context/auth-context.js'
import useNetworkStatus from '../hooks/useNetworkStatus.js'
import useOfflineSnapshot from '../hooks/useOfflineSnapshot.js'
import { CUSTOMERS_LIST_SNAPSHOT_KEY } from '../lib/offline/cacheKeys.js'
import { getOfflineSnapshotMissingMessage } from '../lib/offline/freshness.js'
import { loadReadSnapshot, saveReadSnapshot } from '../lib/offline/readCache.js'
import { getPaymentMethodLabel, getTransferStatusMeta } from '../lib/transfer-ui.js'
import { supabase } from '../lib/supabase.js'

const emptyForm = {
  full_name: '',
  phone: '',
  notes: '',
}

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
    totalTransfers: 0,
    overpaidCount: 0,
    partialCount: 0,
    openAwaitingCount: 0,
    hasOverpaid: false,
    outstandingRubLabel: '--',
    overpaidAmountRubLabel: '--',
  })

  return {
    id: customer.id ?? `${customer.full_name}-${customer.phone ?? 'no-phone'}-${index}`,
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
    searchText: `${customer.full_name || ''} ${customer.phone || ''}`.toLowerCase(),
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

function CustomersPage() {
  const { configError, isConfigured } = useAuth()
  const { isOffline } = useNetworkStatus()
  const { clearSnapshotState, markCachedSnapshot, markLiveSnapshot, snapshotState } =
    useOfflineSnapshot()
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(Boolean(isConfigured))
  const [loadError, setLoadError] = useState(isConfigured ? '' : configError)
  const [portfolioWarning, setPortfolioWarning] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [portfolioFilter, setPortfolioFilter] = useState('all')
  const [portfolioStats, setPortfolioStats] = useState(emptyPortfolioStats)
  const [attentionCustomers, setAttentionCustomers] = useState([])
  const [recentActivityItems, setRecentActivityItems] = useState([])
  const [activeDrillDownKey, setActiveDrillDownKey] = useState('')
  const [formValues, setFormValues] = useState(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [submitSuccess, setSubmitSuccess] = useState('')

  useEffect(() => {
    if (!isConfigured || !supabase) {
      return undefined
    }

    let isMounted = true

    const hydrateFromSnapshot = async () => {
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
        setAttentionCustomers([])
        setRecentActivityItems([])
        setPortfolioStats(emptyPortfolioStats)
        setLoadError(getOfflineSnapshotMissingMessage('لملفات العملاء'))
        setLoading(false)
        return
      }

      setCustomers(snapshot.data.customers || [])
      setAttentionCustomers(snapshot.data.attentionCustomers || [])
      setRecentActivityItems(snapshot.data.recentActivityItems || [])
      setPortfolioStats(snapshot.data.portfolioStats || emptyPortfolioStats)
      setPortfolioWarning(snapshot.data.portfolioWarning || '')
      setLoadError('')
      setLoading(false)
      markCachedSnapshot(snapshot.savedAt)
    }

    const loadCustomers = async () => {
      clearSnapshotState()
      setLoading(true)
      setLoadError('')
      setPortfolioWarning('')

      const { data: customersData, error: customersError } = await supabase
        .schema('public')
        .from('customers')
        .select('*')
        .order('full_name', { ascending: true })

      if (!isMounted) {
        return
      }

      if (customersError) {
        setCustomers([])
        setAttentionCustomers([])
        setRecentActivityItems([])
        setPortfolioStats(emptyPortfolioStats)
        setLoadError(customersError.message)
        setLoading(false)
        return
      }

      const customerMap = Object.fromEntries((customersData ?? []).map((customer) => [customer.id, customer]))
      const baseEntries = (customersData ?? []).map((customer, index) =>
        buildBaseCustomerEntry(customer, index)
      )

      const [transfersResult, paymentsResult] = await Promise.all([
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
      ])

      if (!isMounted) {
        return
      }

      if (transfersResult.error || paymentsResult.error) {
        setCustomers(baseEntries)
        setAttentionCustomers([])
        setRecentActivityItems([])
        setPortfolioStats({
          ...emptyPortfolioStats,
          totalCustomers: baseEntries.length,
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
            id: customer.id ?? `${customer.full_name}-${customer.phone ?? 'no-phone'}-${index}`,
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
            searchText: `${customer.full_name || ''} ${customer.phone || ''} ${stateSummary} ${customer.notes || ''}`.toLowerCase(),
          }

          return {
            ...baseEntry,
            ...getCustomerPortfolioMeta(baseEntry),
          }
        })
        .sort(compareCustomersByPriority)

      const portfolioActivityItems = [
        ...payments
          .map((payment) => {
            const transfer = transferMap[payment.transfer_id]

            if (!transfer?.customer_id) {
              return null
            }

            const customer = customerMap[transfer.customer_id]

            if (!customer) {
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

            if (!customer) {
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

      const followUpCustomers = portfolioEntries.filter((customer) => customer.needsFollowUp)
      const activeCollectionCustomers = portfolioEntries.filter(isActiveCollectionCustomer)
      const openAwaitingCustomers = portfolioEntries.filter(isOpenWaitingCustomer)

      setCustomers(portfolioEntries)
      setPortfolioStats({
        totalCustomers: portfolioEntries.length,
        activeCollectionCustomers: activeCollectionCustomers.length,
        openAwaitingCustomers: openAwaitingCustomers.length,
        overpaidCustomers: portfolioEntries.filter((customer) => customer.hasOverpaid).length,
        followUpCustomers: followUpCustomers.length,
        todayFollowUpCustomers: portfolioEntries.filter(
          (customer) => customer.needsFollowUp && customer.hasActivityToday
        ).length,
        totalOutstandingRub: roundCurrency(
          portfolioEntries.reduce((sum, customer) => sum + customer.outstandingRub, 0)
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
          customers: portfolioEntries,
          portfolioStats: {
            totalCustomers: portfolioEntries.length,
            activeCollectionCustomers: activeCollectionCustomers.length,
            openAwaitingCustomers: openAwaitingCustomers.length,
            overpaidCustomers: portfolioEntries.filter((customer) => customer.hasOverpaid).length,
            followUpCustomers: followUpCustomers.length,
            todayFollowUpCustomers: portfolioEntries.filter(
              (customer) => customer.needsFollowUp && customer.hasActivityToday
            ).length,
            totalOutstandingRub: roundCurrency(
              portfolioEntries.reduce((sum, customer) => sum + customer.outstandingRub, 0)
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

  const openDrillDown = (key) => {
    setActiveDrillDownKey(key)
  }

  const closeDrillDown = () => {
    setActiveDrillDownKey('')
  }

  const applyPortfolioFilter = (nextFilter) => {
    setPortfolioFilter(nextFilter)
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

  const activePortfolioFilterLabel = PORTFOLIO_FILTER_LABELS[portfolioFilter] || ''
  const followUpCustomersInView = filteredCustomers.filter((customer) => customer.needsFollowUp).length
  const customerCountLabel = loading
    ? 'جار تحميل محفظة العملاء...'
    : `عرض ${filteredCustomers.length} من أصل ${customers.length} عميل • ${followUpCustomersInView} بحاجة متابعة`
  const listScopeLabel = activePortfolioFilterLabel
    ? `يتم الآن التركيز على: ${activePortfolioFilterLabel}. ما زال بإمكانك استخدام البحث أو إلغاء التركيز للعودة إلى كل المحفظة.`
    : 'العملاء مرتبون هنا حسب أولوية المتابعة: فوق المطلوب، ثم التحصيل الجزئي، ثم الملفات المفتوحة.'

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
      full_name: formValues.full_name.trim(),
      phone: formValues.phone.trim() || null,
      notes: formValues.notes.trim() || null,
    }

    if (!payload.full_name) {
      setSubmitError('اسم العميل مطلوب.')
      return
    }

    setSubmitting(true)

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
        <CustomersHeader customerCountLabel={customerCountLabel} onRefresh={handleRefresh} />

        <OfflineSnapshotNotice snapshotState={snapshotState} />
        <InlineMessage kind="warning">{portfolioWarning}</InlineMessage>

        <CustomersPortfolioSummary
          cards={summaryCards}
          note="يمكنك النقر على أي مؤشر لفتح تفصيله أولا، ثم تركيز محفظة العملاء على نفس الشريحة إذا أردت المتابعة من الصفحة نفسها."
        />

        <CustomersAttentionSection
          loading={loading}
          customers={attentionCustomers}
          onOpenPortfolioDrillDown={portfolioWarning ? undefined : () => openDrillDown('followUp')}
        />

        <CustomersRecentActivitySection
          loading={loading}
          errorMessage=""
          warningMessage=""
          items={recentActivityItems}
          onRetry={handleRefresh}
          onOpenActivityDrillDown={portfolioWarning ? undefined : () => openDrillDown('recentActivity')}
        />

        <CustomersFormSection
          submitError={submitError}
          submitSuccess={submitSuccess}
          formValues={formValues}
          onChange={handleChange}
          onSubmit={handleSubmit}
          submitting={submitting}
          isConfigured={isConfigured}
        />

        <CustomersList
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          errorMessage={loadError}
          loading={loading}
          hasCustomers={customers.length > 0}
          hasFilteredCustomers={filteredCustomers.length > 0}
          groups={customerGroups}
          scopeLabel={listScopeLabel}
          activePortfolioFilterLabel={activePortfolioFilterLabel}
          onClearPortfolioFilter={() => setPortfolioFilter('all')}
          onRetry={handleRefresh}
        />
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
