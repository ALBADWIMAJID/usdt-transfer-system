import InfoCard from '../ui/InfoCard.jsx'
import InfoGrid from '../ui/InfoGrid.jsx'

function CustomerFollowUpPanel({ title, description, tone = 'neutral', chips = [], items = [] }) {
  return (
    <section
      className={[
        'transfer-followup-panel',
        'customer-followup-panel',
        `transfer-followup-panel--${tone}`,
      ].join(' ')}
    >
      <div className="transfer-followup-head">
        <div className="transfer-followup-copy">
          <p className="eyebrow">ما الذي يحتاج متابعة لهذا العميل؟</p>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
      </div>

      {chips.length > 0 ? (
        <div className="transfer-followup-chips">
          {chips.map((chip) => (
            <span
              key={`${chip.label}-${chip.value}`}
              className={['queue-chip', chip.className].filter(Boolean).join(' ')}
            >
              {chip.label}: {chip.value}
            </span>
          ))}
        </div>
      ) : null}

      {items.length > 0 ? (
        <InfoGrid className="transfer-followup-grid">
          {items.map((item) => (
            <InfoCard
              key={item.title}
              title={item.title}
              value={item.value}
              className={item.className}
              valueClassName={item.valueClassName}
            >
              {item.children}
            </InfoCard>
          ))}
        </InfoGrid>
      ) : null}
    </section>
  )
}

export default CustomerFollowUpPanel
