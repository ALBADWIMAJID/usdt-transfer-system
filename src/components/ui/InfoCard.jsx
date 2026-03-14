function InfoCard({
  title,
  value,
  className = '',
  valueClassName = '',
  children,
  onClick,
  ariaLabel = '',
}) {
  const classes = ['info-card', onClick ? 'card-button-shell' : '', className]
    .filter(Boolean)
    .join(' ')

  const content = (
    <>
      {title ? <strong className="info-card-title">{title}</strong> : null}
      {value !== undefined && value !== null ? (
        <p className={['info-card-value', valueClassName].filter(Boolean).join(' ')}>{value}</p>
      ) : null}
      {children}
    </>
  )

  if (onClick) {
    return (
      <button type="button" className={classes} onClick={onClick} aria-label={ariaLabel || title}>
        {content}
      </button>
    )
  }

  return <article className={classes}>{content}</article>
}

export default InfoCard
