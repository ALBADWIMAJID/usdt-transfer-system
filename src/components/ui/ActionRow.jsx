function ActionRow({ as = 'div', className = '', children, ...props }) {
  const Element = as

  return (
    <Element className={['inline-actions', className].filter(Boolean).join(' ')} {...props}>
      {children}
    </Element>
  )
}

export default ActionRow
