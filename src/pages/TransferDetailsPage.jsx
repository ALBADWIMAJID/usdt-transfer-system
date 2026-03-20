import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import BalanceSummary from '../components/transfer-details/BalanceSummary.jsx'
import PaymentForm from '../components/transfer-details/PaymentForm.jsx'
import PaymentList from '../components/transfer-details/PaymentList.jsx'
import PrintStatement from '../components/transfer-details/PrintStatement.jsx'
import TransferFollowUpPanel from '../components/transfer-details/TransferFollowUpPanel.jsx'
import TransferSummary from '../components/transfer-details/TransferSummary.jsx'
import InfoCard from '../components/ui/InfoCard.jsx'
import InfoGrid from '../components/ui/InfoGrid.jsx'
import InlineMessage from '../components/ui/InlineMessage.jsx'
import OfflineSnapshotNotice from '../components/ui/OfflineSnapshotNotice.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import PendingMutationNotice from '../components/ui/PendingMutationNotice.jsx'
import RecordMeta from '../components/ui/RecordMeta.jsx'
import SectionCard from '../components/ui/SectionCard.jsx'
import { useAuth } from '../context/auth-context.js'
import useNetworkStatus from '../hooks/useNetworkStatus.js'
import useOfflineSnapshot from '../hooks/useOfflineSnapshot.js'
import usePendingPayments from '../hooks/usePendingPayments.js'
import useReplayQueue from '../hooks/useReplayQueue.js'
import { getTransferDetailsSnapshotKey } from '../lib/offline/cacheKeys.js'
import { getOfflineSnapshotMissingMessage } from '../lib/offline/freshness.js'
import { queueOfflinePayment } from '../lib/offline/paymentQueue.js'
import {
  isBrowserOffline,
  isLikelyOfflineReadFailure,
  loadReadSnapshot,
  saveReadSnapshot,
  withLiveReadTimeout,
} from '../lib/offline/readCache.js'
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

function roundCurrency(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

function roundRate(value) {
  return Math.round((value + Number.EPSILON) * 1000000) / 1000000
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

const TRANSFER_DETAILS_SECTIONS = [
  { key: 'summary', label: 'الملخص', description: 'الحوالة والرصيد' },
  { key: 'payments', label: 'الدفعات', description: 'إدخال ومزامنة' },
  { key: 'history', label: 'السجل', description: 'المؤكد والمحلي' },
  { key: 'print', label: 'الطباعة', description: 'كشف الحوالة' },
]

function TransferDetailsPage() {
  const { transferId } = useParams()
  const location = useLocation()
  const { configError, isConfigured } = useAuth()
  const { isOffline } = useNetworkStatus()
  const { clearSnapshotState, markCachedSnapshot, markLiveSnapshot, snapshotState } =
    useOfflineSnapshot()
  const [activeSections, setActiveSections] = useState({})
  const [transfer, setTransfer] = useState(null)
  const [transferLoading, setTransferLoading] = useState(Boolean(isConfigured))
  const [transferError, setTransferError] = useState(isConfigured ? '' : configError)
  const [customerName, setCustomerName] = useState('')
  const [payments, setPayments] = useState([])
  const [paymentsLoading, setPaymentsLoading] = useState(Boolean(isConfigured))
  const [paymentsError, setPaymentsError] = useState(isConfigured ? '' : configError)
  const [paymentsRefreshKey, setPaymentsRefreshKey] = useState(0)
  const [paymentForm, setPaymentForm] = useState(emptyPaymentForm)
  const [paymentSubmitting, setPaymentSubmitting] = useState(false)
  const [paymentSubmitError, setPaymentSubmitError] = useState('')
  const [paymentSubmitSuccess, setPaymentSubmitSuccess] = useState('')
  const previousPendingCountRef = useRef(0)
  const snapshotPersistQueueRef = useRef(Promise.resolve(null))
  const transferSnapshotKey = getTransferDetailsSnapshotKey(transferId)
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

      try {
        const { data, error } = await withLiveReadTimeout(
          supabase
            .schema('public')
            .from('transfers')
            .select(
              'id, reference_number, customer_id, usdt_amount, market_rate, client_rate, pricing_mode, commission_pct, commission_rub, gross_rub, payable_rub, status, notes, created_at'
            )
            .eq('id', transferId)
            .maybeSingle(),
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
            supabase
              .schema('public')
              .from('customers')
              .select('full_name')
              .eq('id', data.customer_id)
              .maybeSingle(),
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
    transferId,
    transferSnapshotKey,
  ])

  useEffect(() => {
    if (!isConfigured || !supabase || !transferId) {
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

      if (!isMounted) {
        return
      }

      if (!hasPaymentsSnapshot) {
        if (hasTransferSnapshot) {
          markCachedSnapshot(snapshot?.savedAt || '')
        }
        setPayments([])
        setPaymentsError(fallbackErrorMessage || getOfflineSnapshotMissingMessage('لمدفوعات هذه الحوالة'))
        setPaymentsLoading(false)
        return false
      }

      setPayments(Array.isArray(snapshotData.payments) ? snapshotData.payments : [])
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
          supabase
            .schema('public')
            .from('transfer_payments')
            .select('id, amount_rub, payment_method, note, paid_at, created_at')
            .eq('transfer_id', transferId)
            .order('paid_at', { ascending: false })
            .order('created_at', { ascending: false }),
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

        setPayments(data ?? [])
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
  }, [isConfigured, isOffline, markCachedSnapshot, paymentsRefreshKey, transferId, transferSnapshotKey])

  const handlePaymentsRefresh = () => {
    setPaymentsRefreshKey((current) => current + 1)
  }

  useEffect(() => {
    const previousPendingCount = previousPendingCountRef.current

    if (!isOffline && previousPendingCount > 0 && localPaymentCount < previousPendingCount) {
      const scheduleRefresh = () => {
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
              payments,
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
    transferId,
    transferSnapshotKey,
  ])

  const handlePaymentChange = (event) => {
    const { name, value } = event.target

    setPaymentForm((current) => ({
      ...current,
      [name]: value,
    }))
  }

  const hasResolvedPayments = !paymentsLoading && !paymentsError
  const totalPaidRub = hasResolvedPayments
    ? roundCurrency(payments.reduce((total, payment) => total + (Number(payment.amount_rub) || 0), 0))
    : null
  const remainingRub =
    hasResolvedPayments &&
    transfer &&
    transfer.payable_rub !== null &&
    transfer.payable_rub !== undefined
      ? roundCurrency(Number(transfer.payable_rub) - totalPaidRub)
      : null
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
  const isOverpaid = remainingRub !== null && remainingRub < -0.009
  const overpaidAmountRub = isOverpaid ? roundCurrency(Math.abs(remainingRub)) : 0
  const hasPayments = hasResolvedPayments && payments.length > 0
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

  const handlePaymentSubmit = async (event) => {
    event.preventDefault()
    setPaymentSubmitError('')
    setPaymentSubmitSuccess('')

    if (!isConfigured || !supabase) {
      setPaymentSubmitError(configError)
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
        payload: queuedPayload,
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
      .insert([payload])

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
      handlePaymentsRefresh()
    }
  }

  const referenceNumber = transfer?.reference_number || 'قيد التخصيص'
  const displayTransferId = transfer?.id || '--'
  const displayCustomerName = customerName || 'عميل غير معروف'
  const transferCreatedAtLabel = formatDate(transfer?.created_at)
  const statusLabel = getTransferStatusMeta(transfer?.status).label
  const latestPayment = hasResolvedPayments ? payments[0] || null : null
  const latestPaymentLabel = latestPayment ? formatDate(latestPayment.paid_at || latestPayment.created_at) : ''
  const latestPaymentMethod = latestPayment ? extractPaymentMethod(latestPayment) : ''
  const latestPaymentAmountValue = latestPayment
    ? `${formatNumber(latestPayment.amount_rub, 2)} RUB`
    : 'لا توجد حركة مالية مسجلة'
  const paymentCountLabel = hasResolvedPayments ? `${payments.length} دفعة مسجلة` : 'سجل الدفعات غير مكتمل'
  const hasLocalPendingPayments = localPaymentCount > 0
  const localPendingAmountLabel =
    localPendingAmountRub > 0 ? `${formatNumber(localPendingAmountRub, 2)} RUB محلي` : ''
  const latestLocalPayment = pendingPayments[0] || null
  const hasPartialTransferOnlyOfflineState =
    Boolean(transfer) && !paymentsLoading && Boolean(paymentsError)
  const followUpState = isOverpaid
    ? 'danger'
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
    : hasLocalPendingPayments && !hasPayments
      ? `توجد ${localPaymentCount} دفعة محفوظة محليا بانتظار الإرسال إلى الخادم. ستبقى منفصلة عن الإجماليات المؤكدة الحالية حتى تنجح المزامنة.`
    : isOverpaid
      ? `يوجد دفع زائد بمقدار ${formatNumber(overpaidAmountRub, 2)} RUB ويتطلب مراجعة فورية قبل أي إجراء إضافي.`
      : isCancelled
        ? 'الحوالة ملغاة. راجع سجل الدفعات وحالة الملف قبل أي إجراء جديد.'
        : isSettled
          ? 'الحوالة مسددة حاليا. يمكنك الرجوع إلى سجل الدفعات أو طباعة الكشف عند الحاجة.'
          : hasPayments
            ? `تم تسجيل دفعات جزئية وما زال المتبقي ${formatNumber(remainingRub, 2)} RUB. تتطلب الحوالة متابعة واستكمال تحصيل.${hasLocalPendingPayments ? ` يوجد أيضا ${localPaymentCount} دفعة محلية بانتظار الإرسال.` : ''}`
            : 'لم تُسجل أي دفعة بعد. هذه الحوالة تنتظر أول حركة تحصيل.'

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
    : isOverpaid
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
    : isOverpaid
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

  const followUpChips = [
    {
      label: 'حالة المتابعة',
      value: isOverpaid
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
      className: isOverpaid
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
      value: isOverpaid
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
      className: isOverpaid ? 'info-card--danger' : isSettled ? 'info-card--success' : 'info-card--accent',
      children: (
        <p className={['support-text', isOverpaid ? 'text-danger' : ''].filter(Boolean).join(' ')}>
          {isOverpaid
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
            : isOverpaid
              ? `يوجد رصيد سالب بقيمة ${formatNumber(overpaidAmountRub, 2)} RUB.`
              : isSettled
                ? 'الرصيد الحالي صفر والحوالة مسددة.'
                : `المتبقي الحالي ${formatNumber(remainingRub, 2)} RUB.`}
        </p>
      ),
    },
  ]

  const paymentEntries = payments.map((payment, index) => ({
    id: payment.id ?? `${payment.created_at}-${payment.amount_rub}`,
    amountLabel: `${formatNumber(payment.amount_rub, 2)} RUB`,
    methodLabel: extractPaymentMethod(payment),
    paidAtLabel: formatDate(payment.paid_at),
    createdAtLabel: formatDate(payment.created_at),
    noteText: extractPaymentNote(payment),
    activityLabel: index === 0 ? 'آخر تحصيل مسجل' : 'دفعة متابعة',
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

  const pendingPaymentEntries = pendingPayments.map((payment) => ({
    id: payment.id,
    amountLabel: `${formatNumber(payment.payload.amount_rub, 2)} RUB`,
    methodLabel: getPaymentMethodLabel(payment.payload.payment_method),
    paidAtLabel: formatDate(payment.payload.paid_at || payment.createdAt),
    createdAtLabel: formatDate(payment.updatedAt || payment.createdAt),
    noteText:
      payment.status === 'failed'
        ? `${payment.payload.note || 'لا توجد ملاحظة على الدفعة.'} ${payment.lastError ? `• ${payment.lastError}` : ''}`
        : payment.status === 'blocked'
          ? payment.blockedReason || payment.payload.note || 'هذه الدفعة المحلية بانتظار اعتماد حوالة مرتبطة قبل إرسالها.'
        : payment.payload.note || 'دفعة محفوظة محليا داخل هذا المتصفح بانتظار الإرسال.',
    activityLabel:
      payment.status === 'failed'
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
      payment.status === 'failed'
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

  return (
    <div className="stack transfer-details-page">
      <PageHeader
        eyebrow="الحوالة"
        title={transfer?.reference_number || (transferId ? `حوالة #${transferId}` : 'حوالة')}
        description={pageDescription}
        className="no-print transfer-details-page-hero"
        actions={
          <>
            <Link className="button secondary" to="/transfers">
              العودة إلى الحوالات
            </Link>
            <button
              type="button"
              className="button primary"
              onClick={handlePrint}
              disabled={transferLoading || Boolean(transferError) || !transfer}
            >
              طباعة الكشف
            </button>
            <button type="button" className="button secondary" onClick={handlePaymentsRefresh}>
              تحديث المدفوعات
            </button>
          </>
        }
      />

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
          title="لوحة المتابعة المالية"
          description="افهم وضع الحوالة خلال ثوان: المرجع، العميل، الرصيد الحالي، وما الخطوة التشغيلية التالية."
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
            highlightItems={highlightItems}
            items={[]}
          />

          {!transferError && !transferLoading && transfer ? (
            <TransferFollowUpPanel
              title={followUpTitle}
              description={followUpDescription}
              status={transfer.status}
              tone={followUpState}
              chips={followUpChips}
              items={followUpItems}
            />
          ) : null}
        </SectionCard>

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

        <SectionCard
          title="إجراء التحصيل"
          description="هذه هي منطقة الإجراء الأساسية لتسجيل الحركة المالية التالية على الحوالة."
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
            actionDescription={paymentActionDescription}
            actionTone={followUpState}
            actionMeta={paymentActionMeta}
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
          />
        </SectionCard>

        <SectionCard
          title="سجل التحصيل والحركة المالية"
          description="يعرض الحركات من الأحدث إلى الأقدم مع إبراز آخر دفعة مسجلة لتسهيل المتابعة اليومية."
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
              {paymentsError} سيظهر أدناه ما توفر فقط من السجل المؤكد والعناصر المحلية.
            </InlineMessage>
          ) : null}
          <PaymentList
            errorMessage={paymentsError}
            loading={paymentsLoading}
            payments={paymentEntries}
            pendingPayments={pendingPaymentEntries}
            onRetry={handlePaymentsRefresh}
          />
        </SectionCard>

        {transfer ? (
          <SectionCard
            title="تفاصيل الحوالة والتسعير"
            description="مرجع الحوالة وبيانات التسعير والملاحظات الداخلية عند الحاجة إلى مراجعة أعمق."
            className={[
              'app-section-panel',
              'transfer-details-secondary-section',
              activeSection === 'summary' ? 'is-active' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <InfoGrid className="transfer-details-secondary-grid">
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
          </SectionCard>
        ) : null}

        <SectionCard
          title="قفل البيانات الأساسية"
          description="يجب اعتبار القيم الأساسية للحوالة مقفلة بعد تسجيل أي دفعات عليها."
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
              {paymentsError} لذلك لا يمكن تأكيد حالة قفل الحوالة محليًا بشكل كامل حتى يعود سجل المدفوعات المؤكد أو يُعاد تحميله من الخادم.
            </InlineMessage>
          ) : null}
          {!paymentsLoading && hasPayments ? (
            <InlineMessage kind="warning">
              تحتوي هذه الحوالة بالفعل على {payments.length} دفعة. يجب اعتبار الحقول الأساسية مثل العميل والكمية والأسعار ووضع التسعير والعمولة والإجمالي والمبلغ المستحق مقفلة. كما أن قاعدة البيانات تمنع تعديل هذه القيم بعد وجود دفعات.
            </InlineMessage>
          ) : null}
          {!paymentsLoading && !paymentsError && !hasPayments ? (
            <p className="support-text">
              لا توجد مدفوعات مسجلة بعد. إذا تمت إضافة واجهة تعديل لاحقًا فيمكن إبقاء القيم الأساسية قابلة للتعديل حتى أول دفعة.
            </p>
          ) : null}
        </SectionCard>
      </div>

      <PrintStatement
        className={['transfer-details-print-section', activeSection === 'print' ? 'is-active' : '']
          .filter(Boolean)
          .join(' ')}
        errorMessage={transferError}
        loading={transferLoading}
        hasTransfer={Boolean(transfer)}
        referenceNumber={referenceNumber}
        transferId={displayTransferId}
        customerName={displayCustomerName}
        status={transfer?.status || ''}
        createdAtLabel={transferCreatedAtLabel}
        transferRows={transferRows}
        pricingRows={pricingRows}
        paymentsError={paymentsError}
        paymentsLoading={paymentsLoading}
        paymentRows={paymentEntries}
        totalPaidValue={`${formatNumber(totalPaidRub, 2)} RUB`}
        remainingValue={remainingMessage}
        remainingClassName={printRemainingClass}
        finalAmountValue={`${formatNumber(valueAfterPercentage, 2)} RUB`}
      />
    </div>
  )
}

export default TransferDetailsPage
