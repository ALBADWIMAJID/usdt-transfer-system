function LoadingState({ children, inline = false, className = '' }) {
  const classes = [
    inline ? 'support-text' : 'loading-state',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return <p className={classes}>{children}</p>
}

export default LoadingState
