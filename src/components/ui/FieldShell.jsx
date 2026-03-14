function FieldShell({ label, htmlFor, helpText, errorText, className = '', children }) {
  return (
    <div className={['field', className].filter(Boolean).join(' ')}>
      {label ? <label htmlFor={htmlFor}>{label}</label> : null}
      {children}
      {errorText ? <p className="support-text text-danger">{errorText}</p> : null}
      {helpText ? <p className="support-text">{helpText}</p> : null}
    </div>
  )
}

export default FieldShell
