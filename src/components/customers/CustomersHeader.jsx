import PageHeader from '../ui/PageHeader.jsx'

function CustomersHeader({ customerCountLabel, onRefresh }) {
  return (
    <PageHeader
      eyebrow="محفظة العملاء"
      title="مركز متابعة العملاء"
      description="اعمل من هذه الصفحة كمشهد محفظة كامل: راقب العملاء الأعلى متبقيا، الملفات الجزئية أو فوق المطلوب، وافتح ملف العميل المناسب مباشرة للمتابعة."
      actions={
        <>
          <button type="button" className="button secondary" onClick={onRefresh}>
            تحديث القائمة
          </button>
          <span className="support-text support-text-inline">{customerCountLabel}</span>
        </>
      }
    />
  )
}

export default CustomersHeader
