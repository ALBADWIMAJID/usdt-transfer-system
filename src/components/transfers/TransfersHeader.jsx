import { Link } from 'react-router-dom'
import PageHeader from '../ui/PageHeader.jsx'

function TransfersHeader({ transferCountLabel, onRefresh }) {
  return (
    <PageHeader
      eyebrow="صف المتابعة المالية"
      title="قائمة عمل الحوالات"
      description="اعمل من هذه الصفحة كصف متابعة يومي: ابحث بسرعة، فرز حسب أولوية المتابعة، وافتح أي حوالة تحتاج تحصيلا أو مراجعة مالية."
      actions={
        <>
          <Link className="button secondary" to="/dashboard">
            لوحة التشغيل
          </Link>
          <button type="button" className="button secondary" onClick={onRefresh}>
            تحديث الصف
          </button>
          <Link className="button primary" to="/transfers/new">
            إنشاء حوالة
          </Link>
          <span className="support-text support-text-inline">{transferCountLabel}</span>
        </>
      }
    />
  )
}

export default TransfersHeader
