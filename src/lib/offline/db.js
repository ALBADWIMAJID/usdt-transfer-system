import { PAYMENT_MUTATION_QUEUE_STORE } from './queueStores.js'
import { OFFLINE_DB_NAME, OFFLINE_DB_VERSION, READ_SNAPSHOT_STORE } from './stores.js'

const OFFLINE_DB_REQUEST_TIMEOUT_MS = 3000

function isIndexedDbAvailable() {
  return typeof indexedDB !== 'undefined'
}

function createOfflineDbTimeoutError(actionLabel) {
  const error = new Error(`IndexedDB timeout while ${actionLabel}.`)
  error.name = 'OfflineDbTimeoutError'
  return error
}

function withTimeout(executor, actionLabel) {
  return new Promise((resolve, reject) => {
    let settled = false
    const timeoutId = setTimeout(() => {
      if (settled) {
        return
      }

      settled = true
      reject(createOfflineDbTimeoutError(actionLabel))
    }, OFFLINE_DB_REQUEST_TIMEOUT_MS)

    const finish = (handler) => (value) => {
      if (settled) {
        return
      }

      settled = true
      clearTimeout(timeoutId)
      handler(value)
    }

    executor({
      reject: finish(reject),
      resolve: finish(resolve),
    })
  })
}

function ensureReadSnapshotStore(database) {
  if (!database.objectStoreNames.contains(READ_SNAPSHOT_STORE)) {
    const store = database.createObjectStore(READ_SNAPSHOT_STORE, {
      keyPath: 'key',
    })

    store.createIndex('type', 'type', { unique: false })
    store.createIndex('savedAt', 'savedAt', { unique: false })
  }
}

function ensurePaymentMutationQueueStore(database) {
  if (!database.objectStoreNames.contains(PAYMENT_MUTATION_QUEUE_STORE)) {
    const store = database.createObjectStore(PAYMENT_MUTATION_QUEUE_STORE, {
      keyPath: 'id',
    })

    store.createIndex('status', 'status', { unique: false })
    store.createIndex('transferId', 'transferId', { unique: false })
    store.createIndex('createdAt', 'createdAt', { unique: false })
    store.createIndex('type', 'type', { unique: false })
  }
}

function openOfflineDb() {
  if (!isIndexedDbAvailable()) {
    return Promise.resolve(null)
  }

  return withTimeout(({ resolve, reject }) => {
    const request = indexedDB.open(OFFLINE_DB_NAME, OFFLINE_DB_VERSION)

    request.onupgradeneeded = () => {
      const database = request.result

      ensureReadSnapshotStore(database)
      ensurePaymentMutationQueueStore(database)
    }

    request.onsuccess = () => {
      resolve(request.result)
    }

    request.onerror = () => {
      reject(request.error || new Error('Failed to open IndexedDB.'))
    }

    request.onblocked = () => {
      reject(new Error('IndexedDB open request is blocked.'))
    }
  }, 'opening the offline database')
}

async function readFromStore(key, storeName = READ_SNAPSHOT_STORE) {
  const database = await openOfflineDb()

  if (!database) {
    return null
  }

  return withTimeout(({ resolve, reject }) => {
    const transaction = database.transaction(storeName, 'readonly')
    const store = transaction.objectStore(storeName)
    const request = store.get(key)

    request.onsuccess = () => {
      resolve(request.result || null)
    }

    request.onerror = () => {
      reject(request.error || new Error(`Failed to read record: ${key}`))
    }

    transaction.onabort = () => {
      reject(transaction.error || new Error(`IndexedDB transaction aborted for record: ${key}`))
    }
  }, `reading ${storeName}:${key}`)
}

async function getAllFromStore(storeName = READ_SNAPSHOT_STORE) {
  const database = await openOfflineDb()

  if (!database) {
    return []
  }

  return withTimeout(({ resolve, reject }) => {
    const transaction = database.transaction(storeName, 'readonly')
    const store = transaction.objectStore(storeName)
    const request = store.getAll()

    request.onsuccess = () => {
      resolve(request.result || [])
    }

    request.onerror = () => {
      reject(request.error || new Error(`Failed to read records from store: ${storeName}`))
    }

    transaction.onabort = () => {
      reject(transaction.error || new Error(`IndexedDB transaction aborted for store: ${storeName}`))
    }
  }, `reading all records from ${storeName}`)
}

async function writeToStore(record, storeName = READ_SNAPSHOT_STORE) {
  const database = await openOfflineDb()

  if (!database) {
    return null
  }

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readwrite')
    const store = transaction.objectStore(storeName)
    const request = store.put(record)

    request.onsuccess = () => {
      resolve(record)
    }

    request.onerror = () => {
      reject(request.error || new Error(`Failed to write record to store: ${storeName}`))
    }
  })
}

async function deleteFromStore(key, storeName = READ_SNAPSHOT_STORE) {
  const database = await openOfflineDb()

  if (!database) {
    return null
  }

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readwrite')
    const store = transaction.objectStore(storeName)
    const request = store.delete(key)

    request.onsuccess = () => {
      resolve(true)
    }

    request.onerror = () => {
      reject(request.error || new Error(`Failed to delete record: ${key}`))
    }
  })
}

export { deleteFromStore, getAllFromStore, isIndexedDbAvailable, openOfflineDb, readFromStore, writeToStore }
