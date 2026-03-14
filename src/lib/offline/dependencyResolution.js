function isUuidLike(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value || '').trim()
  )
}

function buildResolvedTransferMaps(resolvedTransfers = []) {
  const byLocalReference = new Map()
  const byQueueId = new Map()

  resolvedTransfers.forEach((entry) => {
    if (entry?.queueId) {
      byQueueId.set(entry.queueId, entry)
    }

    if (entry?.localReference) {
      byLocalReference.set(entry.localReference, entry)
    }
  })

  return {
    byLocalReference,
    byQueueId,
  }
}

function buildQueuedTransferLookup(queuedTransfers = []) {
  const byLocalReference = new Map()
  const byQueueId = new Map()

  queuedTransfers.forEach((record) => {
    if (record?.id) {
      byQueueId.set(record.id, record)
    }

    if (record?.localMeta?.localReference) {
      byLocalReference.set(record.localMeta.localReference, record)
    }
  })

  return {
    byLocalReference,
    byQueueId,
  }
}

function buildBlockedReason(transferRecord) {
  if (transferRecord?.status === 'failed') {
    return 'تعذر إرسال الحوالة المحلية المرتبطة أولا. أعد مزامنة الحوالة ثم حاول إرسال الدفعة مرة أخرى.'
  }

  if (transferRecord?.status === 'syncing') {
    return 'تنتظر هذه الدفعة تأكيد الحوالة المحلية المرتبطة من الخادم قبل إرسالها.'
  }

  return 'بانتظار إرسال الحوالة المحلية المرتبطة أولا قبل إرسال هذه الدفعة.'
}

function resolvePaymentReplayDependency(
  record,
  { queuedTransfers = [], resolvedTransfers = [] } = {}
) {
  const dependencyTransferQueueId = String(record?.localMeta?.dependencyTransferQueueId || '').trim()
  const dependencyLocalReference = String(record?.localMeta?.dependencyLocalReference || '').trim()
  const currentTransferId = String(record?.payload?.transfer_id || '').trim()

  if (!dependencyTransferQueueId && !dependencyLocalReference) {
    if (isUuidLike(currentTransferId)) {
      return {
        blocked: false,
        blockedReason: '',
        localMetaPatch: null,
        payloadPatch: null,
      }
    }

    return {
      blocked: true,
      blockedReason:
        'هذه الدفعة مرتبطة بحوالة محلية لم تؤكد بعد. أعد مزامنة الحوالة أولا ثم حاول إرسال الدفعة.',
      localMetaPatch: null,
      payloadPatch: null,
    }
  }

  const queuedLookup = buildQueuedTransferLookup(queuedTransfers)
  const resolvedLookup = buildResolvedTransferMaps(resolvedTransfers)

  const resolvedTransfer =
    resolvedLookup.byQueueId.get(dependencyTransferQueueId) ||
    resolvedLookup.byLocalReference.get(dependencyLocalReference)

  if (resolvedTransfer?.serverTransferId) {
    return {
      blocked: false,
      blockedReason: '',
      localMetaPatch: {
        dependencyLocalReference: '',
        dependencyTransferQueueId: '',
        referenceNumber:
          resolvedTransfer.referenceNumber || record?.localMeta?.referenceNumber || '',
      },
      payloadPatch: {
        transfer_id: resolvedTransfer.serverTransferId,
      },
    }
  }

  const queuedTransfer =
    queuedLookup.byQueueId.get(dependencyTransferQueueId) ||
    queuedLookup.byLocalReference.get(dependencyLocalReference)

  if (queuedTransfer) {
    return {
      blocked: true,
      blockedReason: buildBlockedReason(queuedTransfer),
      localMetaPatch: null,
      payloadPatch: null,
    }
  }

  if (isUuidLike(currentTransferId)) {
    return {
      blocked: false,
      blockedReason: '',
      localMetaPatch: {
        dependencyLocalReference: '',
        dependencyTransferQueueId: '',
      },
      payloadPatch: null,
    }
  }

  return {
    blocked: true,
    blockedReason:
      'لا تزال هذه الدفعة مرتبطة بحوالة محلية غير مؤكدة. راجع الحوالة المحلية ثم أعد المحاولة عند توفر الاتصال.',
    localMetaPatch: null,
    payloadPatch: null,
  }
}

export { resolvePaymentReplayDependency }
