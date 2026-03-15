import { supabase } from '../supabase.js'
import {
  listReplayableQueuedCustomers,
  markQueuedCustomerFailed,
  markQueuedCustomerSyncing,
  resolveQueuedCustomer,
} from './customerQueue.js'

function buildDuplicateCheckQuery(payload) {
  let query = supabase
    .schema('public')
    .from('customers')
    .select('id, full_name, phone')
    .eq('full_name', payload.full_name)
    .limit(1)

  if (payload.phone) {
    query = query.eq('phone', payload.phone)
  } else {
    query = query.is('phone', null)
  }

  return query
}

async function findExistingServerCustomer(payload) {
  if (!supabase) {
    return { data: null, error: new Error('Supabase client is not configured.') }
  }

  // Conservative duplicate protection: only exact full_name + phone matches are treated as existing.
  if (!payload.phone) {
    return { data: null, error: null }
  }

  const { data, error } = await buildDuplicateCheckQuery(payload)

  if (error) {
    return { data: null, error }
  }

  return {
    data: Array.isArray(data) && data.length > 0 ? data[0] : null,
    error: null,
  }
}

async function insertServerCustomer(payload) {
  if (!supabase) {
    return { data: null, error: new Error('Supabase client is not configured.') }
  }

  return supabase
    .schema('public')
    .from('customers')
    .insert([payload])
    .select('id, full_name, phone')
}

async function replayQueuedCustomer(record) {
  await markQueuedCustomerSyncing(record.id)

  const duplicateCheck = await findExistingServerCustomer(record.payload)

  if (duplicateCheck.error) {
    await markQueuedCustomerFailed(record.id, duplicateCheck.error.message)
    return {
      error: duplicateCheck.error,
      outcome: 'failed',
      record,
    }
  }

  if (duplicateCheck.data) {
    await resolveQueuedCustomer(record.id)
    return {
      outcome: 'deduped',
      record,
      serverCustomerId: duplicateCheck.data.id,
    }
  }

  const insertResult = await insertServerCustomer(record.payload)

  if (insertResult.error) {
    await markQueuedCustomerFailed(record.id, insertResult.error.message)
    return {
      error: insertResult.error,
      outcome: 'failed',
      record,
    }
  }

  const firstRecord = Array.isArray(insertResult.data) ? insertResult.data[0] : insertResult.data

  await resolveQueuedCustomer(record.id)

  return {
    outcome: 'synced',
    record,
    serverCustomerId: firstRecord?.id || '',
  }
}

async function replayCustomerQueue({ includeFailed = true } = {}) {
  const records = await listReplayableQueuedCustomers({ includeFailed })
  const summary = {
    blockedCount: 0,
    dedupedCount: 0,
    failedCount: 0,
    replayedCount: 0,
    totalProcessed: records.length,
  }

  for (const record of records) {
    const result = await replayQueuedCustomer(record)

    if (result.outcome === 'synced') {
      summary.replayedCount += 1
      continue
    }

    if (result.outcome === 'deduped') {
      summary.dedupedCount += 1
      continue
    }

    summary.failedCount += 1
  }

  return summary
}

export { replayCustomerQueue }
