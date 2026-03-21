import { Link } from 'react-router-dom'
import EmptyState from '../ui/EmptyState.jsx'
import InlineMessage from '../ui/InlineMessage.jsx'
import LoadingState from '../ui/LoadingState.jsx'
import SectionCard from '../ui/SectionCard.jsx'

function CustomersRecentActivitySection({
  loading,
  errorMessage,
  warningMessage,
  items = [],
  onRetry,
  onOpenActivityDrillDown,
  compactView = false,
}) {
  const previewItems = items.slice(0, compactView ? 3 : 2)
  const latestItem = items[0]

  return (
    <SectionCard
      title="الحركة الأخيرة عبر العملاء"
      description={compactView ? 'خلاصة الحركة الحديثة.' : 'معاينة قصيرة لأحدث الحركة، مع فتح التفاصيل الكاملة داخل اللوحة الجانبية.'}
      className="customers-recent-activity-section"
      actions={
        onOpenActivityDrillDown ? (
          <button type="button" className="button secondary" onClick={onOpenActivityDrillDown}>
            فتح كل الحركة
          </button>
        ) : null
      }
    >
      {warningMessage ? <InlineMessage kind="warning">{warningMessage}</InlineMessage> : null}

      {loading ? <LoadingState>جار تحميل أحدث الحركة عبر العملاء...</LoadingState> : null}

      {!loading && errorMessage && items.length === 0 ? (
        <div className="customer-activity-preview-error">
          <InlineMessage kind="error">{errorMessage}</InlineMessage>
          {onRetry ? (
            <div>
              <button type="button" className="button secondary" onClick={onRetry}>
                إعادة المحاولة
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {!loading && !errorMessage && items.length === 0 ? (
        <EmptyState>لا توجد حركة حديثة على مستوى محفظة العملاء حتى الآن.</EmptyState>
      ) : null}

      {!loading && items.length > 0 ? (
        <div className="customer-activity-preview">
          <div className="customer-activity-preview-head">
            <div className="customer-activity-preview-copy">
              <strong>{items.length} حركة حديثة متاحة للمراجعة</strong>
              {compactView && latestItem ? (
                <p>{latestItem.title}</p>
              ) : null}
              {!compactView ? (
                <p>
                أحدث حركة: <strong>{latestItem?.title}</strong>
                {latestItem?.timeLabel ? ` • ${latestItem.timeLabel}` : ''}
                </p>
              ) : null}
            </div>

            {!compactView && items.length > previewItems.length ? (
              <p className="support-text customer-portfolio-attention-note">
                +{items.length - previewItems.length} حركات أخرى داخل لوحة التفاصيل
              </p>
            ) : null}
          </div>

          <div className="customer-activity-preview-list" aria-label="معاينة الحركة الأخيرة">
            {previewItems.map((item) => (
              <Link key={item.id} to={item.to} className="customer-activity-preview-item">
                <div className="customer-activity-preview-item-copy">
                  <span className="customer-activity-preview-item-title">{item.title}</span>
                  <span className="customer-activity-preview-item-subtitle">{item.subtitle}</span>
                  {!compactView && item.noteText ? (
                    <span className="customer-activity-preview-item-subtitle">{item.noteText}</span>
                  ) : null}
                </div>

                <div className="customer-activity-preview-item-aside">
                  {item.badgeLabel ? (
                    <span className={['activity-chip', item.badgeClassName].filter(Boolean).join(' ')}>
                      {item.badgeLabel}
                    </span>
                  ) : null}
                  <span className="customer-activity-preview-item-time">{item.timeLabel}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </SectionCard>
  )
}

export default CustomersRecentActivitySection
