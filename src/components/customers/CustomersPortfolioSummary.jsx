import MetricCard from '../ui/MetricCard.jsx'
import SectionCard from '../ui/SectionCard.jsx'

function CustomersPortfolioSummary({ cards = [], note = '' }) {
  return (
    <SectionCard
      title="ملخص محفظة العملاء"
      description="مؤشرات سريعة تفتح تفاصيل المحفظة عند الطلب."
      className="customers-portfolio-summary"
    >
      <section className="stats-grid" aria-label="ملخص محفظة العملاء">
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

      {note ? <p className="support-text customer-portfolio-note">{note}</p> : null}
    </SectionCard>
  )
}

export default CustomersPortfolioSummary
