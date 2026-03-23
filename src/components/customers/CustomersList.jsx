import FilterBar from '../ui/FilterBar.jsx'
import ListStateSwitcher from '../ui/ListStateSwitcher.jsx'
import SearchField from '../ui/SearchField.jsx'
import SectionCard from '../ui/SectionCard.jsx'
import CustomerRecordCard from './CustomerRecordCard.jsx'

function CustomersList({
  searchQuery,
  onSearchChange,
  errorMessage,
  loading,
  hasCustomers,
  hasFilteredCustomers,
  items = [],
  scopeLabel = '',
  activePortfolioFilterLabel = '',
  onClearPortfolioFilter,
  onRetry,
}) {
  return (
    <SectionCard
      title="العملاء"
      description="ابحث بسرعة ثم افتح ملف العميل مباشرة."
      className="customers-list-section"
    >
      <FilterBar className="customers-list-filter-bar">
        <SearchField
          id="customer_search"
          name="customer_search"
          label="البحث عن عميل"
          value={searchQuery}
          onChange={onSearchChange}
          placeholder="ابحث بالاسم أو رقم الهاتف"
        />

        {activePortfolioFilterLabel ? (
          <button
            type="button"
            className="button secondary"
            onClick={onClearPortfolioFilter}
            aria-label={`إلغاء التركيز: ${activePortfolioFilterLabel}`}
          >
            إلغاء التركيز
          </button>
        ) : null}
      </FilterBar>

      {scopeLabel ? <p className="support-text customer-portfolio-scope-note">{scopeLabel}</p> : null}

      <ListStateSwitcher
        errorMessage={errorMessage}
        onRetry={onRetry}
        loading={loading}
        hasItems={hasCustomers}
        hasFilteredItems={hasFilteredCustomers}
        loadingMessage="جار تحميل ملف محفظة العملاء..."
        emptyMessage="لا توجد ملفات عملاء بعد. أنشئ أول عميل لبدء تسجيل الحوالات ومتابعتها."
        noResultsMessage="لا توجد نتائج مطابقة للبحث أو للتركيز الحالي على المتابعة. جرّب اسما مختلفا أو ألغ التركيز الحالي."
        refreshingMessage="جار تحديث محفظة العملاء..."
      >
        <div className="record-list customers-directory-list">
          {items.map((customer) => (
            <CustomerRecordCard
              key={customer.id}
              customer={customer}
              compact
              variant="customers-list"
            />
          ))}
        </div>
      </ListStateSwitcher>
    </SectionCard>
  )
}

export default CustomersList
