import SectionActions from './SectionActions.jsx'

function SectionCard({ title, description, actions, className = '', children }) {
  const hasHeader = title || description || actions

  return (
    <section className={['page-card', className].filter(Boolean).join(' ')}>
      {hasHeader ? (
        <div className="section-card-head">
          <div className="section-card-copy">
            {title ? <h2>{title}</h2> : null}
            {description ? <p>{description}</p> : null}
          </div>
          {actions ? <SectionActions>{actions}</SectionActions> : null}
        </div>
      ) : null}
      {children}
    </section>
  )
}

export default SectionCard
