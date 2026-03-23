import { getTransferStatusMeta } from '../../lib/transfer-ui.js'

function StatusBadge({ status, className = '' }) {
  const meta = getTransferStatusMeta(status)

  return (
    <span className={['status-badge', className].filter(Boolean).join(' ')} style={meta.style}>
      {meta.label}
    </span>
  )
}

export default StatusBadge
