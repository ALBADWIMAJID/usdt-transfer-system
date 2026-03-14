function getBaseUrl() {
  const configuredBase = import.meta.env.BASE_URL || '/'

  return configuredBase.endsWith('/') ? configuredBase : `${configuredBase}/`
}

function getSameOriginPath(source) {
  if (!source) {
    return ''
  }

  try {
    const url = new URL(source, window.location.href)

    if (url.origin !== window.location.origin) {
      return ''
    }

    return `${url.pathname}${url.search}`
  } catch {
    return ''
  }
}

export function registerServiceWorker() {
  if (!('serviceWorker' in navigator) || !import.meta.env.PROD) {
    return
  }

  const baseUrl = getBaseUrl()
  const scopeUrl = new URL(baseUrl, window.location.origin)
  const serviceWorkerUrl = new URL('sw.js', scopeUrl)

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(serviceWorkerUrl, {
        scope: scopeUrl.pathname,
      })
      .then(() => navigator.serviceWorker.ready)
      .then((registration) => {
        const currentShellUrls = [
          scopeUrl.pathname,
          getSameOriginPath(new URL('index.html', scopeUrl)),
          ...Array.from(
            document.querySelectorAll(
              'link[rel="stylesheet"], link[rel="modulepreload"], link[rel="manifest"], link[rel="icon"], link[rel="apple-touch-icon"], script[src]'
            )
          ).map((element) => getSameOriginPath(element.href || element.src)),
        ]

        const activeWorker =
          registration.active || registration.waiting || registration.installing || null

        activeWorker?.postMessage({
          type: 'CACHE_URLS',
          payload: currentShellUrls,
        })
      })
      .catch((error) => {
        console.error('Service worker registration failed.', error)
      })
  })
}
