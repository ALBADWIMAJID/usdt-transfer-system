const basePath = import.meta.env.BASE_URL || '/'

function resolveBrandAsset(pathname) {
  const normalizedPath = pathname.replace(/^\/+/, '')
  return `${basePath}${normalizedPath}`
}

export const branding = {
  systemName: 'eduquest',
  officeName: 'eduquest',
  shortName: 'eduquest',
  tagline: 'تشغيل احترافي للحوالات والتسويات والمدفوعات اليومية',
  printTitle: 'كشف الحوالة الرسمي',
  logoMode: 'asset',
  assets: {
    logo: resolveBrandAsset('branding/image-ui.png'),
    printLogo: resolveBrandAsset('branding/image-ui.png'),
    mark: resolveBrandAsset('branding/image-mark.png'),
    appIcon: resolveBrandAsset('icons/icon-512.png'),
    appleTouchIcon: resolveBrandAsset('apple-touch-icon.png'),
  },
  palette: {
    primary: '#0d7a72',
    primaryRgb: '13, 122, 114',
    secondary: '#11293b',
    secondaryRgb: '17, 41, 59',
    accent: '#c89a43',
    accentRgb: '200, 154, 67',
    primarySoft: '#e3f5f1',
    secondarySoft: '#eef4f8',
    accentSoft: '#fbf2df',
    focus: '#1d4ed8',
  },
}

export function applyBrandingToDocument(rootElement) {
  if (!rootElement) {
    return
  }

  const { palette } = branding

  rootElement.style.setProperty('--brand-primary', palette.primary)
  rootElement.style.setProperty('--brand-primary-rgb', palette.primaryRgb)
  rootElement.style.setProperty('--brand-secondary', palette.secondary)
  rootElement.style.setProperty('--brand-secondary-rgb', palette.secondaryRgb)
  rootElement.style.setProperty('--brand-accent', palette.accent)
  rootElement.style.setProperty('--brand-accent-rgb', palette.accentRgb)
  rootElement.style.setProperty('--brand-primary-soft', palette.primarySoft)
  rootElement.style.setProperty('--brand-secondary-soft', palette.secondarySoft)
  rootElement.style.setProperty('--brand-accent-soft', palette.accentSoft)
  rootElement.style.setProperty('--brand-focus', palette.focus)
}
