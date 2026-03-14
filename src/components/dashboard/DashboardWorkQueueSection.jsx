import { Link } from 'react-router-dom'
import ActionRow from '../ui/ActionRow.jsx'
import EmptyState from '../ui/EmptyState.jsx'
import LoadingState from '../ui/LoadingState.jsx'
import RecordCard from '../ui/RecordCard.jsx'
import RecordHeader from '../ui/RecordHeader.jsx'
import SectionCard from '../ui/SectionCard.jsx'
import StatusBadge from '../ui/StatusBadge.jsx'

function WorkQueueColumn({
  title,
  description,
  loading,
  items = [],
  emptyText = '',
  actionLabel = '',
  onAction,
}) {
  return (
    <div className="dashboard-column">
      <div className="dashboard-subsection-head dashboard-subsection-head--actionable">
        <div>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
        {onAction ? (
          <button type="button" className="button secondary" onClick={onAction}>
            {actionLabel || 'فتح التفاصيل'}
          </button>
        ) : null}
      </div>

      {loading ? <LoadingState>جار تحميل عناصر هذا المسار...</LoadingState> : null}

      {!loading && items.length === 0 ? <EmptyState>{emptyText}</EmptyState> : null}

      {items.length > 0 ? (
        <div className="record-list dashboard-queue-list">
          {items.map((item) => (
            <RecordCard key={item.id} className="dashboard-queue-card">
              <RecordHeader
                eyebrow={item.eyebrow}
                title={item.referenceLabel}
                titleTo={item.transferTo}
                subtitle={item.customerName}
                metaItems={[
                  { label: 'العمر التشغيلي', value: item.ageLabel },
                  { label: 'تاريخ الإنشاء', value: item.createdAtLabel },
                  { label: 'المبلغ المتبقي', value: item.remainingLabel, className: item.remainingClassName, ltr: true },
                ]}
                aside={
                  <>
                    <StatusBadge status={item.status} />
                    <span className={['queue-chip', item.chipClassName].filter(Boolean).join(' ')}>
                      {item.queueLabel}
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
    </div>
  )
}

function DashboardWorkQueueSection({
  loading,
  partialItems = [],
  openItems = [],
  onOpenPartialDrillDown,
  onOpenOpenDrillDown,
}) {
  return (
    <SectionCard
      title="قائمة العمل المفتوح"
      description="الحوالات التي ما زالت تحتاج تحصيلا أو متابعة تشغيلية مباشرة. الأولوية هنا للحوالات التي لم تُغلق بعد."
      className="dashboard-section"
    >
      <div className="dashboard-columns dashboard-columns--queue">
        <WorkQueueColumn
          title="مدفوعة جزئيا"
          description="أحدث الحوالات التي بدأ عليها التحصيل وما زال فيها رصيد مفتوح."
          loading={loading}
          items={partialItems}
          emptyText="لا توجد حاليا حوالات مدفوعة جزئيا ضمن قائمة العمل المفتوح."
          actionLabel="فتح كل الحوالات الجزئية"
          onAction={onOpenPartialDrillDown}
        />
        <WorkQueueColumn
          title="مفتوحة بانتظار التحصيل"
          description="أحدث الحوالات المفتوحة التي لم يبدأ عليها التحصيل بعد."
          loading={loading}
          items={openItems}
          emptyText="لا توجد حاليا حوالات مفتوحة بانتظار التحصيل."
          actionLabel="فتح كل الحوالات المفتوحة"
          onAction={onOpenOpenDrillDown}
        />
      </div>
    </SectionCard>
  )
}

export default DashboardWorkQueueSection
