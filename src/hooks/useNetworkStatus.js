import { useContext } from 'react'
import { NetworkContext } from '../context/NetworkProvider.jsx'

function useNetworkStatus() {
  const context = useContext(NetworkContext)

  if (!context) {
    throw new Error('useNetworkStatus must be used within a NetworkProvider')
  }

  return context
}

export default useNetworkStatus
