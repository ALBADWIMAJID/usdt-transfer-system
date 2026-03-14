import { Link } from 'react-router-dom'

function RecordCard({ to = '', className = '', children }) {
  const content = <article className={['record-card', className].filter(Boolean).join(' ')}>{children}</article>

  if (to) {
    return (
      <Link to={to} className="record-link">
        {content}
      </Link>
    )
  }

  return content
}

export default RecordCard
