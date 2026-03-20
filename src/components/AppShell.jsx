import { useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { branding } from '../config/branding.js'
import { useAuth } from '../context/auth-context.js'
import BrandLockup from './ui/BrandLockup.jsx'
import ConnectionBadge from './ui/ConnectionBadge.jsx'
import InlineMessage from './ui/InlineMessage.jsx'
import SyncStatusBanner from './ui/SyncStatusBanner.jsx'

const navigation = [
  {
    to: '/dashboard',
    label: 'لوحة التحكم',
    shortLabel: 'الرئيسية',
    note: 'نظرة تشغيلية سريعة',
    icon: 'dashboard',
    match: (pathname) => pathname.startsWith('/dashboard'),
  },
  {
    to: '/customers',
    label: 'العملاء',
    shortLabel: 'العملاء',
    note: 'ملفات العملاء وسجلهم',
    icon: 'customers',
    match: (pathname) => pathname.startsWith('/customers'),
  },
  {
    to: '/transfers',
    label: 'الحوالات',
    shortLabel: 'الحوالات',
    note: 'متابعة الحوالات والدفع',
    icon: 'transfers',
    match: (pathname) =>
      pathname.startsWith('/transfers') && !pathname.startsWith('/transfers/new'),
  },
  {
    to: '/transfers/new',
    label: 'حوالة جديدة',
    shortLabel: 'جديدة',
    note: 'إدخال حوالة جديدة',
    icon: 'plus',
    match: (pathname) => pathname.startsWith('/transfers/new'),
  },
]

function Icon({ name }) {
  const commonProps = {
    width: 20,
    height: 20,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: '1.8',
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
  }

  switch (name) {
    case 'dashboard':
      return (
        <svg {...commonProps}>
          <rect x="3.5" y="3.5" width="7" height="7" rx="2" />
          <rect x="13.5" y="3.5" width="7" height="11" rx="2" />
          <rect x="3.5" y="13.5" width="7" height="7" rx="2" />
          <rect x="13.5" y="17.5" width="7" height="3" rx="1.5" />
        </svg>
      )
    case 'customers':
      return (
        <svg {...commonProps}>
          <path d="M15 19.5a5.5 5.5 0 0 0-11 0" />
          <circle cx="9.5" cy="8" r="3.5" />
          <path d="M21 19.5a4.5 4.5 0 0 0-5-4.4" />
          <path d="M15.5 4.7a3.3 3.3 0 0 1 0 6.6" />
        </svg>
      )
    case 'transfers':
      return (
        <svg {...commonProps}>
          <path d="M7 7h12" />
          <path d="m15 3 4 4-4 4" />
          <path d="M17 17H5" />
          <path d="m9 13-4 4 4 4" />
        </svg>
      )
    case 'plus':
      return (
        <svg {...commonProps}>
          <path d="M12 5v14" />
          <path d="M5 12h14" />
        </svg>
      )
    case 'menu':
      return (
        <svg {...commonProps}>
          <path d="M4 7h16" />
          <path d="M4 12h16" />
          <path d="M4 17h16" />
        </svg>
      )
    case 'collapse':
      return (
        <svg {...commonProps}>
          <path d="m15 6-6 6 6 6" />
        </svg>
      )
    case 'expand':
      return (
        <svg {...commonProps}>
          <path d="m9 6 6 6-6 6" />
        </svg>
      )
    default:
      return null
  }
}

function getCurrentSection(pathname) {
  if (pathname.startsWith('/customers/')) {
    return {
      title: 'ملف العميل',
      description: 'مراجعة بيانات العميل وحوالاته وإجمالي الرصيد المرتبط به.',
    }
  }

  if (pathname.startsWith('/customers')) {
    return {
      title: 'إدارة العملاء',
      description: 'إنشاء ملفات العملاء والوصول السريع إلى سجل الحوالات لكل عميل.',
    }
  }

  if (pathname.startsWith('/transfers/new')) {
    return {
      title: 'إنشاء حوالة جديدة',
      description: 'إدخال البيانات التجارية للحوالة مع معاينة فورية قبل الحفظ.',
    }
  }

  if (pathname.startsWith('/transfers/') && pathname !== '/transfers/new') {
    return {
      title: 'تفاصيل الحوالة',
      description: 'متابعة الحالة والمدفوعات والطباعة من شاشة تشغيل واحدة.',
    }
  }

  if (pathname.startsWith('/transfers')) {
    return {
      title: 'إدارة الحوالات',
      description: 'بحث وتصفية ومراجعة الحوالات وربطها بالعملاء والمدفوعات.',
    }
  }

  return {
    title: 'لوحة التحكم',
    description: 'ملخص تشغيلي يومي للحوالات والعملاء والأرصدة الحالية.',
  }
}

function AppShell() {
  const location = useLocation()
  const navigate = useNavigate()
  const { signOut, user } = useAuth()
  const [signOutError, setSignOutError] = useState('')
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const currentSection = getCurrentSection(location.pathname)
  const todayLabel = new Intl.DateTimeFormat('ar', { dateStyle: 'full' }).format(new Date())

  const handleSignOut = async () => {
    setSignOutError('')

    const { error } = await signOut()

    if (error) {
      setSignOutError(error.message)
      return
    }

    navigate('/login', { replace: true })
  }

  return (
    <div className={`app-shell${sidebarCollapsed ? ' sidebar-collapsed' : ''}`}>
      <div
        className={`mobile-drawer-backdrop${mobileNavOpen ? ' open' : ''}`}
        onClick={() => setMobileNavOpen(false)}
      />

      <aside className={`sidebar${mobileNavOpen ? ' open' : ''}`} aria-label="التنقل الرئيسي">
        <div className="sidebar-panel">
          <div className="sidebar-header">
            <BrandLockup tone="sidebar" size="md" />

            <button
              type="button"
              className="icon-button desktop-only"
              onClick={() => setSidebarCollapsed((current) => !current)}
              aria-label={sidebarCollapsed ? 'توسيع الشريط الجانبي' : 'طي الشريط الجانبي'}
            >
              <Icon name={sidebarCollapsed ? 'expand' : 'collapse'} />
            </button>
          </div>

          <div className="sidebar-section">
            <p className="sidebar-section-label desktop-only">الأقسام الرئيسية</p>

            <nav className="nav-links">
              {navigation.map((item) => {
                const isActive = item.match(location.pathname)

                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={`nav-link${isActive ? ' active' : ''}`}
                    aria-current={isActive ? 'page' : undefined}
                    onClick={() => setMobileNavOpen(false)}
                  >
                    <span className="nav-link-icon">
                      <Icon name={item.icon} />
                    </span>
                    <span className="nav-link-copy">
                      <span className="nav-link-label">{item.label}</span>
                      <small className="nav-link-note">{item.note}</small>
                    </span>
                  </NavLink>
                )
              })}
            </nav>
          </div>

          <div className="sidebar-footer">
            <div className="user-chip">
              <span className="user-avatar">OP</span>
              <div className="sidebar-footer-copy">
                <strong className="ltr">{user?.email || '--'}</strong>
                <span>جلسة تشغيل نشطة</span>
              </div>
            </div>

            <button type="button" className="button secondary sidebar-signout" onClick={handleSignOut}>
              تسجيل الخروج
            </button>
          </div>
        </div>
      </aside>

      <div className="content-shell">
        <header className="topbar">
          <div className="topbar-leading">
            <button
              type="button"
              className="icon-button mobile-only"
              onClick={() => setMobileNavOpen(true)}
              aria-label="فتح القائمة"
              aria-expanded={mobileNavOpen}
            >
              <Icon name="menu" />
            </button>

            <div className="page-intro">
              <p className="eyebrow">{branding.systemName}</p>
              <h2>{currentSection.title}</h2>
              <p>{currentSection.description}</p>
            </div>
          </div>

          <div className="topbar-actions">
            <ConnectionBadge />
            <div className="topbar-badge desktop-only">
              <span>اليوم</span>
              <strong>{todayLabel}</strong>
            </div>

            <div className="topbar-user">
              <p className="eyebrow">المشغل الحالي</p>
              <strong className="ltr">{user?.email || '--'}</strong>
            </div>

            <button
              type="button"
              className="button secondary desktop-only"
              onClick={handleSignOut}
            >
              تسجيل الخروج
            </button>
          </div>
        </header>

        <div className="shell-status-strip">
          <SyncStatusBanner />
        </div>

        <main className="page-content">
          <InlineMessage kind="error">{signOutError}</InlineMessage>
          <Outlet />
        </main>

        <nav className="bottom-nav mobile-only" aria-label="التنقل السفلي">
          {navigation.map((item) => {
            const isActive = item.match(location.pathname)

            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={`bottom-nav-link${isActive ? ' active' : ''}`}
                aria-current={isActive ? 'page' : undefined}
                aria-label={item.label}
              >
                <span className="bottom-nav-icon">
                  <Icon name={item.icon} />
                </span>
                <span>{item.shortLabel}</span>
              </NavLink>
            )
          })}
        </nav>
      </div>
    </div>
  )
}

export default AppShell
