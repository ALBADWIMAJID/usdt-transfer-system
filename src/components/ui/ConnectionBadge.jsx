import useNetworkStatus from '../../hooks/useNetworkStatus.js'

const STATUS_META = {
  offline: {
    detail: 'التحديثات الحية متوقفة',
    label: 'غير متصل',
    tone: 'offline',
  },
  online: {
    detail: 'الاتصال المباشر متاح',
    label: 'متصل',
    tone: 'online',
  },
  unknown: {
    detail: 'جار التحقق من الشبكة',
    label: 'جار التحقق',
    tone: 'unknown',
  },
}

function ConnectionBadge({ className = '' }) {
  const { status } = useNetworkStatus()
  const meta = STATUS_META[status] || STATUS_META.unknown

  return (
    <div
      className={['connection-badge', `connection-badge--${meta.tone}`, className]
        .filter(Boolean)
        .join(' ')}
      aria-live="polite"
      role="status"
    >
      <span className="connection-badge-dot" aria-hidden="true" />
      <span className="connection-badge-copy">
        <strong>{meta.label}</strong>
        <small>{meta.detail}</small>
      </span>
    </div>
  )
}

export default ConnectionBadge
