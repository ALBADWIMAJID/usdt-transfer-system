import { Link } from 'react-router-dom'
import RecordMetaList from './RecordMetaList.jsx'

function RecordHeader({
  eyebrow,
  title,
  titleTo,
  subtitle,
  subtitleClassName = '',
  metaItems = [],
  aside,
  className = '',
  titleClassName = '',
  children,
}) {
  const titleClasses = [
    'record-title',
    titleTo ? 'record-title-link' : '',
    titleClassName,
  ]
    .filter(Boolean)
    .join(' ')

  const titleContent = <h3 className={titleClasses}>{title}</h3>

  return (
    <div className={['record-header', className].filter(Boolean).join(' ')}>
      <div className="record-header-main">
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        {titleTo ? <Link to={titleTo}>{titleContent}</Link> : titleContent}
        {subtitle ? (
          <p className={['record-muted', subtitleClassName].filter(Boolean).join(' ')}>{subtitle}</p>
        ) : null}
        <RecordMetaList items={metaItems} />
        {children}
      </div>

      {aside ? <div className="record-header-side">{aside}</div> : null}
    </div>
  )
}

export default RecordHeader
