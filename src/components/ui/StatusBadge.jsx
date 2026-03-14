import { getTransferStatusMeta } from '../../lib/transfer-ui.js'

function StatusBadge({ status, className = '' }) {
  const meta = getTransferStatusMeta(status)

  return (
    <span className={className} style={meta.style}>
      {meta.label}
    </span>
  )
}

export default StatusBadge
