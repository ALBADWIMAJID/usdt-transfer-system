import BrandLogo from './BrandLogo.jsx'

function AppLaunchScreen({
  className = '',
  stageLabel = 'تهيئة مساحة العمل',
  message = 'جار تجهيز مساحة العمل الآن.',
}) {
  return (
    <section
      className={['app-launch-screen', className].filter(Boolean).join(' ')}
      role="status"
      aria-live="polite"
    >
      <div className="app-launch-shell">
        <div className="app-launch-mark-shell">
          <BrandLogo className="app-launch-brand" />
        </div>

        <div className="app-launch-copy">
          <p className="eyebrow app-launch-kicker">{stageLabel}</p>
          <p className="app-launch-message">{message}</p>
        </div>

        <div className="app-launch-progress" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </div>
    </section>
  )
}

export default AppLaunchScreen
