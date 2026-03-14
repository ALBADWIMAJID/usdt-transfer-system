import InlineMessage from '../ui/InlineMessage.jsx'
import ListStateSwitcher from '../ui/ListStateSwitcher.jsx'
import RecordCard from '../ui/RecordCard.jsx'
import RecordHeader from '../ui/RecordHeader.jsx'
import RecordMeta from '../ui/RecordMeta.jsx'

function CustomerRecentActivity({
  loading,
  errorMessage,
  warningMessage,
  hasItems,
  items,
  onRetry,
  loadingMessage = 'جار تحميل أحدث حركة لهذا العميل...',
  emptyMessage = 'لا توجد حركة حديثة مرتبطة بهذا العميل حتى الآن.',
  refreshingMessage = 'جار تحديث نشاط العميل...',
}) {
  return (
    <>
      {warningMessage ? <InlineMessage kind="warning">{warningMessage}</InlineMessage> : null}

      <ListStateSwitcher
        errorMessage={errorMessage && !hasItems ? errorMessage : ''}
        onRetry={onRetry}
        loading={loading}
        hasItems={hasItems}
        loadingMessage={loadingMessage}
        emptyMessage={emptyMessage}
        refreshingMessage={refreshingMessage}
      >
        <div className="record-list customer-activity-list">
          {items.map((item) => (
            <RecordCard
              key={item.id}
              to={item.to}
              className={[
                'customer-activity-card',
                'customer-activity-card--priority',
                item.cardClassName,
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <RecordHeader
                eyebrow={item.eyebrow}
                title={item.title}
                subtitle={item.subtitle}
                subtitleClassName="record-muted-strong"
                metaItems={item.metaItems}
                aside={
                  <>
                    {item.badgeLabel ? (
                      <span className={['activity-chip', item.badgeClassName].filter(Boolean).join(' ')}>
                        {item.badgeLabel}
                      </span>
                    ) : null}
                    <RecordMeta label="وقت الحركة" value={item.timeLabel} className="detail-mobile-light" />
                  </>
                }
              />

              {item.noteText ? (
                <p className="record-note record-note--compact customer-activity-note detail-mobile-light">
                  {item.noteText}
                </p>
              ) : null}
            </RecordCard>
          ))}
        </div>
      </ListStateSwitcher>
    </>
  )
}

export default CustomerRecentActivity
