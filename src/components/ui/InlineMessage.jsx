function InlineMessage({ kind = 'info', className = '', children }) {
  if (!children) {
    return null
  }

  return <div className={['status-banner', kind, className].filter(Boolean).join(' ')}>{children}</div>
}

export default InlineMessage
