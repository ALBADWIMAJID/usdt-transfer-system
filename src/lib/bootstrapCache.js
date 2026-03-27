const TENANT_BOOTSTRAP_CACHE_KEY = 'usdt-tenant-bootstrap-cache-v1'

function canUseLocalStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function readStoredJson(key) {
  if (!canUseLocalStorage() || !key) {
    return null
  }

  try {
    const rawValue = window.localStorage.getItem(key)

    return rawValue ? JSON.parse(rawValue) : null
  } catch {
    return null
  }
}

export function readTenantBootstrapCache(userId = '') {
  if (!userId) {
    return null
  }

  const cachedRecord = readStoredJson(TENANT_BOOTSTRAP_CACHE_KEY)

  if (
    !cachedRecord ||
    cachedRecord.userId !== userId ||
    !cachedRecord.orgId ||
    !cachedRecord.profile ||
    !cachedRecord.organization
  ) {
    return null
  }

  return {
    orgId: cachedRecord.orgId,
    organization: cachedRecord.organization,
    profile: cachedRecord.profile,
    savedAt: cachedRecord.savedAt || '',
  }
}

export function saveTenantBootstrapCache({ orgId = '', organization = null, profile = null, userId = '' }) {
  if (!canUseLocalStorage() || !userId || !orgId || !organization || !profile) {
    return
  }

  try {
    window.localStorage.setItem(
      TENANT_BOOTSTRAP_CACHE_KEY,
      JSON.stringify({
        orgId,
        organization,
        profile,
        savedAt: new Date().toISOString(),
        userId,
      })
    )
  } catch {
    return
  }
}

export function clearTenantBootstrapCache() {
  if (!canUseLocalStorage()) {
    return
  }

  try {
    window.localStorage.removeItem(TENANT_BOOTSTRAP_CACHE_KEY)
  } catch {
    return
  }
}
