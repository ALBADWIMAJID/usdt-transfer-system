import useTransfersQueueCompactCards from '../../hooks/useTransfersQueueCompactCards.js'
import ListStateSwitcher from '../ui/ListStateSwitcher.jsx'
import TransferQueueGroup from './TransferQueueGroup.jsx'

function TransfersList({
  errorMessage,
  loading,
  hasTransfers,
  hasFilteredTransfers,
  groups,
  onRetry,
}) {
  const compactCards = useTransfersQueueCompactCards()

  return (
    <ListStateSwitcher
      errorMessage={errorMessage}
      onRetry={onRetry}
      loading={loading}
      hasItems={hasTransfers}
      hasFilteredItems={hasFilteredTransfers}
      loadingMessage="جار تحميل سجلات الحوالات..."
      emptyMessage="لا توجد حوالات بعد. أنشئ أول حوالة لبدء متابعة التسوية والمدفوعات."
      noResultsMessage="لا توجد حوالات مطابقة للبحث أو لعوامل التصفية الحالية. عدّل المرجع أو العميل أو الحالة أو التاريخ ثم أعد المحاولة."
      refreshingMessage="جار تحديث الحوالات..."
    >
      <div className="transfers-queue-scroll-area" aria-label="نتائج صف الحوالات" tabIndex={0}>
        <div className="transfer-queue-groups">
          {groups.map((group) => (
            <TransferQueueGroup
              key={group.key}
              title={group.title}
              description={group.description}
              count={group.items.length}
              tone={group.tone}
              transfers={group.items}
              compactCards={compactCards}
            />
          ))}
        </div>
      </div>
    </ListStateSwitcher>
  )
}

export default TransfersList
