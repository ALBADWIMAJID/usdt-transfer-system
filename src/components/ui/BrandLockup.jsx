import { branding } from '../../config/branding.js'
import BrandMark from './BrandMark.jsx'

function BrandLockup({
  tone = 'default',
  size = 'md',
  showOffice = true,
  showTagline = true,
  className = '',
}) {
  return (
    <div
      className={['brand-lockup', `brand-lockup--${tone}`, `brand-lockup--${size}`, className]
        .filter(Boolean)
        .join(' ')}
    >
      <BrandMark tone={tone} size={size} />

      <div className="brand-lockup-copy">
        {showOffice ? <p className="brand-office">{branding.officeName}</p> : null}
        <strong className="brand-system-name">{branding.systemName}</strong>
        {showTagline ? <p className="brand-tagline">{branding.tagline}</p> : null}
      </div>
    </div>
  )
}

export default BrandLockup
