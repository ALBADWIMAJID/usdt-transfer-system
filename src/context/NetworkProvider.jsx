import { createContext, useEffect, useState } from 'react'

function resolveNetworkStatus() {
  if (typeof navigator === 'undefined' || typeof navigator.onLine !== 'boolean') {
    return 'unknown'
  }

  return navigator.onLine ? 'online' : 'offline'
}

const NetworkContext = createContext(null)

function NetworkProvider({ children }) {
  const [status, setStatus] = useState(resolveNetworkStatus)

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined
    }

    const handleOnline = () => {
      setStatus('online')
    }

    const handleOffline = () => {
      setStatus('offline')
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return (
    <NetworkContext.Provider
      value={{
        isOffline: status === 'offline',
        isOnline: status === 'online',
        isUnknown: status === 'unknown',
        status,
      }}
    >
      {children}
    </NetworkContext.Provider>
  )
}

export { NetworkContext }
export default NetworkProvider
