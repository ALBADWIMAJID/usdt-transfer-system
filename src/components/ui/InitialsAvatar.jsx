function getInitials(label = '', fallback = '--') {
  const normalizedLabel = String(label || '')
    .trim()
    .replace(/[_-]+/g, ' ')

  if (!normalizedLabel) {
    return fallback
  }

  const parts = normalizedLabel.split(/\s+/).filter(Boolean)

  if (parts.length === 1) {
    return Array.from(parts[0]).slice(0, 2).join('').toUpperCase()
  }

  return parts
    .slice(0, 2)
    .map((part) => Array.from(part)[0] || '')
    .join('')
    .toUpperCase()
}

function InitialsAvatar({ label = '', fallback = '--', className = '' }) {
  return (
    <span className={['identity-avatar', className].filter(Boolean).join(' ')} aria-hidden="true">
      <span className="identity-avatar__value">{getInitials(label, fallback)}</span>
    </span>
  )
}

export default InitialsAvatar
