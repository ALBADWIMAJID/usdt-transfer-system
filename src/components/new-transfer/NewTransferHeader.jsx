import { Link } from 'react-router-dom'
import PageHeader from '../ui/PageHeader.jsx'

function NewTransferHeader({ onRefresh }) {
  return (
    <PageHeader
      className="new-transfer-page-hero"
      eyebrow="حوالة جديدة"
      title="إدخال حوالة جديدة"
      description="اختر العميل وأدخل البيانات التجارية وراجع مبلغ التسوية قبل حفظ الحوالة."
      actions={
        <>
          <button type="button" className="button secondary" onClick={onRefresh}>
            تحديث العملاء
          </button>
          <Link className="button secondary" to="/transfers">
            العودة إلى الحوالات
          </Link>
        </>
      }
    />
  )
}

export default NewTransferHeader
