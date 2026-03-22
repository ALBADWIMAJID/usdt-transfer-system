import { useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import AppLaunchScreen from '../components/ui/AppLaunchScreen.jsx'
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

  if (loading) {
    return (
      <AppLaunchScreen
        stageLabel="التحقق من الجلسة"
        message="جار تجهيز الوصول الآمن إلى مساحة العمل."
      />
    )
  }

  if (submitting) {
    return (
      <AppLaunchScreen
        stageLabel="تسجيل الدخول"
        message="جار تأكيد بيانات المشغل وفتح مساحة العمل."
      />
    )
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
        <div className="auth-brand-panel auth-brand-panel--minimal">
          <BrandLogo className="auth-brand-logo" />

          <div className="auth-brand-copy auth-brand-copy--minimal">
            <h1>تسجيل الدخول</h1>
            <p className="auth-copy">
              ادخل بيانات المشغل للوصول إلى مساحة العمل ومتابعة الحوالات والمدفوعات اليومية.
            </p>
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

        <p className="auth-footer">بعد نجاح المصادقة سيتم تحويلك مباشرة إلى مساحة العمل الخاصة بك.</p>
      </section>
    </div>
  )
}

export default LoginPage
