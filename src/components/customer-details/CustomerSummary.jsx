import EmptyState from '../ui/EmptyState.jsx'
import InfoCard from '../ui/InfoCard.jsx'
import InfoGrid from '../ui/InfoGrid.jsx'
import InlineMessage from '../ui/InlineMessage.jsx'
import RecordHeader from '../ui/RecordHeader.jsx'

function CustomerSummary({
  errorMessage,
  loading,
  notFound,
  hasCustomer,
  title,
  subtitle,
  metaItems = [],
  aside,
  highlightItems = [],
  items = [],
}) {
  if (errorMessage) {
    return <InlineMessage kind="error">{errorMessage}</InlineMessage>
  }

  if (loading) {
    return <p>جار تحميل ملف العميل...</p>
  }

  if (notFound) {
    return <EmptyState>ملف العميل غير موجود أو غير متاح ضمن الجلسة الحالية.</EmptyState>
  }

  if (!hasCustomer) {
    return <p>بيانات العميل غير متاحة حاليا.</p>
  }

  return (
    <>
      <RecordHeader
        eyebrow="ملف العميل"
        title={title}
        subtitle={subtitle}
        subtitleClassName="record-muted-strong"
        metaItems={metaItems}
        aside={aside}
        className="inline-summary"
      />

      {highlightItems.length > 0 ? (
        <InfoGrid className="customer-summary-grid customer-summary-grid--highlight">
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
        <InfoGrid className="customer-summary-grid customer-summary-grid--details">
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

export default CustomerSummary
