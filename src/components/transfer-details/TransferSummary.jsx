import InfoCard from '../ui/InfoCard.jsx'
import InfoGrid from '../ui/InfoGrid.jsx'
import InitialsAvatar from '../ui/InitialsAvatar.jsx'
import InlineMessage from '../ui/InlineMessage.jsx'
import RecordHeader from '../ui/RecordHeader.jsx'
import StatusBadge from '../ui/StatusBadge.jsx'

function TransferSummary({
  errorMessage,
  loading,
  hasTransfer,
  customerId,
  customerName,
  status,
  metaItems = [],
  asideChildren = null,
  highlightItems = [],
  items = [],
  recordHeaderClassName = '',
}) {
  if (errorMessage) {
    return <InlineMessage kind="error">{errorMessage}</InlineMessage>
  }

  if (loading) {
    return <p>جار تحميل ملخص الحوالة...</p>
  }

  if (!hasTransfer) {
    return <p>بيانات الحوالة غير متاحة حاليا.</p>
  }

  return (
    <>
      <RecordHeader
        leading={
          <InitialsAvatar
            label={customerName}
            fallback="TR"
            className="record-header-avatar record-header-avatar--hero"
          />
        }
        eyebrow="العميل"
        title={customerName}
        titleTo={customerId ? `/customers/${customerId}` : ''}
        metaItems={metaItems}
        aside={
          <>
            <StatusBadge status={status} />
            {asideChildren}
          </>
        }
        className={['inline-summary', recordHeaderClassName].filter(Boolean).join(' ')}
      />

      {highlightItems.length > 0 ? (
        <InfoGrid className="transfer-summary-grid transfer-summary-grid--highlight">
          {highlightItems.map((item) => (
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

      {items.length > 0 ? (
        <InfoGrid className="transfer-summary-grid transfer-summary-grid--details">
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
    </>
  )
}

export default TransferSummary
