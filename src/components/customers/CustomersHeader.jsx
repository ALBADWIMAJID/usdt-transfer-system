import PageHeader from '../ui/PageHeader.jsx'

function CustomersHeader({ customerCountLabel, onRefresh }) {
  return (
    <PageHeader
      title="العملاء"
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
      <div className="customers-page-hero-meta">
        <p className="support-text support-text-inline page-header-meta">{customerCountLabel}</p>
      </div>
    </PageHeader>
  )
}

export default CustomersHeader
