import InfoCard from '../ui/InfoCard.jsx'
import RecordCard from '../ui/RecordCard.jsx'
import RecordHeader from '../ui/RecordHeader.jsx'
import RecordMeta from '../ui/RecordMeta.jsx'

function CustomerRecordCard({ customer, compact = false }) {
  const transferCountTitle = customer.isArchived ? 'الحوالات المرتبطة' : 'الحوالات النشطة'
  const transferCountValue = customer.isArchived
    ? customer.totalTransfersLabel
    : customer.activeTransfersLabel

  return (
    <RecordCard
      to={customer.to}
      className={[
        'customer-portfolio-card',
        customer.cardClassName,
        compact ? 'record-card--mobile-priority customer-portfolio-card--compact' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <RecordHeader
        eyebrow={customer.eyebrow}
        title={customer.name}
        subtitle={customer.phone}
        subtitleClassName="record-muted-strong"
        metaItems={
          compact
            ? [
                { label: 'آخر حركة', value: customer.lastActivityLabel },
                { label: 'المتابعة', value: customer.stateSummary },
              ]
            : [
                { label: 'الحوالات', value: customer.totalTransfersLabel },
                { label: 'آخر حركة', value: customer.lastActivityLabel },
                { label: 'المتابعة', value: customer.stateSummary },
              ]
        }
        aside={
          <>
            {customer.hasActivityToday ? <span className="activity-chip activity-chip--warning">حركة اليوم</span> : null}
            {customer.queueLabel ? (
              <span className={['queue-chip', customer.queueClassName].filter(Boolean).join(' ')}>
                {customer.queueLabel}
              </span>
            ) : null}
            {!compact && customer.internalId ? <RecordMeta label="ID" value={customer.internalId} ltr /> : null}
            {compact ? (
              <span className="record-compact-action">فتح ملف العميل</span>
            ) : (
              <RecordMeta value="فتح ملف العميل" />
            )}
          </>
        }
      />

      {compact ? (
        <div className="record-meta-grid record-compact-grid customer-portfolio-grid">
          <InfoCard
            title="المتبقي المفتوح"
            value={customer.outstandingRubLabel}
            className={customer.remainingCardClassName}
            valueClassName={customer.remainingValueClassName}
          />
          <InfoCard title={transferCountTitle} value={transferCountValue} />
        </div>
      ) : (
        <div className="record-meta-grid customer-portfolio-grid">
          <InfoCard title="إجمالي المبلغ النهائي" value={customer.totalPayableRubLabel} />
          <InfoCard title="المحصل" value={customer.totalPaidRubLabel} />
          <InfoCard
            title="المتبقي المفتوح"
            value={customer.outstandingRubLabel}
            className={customer.remainingCardClassName}
            valueClassName={customer.remainingValueClassName}
          />
          <InfoCard title={transferCountTitle} value={transferCountValue} />
        </div>
      )}

      <p className={compact ? 'record-note record-note--compact' : 'record-note'}>{customer.followUpNote}</p>
    </RecordCard>
  )
}

export default CustomerRecordCard
