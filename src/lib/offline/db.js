import { PAYMENT_MUTATION_QUEUE_STORE } from './queueStores.js'
import { OFFLINE_DB_NAME, OFFLINE_DB_VERSION, READ_SNAPSHOT_STORE } from './stores.js'

function isIndexedDbAvailable() {
  return typeof indexedDB !== 'undefined'
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

  return new Promise((resolve, reject) => {
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
  })
}

async function readFromStore(key, storeName = READ_SNAPSHOT_STORE) {
  const database = await openOfflineDb()

  if (!database) {
    return null
  }

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readonly')
    const store = transaction.objectStore(storeName)
    const request = store.get(key)

    request.onsuccess = () => {
      resolve(request.result || null)
    }

    request.onerror = () => {
      reject(request.error || new Error(`Failed to read record: ${key}`))
    }
  })
}

async function getAllFromStore(storeName = READ_SNAPSHOT_STORE) {
  const database = await openOfflineDb()

  if (!database) {
    return []
  }

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readonly')
    const store = transaction.objectStore(storeName)
    const request = store.getAll()

    request.onsuccess = () => {
      resolve(request.result || [])
    }

    request.onerror = () => {
      reject(request.error || new Error(`Failed to read records from store: ${storeName}`))
    }
  })
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
