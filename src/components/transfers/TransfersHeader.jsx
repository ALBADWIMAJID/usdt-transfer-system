import { Link } from 'react-router-dom'
import PageHeader from '../ui/PageHeader.jsx'

function TransfersHeader({ transferCountLabel, onRefresh }) {
  return (
    <PageHeader
      className="transfers-queue-page-header"
      title="الحوالات"
      actions={
        <>
          {onRefresh ? (
            <button type="button" className="button secondary" onClick={onRefresh}>
              تحديث
            </button>
          ) : null}
          <Link className="button primary" to="/transfers/new">
            حوالة جديدة
          </Link>
        </>
      }
    >
      <p className="support-text support-text-inline page-header-meta">{transferCountLabel}</p>
    </PageHeader>
  )
}

export default TransfersHeader
