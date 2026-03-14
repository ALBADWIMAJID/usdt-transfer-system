function SectionActions({ as = 'div', className = '', children, ...props }) {
  const Element = as

  return (
    <Element className={['section-card-actions', className].filter(Boolean).join(' ')} {...props}>
      {children}
    </Element>
  )
}

export default SectionActions
