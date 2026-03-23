import InfoCard from '../ui/InfoCard.jsx'
import InitialsAvatar from '../ui/InitialsAvatar.jsx'
import RecordCard from '../ui/RecordCard.jsx'
import RecordHeader from '../ui/RecordHeader.jsx'
import RecordMeta from '../ui/RecordMeta.jsx'

function CustomerRecordCard({ customer, compact = false, variant = 'default' }) {
  const transferCountTitle = customer.isArchived ? 'الحوالات المرتبطة' : 'الحوالات النشطة'
  const transferCountValue = customer.isArchived
    ? customer.totalTransfersLabel
    : customer.activeTransfersLabel
  const isCustomersListVariant = variant === 'customers-list'
  const compactSubtitle =
    isCustomersListVariant && (!customer.phone || customer.phone === 'غير مضاف')
      ? ''
      : customer.phone
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
  const compactMetaLabel = isCustomersListVariant
    ? customer.isArchived
      ? 'ملف مؤرشف'
      : customer.hasActivityToday
        ? 'نشط اليوم'
        : customer.hasOverpaid
          ? 'مراجعة مالية'
          : customer.outstandingRub && customer.outstandingRub > 0.009
            ? 'متابعة مفتوحة'
            : 'ملف مستقر'
    : [customer.stateSummary, customer.hasActivityToday ? 'حركة اليوم' : ''].filter(Boolean).join(' • ')
  const listRowChip = customer.isArchived
    ? {
        label: 'مؤرشف',
        className: 'queue-chip queue-chip--neutral',
      }
    : customer.queueLabel
      ? {
          label: customer.queueLabel,
          className: ['queue-chip', customer.queueClassName].filter(Boolean).join(' '),
        }
      : null
  const showCompactSummary = compact || isCustomersListVariant

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
        leading={<InitialsAvatar label={customer.name} className="record-header-avatar record-header-avatar--customer" />}
        eyebrow={compact || isCustomersListVariant ? '' : customer.eyebrow}
        title={customer.name}
        subtitle={compactSubtitle}
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

      {showCompactSummary ? (
        <div
          className={[
            'customer-portfolio-compact-summary',
            isCustomersListVariant ? 'customer-portfolio-compact-summary--list-row' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
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
