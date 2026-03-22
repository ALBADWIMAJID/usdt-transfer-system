import BrandOrbitMark from './BrandOrbitMark.jsx'

function EmptyState({ className = '', children }) {
  return (
    <div className={['empty-state', className].filter(Boolean).join(' ')}>
      <div className="empty-state-illustration" aria-hidden="true">
        <BrandOrbitMark size="sm" className="empty-state-mark" />
      </div>
      <div className="empty-state-copy">{children}</div>
    </div>
  )
}

export default EmptyState
