function EmptyState({ className = '', children }) {
  return <div className={['empty-state', className].filter(Boolean).join(' ')}>{children}</div>
}

export default EmptyState
