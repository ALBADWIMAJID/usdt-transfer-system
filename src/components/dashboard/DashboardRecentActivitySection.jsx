import { Link } from 'react-router-dom'
import ActionRow from '../ui/ActionRow.jsx'
import EmptyState from '../ui/EmptyState.jsx'
import LoadingState from '../ui/LoadingState.jsx'
import RecordCard from '../ui/RecordCard.jsx'
import RecordHeader from '../ui/RecordHeader.jsx'
import SectionCard from '../ui/SectionCard.jsx'
import StatusBadge from '../ui/StatusBadge.jsx'

function DashboardRecentActivitySection({
  loading,
  recentTransfers = [],
  recentPayments = [],
  paymentsSummary = '',
  transfersSummary = '',
  onOpenPaymentsDrillDown,
  onOpenTransfersDrillDown,
}) {
  return (
    <SectionCard
      title="حركة الأموال والعمليات الأخيرة"
      description="تغذية تشغيلية مباشرة لأحدث المدفوعات والحوالات حتى يستطيع المشغل التقاط الحركة المالية الأخيرة دون فتح السجلات كاملة."
      className="dashboard-section"
    >
      <div className="dashboard-columns">
        <div className="dashboard-column">
          <div className="dashboard-subsection-head dashboard-subsection-head--actionable">
            <div>
              <h3>آخر المدفوعات</h3>
              <p>{paymentsSummary || 'المدفوعات الأحدث مع وسيلة الدفع ومرجع الحوالة المرتبطة بها.'}</p>
            </div>
            {onOpenPaymentsDrillDown ? (
              <button type="button" className="button secondary" onClick={onOpenPaymentsDrillDown}>
                فتح كل الدفعات الحديثة
              </button>
            ) : null}
          </div>

          {loading ? <LoadingState>جار تحميل آخر المدفوعات...</LoadingState> : null}

          {!loading && recentPayments.length === 0 ? (
            <EmptyState>لا توجد مدفوعات حديثة مسجلة حتى الآن.</EmptyState>
          ) : null}

          {recentPayments.length > 0 ? (
            <div className="record-list dashboard-activity-list">
              {recentPayments.map((payment) => (
                <RecordCard key={payment.id} className="dashboard-activity-card dashboard-money-card">
                  <RecordHeader
                    eyebrow="حركة مالية"
                    title={payment.amountLabel}
                    titleTo={payment.transferTo}
                    subtitle={payment.customerName}
                    metaItems={[
                      { label: 'مرجع الحوالة', value: payment.referenceLabel },
                      { label: 'السياق', value: payment.contextLabel },
                      { label: 'وقت التسجيل', value: payment.activityAtLabel },
                    ]}
                    aside={<span className="activity-chip">{payment.methodLabel}</span>}
                  />

                  {payment.note ? <p className="record-note">{payment.note}</p> : null}

                  <ActionRow>
                    <Link className="button secondary" to={payment.transferTo}>
                      فتح الحوالة
                    </Link>
                    {payment.customerTo ? (
                      <Link className="button secondary" to={payment.customerTo}>
                        فتح العميل
                      </Link>
                    ) : null}
                  </ActionRow>
                </RecordCard>
              ))}
            </div>
          ) : null}
        </div>

        <div className="dashboard-column">
          <div className="dashboard-subsection-head dashboard-subsection-head--actionable">
            <div>
              <h3>أحدث الحوالات</h3>
              <p>{transfersSummary || 'آخر الحوالات التي دخلت إلى النظام مع الحالة الحالية والرصد المفتوح لكل منها.'}</p>
            </div>
            {onOpenTransfersDrillDown ? (
              <button type="button" className="button secondary" onClick={onOpenTransfersDrillDown}>
                فتح كل الحوالات الحديثة
              </button>
            ) : null}
          </div>

          {loading ? <LoadingState>جار تحميل أحدث الحوالات...</LoadingState> : null}

          {!loading && recentTransfers.length === 0 ? (
            <EmptyState>لا توجد حوالات حديثة لعرضها حاليا.</EmptyState>
          ) : null}

          {recentTransfers.length > 0 ? (
            <div className="record-list dashboard-activity-list">
              {recentTransfers.map((transfer) => (
                <RecordCard key={transfer.id} className="dashboard-activity-card">
                  <RecordHeader
                    eyebrow="حوالة حديثة"
                    title={transfer.referenceLabel}
                    titleTo={transfer.transferTo}
                    subtitle={transfer.customerName}
                    metaItems={[
                      { label: 'تاريخ الإنشاء', value: transfer.createdAtLabel },
                      { label: 'المبلغ النهائي', value: transfer.payableLabel, ltr: true },
                      { label: 'المتبقي', value: transfer.remainingLabel, className: transfer.remainingClassName, ltr: true },
                    ]}
                    aside={<StatusBadge status={transfer.status} />}
                  />

                  <ActionRow>
                    <Link className="button secondary" to={transfer.transferTo}>
                      فتح الحوالة
                    </Link>
                    {transfer.customerTo ? (
                      <Link className="button secondary" to={transfer.customerTo}>
                        فتح العميل
                      </Link>
                    ) : null}
                  </ActionRow>
                </RecordCard>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </SectionCard>
  )
}

export default DashboardRecentActivitySection
