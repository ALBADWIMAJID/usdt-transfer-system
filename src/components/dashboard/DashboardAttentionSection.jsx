import { Link } from 'react-router-dom'
import ActionRow from '../ui/ActionRow.jsx'
import EmptyState from '../ui/EmptyState.jsx'
import InfoCard from '../ui/InfoCard.jsx'
import InfoGrid from '../ui/InfoGrid.jsx'
import LoadingState from '../ui/LoadingState.jsx'
import RecordCard from '../ui/RecordCard.jsx'
import RecordHeader from '../ui/RecordHeader.jsx'
import SectionCard from '../ui/SectionCard.jsx'
import StatusBadge from '../ui/StatusBadge.jsx'

function DashboardAttentionSection({
  loading,
  summaryCards = [],
  attentionItems = [],
  onOpenAttentionPanel,
}) {
  return (
    <SectionCard
      title="تنبيهات مالية عاجلة"
      description="الأولوية هنا للحوالات ذات المخاطر المالية الأعلى: فوق المطلوب أو غير المحسومة منذ مدة وتحتاج متابعة اليوم."
      className="dashboard-section dashboard-section--attention"
      actions={
        onOpenAttentionPanel ? (
          <button type="button" className="button secondary" onClick={onOpenAttentionPanel}>
            فتح لوحة التنبيهات
          </button>
        ) : null
      }
    >
      <InfoGrid className="dashboard-attention-grid">
        {summaryCards.map((card) => (
          <InfoCard
            key={card.key || card.title}
            title={card.title}
            value={card.value}
            className={card.className}
            valueClassName={card.valueClassName}
            onClick={card.onClick}
            ariaLabel={card.ariaLabel}
          >
            {card.copy ? <p className="info-card-value">{card.copy}</p> : null}
          </InfoCard>
        ))}
      </InfoGrid>

      {loading ? <LoadingState>جار تحميل التنبيهات المالية العاجلة...</LoadingState> : null}

      {!loading && attentionItems.length === 0 ? (
        <EmptyState>لا توجد حاليا تنبيهات مالية عاجلة. لا يظهر في السجل الحالي ما يستدعي تدخلا فوريا.</EmptyState>
      ) : null}

      {attentionItems.length > 0 ? (
        <div className="record-list dashboard-attention-list">
          {attentionItems.map((item) => (
            <RecordCard
              key={item.id}
              className={['dashboard-attention-card', item.className].filter(Boolean).join(' ')}
            >
              <RecordHeader
                eyebrow={item.eyebrow}
                title={item.referenceLabel}
                titleTo={item.transferTo}
                subtitle={item.customerName}
                metaItems={[
                  { label: 'تاريخ الإنشاء', value: item.createdAtLabel },
                  { label: 'المبلغ النهائي', value: item.payableLabel, ltr: true },
                  { label: 'المتبقي', value: item.remainingLabel, className: item.remainingClassName, ltr: true },
                ]}
                aside={
                  <>
                    <StatusBadge status={item.status} />
                    <span className={['attention-chip', item.chipClassName].filter(Boolean).join(' ')}>
                      {item.attentionLabel}
                    </span>
                  </>
                }
              />

              <p className="record-note">{item.note}</p>

              <ActionRow>
                <Link className="button secondary" to={item.transferTo}>
                  فتح الحوالة
                </Link>
                {item.customerTo ? (
                  <Link className="button secondary" to={item.customerTo}>
                    فتح العميل
                  </Link>
                ) : null}
              </ActionRow>
            </RecordCard>
          ))}
        </div>
      ) : null}
    </SectionCard>
  )
}

export default DashboardAttentionSection
