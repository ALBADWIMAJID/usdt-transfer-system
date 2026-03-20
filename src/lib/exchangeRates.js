const USD_RUB_RATE_SOURCE_URL = 'https://www.cbr-xml-daily.ru/daily_json.js'
const REQUEST_TIMEOUT_MS = 8000

function parsePositiveNumber(value) {
  const parsedValue = Number(value)

  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : null
}

export async function fetchUsdRubRate({ signal } = {}) {
  const controller = new AbortController()
  let didTimeout = false
  let removeAbortListener = null

  if (signal) {
    if (signal.aborted) {
      controller.abort()
    } else {
      const forwardAbort = () => controller.abort()
      signal.addEventListener('abort', forwardAbort, { once: true })
      removeAbortListener = () => signal.removeEventListener('abort', forwardAbort)
    }
  }

  const timeoutId = setTimeout(() => {
    didTimeout = true
    controller.abort()
  }, REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch(USD_RUB_RATE_SOURCE_URL, {
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
      },
      mode: 'cors',
      signal: controller.signal,
    })

    if (!response.ok) {
      throw new Error('تعذر تحميل سعر USD/RUB من المصدر الخارجي الآن.')
    }

    const payload = await response.json()
    const usdEntry = payload?.Valute?.USD
    const rawRate = parsePositiveNumber(usdEntry?.Value)
    const nominal = parsePositiveNumber(usdEntry?.Nominal) ?? 1

    if (!rawRate) {
      throw new Error('لم يعد المصدر الخارجي يعرض سعر USD/RUB بالشكل المتوقع.')
    }

    const normalizedRate = rawRate / nominal

    if (!Number.isFinite(normalizedRate) || normalizedRate <= 0) {
      throw new Error('تعذر تفسير سعر USD/RUB القادم من المصدر الخارجي.')
    }

    return {
      fetchedAt: new Date().toISOString(),
      pair: 'USD/RUB',
      publishedAt: payload?.Date || '',
      rate: normalizedRate,
      sourceLabel: 'CBR XML Daily',
      sourceUpdatedAt: payload?.Timestamp || '',
      sourceUrl: USD_RUB_RATE_SOURCE_URL,
    }
  } catch (error) {
    if (didTimeout) {
      throw new Error('انتهت مهلة جلب سعر USD/RUB. أدخل السعر يدويًا أو أعد المحاولة.')
    }

    if (error?.name === 'AbortError') {
      throw error
    }

    if (
      error instanceof Error &&
      error.message &&
      error.message !== 'Failed to fetch' &&
      error.message !== 'Load failed'
    ) {
      throw error
    }

    throw new Error('تعذر جلب سعر USD/RUB الآن. أدخل السعر يدويًا أو أعد المحاولة.')
  } finally {
    clearTimeout(timeoutId)
    removeAbortListener?.()
  }
}

export { USD_RUB_RATE_SOURCE_URL }
