import { branding } from '../../config/branding.js'

function BrandLogo({ className = '', variant = 'default' }) {
  const assetSource = variant === 'print' ? branding.assets.printLogo : branding.assets.logo

  return (
    <span className={['brand-logo-plate', `brand-logo-plate--${variant}`, className].filter(Boolean).join(' ')}>
      <img
        className={['brand-logo-image', `brand-logo-image--${variant}`].filter(Boolean).join(' ')}
        src={assetSource}
        alt={`شعار ${branding.systemName}`}
        loading="eager"
        decoding="async"
      />
    </span>
  )
}

export default BrandLogo
