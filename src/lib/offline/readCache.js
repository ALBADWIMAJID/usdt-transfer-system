import { createReadSnapshotRecord } from './serializers.js'
import { readFromStore, writeToStore } from './db.js'

export async function loadReadSnapshot(key) {
  try {
    return await readFromStore(key)
  } catch (error) {
    console.warn('Failed to load offline snapshot:', key, error)
    return null
  }
}

export async function saveReadSnapshot({ data, key, scope, type }) {
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
