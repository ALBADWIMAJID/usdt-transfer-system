import { Link } from 'react-router-dom'
import EmptyState from '../ui/EmptyState.jsx'
import LoadingState from '../ui/LoadingState.jsx'
import SectionCard from '../ui/SectionCard.jsx'

function CustomersAttentionSection({
  loading,
  customers = [],
  onOpenPortfolioDrillDown,
  compactView = false,
}) {
  const leadCustomer = customers[0]
  const previewCustomers = customers.slice(0, compactView ? 2 : 2)
  const hiddenCustomersCount = Math.max(customers.length - previewCustomers.length, 0)
  const overpaidCustomersCount = customers.filter((customer) => customer.hasOverpaid).length
  const activeCollectionCustomersCount = customers.filter(
    (customer) => customer.partialCount > 0 && !customer.hasOverpaid
  ).length
  const openWaitingCustomersCount = customers.filter(
    (customer) =>
      customer.openAwaitingCount > 0 && customer.partialCount === 0 && !customer.hasOverpaid
  ).length

  return (
    <SectionCard
      title="من يحتاج متابعة الآن؟"
      description={
        compactView
          ? 'قائمة تشغيل سريعة للأولوية الحالية.'
          : 'ملخص مضغوط للأولوية الحالية، مع تفاصيل كاملة داخل لوحة drill-down عند الحاجة.'
      }
      className="customers-attention-section"
      actions={
        onOpenPortfolioDrillDown ? (
          <button type="button" className="button secondary" onClick={onOpenPortfolioDrillDown}>
            فتح لوحة المتابعة
          </button>
        ) : null
      }
    >
      {loading ? <LoadingState>جار تحليل أولويات متابعة العملاء...</LoadingState> : null}

      {!loading && customers.length === 0 ? (
        <EmptyState>لا يوجد حاليا عملاء يحملون حالات متابعة عاجلة أو رصيدا مفتوحا يحتاج حركة مباشرة.</EmptyState>
      ) : null}

      {!loading && customers.length > 0 ? (
        <div className="customer-portfolio-preview">
          <div className="customer-portfolio-preview-summary">
            <div className="customer-portfolio-preview-headline">
              <strong>{customers.length} عميل يحتاج متابعة الآن</strong>
              {compactView && leadCustomer ? (
                <p>ابدأ بـ {leadCustomer.name}</p>
              ) : null}
              {!compactView && leadCustomer ? (
                <p>
                  ابدأ بملف <strong>{leadCustomer.name}</strong> إذا أردت فتح أعلى أولوية مباشرة.
                </p>
              ) : null}
            </div>

            {!compactView && hiddenCustomersCount > 0 ? (
              <p className="support-text customer-portfolio-attention-note">
                +{hiddenCustomersCount} ملف إضافي داخل لوحة التفاصيل
              </p>
            ) : null}
          </div>

          <div className="customer-portfolio-preview-grid">
            <article className="customer-portfolio-preview-card customer-portfolio-preview-card--danger">
              <span>مراجعة مالية</span>
              <strong>{overpaidCustomersCount}</strong>
              <p>عملاء لديهم overpaid يحتاج مراجعة.</p>
            </article>

            <article className="customer-portfolio-preview-card customer-portfolio-preview-card--warning">
              <span>تحصيل نشط</span>
              <strong>{activeCollectionCustomersCount}</strong>
              <p>ملفات جزئية والتحصيل ما زال جاريا.</p>
            </article>

            <article className="customer-portfolio-preview-card customer-portfolio-preview-card--brand">
              <span>بانتظار أول دفعة</span>
              <strong>{openWaitingCustomersCount}</strong>
              <p>ملفات مفتوحة لم يبدأ التحصيل عليها بعد.</p>
            </article>
          </div>

          <div className="customer-portfolio-preview-list" aria-label="معاينة أولويات المتابعة">
            {previewCustomers.map((customer) => (
              <Link key={customer.id} to={customer.to} className="customer-portfolio-preview-item">
                <div className="customer-portfolio-preview-copy">
                  <span className="customer-portfolio-preview-title">{customer.name}</span>
                  <span className="customer-portfolio-preview-meta">
                    {compactView ? customer.queueLabel || customer.stateSummary : customer.phone}
                  </span>
                  <span className="customer-portfolio-preview-meta">
                    {compactView ? `المتبقي ${customer.outstandingRubLabel}` : customer.followUpNote}
                  </span>
                </div>

                <div className="customer-portfolio-preview-aside">
                  {customer.queueLabel ? (
                    <span className={['queue-chip', customer.queueClassName].filter(Boolean).join(' ')}>
                      {customer.queueLabel}
                    </span>
                  ) : null}
                  {!compactView ? (
                    <span className="customer-portfolio-preview-meta">
                      المتبقي: {customer.outstandingRubLabel}
                    </span>
                  ) : null}
                  {!compactView ? <span className="customer-portfolio-preview-link">فتح ملف العميل</span> : null}
                </div>
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </SectionCard>
  )
}

export default CustomersAttentionSection
