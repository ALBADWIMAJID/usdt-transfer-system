import { branding } from '../../config/branding.js'
import BrandOrbitMark from './BrandOrbitMark.jsx'

function AppLaunchScreen({
  className = '',
  title = branding.shortName || branding.systemName,
  stageLabel = 'بدء التشغيل',
  message = 'جار تجهيز مساحة العمل الآمنة.',
  detail = branding.systemName,
}) {
  return (
    <section
      className={['app-launch-screen', className].filter(Boolean).join(' ')}
      role="status"
      aria-live="polite"
    >
      <div className="app-launch-shell">
        <div className="app-launch-mark-shell">
          <BrandOrbitMark size="lg" animated className="app-launch-mark" />
        </div>

        <div className="app-launch-copy">
          <p className="eyebrow app-launch-kicker">{stageLabel}</p>
          <h1>{title}</h1>
          <p className="app-launch-message">{message}</p>
          {detail ? <p className="app-launch-detail">{detail}</p> : null}
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
