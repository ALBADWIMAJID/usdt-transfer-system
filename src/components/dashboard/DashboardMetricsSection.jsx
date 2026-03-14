import MetricCard from '../ui/MetricCard.jsx'

function DashboardMetricsSection({ cards = [], className = '', ariaLabel = 'ملخص التشغيل اليومي' }) {
  return (
    <section
      className={['stats-grid', 'dashboard-metrics-grid', className].filter(Boolean).join(' ')}
      aria-label={ariaLabel}
    >
      {cards.map((card) => (
        <MetricCard
          key={card.key || card.label}
          label={card.label}
          value={card.value}
          copy={card.copy}
          tone={card.tone}
          valueClassName={card.valueClassName}
          className={card.className}
          onClick={card.onClick}
          ariaLabel={card.ariaLabel}
        />
      ))}
    </section>
  )
}

export default DashboardMetricsSection
