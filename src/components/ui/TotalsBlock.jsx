function TotalsBlock({ as = 'div', className = '', children, ...props }) {
  const Element = as

  return (
    <Element className={['stats-grid', className].filter(Boolean).join(' ')} {...props}>
      {children}
    </Element>
  )
}

export default TotalsBlock
