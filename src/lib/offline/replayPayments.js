import {
  listReplayableQueuedPayments,
  markQueuedPaymentBlocked,
  markQueuedPaymentFailed,
  markQueuedPaymentSyncing,
  prepareQueuedPaymentForReplay,
  resolveQueuedPayment,
} from './paymentQueue.js'
import { listQueuedTransferMutations } from './transferQueue.js'
import { resolvePaymentReplayDependency } from './dependencyResolution.js'
import { supabase } from '../supabase.js'

function buildDuplicateCheckQuery(payload) {
  let query = supabase
    .schema('public')
    .from('transfer_payments')
    .select('id')
    .eq('transfer_id', payload.transfer_id)
    .eq('amount_rub', payload.amount_rub)
    .eq('payment_method', payload.payment_method)
    .eq('paid_at', payload.paid_at)
    .limit(1)

  if (payload.note) {
    query = query.eq('note', payload.note)
  } else {
    query = query.is('note', null)
  }

  return query
}

async function findExistingServerPayment(payload) {
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

async function insertServerPayment(payload) {
  if (!supabase) {
    return { data: null, error: new Error('Supabase client is not configured.') }
  }

  return supabase
    .schema('public')
    .from('transfer_payments')
    .insert([payload])
    .select('id')
}

async function replayQueuedPayment(
  record,
  { queuedTransfers = [], resolvedTransfers = [] } = {}
) {
  const dependencyState = resolvePaymentReplayDependency(record, {
    queuedTransfers,
    resolvedTransfers,
  })

  if (dependencyState.blocked) {
    await markQueuedPaymentBlocked(record.id, dependencyState.blockedReason)
    return {
      blockedReason: dependencyState.blockedReason,
      outcome: 'blocked',
      record,
    }
  }

  let nextRecord = record

  if (dependencyState.payloadPatch || dependencyState.localMetaPatch) {
    nextRecord =
      (await prepareQueuedPaymentForReplay(record.id, {
        localMetaPatch: dependencyState.localMetaPatch || {},
        payloadPatch: dependencyState.payloadPatch || {},
      })) ||
      {
        ...record,
        localMeta: {
          ...record.localMeta,
          ...(dependencyState.localMetaPatch || {}),
        },
        payload: {
          ...record.payload,
          ...(dependencyState.payloadPatch || {}),
        },
      }
  }

  await markQueuedPaymentSyncing(nextRecord.id)

  const duplicateCheck = await findExistingServerPayment(nextRecord.payload)

  if (duplicateCheck.error) {
    await markQueuedPaymentFailed(nextRecord.id, duplicateCheck.error.message)
    return {
      error: duplicateCheck.error,
      outcome: 'failed',
      record: nextRecord,
    }
  }

  if (duplicateCheck.data) {
    await resolveQueuedPayment(nextRecord.id)
    return {
      outcome: 'deduped',
      record: nextRecord,
      serverPaymentId: duplicateCheck.data.id,
    }
  }

  const insertResult = await insertServerPayment(nextRecord.payload)

  if (insertResult.error) {
    await markQueuedPaymentFailed(nextRecord.id, insertResult.error.message)
    return {
      error: insertResult.error,
      outcome: 'failed',
      record: nextRecord,
    }
  }

  const firstRecord = Array.isArray(insertResult.data) ? insertResult.data[0] : insertResult.data

  await resolveQueuedPayment(nextRecord.id)

  return {
    outcome: 'synced',
    record: nextRecord,
    serverPaymentId: firstRecord?.id || '',
  }
}

async function replayPaymentQueue({
  includeBlocked = true,
  includeFailed = true,
  transferReplayResult = null,
} = {}) {
  const [records, queuedTransfers] = await Promise.all([
    listReplayableQueuedPayments({ includeBlocked, includeFailed }),
    listQueuedTransferMutations(),
  ])
  const summary = {
    blockedCount: 0,
    dedupedCount: 0,
    failedCount: 0,
    replayedCount: 0,
    totalProcessed: records.length,
  }

  for (const record of records) {
    const result = await replayQueuedPayment(record, {
      queuedTransfers,
      resolvedTransfers: transferReplayResult?.resolvedTransfers || [],
    })

    if (result.outcome === 'synced') {
      summary.replayedCount += 1
      continue
    }

    if (result.outcome === 'deduped') {
      summary.dedupedCount += 1
      continue
    }

    if (result.outcome === 'blocked') {
      summary.blockedCount += 1
      continue
    }

    summary.failedCount += 1
  }

  return summary
}

export { replayPaymentQueue }
