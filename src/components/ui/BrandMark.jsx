import BrandOrbitMark from './BrandOrbitMark.jsx'

function BrandMark({ tone = 'default', size = 'md', className = '' }) {
  return (
    <BrandOrbitMark
      className={[
        'brand-mark-shell',
        `brand-mark-shell--${tone}`,
        `brand-mark-shell--${size}`,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      size={size}
      title=""
    />
  )
}

export default BrandMark
