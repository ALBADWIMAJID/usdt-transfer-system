import FieldShell from './FieldShell.jsx'

function SelectFilter({
  id,
  name,
  label,
  value,
  onChange,
  options,
  className = '',
}) {
  return (
    <FieldShell label={label} htmlFor={id} className={className}>
      <select
        id={id}
        name={name}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </FieldShell>
  )
}

export default SelectFilter
