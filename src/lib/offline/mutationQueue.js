import { deleteFromStore, getAllFromStore, readFromStore, writeToStore } from './db.js'
import { OFFLINE_QUEUE_UPDATED_EVENT, PAYMENT_MUTATION_QUEUE_STORE } from './queueStores.js'

function emitQueueUpdated() {
  if (typeof window === 'undefined') {
    return
  }

  window.dispatchEvent(new CustomEvent(OFFLINE_QUEUE_UPDATED_EVENT))
}

async function getMutationRecord(id) {
  try {
    return await readFromStore(id, PAYMENT_MUTATION_QUEUE_STORE)
  } catch (error) {
    console.warn('Failed to read queued mutation:', id, error)
    return null
  }
}

async function listMutationRecords() {
  try {
    return await getAllFromStore(PAYMENT_MUTATION_QUEUE_STORE)
  } catch (error) {
    console.warn('Failed to list queued mutations:', error)
    return []
  }
}

async function putMutationRecord(record) {
  try {
    const savedRecord = await writeToStore(record, PAYMENT_MUTATION_QUEUE_STORE)
    emitQueueUpdated()
    return savedRecord
  } catch (error) {
    console.warn('Failed to write queued mutation:', record?.id, error)
    return null
  }
}

async function removeMutationRecord(id) {
  try {
    await deleteFromStore(id, PAYMENT_MUTATION_QUEUE_STORE)
    emitQueueUpdated()
    return true
  } catch (error) {
    console.warn('Failed to delete queued mutation:', id, error)
    return false
  }
}

function subscribeToMutationQueue(listener) {
  if (typeof window === 'undefined') {
    return () => {}
  }

  const handler = () => {
    listener()
  }

  window.addEventListener(OFFLINE_QUEUE_UPDATED_EVENT, handler)

  return () => {
    window.removeEventListener(OFFLINE_QUEUE_UPDATED_EVENT, handler)
  }
}

export {
  emitQueueUpdated,
  getMutationRecord,
  listMutationRecords,
  putMutationRecord,
  removeMutationRecord,
  subscribeToMutationQueue,
}
