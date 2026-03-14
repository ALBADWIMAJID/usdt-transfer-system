function InfoGrid({ as = 'div', className = '', children, ...props }) {
  const Element = as

  return (
    <Element className={['info-grid', className].filter(Boolean).join(' ')} {...props}>
      {children}
    </Element>
  )
}

export default InfoGrid
