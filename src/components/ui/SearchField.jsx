import FieldShell from './FieldShell.jsx'

function SearchField({
  id,
  name,
  label,
  value,
  onChange,
  placeholder,
  className = '',
}) {
  return (
    <FieldShell label={label} htmlFor={id} className={className}>
      <input
        id={id}
        name={name}
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
    </FieldShell>
  )
}

export default SearchField
