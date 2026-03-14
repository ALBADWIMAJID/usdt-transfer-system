function BrandMark({ tone = 'default', size = 'md', className = '' }) {
  return (
    <span
      className={['brand-mark-shell', `brand-mark-shell--${tone}`, `brand-mark-shell--${size}`, className]
        .filter(Boolean)
        .join(' ')}
      aria-hidden="true"
    >
      <svg className="brand-mark-svg" viewBox="0 0 64 64" fill="none">
        <rect className="brand-mark-panel" x="8" y="8" width="48" height="48" rx="16" />
        <path className="brand-mark-line" d="M19 24h20" />
        <path className="brand-mark-line" d="m33 18 8 6-8 6" />
        <path className="brand-mark-line brand-mark-line--accent" d="M45 40H25" />
        <path className="brand-mark-line brand-mark-line--accent" d="m31 34-8 6 8 6" />
        <circle className="brand-mark-dot" cx="20" cy="18" r="3" />
      </svg>
    </span>
  )
}

export default BrandMark
