import { supabase } from '../supabase.js'
import {
  listReplayableQueuedTransfers,
  markQueuedTransferFailed,
  markQueuedTransferSyncing,
  resolveQueuedTransfer,
} from './transferQueue.js'
import { linkQueuedPaymentsToResolvedTransfer } from './paymentQueue.js'

function buildDuplicateCheckQuery(payload) {
  let query = supabase
    .schema('public')
    .from('transfers')
    .select('id, reference_number')
    .eq('customer_id', payload.customer_id)
    .eq('usdt_amount', payload.usdt_amount)
    .eq('market_rate', payload.market_rate)
    .eq('client_rate', payload.client_rate)
    .eq('pricing_mode', payload.pricing_mode)
    .eq('commission_pct', payload.commission_pct)
    .eq('commission_rub', payload.commission_rub)
    .eq('gross_rub', payload.gross_rub)
    .eq('payable_rub', payload.payable_rub)
    .eq('status', payload.status)
    .eq('created_at', payload.created_at)
    .limit(1)

  if (payload.notes) {
    query = query.eq('notes', payload.notes)
  } else {
    query = query.is('notes', null)
  }

  return query
}

async function findExistingServerTransfer(payload) {
  if (!supabase) {
    return { data: null, error: new Error('Supabase client is not configured.') }
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

async function insertServerTransfer(payload) {
  if (!supabase) {
    return { data: null, error: new Error('Supabase client is not configured.') }
  }

  return supabase
    .schema('public')
    .from('transfers')
    .insert([payload])
    .select('id, reference_number')
}

async function replayQueuedTransfer(record) {
  await markQueuedTransferSyncing(record.id)

  const duplicateCheck = await findExistingServerTransfer(record.payload)

  if (duplicateCheck.error) {
    await markQueuedTransferFailed(record.id, duplicateCheck.error.message)
    return {
      error: duplicateCheck.error,
      outcome: 'failed',
      record,
    }
  }

  if (duplicateCheck.data) {
    await resolveQueuedTransfer(record.id)
    await linkQueuedPaymentsToResolvedTransfer({
      localReference: record.localMeta?.localReference || '',
      queueId: record.id,
      referenceNumber: duplicateCheck.data.reference_number || '',
      serverTransferId: duplicateCheck.data.id,
    })
    return {
      outcome: 'deduped',
      record,
      referenceNumber: duplicateCheck.data.reference_number || '',
      serverTransferId: duplicateCheck.data.id,
    }
  }

  const insertResult = await insertServerTransfer(record.payload)

  if (insertResult.error) {
    await markQueuedTransferFailed(record.id, insertResult.error.message)
    return {
      error: insertResult.error,
      outcome: 'failed',
      record,
    }
  }

  const firstRecord = Array.isArray(insertResult.data) ? insertResult.data[0] : insertResult.data

  await resolveQueuedTransfer(record.id)
  await linkQueuedPaymentsToResolvedTransfer({
    localReference: record.localMeta?.localReference || '',
    queueId: record.id,
    referenceNumber: firstRecord?.reference_number || '',
    serverTransferId: firstRecord?.id || '',
  })

  return {
    outcome: 'synced',
    record,
    referenceNumber: firstRecord?.reference_number || '',
    serverTransferId: firstRecord?.id || '',
  }
}

async function replayTransferQueue({ includeFailed = true } = {}) {
  const records = await listReplayableQueuedTransfers({ includeFailed })
  const summary = {
    blockedCount: 0,
    dedupedCount: 0,
    failedCount: 0,
    replayedCount: 0,
    resolvedTransfers: [],
    totalProcessed: records.length,
  }

  for (const record of records) {
    const result = await replayQueuedTransfer(record)

    if (result.outcome === 'synced') {
      summary.replayedCount += 1
      summary.resolvedTransfers.push({
        localReference: record.localMeta?.localReference || '',
        outcome: 'synced',
        queueId: record.id,
        referenceNumber: result.referenceNumber || '',
        serverTransferId: result.serverTransferId || '',
      })
      continue
    }

    if (result.outcome === 'deduped') {
      summary.dedupedCount += 1
      summary.resolvedTransfers.push({
        localReference: record.localMeta?.localReference || '',
        outcome: 'deduped',
        queueId: record.id,
        referenceNumber: result.referenceNumber || '',
        serverTransferId: result.serverTransferId || '',
      })
      continue
    }

    summary.failedCount += 1
  }

  return summary
}

export { replayTransferQueue }
