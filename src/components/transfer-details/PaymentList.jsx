import EmptyState from '../ui/EmptyState.jsx'
import LoadingState from '../ui/LoadingState.jsx'
import RecordCard from '../ui/RecordCard.jsx'
import RecordHeader from '../ui/RecordHeader.jsx'
import RecordMeta from '../ui/RecordMeta.jsx'
import RetryBlock from '../ui/RetryBlock.jsx'

function renderPaymentCard(payment, { isLocalOnly = false } = {}) {
  return (
    <RecordCard
      key={payment.id}
      className={[
        'payment-entry',
        'payment-entry--priority',
        payment.isLatest ? 'payment-entry--latest' : '',
        isLocalOnly ? 'payment-entry--local-only' : '',
        payment.className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <RecordHeader
        title={payment.amountLabel}
        subtitle={payment.methodLabel}
        subtitleClassName="record-muted-strong"
        metaItems={[
          { label: isLocalOnly ? 'وقت الحفظ المحلي' : 'وقت الدفع', value: payment.paidAtLabel },
          { label: 'سياق الحركة', value: payment.activityLabel, className: 'detail-mobile-secondary' },
        ]}
        aside={
          <>
            {payment.badgeLabel ? (
              <span className={['activity-chip', payment.badgeClassName].filter(Boolean).join(' ')}>
                {payment.badgeLabel}
              </span>
            ) : null}
            <RecordMeta
              label={isLocalOnly ? 'آخر تحديث محلي' : 'وقت التسجيل'}
              value={payment.createdAtLabel}
              className="detail-mobile-secondary"
            />
          </>
        }
      />

      <div className="payment-entry-grid detail-mobile-secondary">
        <RecordMeta label="وسيلة التحصيل" value={payment.methodLabel} />
        <RecordMeta label="المبلغ المسجل" value={payment.amountLabel} />
      </div>

      <p className="record-note record-note--compact payment-entry-note detail-mobile-light">
        {payment.noteText}
      </p>

      {payment.extraContent ? payment.extraContent : null}
    </RecordCard>
  )
}

function PaymentList({ errorMessage, loading, payments, pendingPayments = [], onRetry }) {
  const hasPendingPayments = pendingPayments.length > 0
  const hasConfirmedPayments = payments.length > 0
  const hasAnyPayments = hasPendingPayments || hasConfirmedPayments
  const hasBlockedPendingPayments = pendingPayments.some((payment) => payment.isBlocked)

  if (loading && !hasAnyPayments) {
    return <LoadingState>جار تحميل المدفوعات المسجلة...</LoadingState>
  }

  if (!hasAnyPayments && errorMessage) {
    return <RetryBlock message={errorMessage} onRetry={onRetry} />
  }

  if (!hasAnyPayments) {
    return <EmptyState>لا توجد مدفوعات مسجلة لهذه الحوالة حتى الآن.</EmptyState>
  }

  return (
    <>
      {loading ? <LoadingState inline>جار تحديث المدفوعات...</LoadingState> : null}
      {errorMessage && hasAnyPayments ? (
        <RetryBlock
          message={`${errorMessage} ما زالت الدفعات المحلية المحفوظة داخل المتصفح ظاهرة أدناه.`}
          onRetry={onRetry}
          className="payment-history-inline-retry"
        />
      ) : null}

      {hasPendingPayments ? (
        <section className="payment-history-group payment-history-group--local" aria-label="دفعات محلية">
          <div className="payment-history-group-head">
            <strong>دفعات محفوظة محليا</strong>
            <p>
              {hasBlockedPendingPayments
                ? 'تتضمن هذه العناصر دفعات ما زالت بانتظار اعتماد حوالة مرتبطة. لن تدخل في الإجماليات أو الطباعة حتى ينجح التأكيد ثم المزامنة.'
                : 'هذه العناصر لم يؤكدها الخادم بعد، ولن تدخل في الإجماليات أو الطباعة حتى تنجح المزامنة.'}
            </p>
          </div>
          <div className="record-list payment-history-list payment-history-list--local">
            {pendingPayments.map((payment) => renderPaymentCard(payment, { isLocalOnly: true }))}
          </div>
        </section>
      ) : null}

      {hasConfirmedPayments ? (
        <section className="payment-history-group" aria-label="دفعات مؤكدة">
          <div className="payment-history-group-head">
            <strong>دفعات مؤكدة من الخادم</strong>
            {hasPendingPayments ? <p>هذه الدفعات فقط تدخل في الإجماليات المؤكدة الحالية.</p> : null}
          </div>
          <div className="record-list payment-history-list">
            {payments.map((payment) => renderPaymentCard(payment))}
          </div>
        </section>
      ) : null}
    </>
  )
}

export default PaymentList
