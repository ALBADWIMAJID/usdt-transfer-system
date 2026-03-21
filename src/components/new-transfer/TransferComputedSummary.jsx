import { useState } from 'react'
import InfoCard from '../ui/InfoCard.jsx'
import InfoGrid from '../ui/InfoGrid.jsx'

function TransferComputedSummary({
  customerName,
  amountLabel,
  globalRateLabel,
  valueBeforePercentageLabel,
  percentageLabel,
  valueAfterPercentageLabel,
  className = '',
}) {
  const [detailsOpen, setDetailsOpen] = useState(false)

  return (
    <section
      className={[
        'page-card',
        'new-transfer-summary-section',
        detailsOpen ? 'details-open' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="new-transfer-summary-strip">
        <div className="new-transfer-summary-strip-copy">
          <span className="new-transfer-summary-strip-label">المعاينة</span>
          <strong className="new-transfer-summary-strip-value">{valueAfterPercentageLabel} RUB</strong>
          <p className="new-transfer-summary-strip-meta">
            {customerName} · {amountLabel} USDT
          </p>
        </div>

        <button
          type="button"
          className="button secondary new-transfer-summary-toggle"
          aria-expanded={detailsOpen}
          onClick={() => setDetailsOpen((current) => !current)}
        >
          {detailsOpen ? 'إخفاء التفاصيل' : 'تفاصيل'}
        </button>
      </div>

      <div className="new-transfer-summary-details">
        <InfoGrid>
          <InfoCard title="العميل" value={customerName} />
          <InfoCard title="كمية USDT" value={amountLabel} />
          <InfoCard title="السعر العام" value={globalRateLabel} />
          <InfoCard title="القيمة قبل النسبة" value={valueBeforePercentageLabel} />
          <InfoCard title="النسبة" value={percentageLabel} />
          <InfoCard title="مبلغ التسوية" value={valueAfterPercentageLabel} />
        </InfoGrid>
      </div>
    </section>
  )
}

export default TransferComputedSummary
