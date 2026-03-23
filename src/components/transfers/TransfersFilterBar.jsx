import DateFilter from '../ui/DateFilter.jsx'
import FilterBar from '../ui/FilterBar.jsx'
import SearchField from '../ui/SearchField.jsx'
import SelectFilter from '../ui/SelectFilter.jsx'

function FilterChip({ active = false, children, onClick }) {
  return (
    <button
      type="button"
      className={['transfers-quick-filter-chip', active ? 'active' : ''].filter(Boolean).join(' ')}
      aria-pressed={active}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

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
  advancedOpen = false,
  onToggleAdvanced,
  onClearFilters,
  hasActiveFilters = false,
  activeFilterItems = [],
}) {
  const activeAdvancedCount = Number(statusFilter !== 'all') + Number(Boolean(createdAfter))

  return (
    <section className="transfers-filters-tray" aria-label="عناصر تصفية صف الحوالات">
      <SearchField
        id="transfer_search"
        name="transfer_search"
        label="البحث في الحوالات"
        value={searchQuery}
        onChange={onSearchChange}
        placeholder="ابحث بالمرجع أو اسم العميل"
        className="transfers-queue-filter-search"
      />

      <div className="transfers-quick-filters" role="group" aria-label="الفلاتر السريعة">
        {queueOptions.map((option) => (
          <FilterChip
            key={option.value}
            active={queueFilter === option.value}
            onClick={() => onQueueFilterChange(option.value)}
          >
            {option.label}
          </FilterChip>
        ))}
      </div>

      <div className="transfers-filters-toolbar">
        <button
          type="button"
          className={['transfers-filters-toggle', advancedOpen ? 'open' : ''].filter(Boolean).join(' ')}
          aria-expanded={advancedOpen}
          aria-controls="transfers-advanced-filters"
          onClick={onToggleAdvanced}
        >
          <span>الفلاتر</span>
          <strong>{activeAdvancedCount > 0 ? `${activeAdvancedCount} نشطة` : 'اختيارية'}</strong>
        </button>

        {hasActiveFilters ? (
          <button
            type="button"
            className="button secondary transfers-filters-clear"
            onClick={onClearFilters}
          >
            مسح الكل
          </button>
        ) : null}
      </div>

      {activeFilterItems.length > 0 ? (
        <div className="transfers-active-filters" aria-label="الفلاتر النشطة حاليا">
          {activeFilterItems.map((item) => (
            <span key={item.key} className="transfers-active-filter-chip">
              {item.label}
            </span>
          ))}
        </div>
      ) : null}

      <div
        id="transfers-advanced-filters"
        className={[
          'transfers-filters-advanced',
          advancedOpen ? 'open' : 'collapsed',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <FilterBar className="transfers-queue-filter-bar transfers-queue-filter-bar--advanced">
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
      </div>
    </section>
  )
}

export default TransfersFilterBar
