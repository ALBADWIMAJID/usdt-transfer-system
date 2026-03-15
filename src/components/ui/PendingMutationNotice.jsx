import ActionRow from './ActionRow.jsx'
import InlineMessage from './InlineMessage.jsx'

const noticeMetaByVariant = {
  payment: {
    blockedLabel: (count) => `${count} بانتظار حوالة مرتبطة`,
    countLabel: (count) => `${count} دفعة محلية`,
    descriptionBlocked:
      'بعض هذه الدفعات لا يمكن إرسالها بعد لأن الحوالة المرتبطة بها لم تؤكد من الخادم حتى الآن. ستبقى محلية حتى تصبح جاهزة للمزامنة.',
    descriptionFailed: (failedCount) =>
      `يوجد ${failedCount} عنصر فشل إرساله حتى الآن. ستبقى هذه الدفعات محلية فقط إلى أن تنجح إعادة المحاولة.`,
    descriptionOffline:
      'تم حفظ هذه الدفعات داخل المتصفح فقط. لن تدخل في الإجماليات المؤكدة أو الطباعة قبل نجاح الإرسال.',
    descriptionOnline:
      'هذه الدفعات محفوظة محليا بشكل مؤقت، وستظل منفصلة عن المدفوعات المؤكدة حتى تنجح المزامنة.',
    failedLabel: (count) => `${count} تحتاج إعادة محاولة`,
    metaAriaLabel: 'ملخص الدفعات المحلية',
    retryBlockedLabel: 'إعادة فحص الحوالة المرتبطة',
    retryLabel: 'إعادة المحاولة الآن',
    syncLabel: 'مزامنة الآن',
    syncingLabel: 'جار المزامنة...',
    titleBlocked: 'توجد دفعات محلية بانتظار تأكيد حوالة مرتبطة',
    titleFailed: 'توجد دفعات محلية تحتاج مراجعة أو إعادة محاولة',
    titleOffline: 'توجد دفعات محفوظة محليا بانتظار الإرسال',
    titleOnline: 'توجد دفعات محلية جاهزة للإرسال إلى الخادم',
  },
  transfer: {
    blockedLabel: (count) => `${count} محجوبة مؤقتا`,
    countLabel: (count) => `${count} حوالة محلية`,
    descriptionBlocked:
      'توجد عناصر محلية محجوبة مؤقتا وتحتاج إلى مراجعة حالة الاعتماد المرتبط قبل متابعة المزامنة.',
    descriptionFailed: (failedCount) =>
      `يوجد ${failedCount} عنصر فشل إرساله حتى الآن. ستبقى هذه الحوالات محلية فقط إلى أن تنجح إعادة المحاولة.`,
    descriptionOffline:
      'تم حفظ هذه الحوالات داخل المتصفح فقط. الرقم المرجعي النهائي سيصدر من الخادم بعد نجاح المزامنة ولن تعتبر هذه الحوالات مؤكدة أو قابلة للطباعة قبل ذلك.',
    descriptionOnline:
      'هذه الحوالات محفوظة محليا بشكل مؤقت، وستظل منفصلة عن الحوالات المؤكدة حتى تنجح المزامنة ويحصل كل سجل على مرجعه النهائي.',
    failedLabel: (count) => `${count} تحتاج إعادة محاولة`,
    metaAriaLabel: 'ملخص الحوالات المحلية',
    retryBlockedLabel: 'مراجعة العناصر المحجوبة',
    retryLabel: 'إعادة محاولة الإرسال',
    syncLabel: 'مزامنة الحوالات الآن',
    syncingLabel: 'جار إرسال الحوالات...',
    titleBlocked: 'توجد عناصر محلية محجوبة مؤقتا',
    titleFailed: 'توجد حوالات محلية تحتاج مراجعة أو إعادة محاولة',
    titleOffline: 'توجد حوالات محفوظة محليا بانتظار الإرسال',
    titleOnline: 'توجد حوالات محلية جاهزة للإرسال إلى الخادم',
  },
  customer: {
    blockedLabel: (count) => `${count} محجوبة مؤقتا`,
    countLabel: (count) => `${count} عميل محلي`,
    descriptionBlocked:
      'توجد ملفات عملاء محلية محجوبة مؤقتا وتحتاج إلى مراجعة قبل متابعة المزامنة.',
    descriptionFailed: (failedCount) =>
      `يوجد ${failedCount} ملف عميل فشل إرساله حتى الآن. ستبقى هذه الملفات محلية فقط إلى أن تنجح إعادة المحاولة.`,
    descriptionOffline:
      'تم حفظ هذه الملفات داخل المتصفح فقط. ستظل منفصلة عن ملفات العملاء المؤكدة ولن تصبح صالحة للاعتماد التشغيلي الكامل حتى تنجح المزامنة.',
    descriptionOnline:
      'هذه الملفات محفوظة محليا بشكل مؤقت، وستظل منفصلة عن ملفات العملاء المؤكدة حتى تنجح المزامنة مع الخادم.',
    failedLabel: (count) => `${count} تحتاج إعادة محاولة`,
    metaAriaLabel: 'ملخص العملاء المحليين',
    retryBlockedLabel: 'مراجعة العناصر المحلية',
    retryLabel: 'إعادة محاولة الإرسال',
    syncLabel: 'مزامنة العملاء الآن',
    syncingLabel: 'جار إرسال العملاء...',
    titleBlocked: 'توجد ملفات عملاء محلية محجوبة مؤقتا',
    titleFailed: 'توجد ملفات عملاء محلية تحتاج مراجعة أو إعادة محاولة',
    titleOffline: 'توجد ملفات عملاء محفوظة محليا بانتظار الإرسال',
    titleOnline: 'توجد ملفات عملاء محلية جاهزة للإرسال إلى الخادم',
  },
}

function PendingMutationNotice({
  activeCount = 0,
  blockedCount = 0,
  failedCount = 0,
  isOffline = false,
  syncing = false,
  summaryLabel = '',
  totalAmountLabel = '',
  onSyncNow,
  variant = 'payment',
}) {
  if (activeCount <= 0) {
    return null
  }

  const meta = noticeMetaByVariant[variant] || noticeMetaByVariant.payment
  const hasFailedItems = failedCount > 0
  const hasBlockedItems = blockedCount > 0
  const tone = hasFailedItems ? 'error' : hasBlockedItems || isOffline ? 'warning' : 'info'
  const title = hasFailedItems
    ? meta.titleFailed
    : hasBlockedItems
      ? meta.titleBlocked
    : isOffline
      ? meta.titleOffline
      : meta.titleOnline
  const description = hasFailedItems
    ? meta.descriptionFailed(failedCount)
    : hasBlockedItems
      ? meta.descriptionBlocked
    : isOffline
      ? meta.descriptionOffline
      : meta.descriptionOnline
  const summaryChipText = summaryLabel || totalAmountLabel

  return (
    <div className="pending-mutation-notice">
      <InlineMessage kind={tone}>
        <div className="pending-mutation-copy">
          <strong>{title}</strong>
          <p>{description}</p>
        </div>
      </InlineMessage>

      <div className="pending-mutation-meta" aria-label={meta.metaAriaLabel}>
        <span className="offline-snapshot-chip offline-snapshot-chip--warning">
          {meta.countLabel(activeCount)}
        </span>
        {summaryChipText ? (
          <span className="offline-snapshot-chip offline-snapshot-chip--neutral">
            {summaryChipText}
          </span>
        ) : null}
        {failedCount > 0 ? (
          <span className="offline-snapshot-chip offline-snapshot-chip--warning">
            {meta.failedLabel(failedCount)}
          </span>
        ) : null}
        {blockedCount > 0 ? (
          <span className="offline-snapshot-chip offline-snapshot-chip--warning">
            {meta.blockedLabel(blockedCount)}
          </span>
        ) : null}
      </div>

      <ActionRow className="pending-mutation-actions">
        <button
          type="button"
          className="button secondary"
          onClick={onSyncNow}
          disabled={isOffline || syncing || typeof onSyncNow !== 'function'}
        >
          {syncing
            ? meta.syncingLabel
            : failedCount > 0
              ? meta.retryLabel
              : blockedCount > 0
                ? meta.retryBlockedLabel
                : meta.syncLabel}
        </button>
      </ActionRow>
    </div>
  )
}

export default PendingMutationNotice
