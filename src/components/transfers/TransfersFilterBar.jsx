import DateFilter from '../ui/DateFilter.jsx'
import FilterBar from '../ui/FilterBar.jsx'
import SearchField from '../ui/SearchField.jsx'
import SelectFilter from '../ui/SelectFilter.jsx'

function TransfersFilterBar({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  queueFilter,
  onQueueFilterChange,
  createdAfter,
  onCreatedAfterChange,
  statusOptions,
  queueOptions,
}) {
  return (
    <FilterBar className="transfers-queue-filter-bar">
      <SearchField
        id="transfer_search"
        name="transfer_search"
        label="البحث في الحوالات"
        value={searchQuery}
        onChange={onSearchChange}
        placeholder="ابحث بالمرجع أو اسم العميل"
      />

      <SelectFilter
        id="transfer_queue_filter"
        name="transfer_queue_filter"
        label="العرض التشغيلي"
        value={queueFilter}
        onChange={onQueueFilterChange}
        options={queueOptions}
      />

      <SelectFilter
        id="transfer_status_filter"
        name="transfer_status_filter"
        label="الحالة"
        value={statusFilter}
        onChange={onStatusFilterChange}
        options={statusOptions}
      />

      <DateFilter
        id="transfer_created_after"
        name="transfer_created_after"
        label="من تاريخ"
        value={createdAfter}
        onChange={onCreatedAfterChange}
      />
    </FilterBar>
  )
}

export default TransfersFilterBar
