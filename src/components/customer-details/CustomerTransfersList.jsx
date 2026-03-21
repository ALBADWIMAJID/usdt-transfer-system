import EmptyState from '../ui/EmptyState.jsx'
import FilterBar from '../ui/FilterBar.jsx'
import InlineMessage from '../ui/InlineMessage.jsx'
import ListStateSwitcher from '../ui/ListStateSwitcher.jsx'
import SelectFilter from '../ui/SelectFilter.jsx'
import TransferQueueGroup from '../transfers/TransferQueueGroup.jsx'

function CustomerTransfersList({
  errorMessage,
  loading,
  customerNotFound,
  hasTransfers,
  hasFilteredTransfers,
  groups,
  onRetry,
  filterValue,
  onFilterChange,
  filterOptions,
  warningMessage,
  compactView = false,
}) {
  return (
    <>
      <FilterBar>
        <SelectFilter
          id="customer_transfer_status_filter"
          name="customer_transfer_status_filter"
          label="تصفية بالحالة"
          value={filterValue}
          onChange={onFilterChange}
          options={filterOptions}
        />
      </FilterBar>

      {warningMessage ? <InlineMessage kind="warning">{warningMessage}</InlineMessage> : null}

      {customerNotFound ? (
        <EmptyState>ملف هذا العميل غير متاح حاليا.</EmptyState>
      ) : (
        <ListStateSwitcher
          errorMessage={errorMessage}
          onRetry={onRetry}
          loading={loading}
          hasItems={hasTransfers}
          hasFilteredItems={hasFilteredTransfers}
          loadingMessage="جار تحميل سجل الحوالات..."
          emptyMessage="لا توجد حوالات مسجلة لهذا العميل حتى الآن."
          noResultsMessage="لا توجد حوالات مطابقة للحالة المختارة لهذا العميل."
          refreshingMessage="جار تحديث الحوالات..."
        >
          <div className="transfer-queue-groups">
            {groups.map((group) => (
              <TransferQueueGroup
                key={group.key}
                title={group.title}
                description={group.description}
                count={group.items.length}
                tone={group.tone}
                transfers={group.items}
                compactCards={compactView}
              />
            ))}
          </div>
        </ListStateSwitcher>
      )}
    </>
  )
}

export default CustomerTransfersList
