import { createContext, useContext } from 'react'

const TenantContext = createContext(null)

function useTenant() {
  const context = useContext(TenantContext)

  if (!context) {
    throw new Error('useTenant must be used within a TenantProvider')
  }

  return context
}

export { TenantContext, useTenant }
