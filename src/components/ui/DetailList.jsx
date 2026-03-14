import SummaryRow from './SummaryRow.jsx'

function DetailList({ rows = [], className = '', rowClassName = '' }) {
  return (
    <div className={['detail-list', className].filter(Boolean).join(' ')}>
      {rows.map((row, index) => (
        <SummaryRow
          key={row.key || row.label || index}
          label={row.label}
          value={row.value}
          secondary={row.secondary}
          className={row.className || rowClassName}
          valueClassName={row.valueClassName}
        />
      ))}
    </div>
  )
}

export default DetailList
