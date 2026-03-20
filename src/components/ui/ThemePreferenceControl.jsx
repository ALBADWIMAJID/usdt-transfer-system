import { useId } from 'react'
import { useThemePreference } from '../../context/theme-preference-context.js'

const OPTIONS = [
  { mode: 'light', label: 'فاتح' },
  { mode: 'dark', label: 'داكن' },
  { mode: 'auto', label: 'تلقائي' },
]

function ThemePreferenceControl({ className = '' }) {
  const headingId = useId()
  const { mode, setMode } = useThemePreference()

  return (
    <div className={`theme-preference${className ? ` ${className}` : ''}`.trim()}>
      <p className="theme-preference-label" id={headingId}>
        المظهر
      </p>
      <div
        className="theme-preference-segment"
        role="group"
        aria-labelledby={headingId}
      >
        {OPTIONS.map(({ mode: value, label }) => (
          <button
            key={value}
            type="button"
            className={mode === value ? 'active' : ''}
            aria-pressed={mode === value}
            onClick={() => setMode(value)}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}

export default ThemePreferenceControl
