import FilterBar from '../ui/FilterBar.jsx'
import ListStateSwitcher from '../ui/ListStateSwitcher.jsx'
import SearchField from '../ui/SearchField.jsx'
import SectionCard from '../ui/SectionCard.jsx'
import CustomerPortfolioGroup from './CustomerPortfolioGroup.jsx'

function CustomersList({
  searchQuery,
  onSearchChange,
  errorMessage,
  loading,
  hasCustomers,
  hasFilteredCustomers,
  groups,
  scopeLabel = '',
  activePortfolioFilterLabel = '',
  onClearPortfolioFilter,
  onRetry,
}) {
  return (
    <SectionCard
      title="صف متابعة العملاء"
      description="ابحث عن أي عميل بسرعة، ثم اعمل من القائمة حسب أولوية المتابعة: مراجعة مالية، تحصيل جزئي، ثم الملفات المفتوحة."
    >
      <FilterBar>
        <SearchField
          id="customer_search"
          name="customer_search"
          label="البحث عن عميل"
          value={searchQuery}
          onChange={onSearchChange}
          placeholder="ابحث بالاسم أو رقم الهاتف"
        />

        {activePortfolioFilterLabel ? (
          <button type="button" className="button secondary" onClick={onClearPortfolioFilter}>
            إلغاء التركيز: {activePortfolioFilterLabel}
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
        <div className="customer-portfolio-groups">
          {groups.map((group) => (
            <CustomerPortfolioGroup
              key={group.key}
              title={group.title}
              description={group.description}
              count={group.items.length}
              tone={group.tone}
              customers={group.items}
            />
          ))}
        </div>
      </ListStateSwitcher>
    </SectionCard>
  )
}

export default CustomersList
