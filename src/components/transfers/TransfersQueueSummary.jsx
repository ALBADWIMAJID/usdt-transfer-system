import MetricCard from '../ui/MetricCard.jsx'

function TransfersQueueSummary({ cards = [] }) {
  return (
    <section className="stats-grid transfers-queue-summary" aria-label="ملخص صف المتابعة">
      {cards.map((card) => (
        <MetricCard
          key={card.key || card.label}
          label={card.label}
          value={card.value}
          copy={card.copy}
          tone={card.tone}
          className={card.className}
          valueClassName={card.valueClassName}
          onClick={card.onClick}
          ariaLabel={card.ariaLabel}
        />
      ))}
    </section>
  )
}

export default TransfersQueueSummary
