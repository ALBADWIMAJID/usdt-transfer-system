function RecordMeta({
  label,
  value,
  className = '',
  valueClassName = '',
  ltr = false,
  as = 'p',
}) {
  const Element = as

  return (
    <Element className={['record-muted', ltr ? 'ltr' : '', className].filter(Boolean).join(' ')}>
      {label ? <span className="record-meta-label">{label}: </span> : null}
      <span className={valueClassName}>{value}</span>
    </Element>
  )
}

export default RecordMeta
