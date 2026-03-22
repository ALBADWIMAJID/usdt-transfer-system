import { branding } from '../../config/branding.js'

function shouldShowOfficeLine(showOffice) {
  if (!showOffice || !branding.officeName) {
    return false
  }

  return branding.officeName.trim().toLowerCase() !== branding.systemName.trim().toLowerCase()
}

function BrandLockup({
  tone = 'default',
  size = 'md',
  showOffice = true,
  showTagline = true,
  className = '',
}) {
  const showOfficeLine = shouldShowOfficeLine(showOffice)
  const shouldRenderCopy = showOfficeLine || showTagline

  return (
    <div
      className={['brand-lockup', `brand-lockup--${tone}`, `brand-lockup--${size}`, className]
        .filter(Boolean)
        .join(' ')}
    >
      <img
        className="brand-lockup-image"
        src={branding.assets.logo}
        alt={branding.systemName}
        draggable="false"
        loading="eager"
        decoding="async"
      />

      {shouldRenderCopy ? (
        <div className="brand-lockup-copy">
          {showOfficeLine ? <p className="brand-office">{branding.officeName}</p> : null}
          {showTagline ? <p className="brand-tagline">{branding.tagline}</p> : null}
        </div>
      ) : null}
    </div>
  )
}

export default BrandLockup
