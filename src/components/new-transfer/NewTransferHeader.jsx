import PageHeader from '../ui/PageHeader.jsx'

function NewTransferHeader({ onRefresh }) {
  return (
    <PageHeader
      className="new-transfer-page-hero"
      title="حوالة جديدة"
      description="أدخل العميل والتسعير ثم راجع مبلغ التسوية قبل الحفظ."
      showDescriptionOnMobile
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
    >
      <div className="page-hero-highlights new-transfer-hero-highlights">
        <p className="support-text support-text-inline page-hero-highlight page-hero-highlight--brand">تسعير مباشر</p>
        <p className="support-text support-text-inline page-hero-highlight">معاينة فورية للمبلغ النهائي</p>
        <p className="support-text support-text-inline page-hero-highlight">جاهزة للحفظ المحلي عند الانقطاع</p>
      </div>
    </PageHeader>
  )
}

export default NewTransferHeader
