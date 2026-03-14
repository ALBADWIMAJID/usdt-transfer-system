const RECENT_THRESHOLD_MS = 15 * 60 * 1000
const AGING_THRESHOLD_MS = 6 * 60 * 60 * 1000
const STALE_THRESHOLD_MS = 24 * 60 * 60 * 1000

function parseSnapshotDate(value) {
  if (!value) {
    return null
  }

  const parsedDate = new Date(value)

  if (Number.isNaN(parsedDate.getTime())) {
    return null
  }

  return parsedDate
}

export function formatSnapshotSavedAt(value) {
  const parsedDate = parseSnapshotDate(value)

  if (!parsedDate) {
    return ''
  }

  return new Intl.DateTimeFormat('ar', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(parsedDate)
}

export function formatSnapshotAge(value) {
  const parsedDate = parseSnapshotDate(value)

  if (!parsedDate) {
    return ''
  }

  const diffMs = Date.now() - parsedDate.getTime()

  if (diffMs < 45 * 1000) {
    return 'منذ لحظات'
  }

  const absDiffMs = Math.abs(diffMs)
  const minuteMs = 60 * 1000
  const hourMs = 60 * minuteMs
  const dayMs = 24 * hourMs
  const unit =
    absDiffMs >= dayMs
      ? 'day'
      : absDiffMs >= hourMs
        ? 'hour'
        : 'minute'
  const divisor = unit === 'day' ? dayMs : unit === 'hour' ? hourMs : minuteMs
  const delta = -Math.max(1, Math.round(absDiffMs / divisor))

  return new Intl.RelativeTimeFormat('ar', { numeric: 'auto' }).format(delta, unit)
}

export function getSnapshotFreshnessMeta(value) {
  const parsedDate = parseSnapshotDate(value)

  if (!parsedDate) {
    return {
      ageLabel: '',
      description: 'تعذر تحديد وقت الحفظ المحلي الأخير لهذه الشاشة.',
      isStale: false,
      savedAtLabel: '',
      tone: 'neutral',
      toneLabel: 'وقت الحفظ غير متاح',
    }
  }

  const ageMs = Math.max(0, Date.now() - parsedDate.getTime())

  if (ageMs <= RECENT_THRESHOLD_MS) {
    return {
      ageLabel: formatSnapshotAge(value),
      description: 'تم حفظ هذه النسخة محليا مؤخرا، لكنها تظل أقل موثوقية من القراءة المباشرة.',
      isStale: false,
      savedAtLabel: formatSnapshotSavedAt(value),
      tone: 'success',
      toneLabel: 'حفظ محلي حديث',
    }
  }

  if (ageMs <= AGING_THRESHOLD_MS) {
    return {
      ageLabel: formatSnapshotAge(value),
      description: 'هذه النسخة المحلية حديثة نسبيا، لكنها قد لا تعكس آخر التغييرات المباشرة.',
      isStale: false,
      savedAtLabel: formatSnapshotSavedAt(value),
      tone: 'info',
      toneLabel: 'حفظ محلي حديث نسبيا',
    }
  }

  if (ageMs <= STALE_THRESHOLD_MS) {
    return {
      ageLabel: formatSnapshotAge(value),
      description: 'هذه النسخة المحلية أقدم من المعتاد وقد تحتاج إلى تحديث مباشر عند عودة الاتصال.',
      isStale: true,
      savedAtLabel: formatSnapshotSavedAt(value),
      tone: 'warning',
      toneLabel: 'نسخة محلية أقدم من المعتاد',
    }
  }

  return {
    ageLabel: formatSnapshotAge(value),
    description: 'هذه نسخة محلية قديمة. يوصى بتحديث الشاشة من الخادم عند توفر الاتصال.',
    isStale: true,
    savedAtLabel: formatSnapshotSavedAt(value),
    tone: 'warning',
    toneLabel: 'نسخة محلية قديمة',
  }
}

export function getOfflineSnapshotMissingMessage(subjectLabel = 'لهذه الشاشة') {
  return `أنت دون اتصال، ولا توجد نسخة محفوظة محليا ${subjectLabel} حتى الآن. أعد الاتصال ثم حدّث هذه الشاشة لحفظها محليا لأول مرة.`
}
