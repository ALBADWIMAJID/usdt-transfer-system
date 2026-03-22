import { useId } from 'react'

/**
 * Simplified monogram mark: "EQ" letterform with a calm orbit ring.
 * Designed to read cleanly at 20px–96px across all placements.
 */
function BrandOrbitMark({ className = '', size = 'md', animated = false, title = 'EDUQUEST' }) {
  const gradId = useId().replace(/:/g, '')
  const inkId = useId().replace(/:/g, '')
  const haloId = useId().replace(/:/g, '')

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
      {/* Outer halo ring — subtle, not toy-like */}
      <span className="brand-orbit-mark__ring" aria-hidden="true" />

      {/* Accent orbit dot */}
      <span className="brand-orbit-mark__spark brand-orbit-mark__spark--one" aria-hidden="true" />

      <svg
        className="brand-orbit-mark__svg"
        viewBox="0 0 64 64"
        fill="none"
        aria-hidden="true"
      >
        <defs>
          {/* Dark teal-to-navy fill for the badge */}
          <linearGradient id={gradId} x1="12" y1="10" x2="52" y2="54" gradientUnits="userSpaceOnUse">
            <stop stopColor="#11293b" />
            <stop offset="1" stopColor="#0d7a72" />
          </linearGradient>
          {/* White ink for strokes */}
          <linearGradient id={inkId} x1="18" y1="16" x2="46" y2="48" gradientUnits="userSpaceOnUse">
            <stop stopColor="rgba(255,255,255,0.97)" />
            <stop offset="1" stopColor="rgba(230,243,255,0.80)" />
          </linearGradient>
          {/* Subtle inner frame */}
          <linearGradient id={haloId} x1="12" y1="12" x2="52" y2="52" gradientUnits="userSpaceOnUse">
            <stop stopColor="rgba(255,255,255,0.20)" />
            <stop offset="1" stopColor="rgba(255,255,255,0.02)" />
          </linearGradient>
        </defs>

        {/* Badge background */}
        <rect x="9" y="9" width="46" height="46" rx="15" fill={`url(#${gradId})`} />
        {/* Inner edge highlight */}
        <rect x="10" y="10" width="44" height="44" rx="14" fill="none" stroke={`url(#${haloId})`} strokeWidth="1.5" />

        {/*
          "EQ" monogram strokes:
          E  — left vertical + three horizontals
          Q  — circle + tail
        */}

        {/* E — vertical stem */}
        <path d="M18 20v24" stroke={`url(#${inkId})`} strokeWidth="4.2" strokeLinecap="round" />
        {/* E — top bar */}
        <path d="M18.5 20.5h10" stroke={`url(#${inkId})`} strokeWidth="4.2" strokeLinecap="round" />
        {/* E — mid bar (slightly shorter) */}
        <path d="M18.5 32h8" stroke={`url(#${inkId})`} strokeWidth="4.2" strokeLinecap="round" />
        {/* E — bottom bar */}
        <path d="M18.5 43.5h10" stroke={`url(#${inkId})`} strokeWidth="4.2" strokeLinecap="round" />

        {/* Q — circle */}
        <circle cx="42.5" cy="31" r="8.5" stroke={`url(#${inkId})`} strokeWidth="4" />
        {/* Q — tail stroke */}
        <path d="M47.5 37.5L52.5 44" stroke={`url(#${inkId})`} strokeWidth="4" strokeLinecap="round" />

        {/* Accent dot — brand gold */}
        <circle cx="47" cy="18" r="3.2" fill="rgba(200,154,67,0.92)" />
      </svg>
    </div>
  )
}

export default BrandOrbitMark
