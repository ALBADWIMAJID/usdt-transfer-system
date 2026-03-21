import InfoCard from '../ui/InfoCard.jsx'
import RecordCard from '../ui/RecordCard.jsx'
import RecordHeader from '../ui/RecordHeader.jsx'
import RecordMeta from '../ui/RecordMeta.jsx'

function CustomerRecordCard({ customer, compact = false, variant = 'default' }) {
  const transferCountTitle = customer.isArchived ? 'الحوالات المرتبطة' : 'الحوالات النشطة'
  const transferCountValue = customer.isArchived
    ? customer.totalTransfersLabel
    : customer.activeTransfersLabel
  const isCustomersListVariant = variant === 'customers-list'
  const compactMetric = customer.hasOverpaid
    ? {
        label: 'الزيادة الحالية',
        value: customer.overpaidAmountRubLabel,
        valueClassName: 'text-danger',
      }
    : customer.outstandingRub && customer.outstandingRub > 0.009
      ? {
          label: 'المتبقي المفتوح',
          value: customer.outstandingRubLabel,
          valueClassName: customer.remainingValueClassName,
        }
      : {
          label: transferCountTitle,
          value: transferCountValue,
          valueClassName: '',
        }
  const compactMetaLabel = [customer.stateSummary, customer.hasActivityToday ? 'حركة اليوم' : '']
    .filter(Boolean)
    .join(' • ')
  const listRowChip = customer.isArchived
    ? {
        label: 'مؤرشف',
        className: 'queue-chip queue-chip--neutral',
      }
    : customer.hasOverpaid
      ? {
          label: 'مراجعة',
          className: 'queue-chip queue-chip--danger',
        }
      : null

  return (
    <RecordCard
      to={customer.to}
      className={[
        'customer-portfolio-card',
        customer.cardClassName,
        isCustomersListVariant ? 'customer-portfolio-card--list-row' : '',
        compact ? 'record-card--mobile-priority customer-portfolio-card--compact' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <RecordHeader
        eyebrow={compact || isCustomersListVariant ? '' : customer.eyebrow}
        title={customer.name}
        subtitle={customer.phone}
        subtitleClassName="record-muted-strong"
        metaItems={
          isCustomersListVariant
            ? []
            : compact
            ? []
            : [
                { label: 'الحوالات', value: customer.totalTransfersLabel },
                { label: 'آخر حركة', value: customer.lastActivityLabel },
                { label: 'المتابعة', value: customer.stateSummary },
              ]
        }
        aside={
          <>
            {isCustomersListVariant && listRowChip ? (
              <span className={listRowChip.className}>{listRowChip.label}</span>
            ) : null}
            {!isCustomersListVariant && customer.queueLabel ? (
              <span className={['queue-chip', customer.queueClassName].filter(Boolean).join(' ')}>
                {customer.queueLabel}
              </span>
            ) : null}
            {!compact && !isCustomersListVariant && customer.internalId ? (
              <RecordMeta label="ID" value={customer.internalId} ltr />
            ) : null}
            {compact || isCustomersListVariant ? null : (
              <RecordMeta value="فتح ملف العميل" />
            )}
          </>
        }
      />

      {isCustomersListVariant ? null : compact ? (
        <div className="customer-portfolio-compact-summary">
          <div className="customer-portfolio-compact-metric">
            <span className="customer-portfolio-compact-label">{compactMetric.label}</span>
            <strong
              className={['customer-portfolio-compact-value', compactMetric.valueClassName]
                .filter(Boolean)
                .join(' ')}
            >
              {compactMetric.value}
            </strong>
          </div>
          <div className="customer-portfolio-compact-meta">
            <span>{compactMetaLabel || 'ملف مستقر'}</span>
          </div>
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

      {!compact && !isCustomersListVariant ? <p className="record-note">{customer.followUpNote}</p> : null}
    </RecordCard>
  )
}

export default CustomerRecordCard
