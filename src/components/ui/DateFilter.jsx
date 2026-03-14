import FieldShell from './FieldShell.jsx'

function DateFilter({
  id,
  name,
  label,
  value,
  onChange,
  className = '',
}) {
  return (
    <FieldShell label={label} htmlFor={id} className={className}>
      <input
        id={id}
        name={name}
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </FieldShell>
  )
}

export default DateFilter
