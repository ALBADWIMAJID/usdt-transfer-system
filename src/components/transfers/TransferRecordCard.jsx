import InfoCard from '../ui/InfoCard.jsx'
import RecordCard from '../ui/RecordCard.jsx'
import RecordHeader from '../ui/RecordHeader.jsx'
import RecordMeta from '../ui/RecordMeta.jsx'
import StatusBadge from '../ui/StatusBadge.jsx'

function TransferRecordCard({ transfer, compact = false }) {
  const compactRemainingTitle = transfer.isOverpaid ? 'الزيادة' : 'المتبقي'

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
        eyebrow={transfer.eyebrow}
        title={compact ? transfer.referenceNumber || transfer.title : transfer.title}
        subtitle={transfer.customerName}
        metaItems={
          compact
            ? [
                { label: 'العمر التشغيلي', value: transfer.ageLabel },
                { label: 'الإنشاء', value: transfer.createdAtLabel },
              ]
            : [
                { label: 'العمر التشغيلي', value: transfer.ageLabel },
                { label: 'ID', value: transfer.internalId, ltr: true },
                { label: 'تاريخ الإنشاء', value: transfer.createdAtLabel },
              ]
        }
        aside={
          <>
            <StatusBadge status={transfer.status} />
            {transfer.queueLabel ? (
              <span className={['queue-chip', transfer.queueClassName].filter(Boolean).join(' ')}>
                {transfer.queueLabel}
              </span>
            ) : null}
            {compact ? (
              <span className="record-compact-action">فتح المتابعة</span>
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

      <p className={compact ? 'record-note record-note--compact' : 'record-note'}>{transfer.followUpNote}</p>
    </RecordCard>
  )
}

export default TransferRecordCard
