function cloneSnapshotData(data) {
  if (typeof structuredClone === 'function') {
    return structuredClone(data)
  }

  return JSON.parse(JSON.stringify(data))
}

export function createReadSnapshotRecord({ data, key, scope, type }) {
  return {
    data: cloneSnapshotData(data),
    key,
    savedAt: new Date().toISOString(),
    scope,
    type,
    version: 1,
  }
}
