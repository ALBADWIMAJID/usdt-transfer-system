import FieldShell from './FieldShell.jsx'

function ReadonlyField({ id, label, value, placeholder, helpText, className = '', inputClassName = '' }) {
  return (
    <FieldShell label={label} htmlFor={id} helpText={helpText} className={className}>
      <input
        id={id}
        type="text"
        value={value}
        readOnly
        placeholder={placeholder}
        className={inputClassName}
      />
    </FieldShell>
  )
}

export default ReadonlyField
