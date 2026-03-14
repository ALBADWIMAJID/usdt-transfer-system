import { Link } from 'react-router-dom'
import ActionRow from '../ui/ActionRow.jsx'
import InfoCard from '../ui/InfoCard.jsx'
import InfoGrid from '../ui/InfoGrid.jsx'
import SectionCard from '../ui/SectionCard.jsx'

function DashboardQuickActions({ latestTransfer, nextActionItem }) {
  return (
    <SectionCard
      title="إجراءات سريعة"
      description="اختصارات عملية للانتقال السريع إلى أهم الخطوات التالية في يوم العمل الحالي."
      className="dashboard-section"
    >
      <ActionRow className="dashboard-quick-actions">
        <Link className="button primary" to="/transfers/new">
          إنشاء حوالة جديدة
        </Link>
        <Link className="button secondary" to="/transfers">
          فتح سجل الحوالات
        </Link>
        <Link className="button secondary" to="/customers">
          فتح ملفات العملاء
        </Link>
        {latestTransfer ? (
          <Link className="button secondary" to={latestTransfer.transferTo}>
            فتح آخر حوالة
          </Link>
        ) : null}
        {nextActionItem ? (
          <Link className="button secondary" to={nextActionItem.transferTo}>
            فتح أولوية المتابعة
          </Link>
        ) : null}
      </ActionRow>

      {latestTransfer || nextActionItem ? (
        <InfoGrid className="dashboard-quick-grid">
          {latestTransfer ? (
            <InfoCard
              title="آخر حوالة مسجلة"
              value={latestTransfer.referenceLabel}
              className="info-card--accent"
              valueClassName="info-card-value--metric"
            >
              <p className="info-card-value">{latestTransfer.customerName}</p>
              <p className="info-card-value">{latestTransfer.createdAtLabel}</p>
            </InfoCard>
          ) : null}

          {nextActionItem ? (
            <InfoCard
              title="الأولوية التالية"
              value={nextActionItem.referenceLabel}
              className={nextActionItem.cardClassName}
              valueClassName={['info-card-value--metric', nextActionItem.valueClassName].filter(Boolean).join(' ')}
            >
              <p className="info-card-value">{nextActionItem.customerName}</p>
              <p className="info-card-value">{nextActionItem.recommendation}</p>
            </InfoCard>
          ) : null}
        </InfoGrid>
      ) : null}
    </SectionCard>
  )
}

export default DashboardQuickActions
