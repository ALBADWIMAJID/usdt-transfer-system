import { branding } from '../../config/branding.js'

function BrandOrbitMark({ className = '', size = 'md', animated = false, title = branding.systemName }) {
  return (
    <div
      className={[
        'brand-orbit-mark',
        `brand-orbit-mark--${size}`,
        animated ? 'brand-orbit-mark--animated' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      aria-hidden={title ? undefined : true}
      aria-label={title || undefined}
      role={title ? 'img' : undefined}
    >
      <img
        className="brand-orbit-mark__image"
        src={branding.assets.mark}
        alt=""
        draggable="false"
        loading="eager"
        decoding="async"
      />
    </div>
  )
}

export default BrandOrbitMark
