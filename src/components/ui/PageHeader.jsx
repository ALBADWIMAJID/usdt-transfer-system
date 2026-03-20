import PageActions from './PageActions.jsx'

function PageHeader({ eyebrow, title, description, actions, className = '', children }) {
  return (
    <section className={['page-hero', className].filter(Boolean).join(' ')}>
      {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
      {title ? <h1>{title}</h1> : null}
      {description ? <p className="page-hero-description">{description}</p> : null}
      {actions ? <PageActions>{actions}</PageActions> : null}
      {children}
    </section>
  )
}

export default PageHeader
