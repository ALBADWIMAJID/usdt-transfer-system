import InfoCard from '../ui/InfoCard.jsx'
import InfoGrid from '../ui/InfoGrid.jsx'
import SectionCard from '../ui/SectionCard.jsx'
import DashboardMetricsSection from './DashboardMetricsSection.jsx'

function DashboardFinancialSnapshotSection({
  headlineCards = [],
  supportingCards = [],
  overviewCards = [],
  note = '',
}) {
  return (
    <SectionCard
      title="اللقطة المالية اليومية"
      description="قراءة صباحية سريعة لحركة التحصيل اليوم وصافي الرصيد المفتوح والمخاطر المالية الحالية."
      className="dashboard-section dashboard-financial-snapshot"
    >
      <div className="dashboard-snapshot-grid">
        {headlineCards.map((card) => {
          const classes = ['dashboard-snapshot-card', card.onClick ? 'card-button-shell' : '', card.className]
            .filter(Boolean)
            .join(' ')

          const content = (
            <>
              <span className="dashboard-snapshot-label">{card.label}</span>
              <strong className={['dashboard-snapshot-value', card.valueClassName].filter(Boolean).join(' ')}>
                {card.value}
              </strong>
              {card.copy ? <p className="dashboard-snapshot-copy">{card.copy}</p> : null}
            </>
          )

          if (card.onClick) {
            return (
              <button
                key={card.key || card.label}
                type="button"
                className={classes}
                onClick={card.onClick}
                aria-label={card.ariaLabel || card.label}
              >
                {content}
              </button>
            )
          }

          return (
            <article key={card.key || card.label} className={classes}>
              {content}
            </article>
          )
        })}
      </div>

      {supportingCards.length > 0 ? (
        <InfoGrid className="dashboard-snapshot-supporting">
          {supportingCards.map((card) => (
            <InfoCard
              key={card.key || card.title}
              title={card.title}
              value={card.value}
              className={card.className}
              valueClassName={card.valueClassName}
              onClick={card.onClick}
              ariaLabel={card.ariaLabel}
            >
              {card.copy ? <p className="info-card-value">{card.copy}</p> : null}
            </InfoCard>
          ))}
        </InfoGrid>
      ) : null}

      {note ? <p className="dashboard-snapshot-note">{note}</p> : null}

      {overviewCards.length > 0 ? (
        <>
          <div className="dashboard-subsection-head dashboard-subsection-head--overview">
            <h3>الصورة العامة</h3>
            <p>إجماليات الملف التشغيلي الحالي عبر العملاء والحوالات والتحصيلات المسجلة.</p>
          </div>
          <DashboardMetricsSection cards={overviewCards} className="dashboard-overview-grid" />
        </>
      ) : null}
    </SectionCard>
  )
}

export default DashboardFinancialSnapshotSection
