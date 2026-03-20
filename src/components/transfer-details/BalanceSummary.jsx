import InfoCard from '../ui/InfoCard.jsx'
import InfoGrid from '../ui/InfoGrid.jsx'

function BalanceSummary({
  settlementValue,
  totalPaidValue,
  remainingTitle,
  remainingValue,
  remainingCardClass,
  remainingValueClass,
  remainingNote,
}) {
  return (
    <InfoGrid className="balance-summary-grid">
      <InfoCard
        title="مبلغ التسوية"
        value={settlementValue}
        className="info-card--accent"
        valueClassName="info-card-value--metric"
      />
      <InfoCard
        title="إجمالي المدفوع بالروبل"
        value={totalPaidValue}
        valueClassName="info-card-value--metric"
      />
      <InfoCard
        title={remainingTitle}
        value={remainingValue}
        className={remainingCardClass}
        valueClassName={['info-card-value--metric', remainingValueClass].filter(Boolean).join(' ')}
      >
        {remainingNote ? <p className="support-text text-danger">{remainingNote}</p> : null}
      </InfoCard>
    </InfoGrid>
  )
}

export default BalanceSummary
