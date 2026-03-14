import useSyncStatus from './useSyncStatus.js'

function useReplayQueue() {
  const syncStatus = useSyncStatus()

  return {
    blockedCount: syncStatus.blockedCount || 0,
    failedCount: syncStatus.failedCount || 0,
    hasPendingWork: Boolean(syncStatus.hasPendingWork),
    isOffline: Boolean(syncStatus.isOffline),
    isSyncing: syncStatus.status === 'syncing',
    paymentBlockedCount: syncStatus.paymentBlockedCount || 0,
    paymentFailedCount: syncStatus.paymentFailedCount || 0,
    paymentPendingCount: syncStatus.paymentPendingCount || 0,
    paymentQueueCount: syncStatus.paymentQueueCount || 0,
    pendingCount: syncStatus.pendingCount || 0,
    refreshSyncState: syncStatus.refreshSyncState,
    replayAllNow: syncStatus.syncAllNow,
    replayPaymentsNow: syncStatus.syncPaymentsNow,
    replayTransfersNow: syncStatus.syncTransfersNow,
    status: syncStatus.status,
    statusMessage: syncStatus.message,
    transferBlockedCount: syncStatus.transferBlockedCount || 0,
    transferFailedCount: syncStatus.transferFailedCount || 0,
    transferPendingCount: syncStatus.transferPendingCount || 0,
    transferQueueCount: syncStatus.transferQueueCount || 0,
  }
}

export default useReplayQueue
