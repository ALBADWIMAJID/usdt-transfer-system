import { branding } from '../../config/branding.js'
import BrandOrbitMark from './BrandOrbitMark.jsx'

function BrandLogo({ className = '', variant = 'default' }) {
  const isPrint = variant === 'print'
  const markSize = isPrint ? 'sm' : variant === 'hero' ? 'md' : 'sm'

  return (
    <span className={['brand-logo-plate', `brand-logo-plate--${variant}`, className].filter(Boolean).join(' ')}>
      <span className={['brand-logo-lockup', `brand-logo-lockup--${variant}`].filter(Boolean).join(' ')}>
        <BrandOrbitMark
          className={['brand-logo-mark', `brand-logo-mark--${variant}`].filter(Boolean).join(' ')}
          size={markSize}
          title=""
        />
        <span className={['brand-logo-wordmark', `brand-logo-wordmark--${variant}`].filter(Boolean).join(' ')}>
          <strong>{branding.systemName}</strong>
          <small>{isPrint ? 'Financial Operations Statement' : 'Financial Operations System'}</small>
        </span>
      </span>
    </span>
  )
}

export default BrandLogo
