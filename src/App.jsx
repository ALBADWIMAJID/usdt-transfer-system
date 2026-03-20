import { useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import AppShell from './components/AppShell.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import { applyBrandingToDocument, branding } from './config/branding.js'
import AuthProvider from './context/AuthProvider.jsx'
import ThemePreferenceProvider from './context/ThemePreferenceProvider.jsx'
import NetworkProvider from './context/NetworkProvider.jsx'
import SyncProvider from './context/SyncProvider.jsx'
import { useAuth } from './context/auth-context.js'
import CustomerDetailsPage from './pages/CustomerDetailsPage.jsx'
import CustomersPage from './pages/CustomersPage.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import NewTransferPage from './pages/NewTransferPage.jsx'
import TransferDetailsPage from './pages/TransferDetailsPage.jsx'
import TransfersPage from './pages/TransfersPage.jsx'

function HomeRedirect() {
  const { loading, user } = useAuth()

  if (loading) {
    return <div className="screen-message">جار تحميل لوحة التشغيل...</div>
  }

  return <Navigate replace to={user ? '/dashboard' : '/login'} />
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/customers" element={<CustomersPage />} />
          <Route path="/customers/:customerId" element={<CustomerDetailsPage />} />
          <Route path="/transfers" element={<TransfersPage />} />
          <Route path="/transfers/new" element={<NewTransferPage />} />
          <Route path="/transfers/:transferId" element={<TransferDetailsPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate replace to="/" />} />
    </Routes>
  )
}

function App() {
  useEffect(() => {
    const root = document.documentElement
    root.lang = 'ar'
    root.dir = 'rtl'
    document.body.dir = 'rtl'
    document.title = branding.systemName
    applyBrandingToDocument(root)
  }, [])

  return (
    <ThemePreferenceProvider>
      <NetworkProvider>
        <SyncProvider>
          <AuthProvider>
            <BrowserRouter>
              <AppRoutes />
            </BrowserRouter>
          </AuthProvider>
        </SyncProvider>
      </NetworkProvider>
    </ThemePreferenceProvider>
  )
}

export default App
