import { useId } from 'react'

function BrandOrbitMark({ className = '', size = 'md', animated = false, title = 'Eduquest brand mark' }) {
  const gradientId = useId().replace(/:/g, '')
  const accentId = useId().replace(/:/g, '')
  const frameId = useId().replace(/:/g, '')

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
      <span className="brand-orbit-mark__ring" aria-hidden="true" />
      <span className="brand-orbit-mark__ring brand-orbit-mark__ring--inner" aria-hidden="true" />
      <span className="brand-orbit-mark__orbit" aria-hidden="true" />
      <span className="brand-orbit-mark__spark brand-orbit-mark__spark--one" aria-hidden="true" />
      <span className="brand-orbit-mark__spark brand-orbit-mark__spark--two" aria-hidden="true" />

      <svg className="brand-orbit-mark__svg" viewBox="0 0 64 64" fill="none" aria-hidden="true">
        <defs>
          <linearGradient id={gradientId} x1="14" y1="12" x2="50" y2="52" gradientUnits="userSpaceOnUse">
            <stop stopColor="rgba(17, 41, 59, 1)" />
            <stop offset="1" stopColor="rgba(13, 122, 114, 1)" />
          </linearGradient>
          <linearGradient id={accentId} x1="20" y1="18" x2="48" y2="44" gradientUnits="userSpaceOnUse">
            <stop stopColor="rgba(255, 255, 255, 0.98)" />
            <stop offset="1" stopColor="rgba(237, 243, 255, 0.82)" />
          </linearGradient>
          <linearGradient id={frameId} x1="16" y1="16" x2="48" y2="48" gradientUnits="userSpaceOnUse">
            <stop stopColor="rgba(255,255,255,0.18)" />
            <stop offset="1" stopColor="rgba(255,255,255,0.02)" />
          </linearGradient>
        </defs>

        <rect x="10" y="10" width="44" height="44" rx="14" fill={`url(#${gradientId})`} />
        <rect x="11" y="11" width="42" height="42" rx="13" stroke={`url(#${frameId})`} strokeWidth="1.2" />
        <rect x="16" y="16" width="32" height="32" rx="10" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />

        <path
          d="M21 21.2v21.6"
          stroke={`url(#${accentId})`}
          strokeWidth="4.5"
          strokeLinecap="round"
        />
        <path
          d="M21.2 21.8h13"
          stroke={`url(#${accentId})`}
          strokeWidth="4.5"
          strokeLinecap="round"
        />
        <path
          d="M21.2 32h10"
          stroke={`url(#${accentId})`}
          strokeWidth="4.5"
          strokeLinecap="round"
        />
        <path
          d="M21.2 43h13"
          stroke={`url(#${accentId})`}
          strokeWidth="4.5"
          strokeLinecap="round"
        />
        <path
          d="M39.8 21.3a10.4 10.4 0 1 0 0 20.8 10.4 10.4 0 0 0 0-20.8Z"
          stroke={`url(#${accentId})`}
          strokeWidth="4.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M43.5 39.6 48 44"
          stroke={`url(#${accentId})`}
          strokeWidth="4.5"
          strokeLinecap="round"
        />
        <path
          d="M44.8 19.5c2 0 3.6 1.5 3.9 3.4"
          stroke="rgba(200, 154, 67, 0.96)"
          strokeWidth="2.1"
          strokeLinecap="round"
        />
      </svg>
    </div>
  )
}

export default BrandOrbitMark
