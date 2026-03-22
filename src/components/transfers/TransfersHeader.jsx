import { Link } from 'react-router-dom'
import PageHeader from '../ui/PageHeader.jsx'

function TransfersHeader({ transferCountLabel, onRefresh }) {
  return (
    <PageHeader
      className="transfers-queue-page-header"
      title="الحوالات"
      description="صف متابعة واضح للحوالات المفتوحة والجزئية والمحفوفة بالمخاطر."
      showDescriptionOnMobile
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
      <div className="page-hero-highlights transfers-page-hero-highlights">
        <p className="support-text support-text-inline page-header-meta page-hero-highlight page-hero-highlight--brand">
          {transferCountLabel}
        </p>
        <p className="support-text support-text-inline page-hero-highlight">الأولوية تبدأ من السجلات التي تحتاج حركة الآن</p>
      </div>
    </PageHeader>
  )
}

export default TransfersHeader
