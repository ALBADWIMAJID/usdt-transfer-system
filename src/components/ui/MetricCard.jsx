function MetricCard({
  label,
  value,
  copy,
  tone = 'default',
  valueClassName = '',
  className = '',
  onClick,
  ariaLabel = '',
}) {
  const resolvedTone = tone || 'default'
  const classes = [
    'stat-card',
    'metric-card',
    onClick ? 'card-button-shell' : '',
    resolvedTone !== 'default' ? `metric-card--${resolvedTone}` : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  const content = (
    <>
      {label ? <span className="stat-label">{label}</span> : null}
      <strong className={['stat-value', valueClassName].filter(Boolean).join(' ')}>{value}</strong>
      {copy ? <p className="stat-copy">{copy}</p> : null}
    </>
  )

  if (onClick) {
    return (
      <button type="button" className={classes} onClick={onClick} aria-label={ariaLabel || label}>
        {content}
      </button>
    )
  }

  return (
    <article className={classes}>
      {content}
    </article>
  )
}

export default MetricCard
