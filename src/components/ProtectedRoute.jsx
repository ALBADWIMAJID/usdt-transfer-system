import { Navigate, Outlet, useLocation } from 'react-router-dom'
import AppLaunchScreen from './ui/AppLaunchScreen.jsx'
import { useAuth } from '../context/auth-context.js'
import { useTenant } from '../context/tenant-context.js'

function TenantBootstrapMessage({
  actionLabel = '',
  children,
  onAction = null,
  onSignOut = null,
  title,
}) {
  return (
    <div className="screen-message">
      <div className="status-banner error">
        <strong>{title}</strong>
        <p>{children}</p>
      </div>

      <div
        style={{
          display: 'flex',
          gap: '0.75rem',
          justifyContent: 'center',
          flexWrap: 'wrap',
        }}
      >
        {onAction ? (
          <button type="button" className="button primary" onClick={onAction}>
            {actionLabel}
          </button>
        ) : null}

        {onSignOut ? (
          <button type="button" className="button secondary" onClick={onSignOut}>
            تسجيل الخروج
          </button>
        ) : null}
      </div>
    </div>
  )
}

function ProtectedRoute() {
  const location = useLocation()
  const { loading, signOut, user } = useAuth()
  const { bootstrapError, bootstrapStatus, loading: tenantLoading, refreshTenantContext } = useTenant()

  if (loading) {
    return (
      <AppLaunchScreen
        stageLabel="التحقق من الجلسة"
        message="جار تأكيد صلاحية الجلسة وتأمين الدخول إلى مساحة العمل."
      />
    )
  }

  if (!user) {
    return <Navigate replace to="/login" state={{ from: location }} />
  }

  if (tenantLoading) {
    return (
      <AppLaunchScreen
        stageLabel="تهيئة جهة التشغيل"
        message="جار فتح بيئة العمل وربط ملف التشغيل الحالي قبل الدخول."
      />
    )
  }

  if (bootstrapStatus === 'error') {
    return (
      <TenantBootstrapMessage
        title="تعذر تهيئة جهة التشغيل الحالية"
        actionLabel="إعادة المحاولة"
        onAction={refreshTenantContext}
        onSignOut={signOut}
      >
        {bootstrapError || 'حدث خطأ أثناء تحميل ملف المستخدم أو جهة التشغيل الحالية.'}
      </TenantBootstrapMessage>
    )
  }

  if (bootstrapStatus === 'unprovisioned') {
    return (
      <TenantBootstrapMessage title="الحساب غير مهيأ بعد" onSignOut={signOut}>
        هذا الحساب مسجل الدخول، لكنه لا يملك حاليا ملف تشغيل نشطا أو جهة تشغيل مفعلة. تواصل مع
        مسؤول النظام لإكمال التهيئة قبل متابعة العمل.
      </TenantBootstrapMessage>
    )
  }

  return <Outlet />
}

export default ProtectedRoute
