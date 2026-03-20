import { branding } from '../../config/branding.js'

function BrandMark({ tone = 'default', size = 'md', className = '' }) {
  return (
    <span
      className={[
        'brand-mark-shell',
        'brand-mark-shell--asset',
        `brand-mark-shell--${tone}`,
        `brand-mark-shell--${size}`,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      aria-hidden="true"
    >
      <img className="brand-mark-image" src={branding.assets.mark} alt="" loading="eager" decoding="async" />
    </span>
  )
}

export default BrandMark
