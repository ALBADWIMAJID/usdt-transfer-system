import InfoCard from '../ui/InfoCard.jsx'
import InlineMessage from '../ui/InlineMessage.jsx'
import MetricCard from '../ui/MetricCard.jsx'
import TotalsBlock from '../ui/TotalsBlock.jsx'

function CustomerTotals({ metrics, remainingCard, errorMessage }) {
  return (
    <>
      <TotalsBlock>
        {metrics.map((metric) => (
          <MetricCard
            key={metric.label}
            label={metric.label}
            value={metric.value}
            copy={metric.copy}
            tone={metric.tone}
            valueClassName={metric.valueClassName}
            className={metric.className}
          />
        ))}
        <InfoCard
          title={remainingCard.title}
          value={remainingCard.value}
          className={remainingCard.className}
          valueClassName={remainingCard.valueClassName}
        >
          {remainingCard.children}
        </InfoCard>
      </TotalsBlock>
      <InlineMessage kind="error">{errorMessage}</InlineMessage>
    </>
  )
}

export default CustomerTotals
