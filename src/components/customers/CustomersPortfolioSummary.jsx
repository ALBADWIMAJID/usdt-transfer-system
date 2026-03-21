import MetricCard from '../ui/MetricCard.jsx'
import SectionCard from '../ui/SectionCard.jsx'

function CustomersPortfolioSummary({ cards = [], note = '', compactView = false }) {
  return (
    <SectionCard
      title={compactView ? 'ملخص المحفظة' : 'ملخص محفظة العملاء'}
      description={compactView ? 'أرقام سريعة عالية الإشارة.' : 'مؤشرات سريعة تفتح تفاصيل المحفظة عند الطلب.'}
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

      {!compactView && note ? <p className="support-text customer-portfolio-note">{note}</p> : null}
    </SectionCard>
  )
}

export default CustomersPortfolioSummary
