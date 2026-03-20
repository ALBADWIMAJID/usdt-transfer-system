import { useState } from 'react'
import { Link } from 'react-router-dom'
import EmptyState from '../ui/EmptyState.jsx'
import InlineMessage from '../ui/InlineMessage.jsx'
import LoadingState from '../ui/LoadingState.jsx'
import OfflineSnapshotNotice from '../ui/OfflineSnapshotNotice.jsx'
import PageHeader from '../ui/PageHeader.jsx'
import RetryBlock from '../ui/RetryBlock.jsx'
import StatusBadge from '../ui/StatusBadge.jsx'

const MOBILE_TABS = [
  { key: 'followup', label: 'المتابعة' },
  { key: 'actions', label: 'الإجراءات' },
  { key: 'activity', label: 'النشاط' },
]

const ATTENTION_PREVIEW = 3
const QUEUE_PREVIEW_EACH = 2
const ACTIVITY_PREVIEW = 3

function DashboardMobileLite({
  loading,
  loadDashboard,
  lastUpdatedLabel,
  snapshotState,
  isConfigured,
  loadError,
  headlineCards,
  openDrillDown,
  attentionItems,
  queueItems,
  recentTransfers,
  recentPayments,
  quickActionItem,
  stats,
  buildTransfersQueueHref,
}) {
  const [activeSection, setActiveSection] = useState('followup')

  const partialPreview = queueItems.partial.slice(0, QUEUE_PREVIEW_EACH)
  const openPreview = queueItems.open.slice(0, QUEUE_PREVIEW_EACH)
  const attentionPreview = attentionItems.slice(0, ATTENTION_PREVIEW)
  const paymentsPreview = recentPayments.slice(0, ACTIVITY_PREVIEW)
  const transfersPreview = recentTransfers.slice(0, ACTIVITY_PREVIEW)

  return (
    <div className="stack dashboard-mobile-lite">
      <PageHeader
        className="dashboard-mobile-lite-header"
        title="لوحة التشغيل"
        actions={
          <>
            <button type="button" className="button secondary" onClick={loadDashboard} disabled={loading}>
              {loading ? '…' : 'تحديث'}
            </button>
            <Link className="button primary" to="/transfers/new">
              حوالة جديدة
            </Link>
          </>
        }
      >
        {lastUpdatedLabel ? <p className="dashboard-mobile-lite-updated support-text">{lastUpdatedLabel}</p> : null}
      </PageHeader>

      <div className="dashboard-mobile-lite-status-strip">
        <OfflineSnapshotNotice className="dashboard-mobile-lite-offline" snapshotState={snapshotState} />
        {!isConfigured ? <InlineMessage kind="error">{loadError}</InlineMessage> : null}
        {isConfigured && loadError ? (
          <RetryBlock className="dashboard-mobile-lite-retry" message={loadError} onRetry={loadDashboard} />
        ) : null}
      </div>

      <section className="dashboard-mobile-lite-kpis" aria-label="أهم المؤشرات">
        <div className="dashboard-mobile-lite-kpi-row">
          {headlineCards.map((card) => {
            const classes = ['dashboard-mobile-lite-kpi', card.className].filter(Boolean).join(' ')
            const inner = (
              <>
                <span className="dashboard-mobile-lite-kpi-label">{card.label}</span>
                <strong className={['dashboard-mobile-lite-kpi-value', card.valueClassName].filter(Boolean).join(' ')}>
                  {card.value}
                </strong>
                {card.copy ? <span className="dashboard-mobile-lite-kpi-meta">{card.copy}</span> : null}
              </>
            )

            if (card.onClick) {
              return (
                <button
                  key={card.key || card.label}
                  type="button"
                  className={classes}
                  onClick={card.onClick}
                  aria-label={card.ariaLabel || card.label}
                >
                  {inner}
                </button>
              )
            }

            return (
              <article key={card.key || card.label} className={classes}>
                {inner}
              </article>
            )
          })}
        </div>
      </section>

      <div className="dashboard-mobile-lite-nav-shell">
        <nav className="dashboard-mobile-lite-nav" aria-label="أقسام لوحة التشغيل">
          {MOBILE_TABS.map((tab) => {
            const isActive = activeSection === tab.key

            return (
              <button
                key={tab.key}
                type="button"
                className={['dashboard-mobile-lite-tab', isActive ? 'active' : ''].filter(Boolean).join(' ')}
                aria-pressed={isActive}
                onClick={() => setActiveSection(tab.key)}
              >
                {tab.label}
              </button>
            )
          })}
        </nav>
      </div>

      <section
        className="dashboard-mobile-lite-panel"
        aria-label={MOBILE_TABS.find((t) => t.key === activeSection)?.label || 'لوحة العمل'}
      >
        {activeSection === 'followup' ? (
          <div className="dashboard-mobile-lite-followup">
            {loading ? <LoadingState>جار تحميل المتابعة…</LoadingState> : null}

            {!loading ? (
              <>
                <div className="dashboard-mobile-lite-follow-chips" role="group" aria-label="اختصارات المتابعة">
                  <button type="button" className="dashboard-mobile-lite-chip" onClick={() => openDrillDown('urgentAttention')}>
                    عاجل <span>{attentionItems.length}</span>
                  </button>
                  <button type="button" className="dashboard-mobile-lite-chip" onClick={() => openDrillDown('partial')}>
                    جزئي <span>{stats.partialTransfers ?? '—'}</span>
                  </button>
                  <button type="button" className="dashboard-mobile-lite-chip" onClick={() => openDrillDown('open')}>
                    مفتوح <span>{stats.openTransfers ?? '—'}</span>
                  </button>
                </div>

                <div className="dashboard-mobile-lite-block">
                  <div className="dashboard-mobile-lite-block-head">
                    <h2 className="dashboard-mobile-lite-block-title">أولويات اليوم</h2>
                    <button type="button" className="dashboard-mobile-lite-tertiary" onClick={() => openDrillDown('urgentAttention')}>
                      الكل
                    </button>
                  </div>
                  {attentionPreview.length === 0 ? (
                    <EmptyState>لا تنبيهات عاجلة في العرض الحالي.</EmptyState>
                  ) : (
                    <ul className="dashboard-mobile-lite-list dashboard-mobile-lite-list--grouped">
                      {attentionPreview.map((item) => (
                        <li key={item.id}>
                          <Link className="dashboard-mobile-lite-row" to={item.transferTo}>
                            <span className="dashboard-mobile-lite-row-main">
                              <span className="dashboard-mobile-lite-row-title">{item.referenceLabel}</span>
                              <span className="dashboard-mobile-lite-row-sub">{item.customerName}</span>
                            </span>
                            <span className={['dashboard-mobile-lite-row-meta', item.remainingClassName].filter(Boolean).join(' ')}>
                              {item.remainingLabel}
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {(partialPreview.length > 0 || openPreview.length > 0) && (
                  <div className="dashboard-mobile-lite-block">
                    <div className="dashboard-mobile-lite-block-head">
                      <h2 className="dashboard-mobile-lite-block-title">صف العمل</h2>
                      <Link className="dashboard-mobile-lite-tertiary" to={buildTransfersQueueHref({})}>
                        الصف
                      </Link>
                    </div>
                    {partialPreview.length > 0 ? (
                      <>
                        <p className="dashboard-mobile-lite-subhead">مدفوعة جزئيا</p>
                        <ul className="dashboard-mobile-lite-list dashboard-mobile-lite-list--grouped">
                          {partialPreview.map((item) => (
                            <li key={item.id}>
                              <Link className="dashboard-mobile-lite-row" to={item.transferTo}>
                                <span className="dashboard-mobile-lite-row-main">
                                  <span className="dashboard-mobile-lite-row-title">{item.referenceLabel}</span>
                                  <span className="dashboard-mobile-lite-row-sub">{item.customerName}</span>
                                </span>
                                <span className="dashboard-mobile-lite-row-aside">
                                  <StatusBadge status={item.status} />
                                </span>
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </>
                    ) : null}
                    {openPreview.length > 0 ? (
                      <>
                        <p className="dashboard-mobile-lite-subhead">مفتوحة</p>
                        <ul className="dashboard-mobile-lite-list dashboard-mobile-lite-list--grouped">
                          {openPreview.map((item) => (
                            <li key={item.id}>
                              <Link className="dashboard-mobile-lite-row" to={item.transferTo}>
                                <span className="dashboard-mobile-lite-row-main">
                                  <span className="dashboard-mobile-lite-row-title">{item.referenceLabel}</span>
                                  <span className="dashboard-mobile-lite-row-sub">{item.customerName}</span>
                                </span>
                                <span className="dashboard-mobile-lite-row-aside">
                                  <StatusBadge status={item.status} />
                                </span>
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </>
                    ) : null}
                  </div>
                )}

              </>
            ) : null}
          </div>
        ) : null}

        {activeSection === 'actions' ? (
          <div className="dashboard-mobile-lite-actions">
            <div className="dashboard-mobile-lite-actions-grid">
              <Link className="button primary" to="/transfers/new">
                إنشاء حوالة
              </Link>
              <Link className="button secondary" to="/transfers">
                سجل الحوالات
              </Link>
              <Link className="button secondary" to="/customers">
                ملفات العملاء
              </Link>
              {recentTransfers[0] ? (
                <Link className="button secondary" to={recentTransfers[0].transferTo}>
                  آخر حوالة
                </Link>
              ) : null}
              {quickActionItem ? (
                <Link className="button secondary" to={quickActionItem.transferTo}>
                  أولوية المتابعة
                </Link>
              ) : null}
            </div>
          </div>
        ) : null}

        {activeSection === 'activity' ? (
          <div className="dashboard-mobile-lite-activity">
            {loading ? <LoadingState>جار تحميل النشاط…</LoadingState> : null}
            {!loading ? (
              <>
                <div className="dashboard-mobile-lite-block">
                  <div className="dashboard-mobile-lite-block-head">
                    <h2 className="dashboard-mobile-lite-block-title">آخر المدفوعات</h2>
                    <button type="button" className="dashboard-mobile-lite-tertiary" onClick={() => openDrillDown('recentPayments')}>
                      الكل
                    </button>
                  </div>
                  {paymentsPreview.length === 0 ? (
                    <EmptyState>لا مدفوعات حديثة.</EmptyState>
                  ) : (
                    <ul className="dashboard-mobile-lite-list dashboard-mobile-lite-list--grouped">
                      {paymentsPreview.map((p) => (
                        <li key={p.id}>
                          <Link className="dashboard-mobile-lite-row" to={p.transferTo}>
                            <span className="dashboard-mobile-lite-row-main">
                              <span className="dashboard-mobile-lite-row-title">{p.amountLabel}</span>
                              <span className="dashboard-mobile-lite-row-sub">{p.customerName}</span>
                            </span>
                            <span className="dashboard-mobile-lite-row-aside">{p.activityAtLabel}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="dashboard-mobile-lite-block">
                  <div className="dashboard-mobile-lite-block-head">
                    <h2 className="dashboard-mobile-lite-block-title">أحدث الحوالات</h2>
                    <button type="button" className="dashboard-mobile-lite-tertiary" onClick={() => openDrillDown('recentTransfers')}>
                      الكل
                    </button>
                  </div>
                  {transfersPreview.length === 0 ? (
                    <EmptyState>لا حوالات حديثة.</EmptyState>
                  ) : (
                    <ul className="dashboard-mobile-lite-list dashboard-mobile-lite-list--grouped">
                      {transfersPreview.map((t) => (
                        <li key={t.id}>
                          <Link className="dashboard-mobile-lite-row" to={t.transferTo}>
                            <span className="dashboard-mobile-lite-row-main">
                              <span className="dashboard-mobile-lite-row-title">{t.referenceLabel}</span>
                              <span className="dashboard-mobile-lite-row-sub">{t.customerName}</span>
                            </span>
                            <span className="dashboard-mobile-lite-row-aside">
                              <StatusBadge status={t.status} />
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </>
            ) : null}
          </div>
        ) : null}
      </section>
    </div>
  )
}

export default DashboardMobileLite
