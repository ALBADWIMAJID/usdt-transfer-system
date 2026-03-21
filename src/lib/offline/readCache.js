import { createReadSnapshotRecord } from './serializers.js'
import { readFromStore, writeToStore } from './db.js'

const LIVE_READ_TIMEOUT_MS = 7000

function createLiveReadTimeoutError(message) {
  const error = new Error(message || 'Timed out while loading live data.')
  error.name = 'OfflineReadTimeoutError'
  return error
}

export function withLiveReadTimeout(promise, options = {}) {
  const {
    timeoutMessage = 'Timed out while loading live data.',
    timeoutMs = LIVE_READ_TIMEOUT_MS,
  } = options

  let timeoutId = null

  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(createLiveReadTimeoutError(timeoutMessage))
      }, timeoutMs)
    }),
  ]).finally(() => {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
  })
}

export function isLiveReadTimeoutError(error) {
  return error?.name === 'OfflineReadTimeoutError'
}

export function isLikelyOfflineReadFailure(error) {
  if (!error) {
    return false
  }

  if (isLiveReadTimeoutError(error)) {
    return true
  }

  const message = String(error.message || '').toLowerCase()

  return (
    message.includes('failed to fetch') ||
    message.includes('network request failed') ||
    message.includes('networkerror') ||
    message.includes('load failed') ||
    message.includes('offline')
  )
}

export function isBrowserOffline() {
  return typeof navigator !== 'undefined' && navigator.onLine === false
}

export async function loadReadSnapshot(key) {
  if (!key) {
    return null
  }

  try {
    return await readFromStore(key)
  } catch (error) {
    console.warn('Failed to load offline snapshot:', key, error)
    return null
  }
}

export async function saveReadSnapshot({ data, key, scope, type }) {
  if (!key) {
    return null
  }

  try {
    const record = createReadSnapshotRecord({
      data,
      key,
      scope,
      type,
    })

    return await writeToStore(record)
  } catch (error) {
    console.warn('Failed to save offline snapshot:', key, error)
    return null
  }
}
