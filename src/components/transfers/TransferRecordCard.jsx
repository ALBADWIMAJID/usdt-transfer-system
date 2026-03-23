import InfoCard from '../ui/InfoCard.jsx'
import RecordCard from '../ui/RecordCard.jsx'
import RecordHeader from '../ui/RecordHeader.jsx'
import RecordMeta from '../ui/RecordMeta.jsx'
import StatusBadge from '../ui/StatusBadge.jsx'

function TransferRecordCard({ transfer, compact = false }) {
  const compactRemainingTitle = transfer.isOverpaid ? 'الزيادة' : 'المتبقي'
  const compactAside = transfer.queueLabel ? (
    <span className={['queue-chip', transfer.queueClassName].filter(Boolean).join(' ')}>
      {transfer.queueLabel}
    </span>
  ) : (
    <StatusBadge status={transfer.status} />
  )
  const compactFollowUpNote = transfer.isUnresolvedOverpaid
    ? 'زيادة دفع تحتاج مراجعة'
    : transfer.isResolvedOverpaid
      ? 'تم تسجيل معالجة زيادة الدفع'
      : transfer.isPartial && transfer.hasOutstanding
        ? `المتبقي ${transfer.remainingRubLabel}`
        : transfer.isOpen && transfer.hasOutstanding
          ? 'بانتظار أول دفعة'
          : ''
  const noteText = compact ? compactFollowUpNote : transfer.followUpNote

  return (
    <RecordCard
      to={transfer.to}
      className={[
        'transfer-queue-card',
        transfer.cardClassName,
        compact ? 'record-card--mobile-priority transfer-queue-card--compact' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <RecordHeader
        eyebrow={compact ? '' : transfer.eyebrow}
        title={compact ? transfer.referenceNumber || transfer.title : transfer.title}
        subtitle={transfer.customerName}
        metaItems={
          compact
            ? [
                { value: transfer.ageLabel },
              ]
            : [
                { label: 'العمر التشغيلي', value: transfer.ageLabel },
                { label: 'ID', value: transfer.internalId, ltr: true },
                { label: 'تاريخ الإنشاء', value: transfer.createdAtLabel },
              ]
        }
        aside={
          <>
            {compact ? compactAside : <StatusBadge status={transfer.status} />}
            {!compact && transfer.queueLabel ? (
              <span className={['queue-chip', transfer.queueClassName].filter(Boolean).join(' ')}>
                {transfer.queueLabel}
              </span>
            ) : null}
            {compact ? (
              null
            ) : (
              <RecordMeta value="فتح المتابعة" />
            )}
          </>
        }
      />

      {compact ? (
        <div className="record-meta-grid record-compact-grid transfer-queue-grid">
          <InfoCard title="المبلغ النهائي" value={transfer.payableRubLabel} />
          <InfoCard
            title={compactRemainingTitle}
            value={transfer.remainingRubLabel}
            className={transfer.remainingCardClassName}
            valueClassName={transfer.remainingValueClassName}
          />
        </div>
      ) : (
        <div className="record-meta-grid transfer-queue-grid">
          <InfoCard title="رقم المرجع" value={transfer.referenceNumber} />
          <InfoCard title="كمية USDT" value={transfer.usdtAmountLabel} />
          <InfoCard title="المبلغ النهائي" value={transfer.payableRubLabel} />
          <InfoCard title="المحصل" value={transfer.totalPaidRubLabel} />
          <InfoCard
            title="المتبقي"
            value={transfer.remainingRubLabel}
            className={transfer.remainingCardClassName}
            valueClassName={transfer.remainingValueClassName}
          />
        </div>
      )}

      {noteText ? (
        <p className={compact ? 'record-note record-note--compact' : 'record-note'}>{noteText}</p>
      ) : null}
    </RecordCard>
  )
}

export default TransferRecordCard
