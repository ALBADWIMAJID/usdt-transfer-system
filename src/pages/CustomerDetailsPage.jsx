import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import CustomerFollowUpPanel from '../components/customer-details/CustomerFollowUpPanel.jsx'
import CustomerRecentActivity from '../components/customer-details/CustomerRecentActivity.jsx'
import CustomerSummary from '../components/customer-details/CustomerSummary.jsx'
import CustomerTotals from '../components/customer-details/CustomerTotals.jsx'
import CustomerTransfersList from '../components/customer-details/CustomerTransfersList.jsx'
import InfoCard from '../components/ui/InfoCard.jsx'
import InfoGrid from '../components/ui/InfoGrid.jsx'
import OfflineSnapshotNotice from '../components/ui/OfflineSnapshotNotice.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import SectionCard from '../components/ui/SectionCard.jsx'
import { useAuth } from '../context/auth-context.js'
import useNetworkStatus from '../hooks/useNetworkStatus.js'
import useOfflineSnapshot from '../hooks/useOfflineSnapshot.js'
import { getCustomerDetailsSnapshotKey } from '../lib/offline/cacheKeys.js'
import { getOfflineSnapshotMissingMessage } from '../lib/offline/freshness.js'
import { loadReadSnapshot, saveReadSnapshot } from '../lib/offline/readCache.js'
import {
  TRANSFER_STATUS_FILTER_OPTIONS,
  getPaymentMethodLabel,
  getTransferStatusMeta,
  matchesTransferStatusFilter,
} from '../lib/transfer-ui.js'
import { supabase } from '../lib/supabase.js'

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
  if (entry.isOverpaid) {
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
  const { configError, isConfigured } = useAuth()
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
  const [totalPaidRub, setTotalPaidRub] = useState(0)
  const customerSnapshotKey = getCustomerDetailsSnapshotKey(customerId)

  useEffect(() => {
    if (!isConfigured || !supabase || !customerId) {
      return undefined
    }

    let isMounted = true

    const hydrateCustomerFromSnapshot = async () => {
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
        setCustomerError(getOfflineSnapshotMissingMessage('لملف هذا العميل'))
        setCustomerLoading(false)
        return
      }

      setCustomer(snapshot.data.customer)
      setCustomerError('')
      setCustomerNotFound(false)
      setCustomerLoading(false)
      markCachedSnapshot(snapshot.savedAt)
    }

    const loadCustomer = async () => {
      clearSnapshotState()
      setCustomerLoading(true)
      setCustomerError('')
      setCustomerNotFound(false)

      const { data, error } = await supabase
        .schema('public')
        .from('customers')
        .select('id, full_name, phone, notes, created_at')
        .eq('id', customerId)
        .maybeSingle()

      if (!isMounted) {
        return
      }

      if (error) {
        setCustomer(null)
        setCustomerError(error.message)
        setCustomerNotFound(false)
        setCustomerLoading(false)
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
  ])

  useEffect(() => {
    if (!isConfigured || !supabase || !customerId) {
      return undefined
    }

    let isMounted = true

    const hydrateTransfersFromSnapshot = async () => {
      setTransfersLoading(true)
      setTransfersError('')
      setPaymentTotalsLoading(true)
      setPaymentTotalsError('')
      setCustomerPayments([])
      setTotalPaidRub(0)

      const snapshot = await loadReadSnapshot(customerSnapshotKey)

      if (!isMounted) {
        return
      }

      if (!snapshot?.data) {
        setTransfers([])
        setCustomerPayments([])
        setTransfersError(getOfflineSnapshotMissingMessage('لحوالات هذا العميل'))
        setPaymentTotalsError('')
        setTransfersLoading(false)
        setPaymentTotalsLoading(false)
        return
      }

      setTransfers(snapshot.data.transfers || [])
      setCustomerPayments(snapshot.data.customerPayments || [])
      setTotalPaidRub(Number(snapshot.data.totalPaidRub) || 0)
      setTransfersError('')
      setPaymentTotalsError('')
      setTransfersLoading(false)
      setPaymentTotalsLoading(false)
    }

    const loadTransfers = async () => {
      setTransfersLoading(true)
      setTransfersError('')
      setPaymentTotalsLoading(true)
      setPaymentTotalsError('')
      setCustomerPayments([])
      setTotalPaidRub(0)

      const { data, error } = await supabase
        .schema('public')
        .from('transfers')
        .select('id, reference_number, status, usdt_amount, market_rate, payable_rub, created_at')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })

      if (!isMounted) {
        return
      }

      if (error) {
        setTransfers([])
        setTransfersError(error.message)
        setTransfersLoading(false)
        setPaymentTotalsLoading(false)
        return
      }

      const nextTransfers = data ?? []
      setTransfers(nextTransfers)
      setTransfersLoading(false)

      const transferIds = nextTransfers.map((transfer) => transfer.id).filter(Boolean)

      if (transferIds.length === 0) {
        setCustomerPayments([])
        setPaymentTotalsLoading(false)
        return
      }

      const { data: paymentsData, error: paymentsError } = await supabase
        .schema('public')
        .from('transfer_payments')
        .select('id, transfer_id, amount_rub, payment_method, note, paid_at, created_at')
        .in('transfer_id', transferIds)
        .order('paid_at', { ascending: false })
        .order('created_at', { ascending: false })

      if (!isMounted) {
        return
      }

      if (paymentsError) {
        setCustomerPayments([])
        setPaymentTotalsError('تعذر تحميل سجل المدفوعات لهذا العميل. سيتم عرض الإجماليات المالية عند نجاح تحميلها.')
        setPaymentTotalsLoading(false)
        return
      }

      const nextPayments = paymentsData ?? []
      const nextTotalPaidRub = roundCurrency(
        nextPayments.reduce((total, payment) => total + (Number(payment.amount_rub) || 0), 0)
      )

      setCustomerPayments(nextPayments)
      setTotalPaidRub(nextTotalPaidRub)
      setPaymentTotalsLoading(false)
    }

    if (isOffline) {
      hydrateTransfersFromSnapshot()
    } else {
      loadTransfers()
    }

    return () => {
      isMounted = false
    }
  }, [customerId, customerSnapshotKey, isConfigured, isOffline, transfersRefreshKey])

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
    paymentTotalsError,
    paymentTotalsLoading,
    totalPaidRub,
    transfers,
    transfersError,
    transfersLoading,
  ])

  const paymentsByTransfer = customerPayments.reduce((map, payment) => {
    const transferKey = payment.transfer_id
    const current = map.get(transferKey) || 0
    map.set(transferKey, roundCurrency(current + (Number(payment.amount_rub) || 0)))
    return map
  }, new Map())

  const totalsReady = !paymentTotalsLoading && !paymentTotalsError
  const customerUnavailable = customerNotFound || Boolean(customerError)

  const enrichedTransfers = transfers
    .map((transfer) => {
      const normalizedStatus = String(transfer.status || '').toLowerCase()
      const transferPaidRub = totalsReady ? paymentsByTransfer.get(transfer.id) || 0 : null
      const remainingRub =
        totalsReady && transfer.payable_rub !== null && transfer.payable_rub !== undefined
          ? roundCurrency(Number(transfer.payable_rub) - transferPaidRub)
          : null
      const isOverpaid = remainingRub !== null && remainingRub < -0.009
      const isSettled =
        remainingRub !== null ? Math.abs(remainingRub) <= 0.009 : normalizedStatus === 'paid'
      const isPartialFollowUp =
        remainingRub !== null
          ? transferPaidRub > 0.009 && remainingRub > 0.009
          : normalizedStatus === 'partial' || normalizedStatus === 'partially_paid'
      const isOpenFollowUp =
        remainingRub !== null ? transferPaidRub <= 0.009 && remainingRub > 0.009 : normalizedStatus === 'open'

      const queueLabel = isOverpaid
        ? 'مراجعة مالية'
        : isPartialFollowUp
          ? 'تحصيل جزئي'
          : isOpenFollowUp
            ? 'بانتظار أول دفعة'
            : isSettled
              ? 'مستقرة'
              : 'متابعة عادية'

      const queueClassName = isOverpaid
        ? 'queue-chip--danger'
        : isPartialFollowUp
          ? 'queue-chip--warning'
          : isOpenFollowUp
            ? 'queue-chip--neutral'
            : 'queue-chip--success'

      const cardClassName = isOverpaid
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

      const followUpNote = isOverpaid
        ? `يوجد رصيد سالب على هذه الحوالة بمقدار ${formatNumber(Math.abs(remainingRub), 2)} RUB ويتطلب مراجعة.`
        : isPartialFollowUp
          ? `تم تحصيل ${formatNumber(transferPaidRub, 2)} RUB وما زال المتبقي ${formatNumber(remainingRub, 2)} RUB.`
          : isOpenFollowUp
            ? 'لم تسجل أي دفعة بعد على هذه الحوالة، وتنتظر بدء التحصيل.'
            : isSettled
              ? 'هذه الحوالة تبدو مستقرة حاليا ولا تتطلب متابعة مالية عاجلة.'
              : 'حوالة للمتابعة العامة والرجوع إلى التفاصيل عند الحاجة.'

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
        queueLabel,
        queueClassName,
        cardClassName,
        followUpNote,
        isOverpaid,
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
  const overpaidTransfersCount = enrichedTransfers.filter((transfer) => transfer.isOverpaid).length
  const settledTransfersCount = enrichedTransfers.filter((transfer) => transfer.isSettled).length
  const activeTransfersCount = openTransfersCount + partialTransfersCount
  const filteredTransfers = enrichedTransfers.filter((transfer) =>
    matchesTransferStatusFilter(transfer.status, transferStatusFilter)
  )

  const transferGroups = [
    {
      key: 'overpaid',
      title: 'تحتاج مراجعة مالية عاجلة',
      description: 'هذه الحوالات تحمل زيادة دفع أو رصيدا سالبا وتتطلب تدخلا مباشرا.',
      tone: 'danger',
      items: filteredTransfers.filter((transfer) => transfer.isOverpaid),
    },
    {
      key: 'partial',
      title: 'تحصيل جزئي قيد المتابعة',
      description: 'دفعات مسجلة وما زالت هذه الحوالات تحتاج استكمال التحصيل.',
      tone: 'warning',
      items: filteredTransfers.filter((transfer) => !transfer.isOverpaid && transfer.isPartialFollowUp),
    },
    {
      key: 'open',
      title: 'بانتظار أول دفعة',
      description: 'حوالات قائمة لم تبدأ عليها حركة تحصيل بعد.',
      tone: 'default',
      items: filteredTransfers.filter(
        (transfer) =>
          !transfer.isOverpaid && !transfer.isPartialFollowUp && transfer.isOpenFollowUp
      ),
    },
    {
      key: 'other',
      title: 'حوالات مستقرة أو أقل أولوية',
      description: 'سجلات أخرى يمكن الرجوع إليها عند الحاجة.',
      tone: 'default',
      items: filteredTransfers.filter(
        (transfer) =>
          !transfer.isOverpaid && !transfer.isPartialFollowUp && !transfer.isOpenFollowUp
      ),
    },
  ].filter((group) => group.items.length > 0)

  const recentActivityItems = [
    ...customerPayments.map((payment) => {
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

  return (
    <div className="stack customer-details-page">
      <PageHeader
        eyebrow="العميل"
        title={customer?.full_name || 'ملف العميل'}
        description={pageDescription}
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
            <button type="button" className="button secondary" onClick={handleTransfersRefresh}>
              تحديث الحوالات
            </button>
          </>
        }
      />

      <OfflineSnapshotNotice snapshotState={snapshotState} />

      <SectionCard
        title="لوحة المتابعة المالية للعميل"
        description="افهم وضع العميل المالي خلال ثوان: إجمالي المستحق، المدفوع، المتبقي، وما يحتاج متابعة الآن."
        className="customer-details-summary-section"
      >
        <CustomerSummary
          errorMessage={customerError}
          loading={customerLoading}
          notFound={customerNotFound}
          hasCustomer={Boolean(customer)}
          title={customer?.full_name || 'عميل بدون اسم'}
          subtitle={customer?.phone || 'لا يوجد رقم هاتف مسجل'}
          metaItems={[]}
          aside={
            <span className={['queue-chip', `queue-chip--${customerStateTone === 'accent' ? 'neutral' : customerStateTone}`].join(' ')}>
              {customerStateLabel}
            </span>
          }
          highlightItems={customerSummaryHighlightItems}
          items={[]}
        />
      </SectionCard>

      {!customerNotFound ? (
        <SectionCard
          title="ما الذي يحتاج متابعة لهذا العميل؟"
          description="تلخيص تشغيلي سريع يساعدك على تحديد أول حركة متابعة على مستوى العميل بالكامل."
          className="customer-details-followup-section"
        >
          <CustomerFollowUpPanel
            title={followUpTitle}
            description={followUpDescription}
            tone={customerStateTone}
            chips={followUpChips}
            items={followUpItems}
          />
        </SectionCard>
      ) : null}

      <SectionCard
        title="مؤشرات المحفظة المالية"
        description="تجميع تشغيلي يوضح عدد الحوالات وحالة التحصيل الحالية عبر كامل ملف هذا العميل."
        className="customer-details-totals-section"
      >
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
            valueClassName: totalsAreOverpaid
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
        className="customer-details-queue-section"
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
        className="customer-details-recent-section"
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

      {customer ? (
        <SectionCard
          title="تفاصيل ملف العميل"
          description="ملاحظات الملف وبياناته الداخلية عند الحاجة إلى مراجعة أعمق."
          className="customer-details-secondary-section"
        >
          <InfoGrid className="customer-details-secondary-grid">
            <InfoCard title="المعرّف الداخلي" value={customer.id || '--'} />
            {customerSummaryItems
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
  )
}

export default CustomerDetailsPage
