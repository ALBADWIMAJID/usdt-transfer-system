import useNetworkStatus from '../../hooks/useNetworkStatus.js'
import { getSnapshotFreshnessMeta } from '../../lib/offline/freshness.js'
import InlineMessage from './InlineMessage.jsx'

function OfflineSnapshotNotice({ className = '', snapshotState }) {
  const { isOffline } = useNetworkStatus()

  if (!snapshotState?.hasSnapshot) {
    return null
  }

  const freshnessMeta = getSnapshotFreshnessMeta(snapshotState.savedAt)
  const isFromCache = Boolean(snapshotState.isFromCache)
  const title = isFromCache
    ? 'يتم عرض نسخة محفوظة محليا'
    : 'البيانات الحالية مباشرة'
  const description = isFromCache
    ? isOffline
      ? 'التحديثات الحية غير متاحة حاليا. استخدم هذه الشاشة كمرجع تشغيلي إلى أن يعود الاتصال.'
      : 'تم الرجوع إلى آخر نسخة محلية محفوظة لهذه الشاشة. قد لا تعكس هذه البيانات أحدث حالة على الخادم.'
    : 'هذه الشاشة تعمل على البيانات المباشرة حاليا، وتم حفظ نسخة محلية للقراءة عند انقطاع الاتصال.'
  const bannerKind = isFromCache || freshnessMeta.isStale ? 'warning' : 'info'
  const metaToneClass = `offline-snapshot-chip--${freshnessMeta.tone}`

  return (
    <InlineMessage kind={bannerKind} className={className}>
      <div className="offline-snapshot-notice">
        <div className="offline-snapshot-copy">
          <strong>{title}</strong>
          <p>{description}</p>
        </div>

        <div className="offline-snapshot-meta" aria-label="حالة الحفظ المحلي">
          <span
            className={[
              'offline-snapshot-chip',
              isFromCache ? 'offline-snapshot-chip--warning' : 'offline-snapshot-chip--info',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {isFromCache ? 'محفوظ محليا' : 'مباشر الآن'}
          </span>

          <span className={['offline-snapshot-chip', metaToneClass].filter(Boolean).join(' ')}>
            {freshnessMeta.toneLabel}
          </span>

          {freshnessMeta.ageLabel ? (
            <span className="offline-snapshot-meta-text">آخر حفظ محلي: {freshnessMeta.ageLabel}</span>
          ) : null}

          {freshnessMeta.savedAtLabel ? (
            <span className="offline-snapshot-meta-text">وقت الحفظ: {freshnessMeta.savedAtLabel}</span>
          ) : null}
        </div>

        <p className="offline-snapshot-footnote">{freshnessMeta.description}</p>
      </div>
    </InlineMessage>
  )
}

export default OfflineSnapshotNotice
