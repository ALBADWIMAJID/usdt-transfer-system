import InfoCard from '../ui/InfoCard.jsx'
import InfoGrid from '../ui/InfoGrid.jsx'
import SectionCard from '../ui/SectionCard.jsx'

function TransferComputedSummary({
  customerName,
  amountLabel,
  globalRateLabel,
  valueBeforePercentageLabel,
  percentageLabel,
  valueAfterPercentageLabel,
}) {
  return (
    <SectionCard
      title="معاينة التسوية"
      description="يتم تحديث الملخص التالي مباشرة ويعكس القيم التي سيتم حفظها مع الحوالة."
    >
      <InfoGrid>
        <InfoCard title="العميل" value={customerName} />
        <InfoCard title="كمية USDT" value={amountLabel} />
        <InfoCard title="السعر العام" value={globalRateLabel} />
        <InfoCard title="القيمة قبل النسبة" value={valueBeforePercentageLabel} />
        <InfoCard title="النسبة" value={percentageLabel} />
        <InfoCard title="مبلغ التسوية" value={valueAfterPercentageLabel} />
      </InfoGrid>
    </SectionCard>
  )
}

export default TransferComputedSummary
