import useSyncStatus from '../../hooks/useSyncStatus.js'

function buildBreakdownLabel({ paymentQueueCount = 0, transferQueueCount = 0 }) {
  const parts = []

  if (transferQueueCount > 0) {
    parts.push(`${transferQueueCount} حوالة`)
  }

  if (paymentQueueCount > 0) {
    parts.push(`${paymentQueueCount} دفعة`)
  }

  return parts.join(' + ')
}

function getSyncBannerMeta({
  blockedCount,
  failedCount,
  message,
  paymentBlockedCount,
  paymentFailedCount,
  paymentQueueCount,
  pendingCount,
  status,
  transferBlockedCount,
  transferFailedCount,
  transferQueueCount,
}) {
  const pendingBreakdown = buildBreakdownLabel({
    paymentQueueCount,
    transferQueueCount,
  })
  const blockedBreakdown = buildBreakdownLabel({
    paymentQueueCount: paymentBlockedCount,
    transferQueueCount: transferBlockedCount,
  })
  const failedBreakdown = buildBreakdownLabel({
    paymentQueueCount: paymentFailedCount,
    transferQueueCount: transferFailedCount,
  })

  if (status === 'offline') {
    return {
      description:
        pendingCount > 0
          ? `يمكن متابعة القراءة من النسخ المحلية في بعض الشاشات. أي ${pendingBreakdown || 'عمليات محلية'} محفوظة ستبقى بانتظار الإرسال إلى أن يعود الاتصال.`
          : 'يمكن متابعة القراءة من النسخ المحلية في بعض الشاشات. التحديثات الحية غير متاحة إلى أن يعود الاتصال.',
      label: 'حالة الاتصال',
      title: 'أنت حاليا دون اتصال',
      tone: 'warning',
    }
  }

  if (status === 'pending') {
    return {
      description:
        message ||
        `توجد ${pendingBreakdown || 'عمليات محلية'} محفوظة داخل المتصفح بانتظار الإرسال إلى الخادم. ستبقى منفصلة عن السجلات المؤكدة حتى تنجح المزامنة.`,
      label: pendingCount > 0 ? `${pendingCount} محلية` : 'محلية',
      title: 'توجد عمليات محلية بانتظار الإرسال',
      tone: 'warning',
    }
  }

  if (status === 'blocked') {
    return {
      description:
        message ||
        `توجد ${blockedBreakdown || 'عناصر محلية'} محجوبة مؤقتا بانتظار تأكيد حوالات مرتبطة أو نجاح إعادة المحاولة. ستبقى ظاهرة محليا حتى تصبح جاهزة للإرسال.`,
      label: blockedCount > 0 ? `${blockedCount} محجوبة` : 'محجوبة',
      title: 'بعض العناصر المحلية بانتظار اعتماد مرتبط',
      tone: 'warning',
    }
  }

  if (status === 'syncing') {
    return {
      description: message || 'يجري الآن إرسال العمليات المحلية المحفوظة إلى الخادم بشكل متتابع وآمن.',
      label: 'جار الإرسال',
      title: 'جار مزامنة العمليات المحلية',
      tone: 'info',
    }
  }

  if (status === 'error') {
    return {
      description:
        message ||
        `تعذر إرسال بعض العمليات المحلية${failedBreakdown ? ` (${failedBreakdown})` : ''}. راجع الشاشة المرتبطة ثم أعد المحاولة عند توفر الاتصال.`,
      label: failedCount > 0 ? `${failedCount} تحتاج مراجعة` : 'يتطلب مراجعة',
      title: 'تعذر إرسال بعض العمليات المحلية',
      tone: 'error',
    }
  }

  return {
    description:
      'النظام يعمل على البيانات المباشرة. إذا ظهرت عمليات محلية معلقة أو محفوظة فستعرض حالتها بوضوح داخل الشاشة المرتبطة بها.',
    label: 'مباشر',
    title: 'الاتصال المباشر متاح',
    tone: 'calm',
  }
}

function SyncStatusBanner({ className = '', showWhenIdle = false }) {
  const syncStatus = useSyncStatus()

  if (!showWhenIdle && syncStatus.status === 'idle') {
    return null
  }

  const meta = getSyncBannerMeta(syncStatus)

  return (
    <section
      className={['sync-status-banner', `sync-status-banner--${meta.tone}`, className]
        .filter(Boolean)
        .join(' ')}
      aria-live="polite"
      role={syncStatus.status === 'error' ? 'alert' : 'status'}
    >
      <div className="sync-status-banner-copy">
        <strong>{meta.title}</strong>
        <p>{meta.description}</p>
      </div>
      <span className="sync-status-banner-label">{meta.label}</span>
    </section>
  )
}

export default SyncStatusBanner
