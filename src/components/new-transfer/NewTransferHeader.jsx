import PageHeader from '../ui/PageHeader.jsx'

function NewTransferHeader({ onRefresh }) {
  return (
    <PageHeader
      className="new-transfer-page-hero"
      title="حوالة جديدة"
      actions={
        onRefresh ? (
          <button
            type="button"
            className="button secondary new-transfer-header-refresh-button"
            onClick={onRefresh}
          >
            تحديث
          </button>
        ) : null
      }
    />
  )
}

export default NewTransferHeader
