import { useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { branding } from '../config/branding.js'
import BrandLogo from '../components/ui/BrandLogo.jsx'
import ThemePreferenceControl from '../components/ui/ThemePreferenceControl.jsx'
import { useAuth } from '../context/auth-context.js'

function LoginPage() {
  const location = useLocation()
  const { configError, isConfigured, loading, signInWithPassword, user } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const redirectTo = location.state?.from?.pathname || '/dashboard'

  if (!loading && user) {
    return <Navigate replace to={redirectTo} />
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setErrorMessage('')
    setSubmitting(true)

    const { error } = await signInWithPassword({ email, password })

    if (error) {
      setErrorMessage(error.message)
      setSubmitting(false)
      return
    }

    setSubmitting(false)
  }

  return (
    <div className="auth-screen">
      <section className="auth-card">
        <div className="auth-brand-panel">
          <BrandLogo variant="hero" className="auth-brand-logo" />
          <div className="auth-brand-copy">
            <p className="eyebrow">{branding.systemName}</p>
            <h1>تسجيل الدخول</h1>
            <p className="auth-copy">
              ادخل باستخدام بيانات المشغل للوصول إلى لوحة عمليات احترافية للحوالات والعملاء
              والمدفوعات والطباعة اليومية.
            </p>
            <div className="auth-highlights" aria-hidden="true">
              <span>تشغيل يومي منظم</span>
              <span>متابعة دقيقة للمدفوعات</span>
              <span>كشف طباعة مهني</span>
            </div>
          </div>
        </div>

        {!isConfigured ? <div className="status-banner error">{configError}</div> : null}
        {errorMessage ? <div className="status-banner error">{errorMessage}</div> : null}

        <form className="form-grid" onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="email">البريد الإلكتروني</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="operator@example.com"
              required
            />
          </div>

          <div className="field">
            <label htmlFor="password">كلمة المرور</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="أدخل كلمة المرور"
              required
            />
          </div>

          <button type="submit" className="button primary" disabled={!isConfigured || submitting}>
            {submitting ? 'جار تسجيل الدخول...' : 'دخول'}
          </button>
        </form>

        <ThemePreferenceControl className="auth-theme-preference" />

        <p className="auth-footer">
          بعد نجاح المصادقة سيتم تحويلك مباشرة إلى لوحة التشغيل الخاصة بـ {branding.shortName}.
        </p>
      </section>
    </div>
  )
}

export default LoginPage
