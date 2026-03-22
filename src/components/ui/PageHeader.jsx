import PageActions from './PageActions.jsx'

function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className = '',
  children,
  showDescriptionOnMobile = false,
}) {
  return (
    <section
      className={[
        'page-hero',
        'page-hero--compact',
        actions ? 'page-hero--has-actions' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="page-hero-main">
        <div className="page-hero-copy">
          {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
          {title ? <h1>{title}</h1> : null}
          {description ? (
            <p
              className={[
                'page-hero-description',
                showDescriptionOnMobile ? 'page-hero-description--mobile-visible' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {description}
            </p>
          ) : null}
        </div>

        {actions ? <PageActions className="page-hero-actions-slot">{actions}</PageActions> : null}
      </div>

      {children}
    </section>
  )
}

export default PageHeader
