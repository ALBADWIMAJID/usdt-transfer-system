function SummaryRow({
  label,
  value,
  secondary,
  className = '',
  valueClassName = '',
}) {
  return (
    <div className={['summary-row', className].filter(Boolean).join(' ')}>
      <span>{label}</span>
      <div className="summary-row-values">
        <strong className={valueClassName}>{value}</strong>
        {secondary ? <small>{secondary}</small> : null}
      </div>
    </div>
  )
}

export default SummaryRow
