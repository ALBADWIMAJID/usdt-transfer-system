import PageHeader from '../ui/PageHeader.jsx'

function CustomersHeader({ customerCountLabel, onRefresh }) {
  return (
    <PageHeader
      title="العملاء"
      description="إدارة ملفات العملاء والانتقال السريع بين الإنشاء والبحث والمتابعة."
      showDescriptionOnMobile
      className="customers-page-hero"
      actions={
        onRefresh ? (
          <button
            type="button"
            className="button secondary customers-page-refresh-button"
            onClick={onRefresh}
          >
            تحديث
          </button>
        ) : null
      }
    >
      <div className="customers-page-hero-meta page-hero-highlights">
        <p className="support-text support-text-inline page-header-meta page-hero-highlight page-hero-highlight--brand">
          {customerCountLabel}
        </p>
        <p className="support-text support-text-inline page-hero-highlight">إنشاء، بحث، ومحفظة متابعة</p>
      </div>
    </PageHeader>
  )
}

export default CustomersHeader
