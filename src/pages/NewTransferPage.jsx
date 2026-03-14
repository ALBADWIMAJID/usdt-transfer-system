import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import NewTransferHeader from '../components/new-transfer/NewTransferHeader.jsx'
import TransferComputedSummary from '../components/new-transfer/TransferComputedSummary.jsx'
import TransferFormSection from '../components/new-transfer/TransferFormSection.jsx'
import OfflineSnapshotNotice from '../components/ui/OfflineSnapshotNotice.jsx'
import PendingMutationNotice from '../components/ui/PendingMutationNotice.jsx'
import RecordCard from '../components/ui/RecordCard.jsx'
import RecordHeader from '../components/ui/RecordHeader.jsx'
import SectionCard from '../components/ui/SectionCard.jsx'
import { useAuth } from '../context/auth-context.js'
import useNetworkStatus from '../hooks/useNetworkStatus.js'
import useOfflineSnapshot from '../hooks/useOfflineSnapshot.js'
import usePendingTransfers from '../hooks/usePendingTransfers.js'
import useReplayQueue from '../hooks/useReplayQueue.js'
import {
  CUSTOMERS_LIST_SNAPSHOT_KEY,
  NEW_TRANSFER_CUSTOMERS_SNAPSHOT_KEY,
} from '../lib/offline/cacheKeys.js'
import { getOfflineSnapshotMissingMessage } from '../lib/offline/freshness.js'
import {
  isBrowserOffline,
  isLikelyOfflineReadFailure,
  loadReadSnapshot,
  saveReadSnapshot,
  withLiveReadTimeout,
} from '../lib/offline/readCache.js'
import { queueOfflineTransfer } from '../lib/offline/transferQueue.js'
import { supabase } from '../lib/supabase.js'

function createEmptyForm(customerId = '') {
  return {
    customer_id: customerId,
    amount: '',
    global_rate: '',
    percentage: '0',
    notes: '',
  }
}

function parseOptionalNumber(value) {
  if (value === null || value === undefined || value === '') {
    return null
  }

  const parsedValue = Number(value)

  return Number.isFinite(parsedValue) ? parsedValue : null
}

function roundCurrency(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

function roundRate(value) {
  return Math.round((value + Number.EPSILON) * 1000000) / 1000000
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
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(numericValue)
}

function formatDateTime(value) {
  if (!value) {
    return '--'
  }

  const parsedDate = new Date(value)

  if (Number.isNaN(parsedDate.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('ar', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(parsedDate)
}

function normalizeCustomerOptions(customers = []) {
  const customerMap = new Map()

  customers.forEach((customer) => {
    const id = String(customer?.id || customer?.internalId || '').trim()
    const fullName = String(customer?.full_name || customer?.name || '').trim()

    if (!id || !fullName || customerMap.has(id)) {
      return
    }

    customerMap.set(id, {
      full_name: fullName,
      id,
    })
  })

  return Array.from(customerMap.values()).sort((left, right) =>
    left.full_name.localeCompare(right.full_name, 'ar')
  )
}

async function loadCachedCustomerOptions() {
  const directSnapshot = await loadReadSnapshot(NEW_TRANSFER_CUSTOMERS_SNAPSHOT_KEY)
  const directCustomers = normalizeCustomerOptions(directSnapshot?.data?.customers || [])

  if (directCustomers.length > 0) {
    return {
      customers: directCustomers,
      savedAt: directSnapshot.savedAt || '',
    }
  }

  const portfolioSnapshot = await loadReadSnapshot(CUSTOMERS_LIST_SNAPSHOT_KEY)
  const portfolioCustomers = normalizeCustomerOptions(portfolioSnapshot?.data?.customers || [])

  if (portfolioCustomers.length > 0) {
    return {
      customers: portfolioCustomers,
      savedAt: portfolioSnapshot.savedAt || '',
    }
  }

  return null
}

function getPendingTransferStatusMeta(status) {
  if (status === 'failed') {
    return {
      chipClassName: 'offline-snapshot-chip--warning',
      label: 'فشل الإرسال',
      note: 'تحتاج هذه الحوالة إلى إعادة محاولة عند توفر الاتصال.',
    }
  }

  if (status === 'syncing') {
    return {
      chipClassName: 'offline-snapshot-chip--info',
      label: 'جار الإرسال',
      note: 'يجري الآن إرسال هذه الحوالة المحلية إلى الخادم.',
    }
  }

  return {
    chipClassName: 'offline-snapshot-chip--warning',
    label: 'بانتظار الإرسال',
    note: 'ستبقى هذه الحوالة محلية فقط حتى تنجح المزامنة ويصدر المرجع النهائي من الخادم.',
  }
}

function buildPendingTransferNote(record) {
  if (record.status === 'failed' && record.lastError) {
    return `آخر خطأ: ${record.lastError}`
  }

  if (record.payload?.notes) {
    return record.payload.notes
  }

  return getPendingTransferStatusMeta(record.status).note
}

function NewTransferPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { configError, isConfigured } = useAuth()
  const { isOffline } = useNetworkStatus()
  const { clearSnapshotState, markCachedSnapshot, markLiveSnapshot, snapshotState } =
    useOfflineSnapshot()
  const presetCustomerId = searchParams.get('customerId') || ''
  const [customers, setCustomers] = useState([])
  const [customersLoading, setCustomersLoading] = useState(Boolean(isConfigured))
  const [customersError, setCustomersError] = useState(isConfigured ? '' : configError)
  const [customerRefreshKey, setCustomerRefreshKey] = useState(0)
  const [formValues, setFormValues] = useState(() => createEmptyForm(presetCustomerId))
  const [submitError, setSubmitError] = useState('')
  const [submitSuccess, setSubmitSuccess] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const {
    activeCount: pendingTransferCount,
    failedCount: failedTransferCount,
    pendingTransfers,
    pendingTransfersLoading,
    refreshPendingTransfers,
    totalPayableRub: pendingTransferPayableRub,
  } = usePendingTransfers()
  const { isSyncing, replayTransfersNow } = useReplayQueue()

  useEffect(() => {
    if (!isConfigured || !supabase) {
      return undefined
    }

    let isMounted = true

    const hydrateFromSnapshot = async (options = {}) => {
      const { fallbackErrorMessage = '' } = options

      setCustomersLoading(true)
      setCustomersError('')

      const cachedCustomers = await loadCachedCustomerOptions()

      if (!isMounted) {
        return
      }

      if (!cachedCustomers) {
        clearSnapshotState()
        setCustomers([])
        const missingSnapshotMessage = `${getOfflineSnapshotMissingMessage('لقائمة العملاء')} يلزم وجود عميل محفوظ محليا قبل إنشاء حوالة دون اتصال.`
        setCustomersError(
          fallbackErrorMessage || missingSnapshotMessage
        )
        setCustomersLoading(false)
        return false
      }

      setCustomers(cachedCustomers.customers)
      setCustomersLoading(false)
      markCachedSnapshot(cachedCustomers.savedAt)
      return true
    }

    const loadCustomers = async () => {
      clearSnapshotState()
      setCustomersLoading(true)
      setCustomersError('')

      try {
        const { data, error } = await withLiveReadTimeout(
          supabase
            .schema('public')
            .from('customers')
            .select('id, full_name')
            .order('full_name', { ascending: true }),
          {
            timeoutMessage: 'تعذر إكمال تحميل قائمة العملاء في الوقت المتوقع.',
          }
        )

        if (!isMounted) {
          return
        }

        if (error) {
          const preferSnapshot = isOffline || isBrowserOffline() || isLikelyOfflineReadFailure(error)
          await hydrateFromSnapshot({
            fallbackErrorMessage: preferSnapshot ? '' : error.message,
          })
          return
        }

        const normalizedCustomers = normalizeCustomerOptions(data ?? [])
        const savedSnapshot = await saveReadSnapshot({
          data: {
            customers: normalizedCustomers,
          },
          key: NEW_TRANSFER_CUSTOMERS_SNAPSHOT_KEY,
          scope: {
            page: 'new_transfer',
          },
          type: 'customer_options',
        })

        if (!isMounted) {
          return
        }

        setCustomers(normalizedCustomers)
        setCustomersLoading(false)
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
    configError,
    customerRefreshKey,
    isConfigured,
    isOffline,
    markCachedSnapshot,
    markLiveSnapshot,
  ])

  const handleCustomerRefresh = () => {
    setCustomerRefreshKey((current) => current + 1)
  }

  const handleChange = (event) => {
    const { name, value } = event.target

    setSubmitError('')
    setSubmitSuccess('')
    setFormValues((current) => ({
      ...current,
      [name]: value,
    }))
  }

  const selectedCustomer = customers.find((customer) => customer.id === formValues.customer_id) || null
  const parsedAmount = parseOptionalNumber(formValues.amount)
  const parsedGlobalRate = parseOptionalNumber(formValues.global_rate)
  const parsedPercentageInput = parseOptionalNumber(formValues.percentage)
  const parsedPercentage = parsedPercentageInput ?? 0
  const valueBeforePercentage =
    parsedAmount !== null && parsedGlobalRate !== null
      ? roundCurrency(parsedAmount * parsedGlobalRate)
      : null
  const valueAfterPercentage =
    valueBeforePercentage !== null
      ? roundCurrency(valueBeforePercentage * (1 + parsedPercentage / 100))
      : null
  const derivedClientRate =
    parsedGlobalRate !== null
      ? roundRate(parsedGlobalRate * (1 + parsedPercentage / 100))
      : null
  const derivedDifference =
    valueBeforePercentage !== null && valueAfterPercentage !== null
      ? roundCurrency(valueAfterPercentage - valueBeforePercentage)
      : null

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSubmitError('')
    setSubmitSuccess('')

    if (!isConfigured || !supabase) {
      setSubmitError(configError)
      return
    }

    if (!formValues.customer_id) {
      setSubmitError('اختر العميل قبل إنشاء الحوالة.')
      return
    }

    if (!selectedCustomer) {
      setSubmitError(
        'العميل المختار غير متاح ضمن القائمة المحلية الحالية. يلزم عميل معروف ومحفوظ محليا لإنشاء حوالة دون اتصال.'
      )
      return
    }

    if (parsedAmount === null || parsedAmount <= 0) {
      setSubmitError('أدخل كمية USDT أكبر من صفر.')
      return
    }

    if (parsedGlobalRate === null || parsedGlobalRate <= 0) {
      setSubmitError('أدخل سعرا عاما أكبر من صفر.')
      return
    }

    if (formValues.percentage !== '' && parsedPercentageInput === null) {
      setSubmitError('أدخل نسبة صحيحة.')
      return
    }

    if (parsedPercentage < 0) {
      setSubmitError('النسبة لا يمكن أن تكون سالبة.')
      return
    }

    if (
      valueBeforePercentage === null ||
      valueAfterPercentage === null ||
      derivedClientRate === null ||
      derivedDifference === null
    ) {
      setSubmitError('أكمل الحقول المطلوبة ليتم احتساب قيم التسوية.')
      return
    }

    const payload = {
      client_rate: derivedClientRate,
      commission_pct: parsedPercentage,
      commission_rub: derivedDifference,
      created_at: new Date().toISOString(),
      customer_id: formValues.customer_id,
      gross_rub: valueBeforePercentage,
      market_rate: roundRate(parsedGlobalRate),
      notes: formValues.notes.trim() || null,
      payable_rub: valueAfterPercentage,
      pricing_mode: 'hybrid',
      status: 'open',
      usdt_amount: parsedAmount,
    }

    setSubmitting(true)

    if (isOffline) {
      try {
        const queuedRecord = await queueOfflineTransfer({
          customerId: formValues.customer_id,
          localMeta: {
            customerName: selectedCustomer.full_name,
          },
          payload,
        })

        setFormValues(createEmptyForm(formValues.customer_id))
        setSubmitSuccess(
          queuedRecord?.localMeta?.localReference
            ? `تم حفظ الحوالة محليا بمرجع مؤقت ${queuedRecord.localMeta.localReference}. سيصدر المرجع النهائي من الخادم بعد نجاح المزامنة.`
            : 'تم حفظ الحوالة محليا بانتظار المزامنة مع الخادم.'
        )
        await refreshPendingTransfers()
      } catch (error) {
        setSubmitError(error?.message || 'تعذر حفظ الحوالة المحلية.')
      } finally {
        setSubmitting(false)
      }

      return
    }

    const { data, error } = await supabase
      .schema('public')
      .from('transfers')
      .insert([
        {
          customer_id: payload.customer_id,
          usdt_amount: payload.usdt_amount,
          market_rate: payload.market_rate,
          client_rate: payload.client_rate,
          pricing_mode: payload.pricing_mode,
          commission_pct: payload.commission_pct,
          commission_rub: payload.commission_rub,
          gross_rub: payload.gross_rub,
          payable_rub: payload.payable_rub,
          notes: payload.notes,
          status: payload.status,
        },
      ])
      .select('id, reference_number')
      .maybeSingle()

    if (error) {
      setSubmitError(error.message)
      setSubmitting(false)
      return
    }

    setSubmitting(false)
    navigate(data?.id ? `/transfers/${data.id}` : '/transfers', {
      state: {
        successMessage: data?.reference_number
          ? `تم إنشاء الحوالة ${data.reference_number} بنجاح.`
          : 'تم إنشاء الحوالة بنجاح.',
      },
    })
  }

  const handleSyncNow = async () => {
    setSubmitError('')
    setSubmitSuccess('')

    const result = await replayTransfersNow()

    if (!result.started) {
      setSubmitSuccess('لا توجد حوالات محلية جاهزة للمزامنة حاليا.')
      return
    }

    if (result.failedCount > 0) {
      setSubmitError(`تعذر إرسال ${result.failedCount} حوالة محلية. راجع العناصر المحلية ثم أعد المحاولة.`)
      return
    }

    const messages = []

    if (result.replayedCount > 0) {
      messages.push(`تم إرسال ${result.replayedCount} حوالة محلية إلى الخادم`)
    }

    if (result.dedupedCount > 0) {
      messages.push(`تمت تسوية ${result.dedupedCount} حوالة محلية موجودة مسبقا على الخادم`)
    }

    setSubmitSuccess(messages.join('، ') || 'اكتملت مزامنة الحوالات المحلية.')
  }

  const customersReady = customers.length > 0 && !customersLoading && !customersError
  const showNoCustomersWarning = !customersLoading && customers.length === 0 && !customersError
  const valueBeforePercentageLabel =
    valueBeforePercentage === null ? '' : formatNumber(valueBeforePercentage, 2)
  const valueAfterPercentageLabel =
    valueAfterPercentage === null ? '' : formatNumber(valueAfterPercentage, 2)
  const pendingTransferPayableLabel =
    pendingTransferCount > 0
      ? `${formatNumber(pendingTransferPayableRub, 2)} RUB قيد الانتظار`
      : ''
  const offlineInfoMessage =
    isOffline && customersReady
      ? 'يمكن حفظ حوالة محلية فقط لعميل ظاهر في هذه القائمة المحفوظة محليا. المرجع النهائي سيصدر بعد نجاح المزامنة.'
      : ''
  const formDescription = isOffline
    ? 'يمكنك حفظ حوالة محلية لعميل معروف ومحفوظ محليا فقط. ستبقى منفصلة عن السجلات المؤكدة حتى تنجح المزامنة.'
    : 'يبقى سير العمل مبسطا للمشغل، ويتم تخصيص رقم المرجع تلقائيا عند إنشاء الحوالة.'

  return (
    <div className="stack">
      <NewTransferHeader onRefresh={handleCustomerRefresh} />

      <OfflineSnapshotNotice snapshotState={snapshotState} />

      <TransferFormSection
        customersError={customersError}
        customersLoading={customersLoading}
        customers={customers}
        description={formDescription}
        formValues={formValues}
        infoMessage={offlineInfoMessage}
        onChange={handleChange}
        onSubmit={handleSubmit}
        selectedCustomer={selectedCustomer}
        submitError={submitError}
        submitLabel={isOffline ? 'حفظ الحوالة محليا' : 'إنشاء الحوالة'}
        submitting={submitting}
        submittingLabel={isOffline ? 'جار الحفظ المحلي...' : 'جار الحفظ...'}
        submitSuccess={submitSuccess}
        isConfigured={isConfigured}
        customersReady={customersReady}
        showNoCustomersWarning={showNoCustomersWarning}
        valueBeforePercentageLabel={valueBeforePercentageLabel}
        valueAfterPercentageLabel={valueAfterPercentageLabel}
      />

      {pendingTransfersLoading || pendingTransferCount > 0 ? (
        <SectionCard
          title="حوالات محلية بانتظار الإرسال"
          description="هذه الحوالات محفوظة داخل المتصفح فقط. لا تعتبر مؤكدة من الخادم ولا تدخل في الطباعة قبل نجاح المزامنة."
          className="pending-transfer-section"
        >
          <PendingMutationNotice
            activeCount={pendingTransferCount}
            failedCount={failedTransferCount}
            isOffline={isOffline}
            syncing={isSyncing}
            summaryLabel={pendingTransferPayableLabel}
            onSyncNow={handleSyncNow}
            variant="transfer"
          />

          {pendingTransfersLoading && pendingTransferCount === 0 ? (
            <p className="support-text">جار فحص الحوالات المحلية المحفوظة...</p>
          ) : (
            <div className="pending-transfer-list">
              {pendingTransfers.map((record) => {
                const statusMeta = getPendingTransferStatusMeta(record.status)
                const localReference = record.localMeta?.localReference || 'مرجع محلي مؤقت'
                const customerName = record.localMeta?.customerName || 'عميل محفوظ محليا'

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
                      eyebrow="حوالة محلية"
                      title={localReference}
                      subtitle={customerName}
                      metaItems={[
                        {
                          label: 'وقت الحفظ',
                          value: formatDateTime(record.createdAt),
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
                        <dt>مبلغ التسوية</dt>
                        <dd>{formatNumber(record.payload?.payable_rub, 2)} RUB</dd>
                      </div>
                      <div>
                        <dt>USDT</dt>
                        <dd>{formatNumber(record.payload?.usdt_amount, 2)}</dd>
                      </div>
                      <div>
                        <dt>السعر العام</dt>
                        <dd>{formatNumber(record.payload?.market_rate, 4)}</dd>
                      </div>
                    </dl>

                    <p className="record-note pending-transfer-note">
                      {buildPendingTransferNote(record)}
                    </p>
                  </RecordCard>
                )
              })}
            </div>
          )}
        </SectionCard>
      ) : null}

      <TransferComputedSummary
        customerName={selectedCustomer?.full_name || 'اختر عميلا'}
        amountLabel={formatNumber(parsedAmount, 2)}
        globalRateLabel={formatNumber(parsedGlobalRate, 4)}
        valueBeforePercentageLabel={formatNumber(valueBeforePercentage, 2)}
        percentageLabel={`${formatNumber(parsedPercentage, 2)}%`}
        valueAfterPercentageLabel={formatNumber(valueAfterPercentage, 2)}
      />
    </div>
  )
}

export default NewTransferPage
